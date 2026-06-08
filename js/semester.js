AdminApp.renderSemestersPage = async function() {
    const users = await this.fetchUsers();
    await this.fetchExams();
    
    const mainContent = document.getElementById('mainContent');
    
    if (users.length === 0) {
        mainContent.innerHTML = `
            <div class="section-title">📚 Semesters</div>
            <div class="empty-state" style="text-align:center;padding:40px;background:white;border-radius:12px;">
                <i class="fas fa-database" style="font-size:48px;color:var(--medium-gray);margin-bottom:12px;"></i>
                <h3>No Data Found</h3>
                <p>Configure the Google Sheets URL in config.js or check your connection.</p>
            </div>
        `;
        return;
    }
    
    // Group users by semester
    const semesterGroups = {};
    users.forEach(user => {
        const sem = user.semester || 'Unknown';
        if (!semesterGroups[sem]) semesterGroups[sem] = [];
        semesterGroups[sem].push(user);
    });
    
    const semesters = Object.keys(semesterGroups).sort((a, b) => {
        const numA = parseInt(a.replace(/[^0-9]/g, '')) || 0;
        const numB = parseInt(b.replace(/[^0-9]/g, '')) || 0;
        return numA - numB;
    });
    
    let html = '<div class="section-title">📚 Semesters</div>';
    html += '<div id="breadcrumb" class="breadcrumb"></div>';
    html += '<div class="card-grid">';
    
    semesters.forEach(sem => {
        const count = semesterGroups[sem].length;
        html += `
            <div class="semester-card fade-in" onclick="AdminApp.openSemester('${sem}')" data-semester="${sem}">
                <div class="card-icon">
                    <i class="fas fa-layer-group"></i>
                </div>
                <div class="card-info">
                    <div class="card-name">${sem}</div>
                    <div class="card-count">${count} student${count > 1 ? 's' : ''}</div>
                </div>
                <i class="fas fa-chevron-right" style="color:var(--medium-gray);"></i>
            </div>
        `;
    });
    
    html += '</div>';
    mainContent.innerHTML = html;
    
    this.breadcrumbPath = [];
    this.updateBreadcrumb([{ name: 'Semesters', onClick: () => this.renderSemestersPage() }]);
    this.currentSemester = null;
    this.updateFilters('semesters');
};

AdminApp.openSemester = function(semester) {
    this.currentSemester = semester;
    const users = this.usersData.filter(u => u.semester === semester);
    const exam = this.getExamForSemester(semester);
    const currentDate = this.getCurrentDate();
    
    const mainContent = document.getElementById('mainContent');
    
    this.breadcrumbPath = [
        { name: 'Semesters', onClick: () => this.renderSemestersPage() },
        { name: semester, onClick: () => this.openSemester(semester) }
    ];
    
    let html = `<div class="section-title">📚 ${semester}</div>`;
    html += `<div id="breadcrumb" class="breadcrumb"></div>`;
    
    // Exam info
    if (exam) {
        html += `<p style="margin-bottom:12px;color:var(--bash-navy);font-weight:500;">
            <i class="fas fa-calendar-alt"></i> Current Exam: <strong>${exam}</strong> | Date: <strong>${currentDate}</strong>
        </p>`;
    }
    
    // Send to All button
    html += `<button class="send-all-btn" onclick="AdminApp.openSendAll(AdminApp.usersData.filter(u => u.semester === '${semester}'), '${semester}')">
        <i class="fas fa-paper-plane"></i> Send Message to All (${users.length})
    </button>`;
    
    html += '<div id="usersContainer">';
    
    users.forEach(user => {
        const isMale = user.gender === 'male';
        const genderClass = isMale ? 'male' : 'female';
        const userIdentifier = user.email;
        const hasSent = this.hasMessageBeenSent(userIdentifier, currentDate);
        
        html += `
            <div class="user-card fade-in ${genderClass}" data-gender="${user.gender}" data-email="${user.email}">
                <div class="user-info">
                    <div class="user-name">
                        <i class="fas fa-user-circle" style="color:${isMale ? 'var(--male-text)' : 'var(--female-text)'};margin-right:8px;"></i>
                        ${user.email}
                    </div>
                    <div class="user-detail">
                        <i class="fab fa-whatsapp" style="color:#25D366;margin-right:4px;"></i> ${user.whatsapp}
                        ${user.officialEmail ? ` | <i class="fas fa-envelope" style="margin-left:8px;margin-right:4px;"></i> ${user.officialEmail}` : ''}
                    </div>
                </div>
                <div class="user-actions">
                    <div class="tick-status">
                        <i class="fas fa-check ${hasSent ? 'tick-sent' : 'tick-pending'}"></i>
                        <span>${hasSent ? 'Sent' : 'Pending'}</span>
                    </div>
                    <button class="send-btn" onclick="AdminApp.sendMessageToUser('${user.email}', '${semester}')">
                        <i class="fab fa-whatsapp"></i> Send
                    </button>
                </div>
            </div>
        `;
    });
    
    html += '</div>';
    mainContent.innerHTML = html;
    
    this.updateBreadcrumb(this.breadcrumbPath);
    this.updateFilters('semesters');
};

AdminApp.sendMessageToUser = function(email, semester) {
    const user = this.usersData.find(u => u.email === email);
    if (!user) return;
    
    const exam = this.getExamForSemester(semester);
    const currentDate = this.getCurrentDate();
    const template = this.getTemplate();
    const message = template.replace('{exam}', exam);
    const encodedMessage = encodeURIComponent(message);
    
    const phone = user.whatsapp.replace(/^0/, ADMIN_CONFIG.WHATSAPP_COUNTRY_CODE);
    const link = `https://wa.me/${phone}?text=${encodedMessage}`;
    
    // Mark as sent
    this.markMessageSent(email, currentDate);
    
    // Open WhatsApp
    window.open(link, '_blank');
    
    // Refresh the view to show tick
    setTimeout(() => {
        if (this.currentSemester) {
            this.openSemester(this.currentSemester);
        }
    }, 500);
};

AdminApp.updateBreadcrumb = function(path) {
    const breadcrumb = document.getElementById('breadcrumb');
    if (!breadcrumb) return;
    
    breadcrumb.innerHTML = '';
    path.forEach((item, index) => {
        const span = document.createElement('span');
        span.className = `breadcrumb-item ${index === path.length - 1 ? 'active' : ''}`;
        span.textContent = item.name;
        span.addEventListener('click', item.onClick);
        breadcrumb.appendChild(span);
        
        if (index < path.length - 1) {
            const arrow = document.createElement('span');
            arrow.className = 'breadcrumb-arrow';
            arrow.innerHTML = '<i class="fas fa-chevron-right"></i>';
            breadcrumb.appendChild(arrow);
        }
    });
};