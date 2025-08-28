module.exports = {
  // Discord Bot Configuration
  TOKEN: 'MTQxMDUwNjY5NjUwOTM2MjIxOA.GTWmps.YdudefDozPCKHMItLkMs46VwfRghnBqzfj5_bc', // Your Discord bot token
  CLIENT_ID: '1410506696509362218', // Your bot's client ID
  SERVER_ID: '1057482716305702942', // The server ID where the bot operates
  ALLOWED_USER_ID: '1050650914626740354', // User ID allowed to use the bot commands
  
  // File Configuration
  AD_FILE: './ad.txt', // Path to the advertisement message file
  DMED_FILE: './dmed.json', // Path to store successfully DMed users
  FAILED_DMED_FILE: './failed.json', // Path to store failed DM attempts
  
  // DM Configuration
  DM_DELAY: 10, // Delay between DMs in seconds (minimum recommended: 2)
  
  // Webhook Configuration
  WEBHOOKS: {
    ENABLED: true, // Set to false to disable all webhook functionality
    
    // Log Webhook - For general logging (DM success/failure, milestones)
    LOG_WEBHOOK_URL: 'https://discord.com/api/webhooks/1410444046526320650/Aauc2CB1N_zehNne5LpXFG_ZVMNV4vvWD4GmXuMyv4FIogQikpSzmwmiNofiXcT_F132',
    
    // Status Webhook - For status updates and statistics
    STATUS_WEBHOOK_URL: 'https://discord.com/api/webhooks/1410444046526320650/Aauc2CB1N_zehNne5LpXFG_ZVMNV4vvWD4GmXuMyv4FIogQikpSzmwmiNofiXcT_F132',
    
    // Alert Webhook - For important alerts, errors, and notifications
    ALERT_WEBHOOK_URL: 'https://discord.com/api/webhooks/1410444046526320650/Aauc2CB1N_zehNne5LpXFG_ZVMNV4vvWD4GmXuMyv4FIogQikpSzmwmiNofiXcT_F132',
    
    // Webhook Settings
    SETTINGS: {
      // Send webhook notifications for these events
      LOG_DM_SUCCESS: true,        // Log each successful DM
      LOG_DM_FAILURE: true,        // Log each failed DM
      LOG_MILESTONES: true,        // Log milestone achievements (every 10 DMs)
      LOG_PROCESS_EVENTS: true,    // Log start/stop/complete events
      LOG_STATUS_UPDATES: false,   // Log status command usage (can be spammy)
      LOG_ERRORS: true,            // Log system errors
      LOG_STARTUP_SHUTDOWN: true,  // Log bot startup and shutdown
    }
  },
  
  // Advanced Configuration
  ADVANCED: {
    // Auto-status update interval in milliseconds (default: 30000 = 30 seconds)
    STATUS_UPDATE_INTERVAL: 30000,
    
    // Auto-status timeout in milliseconds (default: 600000 = 10 minutes)
    STATUS_AUTO_TIMEOUT: 600000,
    
    // Maximum members to process in a single batch (0 = unlimited)
    MAX_BATCH_SIZE: 0,
    
    // Enable debug logging
    DEBUG_MODE: false,
    
    // Retry failed webhooks (experimental)
    WEBHOOK_RETRY_ATTEMPTS: 3,
    WEBHOOK_RETRY_DELAY: 5000, // 5 seconds
  }
};