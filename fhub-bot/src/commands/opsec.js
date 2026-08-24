const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('opsec')
    .setDescription('Affiche les informations officielles, fonctionnalités et lien d’achat de Opsec PRO'),

  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setTitle('🛰️ OPSEC PRO — SUITE D’AUTOMATISATION & PROTECTION')
      .setDescription(
        '**Opsec PRO** est la suite logicielle desktop la plus avancée pour Discord (Windows x64).\n\n' +
        '### ⚡ Fonctionnalités Incluses :\n' +
        '• **Token Vault & Multi-Accounts** : Chiffrement matériel DPAPI et rotation de statuts.\n' +
        '• **Snipers Ultra-Rapides** : Pomelo (pseudos uniques) & Vanity URLs.\n' +
        '• **Fermes 24/7 & Vocal Hopper** : Automatisation discrète avec protection de jitter.\n' +
        '• **Moteur Sentinel & Anti-Raid** : Surveillance active de groupes et protection de tokens.\n' +
        '• **Server Cloner & Backups** : Sauvegarde JSON et reconstruction totale de serveurs.\n' +
        '• **In-Chat Stealth Dispatcher** : Commandes in-chat invisibles sans traces.\n\n' +
        '💰 **Tarif Unique :** `5,00 €` (Accès Lifetime à Vie)\n' +
        '🌐 **Site Officiel :** [fhubdev.vercel.app/#security](https://fhubdev.vercel.app/#security)'
      )
      .setColor('#00d2ff')
      .setThumbnail('https://cdn.discordapp.com/icons/1341071221160378368/a_custom.png')
      .setFooter({ text: 'FHUB Software • Opsec PRO v2.0.2', iconURL: interaction.guild.iconURL() })
      .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setLabel('Acheter via PayPal (5€)')
        .setURL('https://paypal.me/mecsuperstyle/5EUR')
        .setStyle(ButtonStyle.Link),
      new ButtonBuilder()
        .setLabel('Site Officiel FHUB')
        .setURL('https://fhubdev.vercel.app/#security')
        .setStyle(ButtonStyle.Link),
      new ButtonBuilder()
        .setLabel('Télécharger (.exe)')
        .setURL('https://github.com/ellecrydansmesdm/Opsec-PRO/releases/tag/v2.0.2')
        .setStyle(ButtonStyle.Link)
    );

    await interaction.reply({ embeds: [embed], components: [row] });
  }
};
