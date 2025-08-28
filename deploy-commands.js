const { SlashCommandBuilder } = require('@discordjs/builders');
const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v9');
const config = require('./config.js'); // Import your config

// Create a list of slash commands to register
const commands = [
  new SlashCommandBuilder().setName('startdm').setDescription('Start sending DMs to users'),
  new SlashCommandBuilder().setName('stop').setDescription('Stop the DMing process'),
  new SlashCommandBuilder().setName('status').setDescription('Get the current DM progress'),
  new SlashCommandBuilder().setName('adtext').setDescription('View or update the ad message'),
  new SlashCommandBuilder().setName('togglegui').setDescription('Toggle GUI mode (optional)')
]
  .map(command => command.toJSON());

// Register slash commands with Discord
const rest = new REST({ version: '9' }).setToken(config.TOKEN);

(async () => {
  try {
    console.log('Started refreshing application (/) commands.');

    await rest.put(Routes.applicationGuildCommands(config.CLIENT_ID, config.SERVER_ID), {
      body: commands,
    });

    console.log('Successfully reloaded application (/) commands.');
  } catch (error) {
    console.error(error);
  }
})();
