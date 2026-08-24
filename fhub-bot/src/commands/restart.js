const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('restart')
    .setDescription('Redémarre le bot FHUB Core (Administrateurs)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    await interaction.reply({ content: '🔄 Redémarrage du bot en cours...', ephemeral: true });
    console.log('🔄 Restart command received, exiting process to let container restart...');
    setTimeout(() => {
      process.exit(0);
    }, 1000);
  }
};
