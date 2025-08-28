const { Client, GatewayIntentBits, ChannelType, SlashCommandBuilder, Routes, REST, WebhookClient } = require('discord.js');
const fs = require('fs');
const config = require('./config.js');
const { printBanner } = require('./utils/logger.js');
const { delay } = require('./utils/delay.js');

// Initialize the client
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildPresences,
    GatewayIntentBits.DirectMessages
  ]
});

// Initialize webhook clients if provided
let logWebhook = null;
let statusWebhook = null;
let alertWebhook = null;

if (config.WEBHOOKS.LOG_WEBHOOK_URL) {
  logWebhook = new WebhookClient({ url: config.WEBHOOKS.LOG_WEBHOOK_URL });
}
if (config.WEBHOOKS.STATUS_WEBHOOK_URL) {
  statusWebhook = new WebhookClient({ url: config.WEBHOOKS.STATUS_WEBHOOK_URL });
}
if (config.WEBHOOKS.ALERT_WEBHOOK_URL) {
  alertWebhook = new WebhookClient({ url: config.WEBHOOKS.ALERT_WEBHOOK_URL });
}

// Print the banner on startup
printBanner();

// Bot state variables
let dmedMembers = loadFile(config.DMED_FILE);
let failedDMs = loadFile(config.FAILED_DMED_FILE);
let isDMing = false;
let successCount = 0;
let activeStatusMessages = new Map(); // Track active auto-updating status messages

// Webhook helper functions
async function sendWebhookLog(type, data, webhook = logWebhook) {
  if (!webhook || !config.WEBHOOKS.ENABLED) return;
  
  try {
    const embed = createLogEmbed(type, data);
    await webhook.send({ embeds: [embed] });
  } catch (error) {
    console.error('❌ Webhook error:', error.message);
  }
}

function createLogEmbed(type, data) {
  const colors = {
    success: 0x00FF00,
    failure: 0xFF0000,
    info: 0x0099FF,
    warning: 0xFFAA00,
    milestone: 0x9932CC,
    start: 0x00FFFF,
    stop: 0xFF4500,
    complete: 0x32CD32
  };

  const icons = {
    success: '✅',
    failure: '❌',
    info: 'ℹ️',
    warning: '⚠️',
    milestone: '📈',
    start: '🚀',
    stop: '🛑',
    complete: '🎉'
  };

  let embed = {
    color: colors[type] || colors.info,
    timestamp: new Date(),
    footer: { text: 'DM Bot Logs' }
  };

  switch (type) {
    case 'success':
      embed.title = `${icons.success} DM Sent Successfully`;
      embed.fields = [
        { name: '👤 User', value: data.userTag, inline: true },
        { name: '🆔 User ID', value: data.userId, inline: true },
        { name: '📊 Progress', value: `${data.processed}/${data.total}`, inline: true },
        { name: '✅ Success Count', value: data.successCount.toString(), inline: true },
        { name: '⏰ Time', value: new Date().toLocaleTimeString(), inline: true }
      ];
      break;

    case 'failure':
      embed.title = `${icons.failure} DM Failed`;
      embed.fields = [
        { name: '👤 User', value: data.userTag, inline: true },
        { name: '🆔 User ID', value: data.userId, inline: true },
        { name: '📊 Progress', value: `${data.processed}/${data.total}`, inline: true },
        { name: '❌ Error', value: data.error.substring(0, 100), inline: false },
        { name: '⏰ Time', value: new Date().toLocaleTimeString(), inline: true }
      ];
      break;

    case 'start':
      embed.title = `${icons.start} DM Process Started`;
      embed.fields = [
        { name: '👥 Members to DM', value: data.totalMembers.toString(), inline: true },
        { name: '⏰ Started', value: new Date().toLocaleTimeString(), inline: true }
      ];
      break;

    case 'stop':
      embed.title = `${icons.stop} DM Process Stopped`;
      embed.fields = [
        { name: '📊 Processed', value: data.processed.toString(), inline: true },
        { name: '✅ Successful', value: data.successful.toString(), inline: true },
        { name: '⏰ Stopped', value: new Date().toLocaleTimeString(), inline: true }
      ];
      break;

    case 'complete':
      embed.title = `${icons.complete} DM Process Completed`;
      embed.fields = [
        { name: '📊 Total Processed', value: data.processed.toString(), inline: true },
        { name: '✅ Successful', value: data.successful.toString(), inline: true },
        { name: '❌ Failed', value: data.failed.toString(), inline: true },
        { name: '⏰ Completed', value: new Date().toLocaleTimeString(), inline: true }
      ];
      break;

    case 'milestone':
      embed.title = `${icons.milestone} Milestone Reached`;
      embed.fields = [
        { name: '📊 Progress', value: `${data.processed}/${data.total}`, inline: true },
        { name: '✅ Success Count', value: data.successCount.toString(), inline: true },
        { name: '⏰ Time', value: new Date().toLocaleTimeString(), inline: true }
      ];
      break;

    case 'info':
    case 'warning':
      embed.title = `${icons[type]} ${data.title || 'Information'}`;
      embed.description = data.message;
      break;
  }

  return embed;
}

// Enhanced console logging functions with webhook support
function logDMSuccess(member, processedCount, totalMembers, successCount) {
  console.log('\n┌─────────────────────────────────────────────────────────┐');
  console.log('│ ✅ DM Sent Successfully                                │');
  console.log('├─────────────────────────────────────────────────────────┤');
  console.log(`│ 👤 User        │ ${member.user.tag.padEnd(35)} │`);
  console.log(`│ 📊 Progress    │ ${`${processedCount}/${totalMembers}`.padEnd(35)} │`);
  console.log(`│ ✅ Success Count│ ${successCount.toString().padEnd(35)} │`);
  console.log(`│ 🆔 User ID     │ ${member.user.id.padEnd(35)} │`);
  console.log(`│ ⏰ Time        │ ${new Date().toLocaleTimeString().padEnd(35)} │`);
  console.log('└─────────────────────────────────────────────────────────┘');
  console.log(`${totalMembers - processedCount} remaining • Today at ${new Date().toLocaleTimeString()}`);
  
  // Send webhook log
  sendWebhookLog('success', {
    userTag: member.user.tag,
    userId: member.user.id,
    processed: processedCount,
    total: totalMembers,
    successCount
  });
}

function logDMFailure(member, processedCount, totalMembers, error) {
  console.log('\n┌─────────────────────────────────────────────────────────┐');
  console.log('│ ❌ DM Failed                                           │');
  console.log('├─────────────────────────────────────────────────────────┤');
  console.log(`│ 👤 User        │ ${member.user.tag.padEnd(35)} │`);
  console.log(`│ 📊 Progress    │ ${`${processedCount}/${totalMembers}`.padEnd(35)} │`);
  console.log(`│ ❌ Error       │ ${error.message.substring(0, 35).padEnd(35)} │`);
  console.log(`│ 🆔 User ID     │ ${member.user.id.padEnd(35)} │`);
  console.log(`│ ⏰ Time        │ ${new Date().toLocaleTimeString().padEnd(35)} │`);
  console.log('└─────────────────────────────────────────────────────────┘');
  console.log(`${totalMembers - processedCount} remaining • Today at ${new Date().toLocaleTimeString()}`);
  
  // Send webhook log
  sendWebhookLog('failure', {
    userTag: member.user.tag,
    userId: member.user.id,
    processed: processedCount,
    total: totalMembers,
    error: error.message
  });
}

function logProcessStart(totalMembers) {
  console.log('\n┌─────────────────────────────────────────────────────────┐');
  console.log('│ 🚀 DM Process Started                                  │');
  console.log('├─────────────────────────────────────────────────────────┤');
  console.log(`│ 👥 Members to DM  │ ${totalMembers.toString().padEnd(32)} │`);
  console.log(`│ ⏰ Started        │ ${new Date().toLocaleTimeString().padEnd(32)} │`);
  console.log('└─────────────────────────────────────────────────────────┘');
  
  // Send webhook log
  sendWebhookLog('start', { totalMembers });
}

function logProcessStopped(processedCount, successCount) {
  console.log('\n┌─────────────────────────────────────────────────────────┐');
  console.log('│ 🛑 DM Process Stopped                                  │');
  console.log('├─────────────────────────────────────────────────────────┤');
  console.log(`│ 📊 Processed      │ ${processedCount.toString().padEnd(32)} │`);
  console.log(`│ ✅ Successful     │ ${successCount.toString().padEnd(32)} │`);
  console.log(`│ ⏰ Stopped        │ ${new Date().toLocaleTimeString().padEnd(32)} │`);
  console.log('└─────────────────────────────────────────────────────────┘');
  
  // Send webhook log
  sendWebhookLog('stop', {
    processed: processedCount,
    successful: successCount
  });
}

function logProcessCompletion(processedCount, successCount, failedCount) {
  console.log('\n┌─────────────────────────────────────────────────────────┐');
  console.log('│ 🎉 DM Process Completed                                │');
  console.log('├─────────────────────────────────────────────────────────┤');
  console.log(`│ 📊 Total Processed │ ${processedCount.toString().padEnd(32)} │`);
  console.log(`│ ✅ Successful      │ ${successCount.toString().padEnd(32)} │`);
  console.log(`│ ❌ Failed          │ ${failedCount.toString().padEnd(32)} │`);
  console.log(`│ ⏰ Completed       │ ${new Date().toLocaleTimeString().padEnd(32)} │`);
  console.log('└─────────────────────────────────────────────────────────┘');
  
  // Send webhook log
  sendWebhookLog('complete', {
    processed: processedCount,
    successful: successCount,
    failed: failedCount
  });
}

function logMilestone(processedCount, totalMembers, successCount) {
  console.log('\n┌─────────────────────────────────────────────────────────┐');
  console.log('│ 📈 Milestone Reached                                   │');
  console.log('├─────────────────────────────────────────────────────────┤');
  console.log(`│ 📊 Progress       │ ${`${processedCount}/${totalMembers}`.padEnd(32)} │`);
  console.log(`│ ✅ Success Count  │ ${successCount.toString().padEnd(32)} │`);
  console.log(`│ ⏰ Time           │ ${new Date().toLocaleTimeString().padEnd(32)} │`);
  console.log('└─────────────────────────────────────────────────────────┘');
  
  // Send webhook log
  sendWebhookLog('milestone', {
    processed: processedCount,
    total: totalMembers,
    successCount
  });
}

// Helper functions
function loadFile(file) {
  try {
    return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf-8')) : [];
  } catch (error) {
    console.error(`Error loading file ${file}:`, error);
    return [];
  }
}

function saveFile(file, data) {
  try {
    fs.writeFileSync(file, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error(`Error saving file ${file}:`, error);
  }
}

// Helper function to get status data
async function getStatusData(guild) {
  const members = await guild.members.fetch();
  const totalMembers = members.filter(member => !member.user.bot).size;
  const dmedCount = dmedMembers.length;
  const failedCount = failedDMs.length;
  const pendingCount = Math.max(0, totalMembers - (dmedCount + failedCount));
  
  // Get online members count
  const onlineMembers = members.filter(member => {
    if (member.user.bot) return false;
    const status = member.presence?.status;
    return status && ['online', 'idle', 'dnd'].includes(status);
  }).size;
  
  return {
    totalMembers,
    dmedCount,
    failedCount,
    pendingCount,
    onlineMembers,
    isDMing,
    successCount
  };
}

// Helper function to create progress bar
function createProgressBar(percentage, length = 20) {
  const filled = Math.round((percentage / 100) * length);
  const empty = length - filled;
  return `${'█'.repeat(filled)}${'▒'.repeat(empty)} ${percentage}%`;
}

// Helper function to create status embed
function createStatusEmbed(statusData, guildName, isUpdate = false) {
  const {
    totalMembers,
    dmedCount,
    failedCount,
    pendingCount,
    onlineMembers,
    isDMing,
    successCount
  } = statusData;
  
  const progressPercentage = totalMembers > 0 ? 
    Math.round(((dmedCount + failedCount) / totalMembers) * 100) : 0;
  
  // Create progress bar
  const progressBar = createProgressBar(progressPercentage);
  
  return {
    color: isDMing ? 0xFFAA00 : 0x00FF00, // Orange if DMing, green if not
    title: `📊 Server Statistics ${isUpdate ? '(Auto-updating)' : ''}`,
    description: `**Progress: ${progressPercentage}%**\n${progressBar}`,
    fields: [
      { name: '🏠 Server', value: guildName, inline: true },
      { name: '👥 Total Members', value: totalMembers.toString(), inline: true },
      { name: '🟢 Online Now', value: onlineMembers.toString(), inline: true },
      { name: '✅ Successfully DMed', value: dmedCount.toString(), inline: true },
      { name: '❌ Failed DMs', value: failedCount.toString(), inline: true },
      { name: '⏳ Pending', value: pendingCount.toString(), inline: true },
      { name: '🔄 Currently DMing', value: isDMing ? '🟡 Yes' : '🔴 No', inline: true },
      { name: '📈 Session Success', value: successCount.toString(), inline: true },
      { name: '⏰ Last Updated', value: `<t:${Math.floor(Date.now() / 1000)}:R>`, inline: true }
    ],
    footer: {
      text: isUpdate ? 'Updates every 30 seconds • Auto-stops after 10 minutes' : 'Click button to enable auto-updates'
    },
    timestamp: new Date(),
  };
}

// Define slash commands
const commands = [
  new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Test bot connectivity'),
    
  new SlashCommandBuilder()
    .setName('help')
    .setDescription('Show all available commands'),
    
  new SlashCommandBuilder()
    .setName('status')
    .setDescription('Show server statistics and DM progress'),
    
  new SlashCommandBuilder()
    .setName('startdm')
    .setDescription('Start the mass DM process'),
    
  new SlashCommandBuilder()
    .setName('stop')
    .setDescription('Stop the current DM process'),
    
  new SlashCommandBuilder()
    .setName('adtext')
    .setDescription('Show the current advertisement message'),
        
  new SlashCommandBuilder()
    .setName('reset')
    .setDescription('Reset all DM records (clears DMed and failed lists)'),

  new SlashCommandBuilder()
    .setName('webhook')
    .setDescription('Test webhook connectivity and send a test message'),
];

// Function to register slash commands
async function registerSlashCommands() {
  const rest = new REST({ version: '10' }).setToken(config.TOKEN);
  
  try {
    console.log('🔄 Started refreshing application (/) commands.');
    
    // Register commands globally (takes up to 1 hour to appear)
    await rest.put(
      Routes.applicationCommands(config.CLIENT_ID),
      { body: commands.map(command => command.toJSON()) }
    );
    
    // Also register for specific guild (appears instantly for testing)
    if (config.SERVER_ID) {
      await rest.put(
        Routes.applicationGuildCommands(config.CLIENT_ID, config.SERVER_ID),
        { body: commands.map(command => command.toJSON()) }
      );
    }
    
    console.log('✅ Successfully reloaded application (/) commands.');
  } catch (error) {
    console.error('❌ Error registering slash commands:', error);
  }
}

// Bot ready event
client.once('ready', async () => {
  console.log('='.repeat(50));
  console.log(`✅ ${client.user.username} is online!`);
  console.log(`🤖 Bot ID: ${client.user.id}`);
  console.log(`👤 Allowed User ID: ${config.ALLOWED_USER_ID}`);
  console.log(`🏠 Servers: ${client.guilds.cache.size}`);
  console.log(`🪝 Webhooks Enabled: ${config.WEBHOOKS.ENABLED ? 'Yes' : 'No'}`);
  if (config.WEBHOOKS.ENABLED) {
    console.log(`📝 Log Webhook: ${logWebhook ? 'Connected' : 'Not configured'}`);
    console.log(`📊 Status Webhook: ${statusWebhook ? 'Connected' : 'Not configured'}`);
    console.log(`🚨 Alert Webhook: ${alertWebhook ? 'Connected' : 'Not configured'}`);
  }
  console.log('='.repeat(50));
  
  // Register slash commands
  await registerSlashCommands();

  // Send startup notification to webhook
  if (config.WEBHOOKS.ENABLED && alertWebhook) {
    sendWebhookLog('info', {
      title: 'Bot Started',
      message: `${client.user.username} is now online and ready!`
    }, alertWebhook);
  }
});

// Command handler functions
async function handleStatusCommand(interaction) {
  try {
    // Initial reply
    await interaction.deferReply();
    
    const guild = client.guilds.cache.get(config.SERVER_ID);
    if (!guild) throw new Error('Unable to find the guild.');

    // Create initial status embed
    const statusData = await getStatusData(guild);
    const statusEmbed = createStatusEmbed(statusData, guild.name);
    
    // Send status to webhook if enabled
    if (config.WEBHOOKS.ENABLED && statusWebhook) {
      await statusWebhook.send({ embeds: [statusEmbed] });
    }
    
    // Add auto-update controls
    const row = {
      type: 1, // ACTION_ROW
      components: [
        {
          type: 2, // BUTTON
          style: 1, // PRIMARY
          label: '🔄 Auto-Update (30s)',
          custom_id: 'toggle_auto_update'
        },
        {
          type: 2, // BUTTON
          style: 4, // DANGER
          label: '⏹️ Stop Updates',
          custom_id: 'stop_auto_update'
        }
      ]
    };
    
    const response = await interaction.editReply({ 
      embeds: [statusEmbed], 
      components: [row] 
    });
    
    // Start auto-updating
    const updateInterval = setInterval(async () => {
      try {
        if (!activeStatusMessages.has(response.id)) {
          clearInterval(updateInterval);
          return;
        }
        
        const newStatusData = await getStatusData(guild);
        const newStatusEmbed = createStatusEmbed(newStatusData, guild.name, true);
        
        await interaction.editReply({ 
          embeds: [newStatusEmbed], 
          components: [row] 
        });
        
        // Send updated status to webhook if enabled
        if (config.WEBHOOKS.ENABLED && statusWebhook) {
          await statusWebhook.send({ embeds: [newStatusEmbed] });
        }
      } catch (error) {
        console.error('❌ Error updating status:', error);
        clearInterval(updateInterval);
        activeStatusMessages.delete(response.id);
      }
    }, 30000); // Update every 30 seconds
    
    // Store the interval for this message
    activeStatusMessages.set(response.id, updateInterval);
    
    // Auto-cleanup after 10 minutes
    setTimeout(() => {
      if (activeStatusMessages.has(response.id)) {
        clearInterval(updateInterval);
        activeStatusMessages.delete(response.id);
      }
    }, 600000); // 10 minutes
    
  } catch (error) {
    throw new Error(`Error fetching status: ${error.message}`);
  }
}

async function handleStartDMCommand(interaction) {
  if (isDMing) {
    await interaction.reply({ 
      content: '⚠️ DMing process is already running!', 
      ephemeral: true 
    });
    return;
  }
  
  // Defer reply since this will take time
  await interaction.deferReply();
  
  isDMing = true;
  successCount = 0;
  
  try {
    const adMessage = fs.readFileSync(config.AD_FILE, 'utf-8');
    const guild = client.guilds.cache.get(config.SERVER_ID);
    
    if (!guild) {
      throw new Error('Unable to find the guild.');
    }
    
    const members = await guild.members.fetch();
    const membersToDM = members.filter(member => {
      const status = member.presence?.status;
      const isOnline = status && ['online', 'idle', 'dnd'].includes(status);
      const notBot = !member.user.bot;
      const notAlreadyDMed = !dmedMembers.includes(member.user.id);
      const notFailedBefore = !failedDMs.includes(member.user.id);
      
      return (isOnline || !member.presence) && notBot && notAlreadyDMed && notFailedBefore;
    });
    
    await interaction.editReply(`✅ Found ${membersToDM.size} members to DM. Starting process...`);
    
    // Start DM process
    await startDMProcess(membersToDM, adMessage, interaction);
    
  } catch (error) {
    isDMing = false;
    throw error;
  }
}

async function handleWebhookTestCommand(interaction) {
  await interaction.deferReply({ ephemeral: true });
  
  const webhookStatus = {
    log: logWebhook ? '✅ Connected' : '❌ Not configured',
    status: statusWebhook ? '✅ Connected' : '❌ Not configured',
    alert: alertWebhook ? '✅ Connected' : '❌ Not configured'
  };
  
  let testResults = [];
  
  // Test each webhook
  if (logWebhook) {
    try {
      await sendWebhookLog('info', {
        title: 'Webhook Test',
        message: 'Log webhook is working correctly!'
      });
      testResults.push('✅ Log webhook test successful');
    } catch (error) {
      testResults.push(`❌ Log webhook test failed: ${error.message}`);
    }
  }
  
  if (statusWebhook) {
    try {
      const guild = client.guilds.cache.get(config.SERVER_ID);
      if (guild) {
        const statusData = await getStatusData(guild);
        const statusEmbed = createStatusEmbed(statusData, guild.name);
        await statusWebhook.send({ 
          content: '📊 **Webhook Test - Status Update**',
          embeds: [statusEmbed] 
        });
        testResults.push('✅ Status webhook test successful');
      }
    } catch (error) {
      testResults.push(`❌ Status webhook test failed: ${error.message}`);
    }
  }
  
  if (alertWebhook) {
    try {
      await sendWebhookLog('warning', {
        title: 'Webhook Test',
        message: 'Alert webhook is working correctly!'
      }, alertWebhook);
      testResults.push('✅ Alert webhook test successful');
    } catch (error) {
      testResults.push(`❌ Alert webhook test failed: ${error.message}`);
    }
  }
  
  const responseEmbed = {
    color: 0x0099FF,
    title: '🪝 Webhook Status & Test Results',
    fields: [
      { name: '📝 Log Webhook', value: webhookStatus.log, inline: true },
      { name: '📊 Status Webhook', value: webhookStatus.status, inline: true },
      { name: '🚨 Alert Webhook', value: webhookStatus.alert, inline: true },
      { name: '🧪 Test Results', value: testResults.length > 0 ? testResults.join('\n') : 'No webhooks configured to test', inline: false }
    ],
    footer: { text: `Webhooks Enabled: ${config.WEBHOOKS.ENABLED ? 'Yes' : 'No'}` },
    timestamp: new Date()
  };
  
  await interaction.editReply({ embeds: [responseEmbed] });
}

async function handleAdTextCommand(interaction) {
  try {
    let adMessage = fs.readFileSync(config.AD_FILE, 'utf-8');
    
    // Truncate if too long
    if (adMessage.length > 1800) {
      adMessage = adMessage.substring(0, 1800) + '...';
    }
    
    await interaction.reply({
      content: `📝 **Current ad message:**\n\`\`\`\n${adMessage}\n\`\`\``,
      ephemeral: true
    });
  } catch (error) {
    throw new Error(`Error reading ad file: ${error.message}`);
  }
}

async function handleResetCommand(interaction) {
  try {
    dmedMembers = [];
    failedDMs = [];
    saveFile(config.DMED_FILE, dmedMembers);
    saveFile(config.FAILED_DMED_FILE, failedDMs);
    
    console.log('\n🔄 DM records reset by user command');
    
    // Send webhook notification
    sendWebhookLog('info', {
      title: 'Records Reset',
      message: 'All DM records have been cleared by user command.'
    });
    
    await interaction.reply('🔄 Reset completed. All DM records cleared.');
  } catch (error) {
    throw new Error(`Error during reset: ${error.message}`);
  }
}

// FIXED DM Process function - removes personalization completely
async function startDMProcess(membersToDM, adMessage, interaction) {
  let processedCount = 0;
  const totalMembers = membersToDM.size;
  
  await interaction.followUp(`🚀 DM process started! Processing ${totalMembers} members...`);
  logProcessStart(totalMembers);
  
  for (const [userId, member] of membersToDM) {
    if (!isDMing) {
      logProcessStopped(processedCount, successCount);
      break;
    }
    
    try {
      processedCount++;
      
      // Use the ad message directly without any personalization
      // This fixes the issue where your Discord name was being added
      const messageToSend = adMessage.trim();
      
      console.log(`📝 Sending message to ${member.displayName}: "${messageToSend.substring(0, 50)}..."`);
      
      // Send DM to member
      await member.send(messageToSend);
      
      // Add to successful DMs
      dmedMembers.push(member.user.id);
      successCount++;
      
      // Save progress
      saveFile(config.DMED_FILE, dmedMembers);
      
      // Enhanced CMD logging for success
      logDMSuccess(member, processedCount, totalMembers, successCount);
      
      // Log milestone every 10 successful DMs
      if (successCount % 10 === 0) {
        logMilestone(processedCount, totalMembers, successCount);
      }
      
    } catch (error) {
      // Add to failed DMs
      failedDMs.push(member.user.id);
      saveFile(config.FAILED_DMED_FILE, failedDMs);
      
      // Enhanced CMD logging for failure
      logDMFailure(member, processedCount, totalMembers, error);
    }
    
    // Rate limiting delay
    if (config.DM_DELAY) {
      await delay(config.DM_DELAY * 1000);
    } else {
      await delay(2000); // Default 2 second delay
    }
  }
  
  // Final completion notification with enhanced CMD logging
  isDMing = false;
  const finalFailedCount = failedDMs.length - (dmedMembers.length - successCount);
  logProcessCompletion(processedCount, successCount, finalFailedCount);
}

// Handle slash command interactions and button interactions
client.on('interactionCreate', async interaction => {
  // Handle slash commands
  if (interaction.isChatInputCommand()) {
    console.log(`📝 Slash command received: /${interaction.commandName} from ${interaction.user.tag}`);
    
    // Check if user is allowed
    if (interaction.user.id !== config.ALLOWED_USER_ID) {
      await interaction.reply({ 
        content: '❌ You are not authorized to use this bot.', 
        ephemeral: true 
      });
      return;
    }
    
    try {
      // Handle different commands
      switch (interaction.commandName) {
        case 'ping':
          await interaction.reply('🏓 Pong! Bot is working!');
          break;
          
        case 'help':
          const helpEmbed = {
            color: 0x0099FF,
            title: '🤖 Bot Commands',
            description: 'Available slash commands:',
            fields: [
              { name: '/ping', value: 'Test bot connectivity', inline: true },
              { name: '/help', value: 'Show this help message', inline: true },
              { name: '/status', value: 'Show server statistics (auto-updating)', inline: true },
              { name: '/startdm', value: 'Start mass DM process', inline: true },
              { name: '/stop', value: 'Stop DM process', inline: true },
              { name: '/adtext', value: 'Show current ad message', inline: true },
              { name: '/reset', value: 'Reset DM records', inline: true },
              { name: '/webhook', value: 'Test webhook connectivity', inline: true },
            ],
            timestamp: new Date(),
          };
          await interaction.reply({ embeds: [helpEmbed] });
          break;
          
        case 'status':
          await handleStatusCommand(interaction);
          break;
          
        case 'startdm':
          await handleStartDMCommand(interaction);
          break;
          
        case 'stop':
          isDMing = false;
          console.log('\n🛑 DM Process manually stopped by user command');
          
          // Send webhook notification
          sendWebhookLog('warning', {
            title: 'Process Stopped',
            message: 'DM process was manually stopped by user command.'
          });
          
          await interaction.reply('🛑 DMing process stopped.');
          break;
          
        case 'adtext':
          await handleAdTextCommand(interaction);
          break;
          
        case 'reset':
          await handleResetCommand(interaction);
          break;

        case 'webhook':
          await handleWebhookTestCommand(interaction);
          break;
          
        default:
          await interaction.reply({ 
            content: '❓ Unknown command.', 
            ephemeral: true 
          });
      }
    } catch (error) {
      console.error('❌ Error handling slash command:', error);
      
      // Send error to webhook
      if (config.WEBHOOKS.ENABLED && alertWebhook) {
        sendWebhookLog('failure', {
          userTag: interaction.user.tag,
          userId: interaction.user.id,
          processed: 0,
          total: 0,
          error: `Command error: ${error.message}`
        }, alertWebhook);
      }
      
      const errorMessage = `❌ An error occurred: ${error.message}`;
      
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({ content: errorMessage, ephemeral: true });
      } else {
        await interaction.reply({ content: errorMessage, ephemeral: true });
      }
    }
  }
  
  // Handle button interactions
  if (interaction.isButton()) {
    console.log(`🔘 Button pressed: ${interaction.customId} from ${interaction.user.tag}`);
    
    // Check if user is allowed
    if (interaction.user.id !== config.ALLOWED_USER_ID) {
      await interaction.reply({ 
        content: '❌ You are not authorized to use this bot.', 
        ephemeral: true 
      });
      return;
    }
    
    try {
      switch (interaction.customId) {
        case 'toggle_auto_update':
          await interaction.reply({ 
            content: '🔄 Auto-update is already active! Updates every 30 seconds.', 
            ephemeral: true 
          });
          break;
          
        case 'stop_auto_update':
          const messageId = interaction.message.id;
          if (activeStatusMessages.has(messageId)) {
            clearInterval(activeStatusMessages.get(messageId));
            activeStatusMessages.delete(messageId);
            
            // Remove buttons and update embed
            const guild = client.guilds.cache.get(config.SERVER_ID);
            const statusData = await getStatusData(guild);
            const finalEmbed = createStatusEmbed(statusData, guild.name, false);
            
            await interaction.update({ 
              embeds: [finalEmbed], 
              components: [] 
            });
            
            await interaction.followUp({ 
              content: '⏹️ Auto-updates stopped.', 
              ephemeral: true 
            });
          } else {
            await interaction.reply({ 
              content: '❌ No active auto-update found for this message.', 
              ephemeral: true 
            });
          }
          break;
      }
    } catch (error) {
      console.error('❌ Error handling button interaction:', error);
      await interaction.reply({ 
        content: `❌ An error occurred: ${error.message}`, 
        ephemeral: true 
      });
    }
  }
});

// Error handling
client.on('error', error => {
  console.error('❌ Discord client error:', error);
  
  // Send error to webhook
  if (config.WEBHOOKS.ENABLED && alertWebhook) {
    sendWebhookLog('failure', {
      userTag: 'System',
      userId: 'N/A',
      processed: 0,
      total: 0,
      error: `Discord client error: ${error.message}`
    }, alertWebhook);
  }
});

process.on('unhandledRejection', error => {
  console.error('❌ Unhandled promise rejection:', error);
  
  // Send error to webhook
  if (config.WEBHOOKS.ENABLED && alertWebhook) {
    sendWebhookLog('failure', {
      userTag: 'System',
      userId: 'N/A',
      processed: 0,
      total: 0,
      error: `Unhandled rejection: ${error.message}`
    }, alertWebhook);
  }
});

// Clean up intervals when bot shuts down
process.on('SIGINT', () => {
  console.log('🔄 Cleaning up auto-update intervals...');
  
  // Send shutdown notification
  if (config.WEBHOOKS.ENABLED && alertWebhook) {
    sendWebhookLog('warning', {
      title: 'Bot Shutdown',
      message: 'Bot is shutting down (SIGINT).'
    }, alertWebhook);
  }
  
  for (const [messageId, interval] of activeStatusMessages) {
    clearInterval(interval);
  }
  activeStatusMessages.clear();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('🔄 Cleaning up auto-update intervals...');
  
  // Send shutdown notification
  if (config.WEBHOOKS.ENABLED && alertWebhook) {
    sendWebhookLog('warning', {
      title: 'Bot Shutdown',
      message: 'Bot is shutting down (SIGTERM).'
    }, alertWebhook);
  }
  
  for (const [messageId, interval] of activeStatusMessages) {
    clearInterval(interval);
  }
  activeStatusMessages.clear();
  process.exit(0);
});

// Login
client.login(config.TOKEN).catch(error => {
  console.error('❌ Failed to login:', error);
  
  // Send error to webhook
  if (config.WEBHOOKS.ENABLED && alertWebhook) {
    sendWebhookLog('failure', {
      userTag: 'System',
      userId: 'N/A',
      processed: 0,
      total: 0,
      error: `Login failed: ${error.message}`
    }, alertWebhook);
  }
  
  process.exit(1);
});