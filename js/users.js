
AdminApp.renderMessagesPage = function() {
    const mainContent = document.getElementById('mainContent');
    const log = this.getMessageLog();
    const currentDate = this.getCurrentDate();
    
    let html = '<div class="section-title">💬 Message Log</div>';
    
    const entries = Object.entries(log);
    if (entries.length === 0) {
        html += `
            <div class="empty-state" style="text-align:center;padding:40px;background:white;border-radius:12px;">
                <i class="fas fa-comment-slash" style="font-size:48px;color:var(--medium-gray);margin-bottom:12px;"></i>
                <h3>No Messages Sent Yet</h3>
                <p>Messages you send will appear here with dates.</p>
            </div>
        `;
    } else {
        html += '<div class="message-log">';
        entries.forEach(([email, dates]) => {
            const user = this.usersData.find(u => u.email === email);
            const userName = user ? user.email : email;
            const semester = user ? user.semester : 'N/A';
            
            html += `
                <div class="message-log-item">
                    <div>
                        <strong>${userName}</strong>
                        <span style="font-size:12px;color:var(--dark-gray);">(${semester})</span>
                    </div>
                    <div style="display:flex;gap:6px;flex-wrap:wrap;">
                        ${dates.map(date => `
                            <span style="font-size:11px;padding:3px 10px;background:#E8F5E9;color:var(--bash-green);border-radius:12px;">
                                <i class="fas fa-check"></i> ${date}
                            </span>
                        `).join('')}
                    </div>
                </div>
            `;
        });
        html += '</div>';
    }
    
    html += `
        <button onclick="AdminApp.clearMessageLog()" style="margin-top:16px;padding:8px 16px;background:#E53935;color:white;border:none;border-radius:20px;cursor:pointer;font-size:12px;">
            <i class="fas fa-trash"></i> Clear Log
        </button>
    `;
    
    mainContent.innerHTML = html;
};

AdminApp.clearMessageLog = function() {
    if (confirm('Are you sure you want to clear all message logs? This cannot be undone.')) {
        localStorage.removeItem(ADMIN_CONFIG.STORAGE_KEYS.MESSAGE_LOG);
        this.showToast('Message log cleared');
        this.renderMessagesPage();
    }
};

AdminApp.renderStatsPage = function() {
    const mainContent = document.getElementById('mainContent');
    const users = this.usersData;
    const log = this.getMessageLog();
    
    const totalUsers = users.length;
    const maleCount = users.filter(u => u.gender === 'male').length;
    const femaleCount = users.filter(u => u.gender === 'female').length;
    const totalMessagesSent = Object.values(log).flat().length;
    const uniqueUsersContacted = Object.keys(log).length;
    const currentDate = this.getCurrentDate();
    const todaySent = Object.values(log).filter(dates => dates.includes(currentDate)).length;
    
    let html = '<div class="section-title">📊 Statistics</div>';
    html += '<div class="stats-grid">';
    html += `<div class="stat-card fade-in"><div class="stat-number">${totalUsers}</div><div class="stat-label">Total Users</div></div>`;
    html += `<div class="stat-card fade-in"><div class="stat-number" style="color:var(--male-text);">${maleCount}</div><div class="stat-label">Male Students</div></div>`;
    html += `<div class="stat-card fade-in"><div class="stat-number" style="color:var(--female-text);">${femaleCount}</div><div class="stat-label">Female Students</div></div>`;
    html += `<div class="stat-card fade-in"><div class="stat-number" style="color:var(--bash-orange);">${totalMessagesSent}</div><div class="stat-label">Total Messages Sent</div></div>`;
    html += `<div class="stat-card fade-in"><div class="stat-number">${uniqueUsersContacted}</div><div class="stat-label">Users Contacted</div></div>`;
    html += `<div class="stat-card fade-in"><div class="stat-number" style="color:var(--bash-green);">${todaySent}</div><div class="stat-label">Sent Today (${currentDate})</div></div>`;
    html += '</div>';
    
    // Semester-wise breakdown
    if (users.length > 0) {
        html += '<div class="section-title" style="margin-top:24px;">📋 Semester Breakdown</div>';
        html += '<div class="message-log">';
        
        const semGroups = {};
        users.forEach(u => {
            const sem = u.semester || 'Unknown';
            if (!semGroups[sem]) semGroups[sem] = { total: 0, male: 0, female: 0, contacted: 0 };
            semGroups[sem].total++;
            if (u.gender === 'male') semGroups[sem].male++;
            if (u.gender === 'female') semGroups[sem].female++;
            if (log[u.email]) semGroups[sem].contacted++;
        });
        
        Object.entries(semGroups).forEach(([sem, stats]) => {
            html += `
                <div class="message-log-item">
                    <strong>${sem}</strong>
                    <span style="font-size:13px;">
                        ${stats.total} users | 
                        <span style="color:var(--male-text);">M:${stats.male}</span> | 
                        <span style="color:var(--female-text);">F:${stats.female}</span> | 
                        <span style="color:var(--bash-green);">Sent:${stats.contacted}</span>
                    </span>
                </div>
            `;
        });
        
        html += '</div>';
    }
    
    mainContent.innerHTML = html;
};