require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { 
  Client, 
  GatewayIntentBits, 
  ChannelType, 
  PermissionFlagsBits, 
  EmbedBuilder, 
  ActionRowBuilder, 
  ButtonBuilder, 
  ButtonStyle 
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
  console.log(`🚀 DÉBUT DE LA RESTRUCTURATION DU SERVEUR PAR FHUB CORE`);
  console.log(`======================================================\n`);

  const guild = client.guilds.cache.first();
  if (!guild) {
    console.error('❌ Aucun serveur trouvé.');
    process.exit(1);
  }

  console.log(`🏰 Serveur : ${guild.name} (${guild.id})`);

  // 1. SUPPRESSION DES SALONS FANTÔMES SANS CATÉGORIE
  console.log('\n🧹 [ÉTAPE 1] Nettoyage des salons fantômes orphelins...');
  const ghostChannelIds = [
    '1541136747617067148', // #ticket-joshtayloryt
    '1541136752595566622', // #ticket-857239
    '1541136756458524732', // #ticket-seninolamam
    '1541136760107565086', // #kodiik-badge
    '1541136764465315900', // #ticket-allomafia
    '1541136768928325702', // #olelg1-badge
    '1541136772799398023', // #jetztkommttravis-badge
    '1541136776306098256', // #3zjv-badge
    '1541136779980316794', // #uwuwuuwuuwuwuuw...
    '1541136889975939082', // #ticket-kzrhs0
    '1541136894543265812', // #ticket-nonamebrothers
    '1541136898519605309', // #ticket-markovka320
    '1541136902336286760', // #ticket-hanroro_love
    '1541136905876541601', // #ticket-bae69
    '1541136909152026695', // #ticket-fz6x
    '1541136627601117354', // #rules doublon sans cat
    '1541136630939656302'  // #moderator-only doublon sans cat
  ];

  for (const chId of ghostChannelIds) {
    const ch = guild.channels.cache.get(chId);
    if (ch) {
      try {
        await ch.delete('Nettoyage salon fantôme cloné');
        console.log(`  🗑️ Supprimé : #${ch.name} (${chId})`);
      } catch (e) {
        console.warn(`  ⚠️ Impossible de supprimer ${chId}: ${e.message}`);
      }
    }
  }

  // 2. CRÉATION DES WEBHOOKS AUTOMATIQUES
  console.log('\n🔗 [ÉTAPE 2] Création & Déploiement des Webhooks...');
  const webhookResults = {};

  // A. Webhook Releases dans #annoucement
  const announceChannel = guild.channels.cache.get('1541136657527480422');
  if (announceChannel) {
    try {
      const existing = await announceChannel.fetchWebhooks();
      let hook = existing.find(w => w.name === 'FHUB Release Radar');
      if (!hook) {
        hook = await announceChannel.createWebhook({
          name: 'FHUB Release Radar',
          avatar: guild.iconURL()
        });
      }
      webhookResults.announcements = hook.url;
      console.log(`  ✅ Webhook Annonces créé : ${hook.name}`);
    } catch (e) {
      console.error('  ❌ Erreur webhook annonces:', e.message);
    }
  }

  // B. Webhook Opsec PRO dans #opsec-pro
  const opsecChannel = guild.channels.cache.get('1541136743955431515');
  if (opsecChannel) {
    try {
      const existing = await opsecChannel.fetchWebhooks();
      let hook = existing.find(w => w.name === 'Opsec PRO System');
      if (!hook) {
        hook = await opsecChannel.createWebhook({
          name: 'Opsec PRO System',
          avatar: guild.iconURL()
        });
      }
      webhookResults.opsec = hook.url;
      console.log(`  ✅ Webhook Opsec PRO créé : ${hook.name}`);
    } catch (e) {
      console.error('  ❌ Erreur webhook opsec:', e.message);
    }
  }

  // C. Webhook Logs dans #ticket-logs
  const ticketLogsChannel = guild.channels.cache.get('1541136866739228722');
  if (ticketLogsChannel) {
    try {
      const existing = await ticketLogsChannel.fetchWebhooks();
      let hook = existing.find(w => w.name === 'FHUB Security Logs');
      if (!hook) {
        hook = await ticketLogsChannel.createWebhook({
          name: 'FHUB Security Logs',
          avatar: guild.iconURL()
        });
      }
      webhookResults.logs = hook.url;
      console.log(`  ✅ Webhook Logs créé : ${hook.name}`);
    } catch (e) {
      console.error('  ❌ Erreur webhook logs:', e.message);
    }
  }

  // 3. DÉPLOIEMENT DU PANEL DE VÉRIFICATION DANS #⚠️verify
  console.log('\n🛡️ [ÉTAPE 3] Déploiement du système de vérification (#⚠️verify)...');
  const verifyChannel = guild.channels.cache.get('1541136634840617050');
  if (verifyChannel) {
    try {
      // Purge des messages existants
      const msgs = await verifyChannel.messages.fetch({ limit: 10 });
      if (msgs.size > 0) await verifyChannel.bulkDelete(msgs).catch(() => null);

      const verifyEmbed = new EmbedBuilder()
        .setTitle('🛡️ VÉRIFICATION DE SÉCURITÉ — FHUB')
        .setDescription(
          '### Bienvenue sur le serveur officiel **FHUB** !\n\n' +
          'Afin de protéger la communauté contre les bots malveillants et le spam, veuillez valider votre accès en cliquant sur le bouton ci-dessous.\n\n' +
          '**En cliquant sur "Valider mon accès", vous vous engagez à :**\n' +
          '• Respecter l’ensemble des membres et du personnel.\n' +
          '• Ne pas faire de publicité sauvage ni de spam en MP.\n' +
          '• Conserver une utilisation éthique des outils et projets.\n\n' +
          '⚡ *L’attribution du rôle Membre est instantanée.*'
        )
        .setColor('#00d2ff')
        .setThumbnail(guild.iconURL())
        .setFooter({ text: 'FHUB Security Protocol • Protection Active', iconURL: guild.iconURL() })
        .setTimestamp();

      const verifyRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('rules_accept')
          .setLabel('Valider mon accès')
          .setEmoji('🛡️')
          .setStyle(ButtonStyle.Success)
      );

      await verifyChannel.send({ embeds: [verifyEmbed], components: [verifyRow] });
      console.log('  ✅ Panel de vérification déployé dans #⚠️verify');
    } catch (e) {
      console.error('  ❌ Erreur déploiement verify:', e.message);
    }
  }

  // 4. DÉPLOIEMENT DU RÈGLEMENT OFFICIEL DANS #rules
  console.log('\n📜 [ÉTAPE 4] Déploiement de la charte (#rules)...');
  const rulesChannel = guild.channels.cache.get('1541136650418126918');
  if (rulesChannel) {
    try {
      const msgs = await rulesChannel.messages.fetch({ limit: 10 });
      if (msgs.size > 0) await rulesChannel.bulkDelete(msgs).catch(() => null);

      const rulesEmbed = new EmbedBuilder()
        .setTitle('📜 RÈGLEMENT OFFICIEL & CHARTE COMMUNAUTAIRE — FHUB')
        .setDescription(
          'Bienvenue dans la documentation officielle de **FHUB**.\n\n' +
          '**1. Respect & Intégrité**\n' +
          '• Tout propos injurieux, haineux, diffamatoire ou toxique entraîne une sanction immédiate.\n\n' +
          '**2. Aucun Spam / Raid / Pub non sollicitée**\n' +
          '• Les invitations Discord non sollicitées en MP ou salons publics sont strictement proscrites et bannies.\n\n' +
          '**3. Sécurité & Données Privées**\n' +
          '• Ne diffusez jamais d\'informations personnelles (tokens Discord, clés privées, identifiants).\n\n' +
          '**4. Ventes & Logiciels Officiels**\n' +
          '• Seuls les administrateurs officiels sont autorisés à distribuer des licences pour **Opsec PRO**.\n' +
          '• Toute tentative d\'escroquerie ou de revente illégale sera immédiatement signalée.\n\n' +
          '**5. Support & Assistance**\n' +
          '• Pour toute demande d\'achat ou assistance technique, utilisez exclusivement le salon <#1541136722375614524>.'
        )
        .setColor('#9e6bff')
        .setThumbnail(guild.iconURL())
        .setFooter({ text: 'FHUB Community Guidelines', iconURL: guild.iconURL() })
        .setTimestamp();

      await rulesChannel.send({ embeds: [rulesEmbed] });
      console.log('  ✅ Règlement déployé dans #rules');
    } catch (e) {
      console.error('  ❌ Erreur déploiement rules:', e.message);
    }
  }

  // 5. DÉPLOIEMENT DU PANEL DE TICKETS DANS #support-ticket
  console.log('\n🎫 [ÉTAPE 5] Déploiement du Panel de Tickets (#support-ticket)...');
  const ticketPanelChannel = guild.channels.cache.get('1541136722375614524');
  if (ticketPanelChannel) {
    try {
      const msgs = await ticketPanelChannel.messages.fetch({ limit: 10 });
      if (msgs.size > 0) await ticketPanelChannel.bulkDelete(msgs).catch(() => null);

      const ticketEmbed = new EmbedBuilder()
        .setTitle('🎫 CENTRE D’ASSISTANCE & COMMANDES — FHUB')
        .setDescription(
          'Besoin d’aide, d’une licence **Opsec PRO** ou de renseignements sur nos projets ?\n\n' +
          'Cliquez sur l’un des boutons ci-dessous pour ouvrir votre salon d’assistance privé avec notre équipe :\n\n' +
          '🛒 **Acheter / Support Opsec PRO (5,00 € Lifetime)**\n' +
          '• Accès illimité à vie, snipers, fermes 24/7, protection Sentinel.\n\n' +
          '⚙️ **Support Technique & Signalement de Bug**\n' +
          '• Assistance pour l’installation, configuration ou résolution de problèmes.\n\n' +
          '🤝 **Partenariat & Demande Diverse**\n' +
          '• Questions générales, collaborations ou suggestions.'
        )
        .setColor('#00d2ff')
        .setThumbnail(guild.iconURL())
        .setFooter({ text: 'FHUB Assistance 24/7', iconURL: guild.iconURL() })
        .setTimestamp();

      const ticketRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('ticket_opsec')
          .setLabel('Acheter Opsec PRO (5€)')
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

      await ticketPanelChannel.send({ embeds: [ticketEmbed], components: [ticketRow] });
      console.log('  ✅ Panel de tickets déployé dans #support-ticket');
    } catch (e) {
      console.error('  ❌ Erreur déploiement ticket panel:', e.message);
    }
  }

  // 6. DÉPLOIEMENT DE LA FICHE OPSEC PRO DANS #opsec-pro
  console.log('\n🛰️ [ÉTAPE 6] Déploiement de la vitrine Opsec PRO (#opsec-pro)...');
  if (opsecChannel) {
    try {
      const msgs = await opsecChannel.messages.fetch({ limit: 10 });
      if (msgs.size > 0) await opsecChannel.bulkDelete(msgs).catch(() => null);

      const opsecEmbed = new EmbedBuilder()
        .setTitle('🛰️ OPSEC PRO v2.0.2 — LA SUITE D’ÉLITE POUR DISCORD')
        .setDescription(
          '**Opsec PRO** est l’outil desktop le plus puissant et le plus sécurisé pour l’automatisation, la gestion de comptes multiples et la protection sur Discord (Windows x64).\n\n' +
          '### ⚡ Capacités Clés Incluses :\n' +
          '• **Multi-Accounts & Token Vault** : Chiffrement matériel Windows DPAPI, rotation automatique (statuts, activités, bio, rich presence).\n' +
          '• **Pomelo Sniper & Vanity Sniper** : Surveillance et réclamation à ultra-haute fréquence de pseudonymes uniques et URLs de serveurs.\n' +
          '• **Fermes 24/7 & Vocal Hopper** : Activité vocale et envoi automatisé de messages avec détection anti-ban (jitter adaptatif).\n' +
          '• **Moteur Sentinel & Anti-Raid** : Surveillance active de serveurs, auto-modération et protection de tokens en temps réel.\n' +
          '• **Server Cloner & Backups** : Sauvegarde JSON intégrale de serveurs et clonage complet automatisé.\n' +
          '• **In-Chat Command Dispatcher** : Exécution de commandes furtives directement dans les salons sans traces.\n\n' +
          '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
          '💎 **Offre Unique :** `5,00 €` (Accès Lifetime — Mises à jour à vie incluses)\n' +
          '🌐 **Site Web Officiel :** [fhubdev.vercel.app/#security](https://fhubdev.vercel.app/#security)\n' +
          '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
        )
        .setColor('#00d2ff')
        .setThumbnail(guild.iconURL())
        .setImage('https://cdn.discordapp.com/icons/1541136404782915665/b5849c44c7dac7bdc291d4a33e8fe35e.png?size=1024')
        .setFooter({ text: 'FHUB Software • Opsec PRO v2.0.2 Official Release', iconURL: guild.iconURL() })
        .setTimestamp();

      const opsecRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setLabel('Acheter via PayPal (5€)')
          .setURL('https://paypal.me/mecsuperstyle/5EUR')
          .setStyle(ButtonStyle.Link),
        new ButtonBuilder()
          .setLabel('Ouvrir un Ticket d’Achat')
          .setURL('https://discord.com/channels/1541136404782915665/1541136722375614524')
          .setStyle(ButtonStyle.Link),
        new ButtonBuilder()
          .setLabel('Télécharger (.exe)')
          .setURL('https://github.com/ellecrydansmesdm/Opsec-PRO/releases/tag/v2.0.2')
          .setStyle(ButtonStyle.Link)
      );

      await opsecChannel.send({ embeds: [opsecEmbed], components: [opsecRow] });
      console.log('  ✅ Présentation Opsec PRO déployée dans #opsec-pro');
    } catch (e) {
      console.error('  ❌ Erreur déploiement opsec-pro:', e.message);
    }
  }

  console.log('\n======================================================');
  console.log('🎉 RESTRUCTURATION TERMINÉE AVEC SUCCÈS !');
  console.log('🔗 Liens des Webhooks générés :');
  console.log(JSON.stringify(webhookResults, null, 2));
  console.log('======================================================\n');

  process.exit(0);
});

client.login(process.env.DISCORD_TOKEN).catch(err => {
  console.error('❌ Erreur de connexion:', err.message);
  process.exit(1);
});
