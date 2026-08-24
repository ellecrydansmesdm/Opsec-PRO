const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ticket-setup')
    .setDescription('Déploie le panel d’ouverture de tickets dans le salon')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setTitle('🎫 CENTRE DE SUPPORT & VENTES — FHUB')
      .setDescription(
        'Bienvenue dans le centre d’assistance de **FHUB**.\n\n' +
        'Pour contacter l’équipe, acheter une licence **Opsec PRO** ou poser une question, cliquez sur le bouton correspondant ci-dessous :\n\n' +
        '🛒 **Support Opsec PRO & Achat (5€ Lifetime)**\n' +
        '⚙️ **Assistance Technique & Projets FHUB**\n' +
        '🤝 **Partenariat & Demandes Diverses**\n\n' +
        '*(Un salon privé sera automatiquement généré pour vous)*'
      )
      .setColor('#00d2ff')
      .setThumbnail('https://cdn.discordapp.com/icons/1341071221160378368/a_custom.png')
      .setFooter({ text: 'FHUB System • Sécurité & Automatisation', iconURL: interaction.guild.iconURL() })
      .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('ticket_opsec')
        .setLabel('Acheter / Support Opsec')
        .setEmoji('🛒')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId('ticket_support')
        .setLabel('Support Technique')
        .setEmoji('⚙️')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('ticket_other')
        .setLabel('Autre Demande')
        .setEmoji('📩')
        .setStyle(ButtonStyle.Secondary)
    );

    await interaction.channel.send({ embeds: [embed], components: [row] });
    await interaction.reply({ content: '✅ Panel de tickets envoyé avec succès !', ephemeral: true });
  }
};
