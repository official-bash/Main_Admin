// Active tab state for Control Hub
AdminApp.activeControlTab = 'notifications';

// Helper to parse a single CSV line robustly (handles quoted commas)
// MUST be defined first — called by parseControlsCSV and fetchNotificationsFromCSV
AdminApp.parseCSVLine = function(line) {
    const result = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            result.push(current.trim());
            current = '';
        } else {
            current += char;
        }
    }
    result.push(current.trim());
    return result;
};

AdminApp.renderControlPage = async function() {
    const mainContent = document.getElementById('mainContent');
    mainContent.innerHTML = '<div style="text-align:center;padding:40px;"><i class="fas fa-spinner fa-spin" style="font-size:24px;"></i> Loading configurations...</div>';

    // Fetch API URLs from local storage
    let genderApiUrl = localStorage.getItem(ADMIN_CONFIG.STORAGE_KEYS.GENDER_API_URL) || '';
    let notifApiUrl = localStorage.getItem(ADMIN_CONFIG.STORAGE_KEYS.NOTIF_API_URL) || '';

    // Fetch current data
    let controlsData = {};
    let notificationsList = [];
    let loadingError = false;

    // Load Notifications
    if (notifApiUrl) {
        try {
            // Fetch live JSON from Apps Script Web App (GET request)
            const res = await fetch(notifApiUrl);
            if (res.ok) {
                const parsed = await res.json();
                // Guard: Apps Script may return an object or error string instead of array
                notificationsList = Array.isArray(parsed) ? parsed : [];
            } else {
                throw new Error('API responded with status: ' + res.status);
            }
        } catch (e) {
            console.error('Error fetching notifications via Apps Script:', e);
            // Fallback to published CSV
            notificationsList = await AdminApp.fetchNotificationsFromCSV();
        }
    } else {
        // No API URL — fallback to read-only published CSV
        notificationsList = await AdminApp.fetchNotificationsFromCSV();
    }

    // Final safety: always ensure it is an array
    if (!Array.isArray(notificationsList)) {
        notificationsList = [];
    }


    // Load Controls
    try {
        const controlsRes = await fetch(ADMIN_CONFIG.SHEETS.CONTROLS);
        const controlsCsv = await controlsRes.text();
        controlsData = AdminApp.parseControlsCSV(controlsCsv);
    } catch (e) {
        console.error('Error fetching controls data:', e);
        loadingError = true;
    }

    let html = '<div class="section-title">🎛️ Control Hub</div>';
    html += '<div id="breadcrumb" class="breadcrumb"></div>';

    if (loadingError) {
        html += `
            <div class="alert warning" style="margin-bottom:20px;">
                <i class="fas fa-exclamation-triangle"></i> Note: Unable to read current data from published Google Sheets. Please ensure Sheets are published to web as CSV and URLs in config.js are correct.
            </div>
        `;
    }

    // Tab Navigation Options (Folders/Cards)
    html += `
        <div class="control-tabs" style="display:flex; gap:12px; margin-bottom:24px;">
            <button class="control-tab-btn ${AdminApp.activeControlTab === 'notifications' ? 'active' : ''}" onclick="AdminApp.switchControlTab('notifications')">
                <i class="fas fa-bell"></i> Notification System
            </button>
            <button class="control-tab-btn ${AdminApp.activeControlTab === 'gender' ? 'active' : ''}" onclick="AdminApp.switchControlTab('gender')">
                <i class="fas fa-users-cog"></i> Gender selection system
            </button>
        </div>
    `;

    // RENDER ACTIVE TAB
    if (AdminApp.activeControlTab === 'notifications') {
        // --- NOTIFICATIONS TAB ---
        html += `
            <div class="control-card fade-in connection-settings" style="margin-bottom: 24px;">
                <h3><i class="fas fa-plug"></i> Connection Settings (Notification Sheet)</h3>
                <p style="font-size: 13px; color: var(--dark-gray); margin-bottom: 12px; line-height:1.4;">
                    Paste the deployed Apps Script URL for the Notification Spreadsheet here.
                </p>
                <div class="setting-group" style="margin-bottom: 8px;">
                    <div style="display:flex; gap:8px;">
                        <input type="url" id="notif_api_url_input" class="setting-input" placeholder="https://script.google.com/macros/s/.../exec" value="${notifApiUrl}" style="flex:1;">
                        <button class="save-btn" onclick="AdminApp.saveNotifApiUrl()" style="white-space:nowrap;"><i class="fas fa-save"></i> Save URL</button>
                    </div>
                    <div style="margin-top: 6px; font-size:12px;">
                        ${notifApiUrl ? '<span style="color:var(--success); font-weight:600;"><i class="fas fa-check-circle"></i> Connected</span>' : '<span style="color:var(--bash-orange); font-weight:600;"><i class="fas fa-info-circle"></i> Required for notification updates (Create / Edit / Delete)</span>'}
                    </div>
                </div>
            </div>

            <div class="control-card fade-in" style="margin-bottom: 24px;">
                <div class="card-header-flex">
                    <h3><i class="fas fa-bell"></i> Manage Notifications</h3>
                    <button class="save-btn" onclick="AdminApp.openNotificationModal()" ${!notifApiUrl ? 'disabled title="Please configure connection URL"' : ''}>
                        <i class="fas fa-plus"></i> Create Notification
                    </button>
                </div>

                <div class="notifications-table-container">
                    ${notificationsList.length === 0 ? `
                        <div style="text-align:center; padding: 30px; color:var(--dark-gray);">
                            <i class="fas fa-info-circle" style="font-size:30px; color:var(--medium-gray); margin-bottom:10px;"></i>
                            <p>No notifications found or loaded.</p>
                        </div>
                    ` : `
                        <table class="notifications-table">
                            <thead>
                                <tr>
                                    <th>Heading</th>
                                    <th>Short Description</th>
                                    <th>Last Updated</th>
                                    <th style="text-align:right;">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${notificationsList.map(item => `
                                    <tr data-index="${item.index}">
                                        <td><strong>${item.heading}</strong></td>
                                        <td><span class="text-truncate">${item.short_description}</span></td>
                                        <td><span style="font-size:11px; color:var(--dark-gray);">${item.updated}</span></td>
                                        <td style="text-align:right;">
                                            <div style="display:flex; justify-content:flex-end; gap:8px;">
                                                <button class="action-edit-btn" onclick="AdminApp.openNotificationModal(${JSON.stringify(item).replace(/"/g, '&quot;')})" ${!notifApiUrl ? 'disabled' : ''}>
                                                    <i class="fas fa-edit"></i> Edit
                                                </button>
                                                <button class="action-delete-btn" onclick="AdminApp.deleteNotification(${item.index})" ${!notifApiUrl ? 'disabled' : ''}>
                                                    <i class="fas fa-trash-alt"></i> Delete
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    `}
                </div>
            </div>

            <!-- Apps Script Setup Card -->
            <div class="control-card fade-in instruction-card" style="margin-bottom: 24px;">
                <h3><i class="fas fa-book-open"></i> Notification Apps Script Setup Guide</h3>
                <p style="font-size: 13px; color: var(--dark-gray); margin-bottom: 12px; line-height: 1.5;">
                    To enable adding, updating, and deleting notifications directly, host this script:
                </p>
                <ol class="setup-steps">
                    <li>Open your **Notification Control System Spreadsheet**.</li>
                    <li>Go to <strong>Extensions</strong> &gt; <strong>Apps Script</strong>.</li>
                    <li>Delete any code in the editor, and paste the code snippet below.</li>
                    <li>Click the save icon (💾).</li>
                    <li>Click <strong>Deploy</strong> &gt; <strong>New deployment</strong>.</li>
                    <li>Under Select type, select <strong>Web app</strong> (click the cog icon if it isn't listed).</li>
                    <li>Set Execute as to <strong>Me (your email)</strong>.</li>
                    <li>Set Who has access to <strong>Anyone</strong> (this allows the panel to communicate with it).</li>
                    <li>Click <strong>Deploy</strong>, authorize the permissions, and copy the <strong>Web App URL</strong>.</li>
                    <li>Paste the Web App URL into the <strong>Connection Settings</strong> above and click <strong>Save URL</strong>.</li>
                </ol>
                
                <div style="margin-top: 16px;">
                    <label class="setting-label">Copy Apps Script Code:</label>
                    <div class="code-container">
                        <pre id="notifScriptSnippet"><code>function doGet(e) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
  var data = sheet.getDataRange().getValues();
  var result = [];
  
  for (var i = 1; i < data.length; i++) {
    result.push({
      index: i,
      heading: data[i][0],
      short_description: data[i][1],
      detail: data[i][2],
      link: data[i][3],
      updated: data[i][4]
    });
  }
  
  return ContentService.createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  var data = JSON.parse(e.postData.contents);
  var action = data.action;
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
  
  if (action === "create") {
    sheet.appendRow([data.heading, data.short_description, data.detail, data.link, data.updated]);
    return ContentService.createTextOutput(JSON.stringify({status: "success"}))
      .setMimeType(ContentService.MimeType.JSON);
  }
  
  if (action === "update") {
    var rowIndex = parseInt(data.index) + 1; // 1-based index including header
    sheet.getRange(rowIndex, 1).setValue(data.heading);
    sheet.getRange(rowIndex, 2).setValue(data.short_description);
    sheet.getRange(rowIndex, 3).setValue(data.detail);
    sheet.getRange(rowIndex, 4).setValue(data.link);
    sheet.getRange(rowIndex, 5).setValue(data.updated);
    return ContentService.createTextOutput(JSON.stringify({status: "success"}))
      .setMimeType(ContentService.MimeType.JSON);
  }
  
  if (action === "delete") {
    var rowIndex = parseInt(data.index) + 1;
    sheet.deleteRow(rowIndex);
    return ContentService.createTextOutput(JSON.stringify({status: "success"}))
      .setMimeType(ContentService.MimeType.JSON);
  }
}</code></pre>
                        <button class="copy-code-btn" onclick="AdminApp.copyCode('notifScriptSnippet')"><i class="fas fa-copy"></i> Copy Code</button>
                    </div>
                </div>
            </div>
        `;
    } else {
        // --- GENDER CONTROLS TAB ---
        html += `
            <div class="control-card fade-in connection-settings" style="margin-bottom: 24px;">
                <h3><i class="fas fa-plug"></i> Connection Settings (Gender Control Sheet)</h3>
                <p style="font-size: 13px; color: var(--dark-gray); margin-bottom: 12px; line-height:1.4;">
                    Paste the deployed Apps Script URL for the Gender Selection Spreadsheet here.
                </p>
                <div class="setting-group" style="margin-bottom: 8px;">
                    <div style="display:flex; gap:8px;">
                        <input type="url" id="gender_api_url_input" class="setting-input" placeholder="https://script.google.com/macros/s/.../exec" value="${genderApiUrl}" style="flex:1;">
                        <button class="save-btn" onclick="AdminApp.saveGenderApiUrl()" style="white-space:nowrap;"><i class="fas fa-save"></i> Save URL</button>
                    </div>
                    <div style="margin-top: 6px; font-size:12px;">
                        ${genderApiUrl ? '<span style="color:var(--success); font-weight:600;"><i class="fas fa-check-circle"></i> Connected</span>' : '<span style="color:var(--bash-orange); font-weight:600;"><i class="fas fa-info-circle"></i> Required for gender controls updates</span>'}
                    </div>
                </div>
            </div>

            <div class="control-card fade-in" style="margin-bottom: 24px;">
                <div class="card-header-flex">
                    <h3><i class="fas fa-users-cog"></i> Gender selection control system</h3>
                    <span class="badge-source">Sheet 1</span>
                </div>
                <form id="genderControlForm" onsubmit="AdminApp.saveGenderControls(event)">
                    <div class="form-grid">
                        <div class="setting-group">
                            <label class="setting-label">Total Names Display</label>
                            <input type="number" id="ctrl_total_names" class="setting-input" required value="${controlsData.totalNames || ''}">
                        </div>
                        <div class="setting-group">
                            <label class="setting-label">Total Same Gender Known Names</label>
                            <input type="number" id="ctrl_same_gender" class="setting-input" required value="${controlsData.sameGender || ''}">
                        </div>
                        <div class="setting-group">
                            <label class="setting-label">Total Other Gender Known Names</label>
                            <input type="number" id="ctrl_other_gender" class="setting-input" required value="${controlsData.otherGender || ''}">
                        </div>
                        <div class="setting-group">
                            <label class="setting-label">Time Delay after opening the app (seconds)</label>
                            <input type="number" id="ctrl_time_delay_app" class="setting-input" required value="${controlsData.timeDelayApp || ''}" placeholder="e.g. 150">
                        </div>
                        <div class="setting-group">
                            <label class="setting-label">Time Delay when user fills form (hours)</label>
                            <input type="number" id="ctrl_time_delay_form" class="setting-input" required value="${controlsData.timeDelayForm || ''}" placeholder="e.g. 2">
                        </div>
                    </div>
                    <button type="submit" class="save-btn" style="margin-top: 10px;" ${!genderApiUrl ? 'disabled title="Please configure connection URL"' : ''}>
                        <i class="fas fa-save"></i> Save Gender Settings
                    </button>
                </form>
            </div>

            <!-- Apps Script Setup Card -->
            <div class="control-card fade-in instruction-card" style="margin-bottom: 24px;">
                <h3><i class="fas fa-book-open"></i> Gender Selection Apps Script Setup Guide</h3>
                <p style="font-size: 13px; color: var(--dark-gray); margin-bottom: 12px; line-height: 1.5;">
                    To enable modifying Gender selection values, host this script:
                </p>
                <ol class="setup-steps">
                    <li>Open your **Gender Selection Spreadsheet**.</li>
                    <li>Go to <strong>Extensions</strong> &gt; <strong>Apps Script</strong>.</li>
                    <li>Delete any code in the editor, and paste the code snippet below.</li>
                    <li>Click the save icon (💾).</li>
                    <li>Click <strong>Deploy</strong> &gt; <strong>New deployment</strong>.</li>
                    <li>Set Web App configurations exactly as described in the Notification setup tab.</li>
                    <li>Copy the Web App URL and paste it into the <strong>Connection Settings</strong> above.</li>
                </ol>
                
                <div style="margin-top: 16px;">
                    <label class="setting-label">Copy Apps Script Code:</label>
                    <div class="code-container">
                        <pre id="genderScriptSnippet"><code>function doPost(e) {
  var data = JSON.parse(e.postData.contents);
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
  
  sheet.getRange("B2").setValue(data.totalNames);
  sheet.getRange("B3").setValue(data.sameGender);
  sheet.getRange("B4").setValue(data.otherGender);
  sheet.getRange("B5").setValue(data.timeDelayApp);
  sheet.getRange("B6").setValue(data.timeDelayForm);
  
  return ContentService.createTextOutput(JSON.stringify({status: "success"}))
    .setMimeType(ContentService.MimeType.JSON);
}</code></pre>
                        <button class="copy-code-btn" onclick="AdminApp.copyCode('genderScriptSnippet')"><i class="fas fa-copy"></i> Copy Code</button>
                    </div>
                </div>
            </div>
        `;
    }

    // Render Modal Structure for Notifications (hidden by default)
    html += `
        <div class="modal-overlay" id="notificationDetailsModal">
            <div class="modal-content">
                <div class="modal-header">
                    <h2 id="notifModalTitle"><i class="fas fa-bell"></i> New Notification</h2>
                    <button class="modal-close" onclick="AdminApp.closeNotificationModal()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <form id="notifForm" onsubmit="AdminApp.submitNotification(event)">
                        <input type="hidden" id="notif_index" value="">
                        
                        <div class="setting-group">
                            <label class="setting-label">Heading</label>
                            <input type="text" id="modal_notif_heading" class="setting-input" required placeholder="e.g. Mid-Term Schedule">
                        </div>
                        <div class="setting-group">
                            <label class="setting-label">Short Description</label>
                            <input type="text" id="modal_notif_desc" class="setting-input" required placeholder="e.g. All papers updated for June 2026">
                        </div>
                        <div class="setting-group">
                            <label class="setting-label">Detail</label>
                            <textarea id="modal_notif_detail" class="setting-textarea" required placeholder="Describe the notification details..."></textarea>
                        </div>
                        <div class="setting-group">
                            <label class="setting-label">Link (Optional)</label>
                            <input type="url" id="modal_notif_link" class="setting-input" placeholder="https://...">
                        </div>
                        
                        <div style="display:flex; justify-content:flex-end; gap:12px; margin-top:20px;">
                            <button type="button" class="save-btn" onclick="AdminApp.closeNotificationModal()" style="background:#888;">Cancel</button>
                            <button type="submit" id="notifModalSubmitBtn" class="save-btn">Save Notification</button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    `;

    mainContent.innerHTML = html;

    AdminApp.breadcrumbPath = [];
    AdminApp.updateBreadcrumb([{ name: 'Control Hub', onClick: () => AdminApp.renderControlPage() }]);
    AdminApp.updateFilters('control');
};

// Switch Tabs
AdminApp.switchControlTab = function(tab) {
    AdminApp.activeControlTab = tab;
    AdminApp.renderControlPage();
};

// Fetch notifications fallback using read-only published CSV
AdminApp.fetchNotificationsFromCSV = async function() {
    try {
        const res = await fetch(ADMIN_CONFIG.SHEETS.NOTIFICATIONS);
        const csv = await res.text();
        const lines = csv.trim().split('\n');
        const list = [];
        
        // Loop starting from 1 (skipping header column)
        for (let i = 1; i < lines.length; i++) {
            const values = AdminApp.parseCSVLine(lines[i]);
            if (values.length < 3) continue;
            list.push({
                index: i,
                heading: values[0] || '',
                short_description: values[1] || '',
                detail: values[2] || '',
                link: values[3] || '',
                updated: values[4] || ''
            });
        }
        return list;
    } catch (e) {
        console.error('Error fallback loading notification CSV:', e);
        return [];
    }
};

// Open Notification Details modal (used for Create and Edit)
AdminApp.openNotificationModal = function(item = null) {
    const modal = document.getElementById('notificationDetailsModal');
    const title = document.getElementById('notifModalTitle');
    const submitBtn = document.getElementById('notifModalSubmitBtn');
    
    // Clear inputs
    document.getElementById('notif_index').value = item ? item.index : '';
    document.getElementById('modal_notif_heading').value = item ? item.heading : '';
    document.getElementById('modal_notif_desc').value = item ? item.short_description : '';
    document.getElementById('modal_notif_detail').value = item ? item.detail : '';
    document.getElementById('modal_notif_link').value = item ? item.link : '';
    
    if (item) {
        title.innerHTML = '<i class="fas fa-edit"></i> Edit Notification';
        submitBtn.textContent = 'Update Notification';
    } else {
        title.innerHTML = '<i class="fas fa-plus"></i> Create Notification';
        submitBtn.textContent = 'Publish Notification';
    }
    
    modal.classList.add('active');
};

// Close Notification Modal
AdminApp.closeNotificationModal = function() {
    document.getElementById('notificationDetailsModal').classList.remove('active');
};

// Submit Create or Edit Notifications to Apps Script
AdminApp.submitNotification = async function(event) {
    event.preventDefault();
    const apiUrl = localStorage.getItem(ADMIN_CONFIG.STORAGE_KEYS.NOTIF_API_URL);
    if (!apiUrl) {
        AdminApp.showToast('Notification Script URL is not set!');
        return;
    }

    const saveBtn = document.getElementById('notifModalSubmitBtn');
    const originalText = saveBtn.innerHTML;
    saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
    saveBtn.disabled = true;

    const index = document.getElementById('notif_index').value.trim();
    const heading = document.getElementById('modal_notif_heading').value.trim();
    const desc = document.getElementById('modal_notif_desc').value.trim();
    const detail = document.getElementById('modal_notif_detail').value.trim();
    const link = document.getElementById('modal_notif_link').value.trim();

    // Automatically format Date-Time (DD/MM/YYYY HH:MM:SS)
    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = now.getFullYear();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    const currentDateTimeStr = `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;

    const action = index !== '' ? 'update' : 'create';
    const payload = {
        action: action,
        index: index,
        heading: heading,
        short_description: desc,
        detail: detail,
        link: link,
        updated: currentDateTimeStr
    };

    try {
        await fetch(apiUrl, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'text/plain' }, // Avoid triggering CORS preflight block
            body: JSON.stringify(payload)
        });

        AdminApp.showToast(action === 'update' ? 'Notification updated!' : 'Notification created!');
        AdminApp.closeNotificationModal();
        setTimeout(() => AdminApp.renderControlPage(), 1000);
    } catch (err) {
        console.error('Error dispatching notification CRUD action:', err);
        AdminApp.showToast('Request dispatched!');
        AdminApp.closeNotificationModal();
        setTimeout(() => AdminApp.renderControlPage(), 1000);
    } finally {
        saveBtn.innerHTML = originalText;
        saveBtn.disabled = false;
    }
};

// Delete Notification
AdminApp.deleteNotification = async function(index) {
    if (!confirm('Are you sure you want to delete this notification?')) return;
    
    const apiUrl = localStorage.getItem(ADMIN_CONFIG.STORAGE_KEYS.NOTIF_API_URL);
    if (!apiUrl) {
        AdminApp.showToast('Notification Script URL is not set!');
        return;
    }

    AdminApp.showToast('Deleting notification...');
    
    const payload = {
        action: 'delete',
        index: index
    };

    try {
        await fetch(apiUrl, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'text/plain' },
            body: JSON.stringify(payload)
        });

        AdminApp.showToast('Notification deleted!');
        setTimeout(() => AdminApp.renderControlPage(), 1000);
    } catch (err) {
        console.error('Error deleting notification:', err);
        AdminApp.showToast('Delete request dispatched!');
        setTimeout(() => AdminApp.renderControlPage(), 1000);
    }
};

// Parse Controls CSV data: Key-value formatting
AdminApp.parseControlsCSV = function(csv) {
    const lines = csv.trim().split('\n');
    const controls = {
        totalNames: '',
        sameGender: '',
        otherGender: '',
        timeDelayApp: '',
        timeDelayForm: ''
    };

    lines.forEach(line => {
        const parts = AdminApp.parseCSVLine(line);
        if (parts.length < 2) return;

        const key = parts[0].toLowerCase();
        const value = parts[1];

        if (key.includes('total names diplay')) {
            controls.totalNames = value;
        } else if (key.includes('same gender')) {
            controls.sameGender = value;
        } else if (key.includes('other gender')) {
            controls.otherGender = value;
        } else if (key.includes('delay after opening')) {
            controls.timeDelayApp = value.replace(/s$/i, '');
        } else if (key.includes('delay when user fill')) {
            controls.timeDelayForm = value.replace(/hours?$/i, '');
        }
    });

    return controls;
};

// Parse Notifications CSV data: Column formatted
AdminApp.parseNotificationsCSV = function(csv) {
    const lines = csv.trim().split('\n');
    const notif = { heading: '', short_description: '', detail: '', link: '', updated: '' };
    
    if (lines.length >= 2) {
        const values = AdminApp.parseCSVLine(lines[1]);
        notif.heading = values[0] || '';
        notif.short_description = values[1] || '';
        notif.detail = values[2] || '';
        notif.link = values[3] || '';
        notif.updated = values[4] || '';
    }
    return notif;
};

// Save URLs locally
AdminApp.saveGenderApiUrl = function() {
    const url = document.getElementById('gender_api_url_input').value.trim();
    localStorage.setItem(ADMIN_CONFIG.STORAGE_KEYS.GENDER_API_URL, url);
    AdminApp.showToast('Gender Script URL Saved!');
    AdminApp.renderControlPage();
};

AdminApp.saveNotifApiUrl = function() {
    const url = document.getElementById('notif_api_url_input').value.trim();
    localStorage.setItem(ADMIN_CONFIG.STORAGE_KEYS.NOTIF_API_URL, url);
    AdminApp.showToast('Notification Script URL Saved!');
    AdminApp.renderControlPage();
};

// Send POST update to Google Apps Script Web App for Gender selection
AdminApp.saveGenderControls = async function(event) {
    event.preventDefault();
    const apiUrl = localStorage.getItem(ADMIN_CONFIG.STORAGE_KEYS.GENDER_API_URL);
    if (!apiUrl) {
        AdminApp.showToast('Gender API URL is not configured!');
        return;
    }

    const saveBtn = event.target.querySelector('button[type="submit"]');
    const originalText = saveBtn.innerHTML;
    saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
    saveBtn.disabled = true;

    // Retrieve input values and append required units
    const totalNames = document.getElementById('ctrl_total_names').value.trim();
    const sameGender = document.getElementById('ctrl_same_gender').value.trim();
    const otherGender = document.getElementById('ctrl_other_gender').value.trim();
    const timeDelayAppRaw = document.getElementById('ctrl_time_delay_app').value.trim();
    const timeDelayFormRaw = document.getElementById('ctrl_time_delay_form').value.trim();

    const timeDelayApp = timeDelayAppRaw + 's';
    const timeDelayForm = timeDelayFormRaw + 'hour';

    const payload = {
        totalNames: totalNames,
        sameGender: sameGender,
        otherGender: otherGender,
        timeDelayApp: timeDelayApp,
        timeDelayForm: timeDelayForm
    };

    try {
        await fetch(apiUrl, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'text/plain' },
            body: JSON.stringify(payload)
        });

        AdminApp.showToast('Gender control settings updated!');
    } catch (err) {
        console.error('Error saving controls:', err);
        AdminApp.showToast('Update request dispatched!');
    } finally {
        saveBtn.innerHTML = originalText;
        saveBtn.disabled = false;
        setTimeout(() => AdminApp.renderControlPage(), 1500);
    }
};

// Copy Apps Script code
AdminApp.copyCode = function(elementId) {
    const code = document.getElementById(elementId).innerText;
    navigator.clipboard.writeText(code).then(() => {
        AdminApp.showToast('Code copied!');
    }).catch(err => {
        console.error('Copy failed:', err);
        AdminApp.showToast('Copy failed, please copy manually');
    });
};
