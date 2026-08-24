const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = async function handleHoneypot(message) {
  // Ignorer les messages du bot lui-même
  if (message.author.bot) return;

  const honeypotChannelId = process.env.HONEYPOT_CHANNEL_ID || '1541136837353938975';
  if (message.channel.id !== honeypotChannelId) return;

  const guild = message.guild;
  const member = message.member;
  const author = message.author;
  const staffRoleId = process.env.STAFF_ROLE_ID;

  // Ignorer si c'est un membre du Staff ou un Administrateur
  if (member) {
    if (member.permissions.has(PermissionFlagsBits.Administrator) || 
        member.permissions.has(PermissionFlagsBits.ManageGuild) ||
        (staffRoleId && member.roles.cache.has(staffRoleId))) {
      return;
    }
  }

  const contentSnippet = message.content ? (message.content.length > 200 ? message.content.slice(0, 197) + '...' : message.content) : '*[Aucun texte / Média]*';

  // 1. Suppression immédiate du message de spam
  await message.delete().catch(() => null);

  // 2. Bannissement du spam bot / raid bot avec purge des messages des dernières 24h
  try {
    await guild.members.ban(author.id, {
      deleteMessageSeconds: 86400, // Supprime tous les messages des 24h sur tout le serveur
      reason: '🍯 Honeypot Triggered — Auto-Ban Spam Bot (FHUB Security)'
    });
    console.log(`[Honeypot] 🚨 Spam bot banni : ${author.tag} (${author.id})`);
  } catch (err) {
    console.error(`[Honeypot] Échec du ban de ${author.tag}:`, err.message);
  }

  // 3. Envoi du log de sécurité dans #moderation-logs
  const modLogsChannelId = process.env.MOD_LOGS_CHANNEL_ID || '1541136848674627654';
  const modLogsChannel = guild.channels.cache.get(modLogsChannelId);

  if (modLogsChannel) {
    const alertEmbed = new EmbedBuilder()
      .setTitle('🍯 ALERTE HONEYPOT — SPAM BOT NEUTRALISÉ')
      .setDescription(`Un compte a posté dans le salon piège et a été **banni instantanément** avec purge complète de ses messages.`)
      .addFields(
        { name: 'Utilisateur Banni', value: `${author.tag} (\`${author.id}\` | <@${author.id}>)`, inline: true },
        { name: 'Création du Compte', value: `<t:${Math.floor(author.createdTimestamp / 1000)}:R>`, inline: true },
        { name: 'Message Capturé', value: `\`\`\`${contentSnippet}\`\`\`` }
      )
      .setColor('#ff4444')
      .setFooter({ text: 'FHUB Honeypot Defense System', iconURL: guild.iconURL() })
      .setTimestamp();

    await modLogsChannel.send({ embeds: [alertEmbed] }).catch(() => null);
  }
};
