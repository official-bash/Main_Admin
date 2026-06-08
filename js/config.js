const ADMIN_CONFIG = {
    // Google Sheets Published CSV URLs
    SHEETS: {
        USERS: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSvot6xMc3FvT6zeO1LGOTb48fXUXc54Xm1kOszCh00KYl2RNzGNJr6s-HS8oTm3qFvinb0pjQbpNLT/pub?gid=173282646&single=true&output=csv',  // Users sheet CSV URL
        EXAMS: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQAKxuUcidPiW_Tj1HtGySIKmlbm86N4Eh_qDw7QhsvDzJ-aAHSysjPZcmPJwGYpFrvKglKFb_5TK_L/pub?gid=1731624938&single=true&output=csv'   // Exams sheet CSV URL (semester, date, exam)
    },
    
    // WhatsApp Settings
    WHATSAPP_COUNTRY_CODE: '92', // Pakistan default
    
    // Default Message Template
    DEFAULT_TEMPLATE: `Hi!

Hope you're doing well.

I hope the BASH Resource Hub is helping you with your exam preparation.

Could you please share the current {exam} exam paper? I'll upload it to the BASH Resource Hub to help students next semester.`,
    
    // Send to All Method: 'manual' or 'auto'
    SEND_ALL_METHOD: 'manual',
    
    // Auto-send delay in milliseconds (only if SEND_ALL_METHOD is 'auto')
    AUTO_SEND_DELAY: 2000,
    
    // LocalStorage Keys
    STORAGE_KEYS: {
        MESSAGE_LOG: 'bash_admin_message_log',
        SETTINGS: 'bash_admin_settings',
        TEMPLATE: 'bash_admin_template',
        CUSTOM_DATE: 'bash_admin_custom_date',
        USE_CURRENT_DATE: 'bash_admin_use_current_date',
        SEND_METHOD: 'bash_admin_send_method'
    }
};