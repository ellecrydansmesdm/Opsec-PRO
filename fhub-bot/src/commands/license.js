const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { getAvailableLifetimeKeys, getKeyInfo, resetKeyHWID } = require('../utils/firebase');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('license')
    .setDescription('Gestion des licences Opsec PRO (Staff uniquement)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(sub =>
      sub.setName('list')
        .setDescription('Affiche le stock de clés Lifetime disponibles')
    )
    .addSubcommand(sub =>
      sub.setName('give')
        .setDescription('Attribue une clé Lifetime à un membre en MP et lui donne le rôle client')
        .addUserOption(opt => opt.setName('membre').setDescription('Le membre à qui donner la clé').setRequired(true))
    )
    .addSubcommand(sub =>
      sub.setName('check')
        .setDescription('Vérifie les informations et le HWID d’une clé')
        .addStringOption(opt => opt.setName('cle').setDescription('La clé OPSEC-XXXX-XXXX-XXXX').setRequired(true))
    )
    .addSubcommand(sub =>
      sub.setName('reset')
        .setDescription('Réinitialise le HWID d’une clé client (changement de PC)')
        .addStringOption(opt => opt.setName('cle').setDescription('La clé OPSEC-XXXX-XXXX-XXXX').setRequired(true))
    ),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });
    const sub = interaction.options.getSubcommand();

    if (sub === 'list') {
      const keys = await getAvailableLifetimeKeys();
      const embed = new EmbedBuilder()
        .setTitle(`🔑 STOCK DE CLÉS OPSEC PRO LIFETIME (${keys.length} disponibles)`)
        .setDescription(
          keys.length > 0
            ? keys.slice(0, 15).map((k, i) => `\`${(i + 1).toString().padStart(2, '0')}.\` \`${k}\``).join('\n') +
              (keys.length > 15 ? `\n\n*... et ${keys.length - 15} autres clés en stock dans Firebase.*` : '')
            : '❌ Aucune clé Lifetime disponible en stock.'
        )
        .setColor('#00d2ff')
        .setFooter({ text: 'FHUB System • Base Firebase RTDB' });

      await interaction.editReply({ embeds: [embed] });
    }

    else if (sub === 'give') {
      const targetUser = interaction.options.getUser('membre');
      const targetMember = interaction.options.getMember('membre');
      const keys = await getAvailableLifetimeKeys();

      if (keys.length === 0) {
        return interaction.editReply({ content: '❌ Aucune clé Lifetime disponible dans la base de données.' });
      }

      const assignedKey = keys[0];

      try {
        // Envoi de la clé en message privé
        const dmEmbed = new EmbedBuilder()
          .setTitle('🎉 VOTRE LICENCE OPSEC PRO EST PRÊTE !')
          .setDescription(
            `Merci pour votre achat auprès de **FHUB** !\n\n` +
            `Voici votre clé d’activation **Lifetime (Accès à Vie)** :\n` +
            `\`\`\`\n${assignedKey}\n\`\`\`\n` +
            `**Instructions d’activation :**\n` +
            `1. Lancez **Opsec PRO** sur votre PC Windows.\n` +
            `2. Collez la clé ci-dessus dans le champ d'activation.\n` +
            `3. Cliquez sur **Activer la Licence**.\n\n` +
            `*Besoin d'aide ? N'hésitez pas à poser vos questions dans votre ticket.*`
          )
          .setColor('#62ff41')
          .setFooter({ text: 'FHUB Software • Support Opsec PRO' });

        await targetUser.send({ embeds: [dmEmbed] });

        // Attribution du rôle Client si configuré
        const customerRoleId = process.env.CUSTOMER_ROLE_ID;
        if (customerRoleId && targetMember) {
          await targetMember.roles.add(customerRoleId).catch(() => null);
        }

        await interaction.editReply({
          content: `✅ Clé \`${assignedKey}\` envoyée avec succès en message privé à **${targetUser.tag}** !`
        });

      } catch (err) {
        await interaction.editReply({
          content: `⚠️ Impossible d'envoyer un MP à ${targetUser.tag} (MP fermés). Voici sa clé : \`${assignedKey}\``
        });
      }
    }

    else if (sub === 'check') {
      const key = interaction.options.getString('cle').trim().toUpperCase();
      const info = await getKeyInfo(key);

      if (!info) {
        return interaction.editReply({ content: `❌ Clé \`${key}\` introuvable dans la base Firebase.` });
      }

      const embed = new EmbedBuilder()
        .setTitle(`🔍 INFOS LICENCE : ${key}`)
        .addFields(
          { name: 'Statut', value: `\`${info.status}\``, inline: true },
          { name: 'Durée', value: `\`${info.durationDays}\``, inline: true },
          { name: 'Créée le', value: info.createdAt ? `<t:${Math.floor(info.createdAt / 1000)}:R>` : 'Inconnu', inline: true },
          { name: 'HWID lié', value: info.hwid ? `\`${info.hwid.slice(0, 24)}...\`` : '🟢 *Vierge (non activée)*' }
        )
        .setColor(info.status === 'active' ? '#62ff41' : '#ff4444');

      await interaction.editReply({ embeds: [embed] });
    }

    else if (sub === 'reset') {
      const key = interaction.options.getString('cle').trim().toUpperCase();
      const ok = await resetKeyHWID(key);

      if (ok) {
        await interaction.editReply({ content: `✅ Le HWID de la clé \`${key}\` a été réinitialisé ! Le client peut maintenant réactiver son logiciel.` });
      } else {
        await interaction.editReply({ content: `❌ Impossible de réinitialiser la clé \`${key}\`.` });
      }
    }
  }
};
