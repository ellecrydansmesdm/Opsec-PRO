const path = require('path');
const dotenv = require(path.join(__dirname, '..', 'fhub-bot', 'node_modules', 'dotenv'));
const {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} = require(path.join(__dirname, '..', 'fhub-bot', 'node_modules', 'discord.js'));

dotenv.config({ path: path.join(__dirname, '..', 'fhub-bot', '.env') });

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

const PATCH_NOTES_CHANNEL_ID = '1541136674766196859';
const ANNOUNCEMENTS_CHANNEL_ID = '1541136657527480422';
const TICKET_CHANNEL_ID = '1541136722375614524';

async function purgeChannelMessages(ch) {
  try {
    const messages = await ch.messages.fetch({ limit: 50 });
    const botMessages = messages.filter(m => m.author.id === client.user.id);
    for (const m of botMessages.values()) {
      await m.delete().catch(() => null);
    }
  } catch (err) {
    console.warn(`Purge partielle sur ${ch.name} : ${err.message}`);
  }
}

client.once('ready', async () => {
  try {
    console.log(`🤖 Bot connecté en tant que ${client.user.tag}`);
    const guild = client.guilds.cache.first();
    if (!guild) {
      console.error('❌ Aucun serveur trouvé.');
      process.exit(1);
    }

    console.log(`📡 Serveur : ${guild.name} (${guild.id})`);

    // 1. Send Clean Patch Notes Embed to #📝・patch-notes
    const patchChannel = await client.channels.fetch(PATCH_NOTES_CHANNEL_ID).catch(() => null);
    if (patchChannel) {
      await purgeChannelMessages(patchChannel);

      const patchEmbed = new EmbedBuilder()
        .setTitle('🚀 OPSEC PRO v2.0.3 — JOURNAL DES VERSIONS & CHANGELOG')
        .setDescription(
          `La version majeure **2.0.3** d'**Opsec PRO** est officiellement disponible !\n\n` +
          `### 🌟 Nouveautés & Correctifs de la Version 2.0.3\n` +
          `• **💎 37 Vrais Badges Officiels Discord (Août 2026)** :\n` +
          `  - Intégration des **37 assets authentiques extraits du projet FCord** et du CDN Discord (\`legacy_username.png\`, \`discord_quests.png\`, \`discord_orbs.png\`, tiers Nitro 1m-72m, tiers Booster 1m-24m, Bug Hunter L1 & L2 doré, etc.).\n` +
          `  - Remplacement des SVGs génériques et filtrage anti-régression du badge Active Developer décommissionné.\n\n` +
          `• **⚡ Vanity URL Claimer Pro** :\n` +
          `  - Surveillance ultra-rapide temps réel Gateway OP 0 avec reconnexion automatique résiliente.\n` +
          `  - Algorithme de réclamation instantanée et protection anti rate-limits (HTTP 429).\n\n` +
          `• **🎵 Spotify Lyrics Pro** :\n` +
          `  - Synchronisation instantanée des paroles karaoké et visualiseur audio dynamique synchronisé au tempo.\n\n` +
          `• **⚙️ Audit Technique Settings 100% Validé** :\n` +
          `  - Architecture unifiée et testée de bout en bout : \`UI → Zustand → IPC → Electron Main → Persistance Disque\`.\n\n` +
          `• **🛡️ Protection & Obfuscation V8 Bytecode** :\n` +
          `  - Binaire de release compilé en bytecode V8 natif (\`main.jsc\`) pour une protection maximale.\n\n` +
          `• **💳 Licence Lifetime Définitive (5,00 €)** :\n` +
          `  - Accès permanent à vie à l'ensemble des modules actuels et futurs.`
        )
        .addFields(
          {
            name: '📦 Téléchargement & Fichiers',
            value: `• **Fichier :** \`Opsec PRO Setup RELEASE.exe\` (105.79 MB)\n• **Release GitHub :** [v2.0.3 sur GitHub](https://github.com/ellecrydansmesdm/opsec-pro/releases/tag/v2.0.3)\n• **Auto-Updater :** Synchronisé via \`latest.yml\``,
            inline: false
          },
          {
            name: '🛒 Obtenir votre Clé de Licence Lifetime',
            value: `Pour acheter votre licence Lifetime (5€) ou obtenir votre clé d'activation, ouvrez un ticket d'achat dans <#${TICKET_CHANNEL_ID}>. Les instructions de paiement vous seront transmises dans votre salon privé.`,
            inline: false
          }
        )
        .setColor(0x10B981) // Emerald Opsec
        .setThumbnail('https://cdn.discordapp.com/attachments/1541136848674627654/1541146373246943344/fhub_logo.png')
        .setFooter({ text: 'Opsec PRO & FHub Team • Version 2.0.3', iconURL: guild.iconURL() })
        .setTimestamp();

      const buttons = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setLabel('Télécharger v2.0.3 (.exe)')
          .setStyle(ButtonStyle.Link)
          .setURL('https://github.com/ellecrydansmesdm/opsec-pro/releases/tag/v2.0.3'),
        new ButtonBuilder()
          .setLabel('🎫 Commander via Ticket')
          .setStyle(ButtonStyle.Link)
          .setURL(`https://discord.com/channels/${guild.id}/${TICKET_CHANNEL_ID}`),
        new ButtonBuilder()
          .setLabel('🌐 Site FHub')
          .setStyle(ButtonStyle.Link)
          .setURL('https://fhubdev.vercel.app/')
      );

      await patchChannel.send({ embeds: [patchEmbed], components: [buttons] });
      console.log(`✅ Message mis à jour dans #📝・patch-notes !`);
    }

    // 2. Send Clean Announcement to #📢・announcements
    const annChannel = await client.channels.fetch(ANNOUNCEMENTS_CHANNEL_ID).catch(() => null);
    if (annChannel) {
      await purgeChannelMessages(annChannel);

      const annEmbed = new EmbedBuilder()
        .setTitle('📢 NOUVELLE VERSION DISPONIBLE : OPSEC PRO v2.0.3')
        .setDescription(
          `La version **2.0.3** d'Opsec PRO vient d'être déployée avec succès !\n\n` +
          `• 💎 **37 Badges Officiels Discord CDN** intégrés fidèlement.\n` +
          `• ⚡ **Vanity Claimer Pro** optimisé pour une réclamation instantanée.\n` +
          `• 🎵 **Spotify Lyrics Pro** synchronisé au tempo musical.\n` +
          `• 🛡️ **Code Obfusqué & V8 Bytecode** pour une sécurité maximale.\n` +
          `• 💳 **Licence Lifetime à 5€** disponible sur ticket privé.\n\n` +
          `📖 Consultez le changelog détaillé dans <#${PATCH_NOTES_CHANNEL_ID}> !\n` +
          `🛒 Pour obtenir une licence, ouvrez un ticket dans <#${TICKET_CHANNEL_ID}>.`
        )
        .setColor(0x5865F2)
        .setThumbnail('https://cdn.discordapp.com/attachments/1541136848674627654/1541146373246943344/fhub_logo.png')
        .setFooter({ text: 'FHub Announcements • Opsec PRO v2.0.3', iconURL: guild.iconURL() })
        .setTimestamp();

      const annRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setLabel('Voir les Patch Notes')
          .setStyle(ButtonStyle.Link)
          .setURL(`https://discord.com/channels/${guild.id}/${PATCH_NOTES_CHANNEL_ID}`),
        new ButtonBuilder()
          .setLabel('Télécharger (.exe)')
          .setStyle(ButtonStyle.Link)
          .setURL('https://github.com/ellecrydansmesdm/opsec-pro/releases/tag/v2.0.3'),
        new ButtonBuilder()
          .setLabel('🎫 Acheter (Ticket)')
          .setStyle(ButtonStyle.Link)
          .setURL(`https://discord.com/channels/${guild.id}/${TICKET_CHANNEL_ID}`)
      );

      await annChannel.send({ embeds: [annEmbed], components: [annRow] });
      console.log(`✅ Message mis à jour dans #📢・announcements !`);
    }

    client.destroy();
    console.log('🎉 Tous les messages publics sont propres et sécurisés !');
  } catch (error) {
    console.error('❌ Erreur :', error);
    client.destroy();
    process.exit(1);
  }
});

client.login(process.env.DISCORD_TOKEN);
