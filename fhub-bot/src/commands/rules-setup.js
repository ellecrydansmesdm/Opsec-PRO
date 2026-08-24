const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('rules-setup')
    .setDescription('Déploie le règlement officiel avec bouton d’acceptation')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setTitle('📜 RÈGLEMENT DU SERVEUR — FHUB')
      .setDescription(
        'Bienvenue sur le serveur officiel **FHUB** ! Afin de garantir une communauté saine et respectueuse, merci de prendre connaissance des règles ci-dessous :\n\n' +
        '**1. Respect & Courtoisie**\n' +
        '• Les insultes, le harcèlement, les propos discriminatoires ou haineux sont strictement interdits.\n\n' +
        '**2. Aucun Spam / Publicité non autorisée**\n' +
        '• Les spams de messages, mentions abusives et pubs en MP sont sanctionnés par un bannissement immédiat.\n\n' +
        '**3. Sécurité & Confidentialité**\n' +
        '• Ne partagez jamais vos tokens Discord, mots de passe ou informations sensibles.\n\n' +
        '**4. Support & Tickets**\n' +
        '• Pour tout achat ou question sur nos logiciels (dont **Opsec PRO**), ouvrez un ticket dans le salon dédié.\n\n' +
        '👉 **Cliquez sur le bouton ci-dessous pour accepter le règlement et débloquer l’accès complet au serveur.**'
      )
      .setColor('#62ff41')
      .setFooter({ text: 'FHUB System • Règlement Communautaire', iconURL: interaction.guild.iconURL() })
      .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('rules_accept')
        .setLabel('J’accepte le règlement')
        .setEmoji('✅')
        .setStyle(ButtonStyle.Success)
    );

    await interaction.channel.send({ embeds: [embed], components: [row] });
    await interaction.reply({ content: '✅ Message de règlement déployé avec succès !', ephemeral: true });
  }
};
