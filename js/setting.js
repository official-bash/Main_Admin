function renderSettings() {
    const content = document.getElementById('settingsContent');
    const template = AdminApp.getTemplate();
    const useCurrentDate = localStorage.getItem(ADMIN_CONFIG.STORAGE_KEYS.USE_CURRENT_DATE) !== 'false';
    const customDate = localStorage.getItem(ADMIN_CONFIG.STORAGE_KEYS.CUSTOM_DATE) || '';
    const sendMethod = localStorage.getItem(ADMIN_CONFIG.STORAGE_KEYS.SEND_METHOD) || ADMIN_CONFIG.SEND_ALL_METHOD;
    
    content.innerHTML = `
        <div class="setting-group">
            <label class="setting-label">Message Template</label>
            <textarea class="setting-textarea" id="templateInput" placeholder="Use {exam} for dynamic exam name">${template}</textarea>
            <span style="font-size:11px;color:var(--dark-gray);">Use <code>{exam}</code> as placeholder for exam name</span>
        </div>
        
        <div class="setting-group">
            <label class="setting-label">Date Mode</label>
            <select class="setting-select" id="dateModeSelect" onchange="toggleDateInput()">
                <option value="current" ${useCurrentDate ? 'selected' : ''}>Use Current Date</option>
                <option value="custom" ${!useCurrentDate ? 'selected' : ''}>Use Custom Date</option>
            </select>
        </div>
        
        <div class="setting-group" id="customDateGroup" style="display:${useCurrentDate ? 'none' : 'block'};">
            <label class="setting-label">Custom Date</label>
            <input type="date" class="setting-input" id="customDateInput" value="${customDate}">
        </div>
        
        <div class="setting-group">
            <label class="setting-label">Send to All Method</label>
            <select class="setting-select" id="sendMethodSelect">
                <option value="manual" ${sendMethod === 'manual' ? 'selected' : ''}>Manual (list of links)</option>
                <option value="auto" ${sendMethod === 'auto' ? 'selected' : ''}>Auto (open one by one with delay)</option>
            </select>
        </div>
        
        <div class="setting-group" id="delayGroup" style="display:${sendMethod === 'auto' ? 'block' : 'none'};">
            <label class="setting-label">Delay Between Messages (seconds)</label>
            <input type="number" class="setting-input" id="delayInput" value="${ADMIN_CONFIG.AUTO_SEND_DELAY / 1000}" min="1" max="10">
        </div>
        
        <button class="save-btn" onclick="saveSettings()">
            <i class="fas fa-save"></i> Save Settings
        </button>
        
        <hr style="margin:24px 0;border-color:var(--medium-gray);">
        
        <div class="setting-group">
            <label class="setting-label">Google Sheets Configuration</label>
            <input type="text" class="setting-input" id="usersSheetUrl" placeholder="Users Sheet CSV URL" value="${ADMIN_CONFIG.SHEETS.USERS}">
            <input type="text" class="setting-input" id="examsSheetUrl" placeholder="Exams Sheet CSV URL" value="${ADMIN_CONFIG.SHEETS.EXAMS}" style="margin-top:8px;">
            <span style="font-size:11px;color:var(--dark-gray);">These are temporarily stored in localStorage. Update config.js for permanent changes.</span>
        </div>
        
        <button class="save-btn" onclick="saveSheetUrls()" style="margin-top:8px;">
            <i class="fas fa-link"></i> Update Sheet URLs
        </button>
    `;
}

function toggleDateInput() {
    const mode = document.getElementById('dateModeSelect').value;
    document.getElementById('customDateGroup').style.display = mode === 'custom' ? 'block' : 'none';
}

function saveSettings() {
    const template = document.getElementById('templateInput').value;
    const useCurrentDate = document.getElementById('dateModeSelect').value === 'current';
    const customDate = document.getElementById('customDateInput').value;
    const sendMethod = document.getElementById('sendMethodSelect').value;
    const delay = parseInt(document.getElementById('delayInput').value) || 2;
    
    localStorage.setItem(ADMIN_CONFIG.STORAGE_KEYS.TEMPLATE, template);
    localStorage.setItem(ADMIN_CONFIG.STORAGE_KEYS.USE_CURRENT_DATE, useCurrentDate.toString());
    localStorage.setItem(ADMIN_CONFIG.STORAGE_KEYS.CUSTOM_DATE, customDate);
    localStorage.setItem(ADMIN_CONFIG.STORAGE_KEYS.SEND_METHOD, sendMethod);
    ADMIN_CONFIG.AUTO_SEND_DELAY = delay * 1000;
    
    AdminApp.showToast('Settings saved successfully!');
    AdminApp.closeSettings();
    
    // Refresh current view
    if (AdminApp.currentPage === 'semesters' && AdminApp.currentSemester) {
        AdminApp.openSemester(AdminApp.currentSemester);
    } else {
        AdminApp.loadPage(AdminApp.currentPage);
    }
}

function saveSheetUrls() {
    const usersUrl = document.getElementById('usersSheetUrl').value;
    const examsUrl = document.getElementById('examsSheetUrl').value;
    
    ADMIN_CONFIG.SHEETS.USERS = usersUrl;
    ADMIN_CONFIG.SHEETS.EXAMS = examsUrl;
    localStorage.setItem('bash_temp_users_sheet', usersUrl);
    localStorage.setItem('bash_temp_exams_sheet', examsUrl);
    
    AdminApp.showToast('Sheet URLs updated! Refresh data? Click Semesters tab.');
    AdminApp.closeSettings();
}

// Load temp sheet URLs on startup
(function() {
    const tempUsers = localStorage.getItem('bash_temp_users_sheet');
    const tempExams = localStorage.getItem('bash_temp_exams_sheet');
    if (tempUsers && !ADMIN_CONFIG.SHEETS.USERS) ADMIN_CONFIG.SHEETS.USERS = tempUsers;
    if (tempExams && !ADMIN_CONFIG.SHEETS.EXAMS) ADMIN_CONFIG.SHEETS.EXAMS = tempExams;
})();