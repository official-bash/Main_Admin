const AdminApp = {
    currentPage: 'semesters',
    currentSemester: null,
    usersData: [],
    examsData: [],
    breadcrumbPath: [],
    
    init() {
        this.loadNavigation();
        this.loadPage('semesters');
        this.setupSearch();
    },
    
    loadNavigation() {
        const navItems = document.querySelectorAll('.nav-item');
        navItems.forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                this.navigateTo(item.dataset.page);
            });
        });
    },
    
    navigateTo(page) {
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.toggle('active', item.dataset.page === page);
        });
        this.currentPage = page;
        this.breadcrumbPath = [];
        this.currentSemester = null;
        this.loadPage(page);
        this.updateFilters(page);
        document.getElementById('searchInput').value = '';
    },
    
    loadPage(page) {
        const mainContent = document.getElementById('mainContent');
        mainContent.innerHTML = '<div style="text-align:center;padding:40px;"><i class="fas fa-spinner fa-spin" style="font-size:24px;"></i></div>';
        
        setTimeout(() => {
            switch(page) {
                case 'semesters': this.renderSemestersPage(); break;
                case 'messages': this.renderMessagesPage(); break;
                case 'stats': this.renderStatsPage(); break;
            }
        }, 200);
    },
    
    setupSearch() {
        const searchInput = document.getElementById('searchInput');
        let debounceTimer;
        searchInput.addEventListener('input', () => {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => this.handleSearch(), 300);
        });
    },
    
    handleSearch() {
        const query = document.getElementById('searchInput').value.toLowerCase().trim();
        const filterActive = document.querySelector('.filter-chip.active');
        const filterValue = filterActive ? filterActive.dataset.filter : 'all';
        
        if (this.currentPage === 'semesters' && this.currentSemester) {
            this.filterUsers(query, filterValue);
        }
    },
    
    updateFilters(page) {
        const filterContainer = document.getElementById('filterContainer');
        filterContainer.innerHTML = '';
        
        if (page === 'semesters' && this.currentSemester) {
            const filters = [
                { label: 'All', value: 'all' },
                { label: 'Male', value: 'male' },
                { label: 'Female', value: 'female' }
            ];
            
            filters.forEach((filter, index) => {
                const chip = document.createElement('div');
                chip.className = 'filter-chip' + (index === 0 ? ' active' : '');
                chip.dataset.filter = filter.value;
                chip.textContent = filter.label;
                chip.addEventListener('click', () => {
                    document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
                    chip.classList.add('active');
                    this.handleSearch();
                });
                filterContainer.appendChild(chip);
            });
        }
    },
    
    filterUsers(query, filter) {
        const cards = document.querySelectorAll('.user-card');
        cards.forEach(card => {
            const text = card.textContent.toLowerCase();
            const gender = card.dataset.gender;
            const matchesQuery = !query || text.includes(query);
            const matchesFilter = filter === 'all' || gender === filter;
            card.style.display = matchesQuery && matchesFilter ? '' : 'none';
        });
    },
    
    async fetchUsers() {
        if (ADMIN_CONFIG.SHEETS.USERS) {
            try {
                const response = await fetch(ADMIN_CONFIG.SHEETS.USERS);
                const csvText = await response.text();
                this.usersData = this.parseUsersCSV(csvText);
            } catch (error) {
                console.error('Error fetching users:', error);
                this.usersData = [];
            }
        } else {
            this.usersData = [];
        }
        return this.usersData;
    },
    
    parseUsersCSV(csv) {
        const lines = csv.trim().split('\n');
        if (lines.length < 2) return [];
        
        const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
        const users = [];
        
        for (let i = 1; i < lines.length; i++) {
            const values = lines[i].split(',').map(v => v.trim());
            if (values.length < 7) continue;
            
            users.push({
                timestamp: values[0],
                email: values[1],
                officialEmail: values[2],
                otherEmail: values[3],
                whatsapp: values[4].replace(/[^0-9+]/g, ''),
                semester: values[5],
                gender: values[6].toLowerCase()
            });
        }
        return users;
    },
    
    async fetchExams() {
        if (ADMIN_CONFIG.SHEETS.EXAMS) {
            try {
                const response = await fetch(ADMIN_CONFIG.SHEETS.EXAMS);
                const csvText = await response.text();
                this.examsData = this.parseExamsCSV(csvText);
            } catch (error) {
                console.error('Error fetching exams:', error);
                this.examsData = [];
            }
        } else {
            this.examsData = [];
        }
        return this.examsData;
    },
    
    parseExamsCSV(csv) {
        const lines = csv.trim().split('\n');
        if (lines.length === 0) return [];
        
        // Check if the first line starts with a date pattern like D/M/YYYY or YYYY-MM-DD
        const hasHeader = !/^\d+[\/\-]\d+[\/\-]\d+/.test(lines[0].trim());
        const startIndex = hasHeader ? 1 : 0;
        
        const exams = [];
        for (let i = startIndex; i < lines.length; i++) {
            const values = lines[i].split(',').map(v => v.trim());
            if (values.length < 3) continue;
            exams.push({
                date: values[0],
                semester: values[1],
                exam: values[2]
            });
        }
        return exams;
    },
    
    parseCSVDate(dateStr) {
        const parts = dateStr.split('/');
        if (parts.length === 3) {
            const day = parseInt(parts[0], 10);
            const month = parseInt(parts[1], 10) - 1;
            const year = parseInt(parts[2], 10);
            return new Date(year, month, day);
        }
        return new Date(dateStr);
    },

    parseYYYYMMDD(dateStr) {
        const parts = dateStr.split('-');
        if (parts.length === 3) {
            const year = parseInt(parts[0], 10);
            const month = parseInt(parts[1], 10) - 1;
            const day = parseInt(parts[2], 10);
            return new Date(year, month, day);
        }
        return new Date(dateStr);
    },

    compareDates(d1, d2) {
        const date1 = this.parseCSVDate(d1);
        const date2 = this.parseYYYYMMDD(d2);
        return date1.getFullYear() === date2.getFullYear() &&
               date1.getMonth() === date2.getMonth() &&
               date1.getDate() === date2.getDate();
    },
    
    getExamForSemester(semester) {
        const currentDate = this.getCurrentDate();
        const exam = this.examsData.find(e => e.semester === semester && this.compareDates(e.date, currentDate));
        return exam ? exam.exam : 'upcoming';
    },
    
    getMessageLog() {
        const log = localStorage.getItem(ADMIN_CONFIG.STORAGE_KEYS.MESSAGE_LOG);
        return log ? JSON.parse(log) : {};
    },
    
    saveMessageLog(log) {
        localStorage.setItem(ADMIN_CONFIG.STORAGE_KEYS.MESSAGE_LOG, JSON.stringify(log));
    },
    
    markMessageSent(userIdentifier, date) {
        const log = this.getMessageLog();
        if (!log[userIdentifier]) log[userIdentifier] = [];
        if (!log[userIdentifier].includes(date)) {
            log[userIdentifier].push(date);
        }
        this.saveMessageLog(log);
    },
    
    hasMessageBeenSent(userIdentifier, date) {
        const log = this.getMessageLog();
        return log[userIdentifier] && log[userIdentifier].includes(date);
    },
    
    getCurrentDate() {
        const useCurrent = localStorage.getItem(ADMIN_CONFIG.STORAGE_KEYS.USE_CURRENT_DATE);
        if (useCurrent === 'false') {
            const customDate = localStorage.getItem(ADMIN_CONFIG.STORAGE_KEYS.CUSTOM_DATE);
            return customDate || new Date().toISOString().split('T')[0];
        }
        return new Date().toISOString().split('T')[0];
    },
    
    getTemplate() {
        return localStorage.getItem(ADMIN_CONFIG.STORAGE_KEYS.TEMPLATE) || ADMIN_CONFIG.DEFAULT_TEMPLATE;
    },
    
    showToast(message) {
        const existingToast = document.querySelector('.toast');
        if (existingToast) existingToast.remove();
        
        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.textContent = message;
        document.body.appendChild(toast);
        
        setTimeout(() => toast.remove(), 3000);
    },
    
    openSettings() {
        document.getElementById('settingsModal').classList.add('active');
        renderSettings();
    },
    
    closeSettings() {
        document.getElementById('settingsModal').classList.remove('active');
    },
    
    openSendAll(users, semester) {
        const modal = document.getElementById('sendAllModal');
        const content = document.getElementById('sendAllContent');
        
        const currentDate = this.getCurrentDate();
        const exam = this.getExamForSemester(semester);
        const template = this.getTemplate();
        const message = template.replace('{exam}', exam);
        const encodedMessage = encodeURIComponent(message);
        
        let html = `<p style="margin-bottom:12px;color:var(--dark-gray);">Sending to <strong>${users.length}</strong> students in <strong>${semester}</strong></p>`;
        html += `<p style="margin-bottom:16px;color:var(--dark-gray);">Exam: <strong>${exam}</strong> | Date: <strong>${currentDate}</strong></p>`;
        html += '<div class="link-list">';
        
        users.forEach(user => {
            const phone = user.whatsapp.replace(/^0/, ADMIN_CONFIG.WHATSAPP_COUNTRY_CODE);
            const link = `https://wa.me/${phone}?text=${encodedMessage}`;
            html += `
                <div class="link-item">
                    <span style="font-size:13px;">${user.email} (${user.gender})</span>
                    <div>
                        <a href="${link}" target="_blank" onclick="AdminApp.markMessageSent('${user.email}', '${currentDate}')">Open WhatsApp</a>
                        <button class="copy-btn" onclick="navigator.clipboard.writeText('${link}');AdminApp.showToast('Link copied!')">Copy</button>
                    </div>
                </div>
            `;
        });
        
        html += '</div>';
        
        content.innerHTML = html;
        modal.classList.add('active');
    },
    
    closeSendAll() {
        document.getElementById('sendAllModal').classList.remove('active');
        if (this.currentSemester) {
            this.renderSemestersPage();
            setTimeout(() => this.openSemester(this.currentSemester), 100);
        }
    }
};

document.addEventListener('DOMContentLoaded', () => AdminApp.init());