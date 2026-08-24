require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { 
  Client, 
  GatewayIntentBits, 
  PermissionFlagsBits, 
  EmbedBuilder 
} = require('discord.js');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMembers
  ]
});

client.once('ready', async () => {
  console.log(`\n======================================================`);
  console.log(`🍯 CONFIGURATION DU HONEYPOT & NETTOYAGE DES LOGS`);
  console.log(`======================================================\n`);

  const guild = client.guilds.cache.first();
  if (!guild) {
    console.error('❌ Aucun serveur trouvé.');
    process.exit(1);
  }

  // 1. SUPPRESSION DES 10 SALONS DE LOGS SUPERFLUS
  console.log('🧹 [1/3] Suppression des salons de logs inutiles...');
  const uselessLogsChannels = [
    '1541136841086869655', // #ihorizon-logs
    '1541136844639576134', // #voice-logs
    '1541136852872855682', // #messages-logs
    '1541136858044432454', // #boost-logs
    '1541136862301786252', // #roles-logs
    '1541136869851529267', // #antispam-logs
    '1541136873848569906', // #channel-logs
    '1541136878890127412', // #confession-logs
    '1541136882669461524', // #economy-logs
    '1541136886435942460'  // #leav-logs
  ];

  for (const chId of uselessLogsChannels) {
    const ch = guild.channels.cache.get(chId);
    if (ch) {
      try {
        await ch.delete('Nettoyage salon de logs superflu');
        console.log(`  🗑️ Supprimé : #${ch.name} (${chId})`);
      } catch (e) {
        console.warn(`  ⚠️ Impossible de supprimer ${chId}: ${e.message}`);
      }
    }
  }

  // 2. CONFIGURATION OPTIMISÉE DU SALON HONEYPOT (#🍯🚫honeypot)
  console.log('\n🍯 [2/3] Configuration du salon Honeypot (RiskyMH Pattern)...');
  const honeypotChannel = guild.channels.cache.get('1541136837353938975');

  if (honeypotChannel) {
    try {
      // Renommer et placer la description
      await honeypotChannel.edit({
        name: '🍯-do-not-type',
        topic: '⚠️ HONEYPOT PIÈGE ANTI-SPAM • Ne postez aucun message sous peine de bannissement automatique immédiat.',
        permissionOverwrites: [
          {
            id: guild.id, // @everyone
            allow: [
              PermissionFlagsBits.ViewChannel,
              PermissionFlagsBits.SendMessages,
              PermissionFlagsBits.ReadMessageHistory
            ]
          }
        ]
      });

      // Purge des vieux messages
      const msgs = await honeypotChannel.messages.fetch({ limit: 20 });
      if (msgs.size > 0) await honeypotChannel.bulkDelete(msgs).catch(() => null);

      // Envoi de l'embed d'avertissement permanent
      const trapEmbed = new EmbedBuilder()
        .setTitle('🍯 HONEYPOT — PIÈGE DE SÉCURITÉ ANTI-BOT')
        .setDescription(
          '### ⚠️ ATTENTION / WARNING ⚠️\n\n' +
          '**Ce salon est un piège de sécurité automatisé.**\n\n' +
          '• **NE POSTEZ AUCUN MESSAGE ICI.**\n' +
          '• Tout message envoyé dans ce salon est analysé comme un comportement de bot de raid/spam.\n' +
          '• L’auteur sera **banni définitivement de manière instantanée** et tous ses messages seront purgés du serveur.\n\n' +
          '*(Si vous êtes un humain, ignorez ce salon et discutez dans <#1541136697411240016>)*'
        )
        .setColor('#e67e22')
        .setThumbnail('https://cdn-icons-png.flaticon.com/512/2953/2953363.png')
        .setFooter({ text: 'FHUB Sentinel Defense • Honeypot Active 24/7' })
        .setTimestamp();

      const pinnedMsg = await honeypotChannel.send({ embeds: [trapEmbed] });
      await pinnedMsg.pin().catch(() => null);

      console.log('  ✅ Salon Honeypot armé avec succès sous le nom #🍯-do-not-type !');
    } catch (e) {
      console.error('  ❌ Erreur config honeypot:', e.message);
    }
  }

  // 3. MISE EN FORME DE LA CATÉGORIE LOGS
  console.log('\n📁 [3/3] Structuration propre de la catégorie Logs...');
  const logsCategory = guild.channels.cache.get('1541136610228441088');
  if (logsCategory) {
    try {
      await logsCategory.setName('🛡️ LOGS & SÉCURITÉ');
      console.log('  ✅ Catégorie renommée en "🛡️ LOGS & SÉCURITÉ"');
    } catch (e) {
      console.error('  ❌ Erreur renommage catégorie:', e.message);
    }
  }

  console.log('\n======================================================');
  console.log('🎉 NETTOYAGE DES LOGS & ACTIVATION DU HONEYPOT TERMINÉS !');
  console.log('======================================================\n');

  process.exit(0);
});

client.login(process.env.DISCORD_TOKEN).catch(err => {
  console.error('❌ Erreur de connexion:', err.message);
  process.exit(1);
});
