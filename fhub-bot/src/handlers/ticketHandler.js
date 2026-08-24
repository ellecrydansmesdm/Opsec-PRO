const { ChannelType, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports = async function handleTicket(interaction) {
  const client = interaction.client;
  const customId = interaction.customId;
  const user = interaction.user;
  const guild = interaction.guild;

  // Safe polymorphic response helper
  async function sendResponse(content) {
    const payload = typeof content === 'string' ? { content, ephemeral: true } : { ...content, ephemeral: true };
    try {
      if (interaction.deferred || interaction.replied) {
        if (typeof interaction.editReply === 'function') {
          return await interaction.editReply(payload).catch(() => null);
        } else if (typeof interaction.followUp === 'function') {
          return await interaction.followUp(payload).catch(() => null);
        }
      }
      if (typeof interaction.reply === 'function') {
        return await interaction.reply(payload).catch(() => null);
      }
    } catch (e) {
      console.error('[Ticket] Erreur sendResponse:', e);
    }
  }

  // Defer early if available to avoid 3s Discord interaction timeout
  if (typeof interaction.deferReply === 'function' && !interaction.deferred && !interaction.replied) {
    await interaction.deferReply({ ephemeral: true }).catch(() => null);
  }

  // 1. FERMETURE D'UN TICKET
  if (customId === 'ticket_close') {
    const embedClose = new EmbedBuilder()
      .setTitle('CLÔTURE DU TICKET')
      .setDescription(`Ce ticket a été fermé par **${user.tag}**.\nLe salon sera automatiquement supprimé dans 5 secondes...`)
      .setColor(0x2b2d31)
      .setTimestamp();

    await sendResponse({ embeds: [embedClose] });

    // Envoi des logs
    const logsChannelId = process.env.LOGS_CHANNEL_ID;
    if (logsChannelId) {
      const logsChannel = guild.channels.cache.get(logsChannelId);
      if (logsChannel) {
        const logEmbed = new EmbedBuilder()
          .setTitle('TICKET FERME')
          .addFields(
            { name: 'Salon', value: `\`${interaction.channel.name}\``, inline: true },
            { name: 'Fermé par', value: `${user.tag} (<@${user.id}>)`, inline: true },
            { name: 'Date', value: `<t:${Math.floor(Date.now() / 1000)}:F>` }
          )
          .setColor(0x2b2d31);
        await logsChannel.send({ embeds: [logEmbed] }).catch(() => null);
      }
    }

    setTimeout(async () => {
      await interaction.channel.delete().catch(() => null);
    }, 5000);
    return;
  }

  // 2. CRÉATION D'UN NOUVEAU TICKET
  let categoryTitle = 'Assistance Generale';
  let ticketPrefix = 'ticket';
  let welcomeDesc = 'Un membre de l\'équipe va prendre en charge votre demande dans les plus brefs délais.';

  if (customId === 'ticket_buy_opsec' || customId === 'ticket_opsec') {
    categoryTitle = 'Achat Opsec PRO';
    ticketPrefix = 'achat-opsec';
    welcomeDesc = 
      `Bienvenue dans votre salon de commande **Opsec PRO**.\n\n` +
      `• **Tarif Lifetime :** \`5,00 €\` (Paiement unique • Accès à vie sans abonnement)\n\n` +
      `**Moyens de paiement acceptés :**\n` +
      `• **PayPal (5,00 €)** : [paypal.me/mecsuperstyle/5EUR](https://paypal.me/mecsuperstyle/5EUR) *(Sélectionner impérativement « Envoi entre proches »)*\n` +
      `• **Crypto (5,00 €)** : LTC / USDT (TRC-20) / BTC (Adresses fournies sur demande dans ce salon)\n\n` +
      `**Procédure :**\n` +
      `1. Effectuez le règlement de **5,00 €** via le lien ci-dessus.\n` +
      `2. Envoyez la capture d'écran ou l'identifiant de transaction dans ce salon.\n` +
      `3. Votre clé d'activation **Lifetime** et votre rôle **Client** vous seront délivrés instantanément.`;
  } else if (customId === 'ticket_fcord_support' || customId === 'ticket_fcord') {
    categoryTitle = 'Support FCord';
    ticketPrefix = 'fcord';
    welcomeDesc = 
      `Bienvenue dans le salon de support **FCord**.\n\n` +
      `Merci de préciser :\n` +
      `• Votre système d'exploitation\n` +
      `• La version de Discord utilisée\n` +
      `• La description précise du problème rencontré.`;
  } else if (customId === 'ticket_opsec_support') {
    categoryTitle = 'Support Opsec PRO';
    ticketPrefix = 'opsec-help';
    welcomeDesc = 
      `Bienvenue dans le support **Opsec PRO**.\n\n` +
      `Veuillez indiquer votre clé de licence et le module concerné.`;
  } else {
    categoryTitle = 'Assistance';
    ticketPrefix = 'ticket';
    welcomeDesc = `Bienvenue. Posez votre question ou détaillez votre demande ci-dessous.`;
  }

  // Vérifier si l'utilisateur a déjà un salon ticket ouvert
  const cleanUsername = user.username.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 8) || 'user';
  const existingChannel = guild.channels.cache.find(
    c => c.name && c.name.startsWith(`${ticketPrefix}-${cleanUsername}`)
  );

  if (existingChannel) {
    return sendResponse(`Vous avez déjà un ticket ouvert dans le salon <#${existingChannel.id}>.`);
  }

  // Récupération de la catégorie et des rôles
  const categoryId = process.env.TICKET_CATEGORY_ID || '1541136574429925577';
  const staffRoleId = process.env.STAFF_ROLE_ID || '1541136441462100135';

  const permissionOverwrites = [
    {
      id: guild.roles.everyone.id,
      deny: [PermissionFlagsBits.ViewChannel]
    },
    {
      id: user.id,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ReadMessageHistory,
        PermissionFlagsBits.AttachFiles,
        PermissionFlagsBits.EmbedLinks
      ]
    },
    {
      id: client.user.id,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ManageChannels,
        PermissionFlagsBits.EmbedLinks
      ]
    }
  ];

  if (staffRoleId && guild.roles.cache.has(staffRoleId)) {
    permissionOverwrites.push({
      id: staffRoleId,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ReadMessageHistory,
        PermissionFlagsBits.AttachFiles
      ]
    });
  }

  try {
    const channelName = `${ticketPrefix}-${cleanUsername}`;
    const targetParent = (categoryId && (guild.channels.cache.has(categoryId) || await guild.channels.fetch(categoryId).catch(() => null))) ? categoryId : null;

    const ticketChannel = await guild.channels.create({
      name: channelName,
      type: ChannelType.GuildText,
      parent: targetParent,
      permissionOverwrites,
      topic: `Ticket de ${user.tag} (${user.id}) | ${categoryTitle}`
    });

    // Embed d'accueil
    const welcomeEmbed = new EmbedBuilder()
      .setTitle(categoryTitle.toUpperCase())
      .setDescription(
        `Bonjour <@${user.id}>,\n\n` +
        `${welcomeDesc}\n\n` +
        `Pour fermer ce ticket, cliquez sur le bouton ci-dessous.`
      )
      .setColor(0x2b2d31)
      .setFooter({ text: 'FHub Support' })
      .setTimestamp();

    const closeRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('ticket_close')
        .setLabel('Fermer le Ticket')
        .setStyle(ButtonStyle.Danger)
    );

    await ticketChannel.send({
      content: `<@${user.id}> ${staffRoleId ? `<@&${staffRoleId}>` : ''}`,
      embeds: [welcomeEmbed],
      components: [closeRow]
    });

    // Envoi des logs
    const logsChannelId = process.env.LOGS_CHANNEL_ID;
    if (logsChannelId) {
      const logsChannel = guild.channels.cache.get(logsChannelId);
      if (logsChannel) {
        const logEmbed = new EmbedBuilder()
          .setTitle('NOUVEAU TICKET')
          .addFields(
            { name: 'Utilisateur', value: `${user.tag} (<@${user.id}>)`, inline: true },
            { name: 'Type', value: `\`${categoryTitle}\``, inline: true },
            { name: 'Salon', value: `<#${ticketChannel.id}>`, inline: true }
          )
          .setColor(0x2b2d31)
          .setTimestamp();
        await logsChannel.send({ embeds: [logEmbed] }).catch(() => null);
      }
    }

    return sendResponse(`Votre ticket a été ouvert dans <#${ticketChannel.id}>.`);
  } catch (err) {
    console.error('[Ticket] Erreur création salon:', err);
    return sendResponse('Une erreur est survenue lors de la création du ticket. Veuillez réessayer ou contacter un administrateur.');
  }
};
