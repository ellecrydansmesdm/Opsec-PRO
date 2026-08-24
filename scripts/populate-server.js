const path = require('path');
const dotenv = require(path.join(__dirname, '..', 'fhub-bot', 'node_modules', 'dotenv'));
const {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  PermissionFlagsBits,
  ChannelType
} = require(path.join(__dirname, '..', 'fhub-bot', 'node_modules', 'discord.js'));

dotenv.config({ path: path.join(__dirname, '..', 'fhub-bot', '.env') });

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

const MEMBER_ROLE_ID = process.env.MEMBER_ROLE_ID || '1541136512890962141';
const STAFF_ROLE_ID = process.env.STAFF_ROLE_ID || '1541136441462100135';

client.once('ready', async () => {
  try {
    const guild = client.guilds.cache.first();
    console.log(`\n🧹 Nettoyage & Restructuration du serveur : ${guild.name} (${guild.id})...`);

    // 1. CHANNELS / CATEGORIES TO DELETE
    const channelsToDelete = [
      '1541136623666724923', // #join in stats
      '1541136646148456538', // #if in voice
      '1541136719007457300', // #help-me (duplicate of support-ticket)
      '1541136733108707438', // #skullboard
      '1541136667694604449', // #content-creator
      '1541136671159095386', // #news in other projects (duplicate of patch-notes/announcements)
      '1541136913610571796', // #bots-list
      // HELPER Category + channels
      '1541136789505450146', // #news helper
      '1541136793682972732', // #chat helper
      '1541136797495726171', // #cmds helper
      '1541136801471930478', // #test-helpers
      '1541136805372633199', // #logs-helpers-test
      '1541136603672481882', // Category HELPER
      // IDEAS Category + channels (we already have your-ideas in community)
      '1541136783939604480', // #ideas
      '1541136599784628386', // Category IDEAS
      // MODERATION duplicate test channels
      '1541136820601884832', // #embed
      '1541136825823920188', // #chat mod
      '1541136829691068516', // #media mod
      '1541136833625194586'  // #cmds mod
    ];

    for (const chId of channelsToDelete) {
      try {
        const ch = await guild.channels.fetch(chId).catch(() => null);
        if (ch) {
          await ch.delete('Nettoyage channels inutiles et redondants');
          console.log(`🗑️ Supprimé : ${ch.name} (${chId})`);
        }
      } catch (err) {
        console.warn(`Erreur suppression ${chId}:`, err.message);
      }
    }

    // 2. RENAME / REORGANIZE CATEGORIES & CHANNELS
    const renameChannels = [
      { id: '1541136581270831155', name: '🚀 PROJETS & RELEASES' }, // Category OTHERS PROJECTS
      { id: '1541136657527480422', name: '📢・announcements' },
      { id: '1541136650418126918', name: '📜・règlement' },
      { id: '1541136654440333382', name: '🌐・charte-langue' },
      { id: '1541136661885231164', name: '🎁・giveaways' },
      { id: '1541136737051349062', name: '⚡・fcord' },
      { id: '1541136743955431515', name: '🛡️・opsec-pro' },
      { id: '1541136682148175962', name: '📥・how-to-download' },
      { id: '1541136674766196859', name: '📝・patch-notes' },
      { id: '1541136678264250491', name: '💻・open-source' },
      { id: '1541136697411240016', name: '💬・général' },
      { id: '1541136711709364344', name: '🤖・bot-commands' },
      { id: '1541136715454873670', name: '💡・vos-idées' },
      { id: '1541136722375614524', name: '🎫・support-ticket' },
      { id: '1541136814776131624', name: '🔒・staff-lounge' }
    ];

    for (const item of renameChannels) {
      try {
        const ch = await guild.channels.fetch(item.id).catch(() => null);
        if (ch) {
          await ch.setName(item.name);
          console.log(`✏️ Renommé : ${item.name}`);
        }
      } catch (err) {
        console.warn(`Erreur renommage ${item.id}:`, err.message);
      }
    }

    // 3. POPULATE USEFUL CHANNELS WITH RICH EMBEDS & CONTENT

    // Helper: Purge previous bot messages in channel
    async function purgeAndSend(channelId, sendFn) {
      const channel = await guild.channels.fetch(channelId).catch(() => null);
      if (!channel) return;
      try {
        const messages = await channel.messages.fetch({ limit: 50 });
        if (messages.size > 0) {
          await channel.bulkDelete(messages).catch(() => {});
        }
      } catch (_) {}
      await sendFn(channel);
    }

    console.log('\n📝 Remplissage des salons utiles avec du contenu officiel...');

    // A. #⚠️verify (1541136634840617050)
    await purgeAndSend('1541136634840617050', async (ch) => {
      const embed = new EmbedBuilder()
        .setTitle('🛡️ BIENVENUE SUR L\'ÉCOSYSTÈME FHUB')
        .setDescription(
          `**FHub** est le hub officiel dédié au développement d'outils avancés, à la sécurité numérique et au modding Discord haute performance.\n\n` +
          `🔹 **FCord** : Le client Discord nouvelle génération ultra-rapide, sans télémétrie et sécurisé.\n` +
          `🔹 **Opsec PRO** : La suite ultime de protection de la vie privée, token vault et anti-forensics.\n` +
          `🔹 **Open Source** : Scripts, honeypots et modules de protection communautaires.\n\n` +
          `🌐 **Site Web Officiel** : [fhubdev.vercel.app](https://fhubdev.vercel.app/)\n\n` +
          `────────────────────────────────────────\n` +
          `📌 **Pour débloquer l'accès complet au serveur :**\n` +
          `Cliquez sur le bouton vert ci-dessous pour confirmer que vous êtes humain et accepter nos règles de vie commune.`
        )
        .setColor(0x00f3ff)
        .setThumbnail('https://cdn.discordapp.com/attachments/1541136848674627654/1541146373246943344/fhub_logo.png')
        .setFooter({ text: 'FHUB Security Protocol • Protection Anti-Raid Active', iconURL: guild.iconURL() })
        .setTimestamp();

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('verify_member')
          .setLabel('✅ Vérifier mon compte')
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setLabel('🌐 Visiter le Site Web')
          .setStyle(ButtonStyle.Link)
          .setURL('https://fhubdev.vercel.app/')
      );

      await ch.send({ embeds: [embed], components: [row] });
      console.log('✅ #verify rempli');
    });

    // B. #📜・règlement (1541136650418126918)
    await purgeAndSend('1541136650418126918', async (ch) => {
      const embed = new EmbedBuilder()
        .setTitle('📜 RÈGLEMENT GÉNÉRAL DE LA COMMUNAUTÉ FHUB')
        .setDescription(
          `L'accès et la participation à ce serveur impliquent l'acceptation sans réserve des règles suivantes :\n\n` +
          `**1. Respect & Courtoisie**\n` +
          `Aucun propos haineux, diffamatoire, discriminatoire, harcèlement ou provocation ne sera toléré.\n\n` +
          `**2. Sécurité & Zéro Tolérance Malware**\n` +
          `Le partage de fichiers infectés, grabbers, rats, phishing ou liens malveillants entraîne un **bannissement immédiat et irrévocable**.\n\n` +
          `**3. Confidentialité & Données Privées (Doxx/Leak)**\n` +
          `La divulgation d'informations privées d'un tiers sans consentement est strictement interdite.\n\n` +
          `**4. Publicité & Spam**\n` +
          `L'auto-promotion non autorisée et le spam en message privé (DM Advertising) sont interdits et surveillés par nos systèmes de détection.\n\n` +
          `**5. Support & Transactions**\n` +
          `Toute demande d'achat ou de support technique concernant nos outils (**Opsec PRO**, **FCord**) doit être effectuée exclusivement via les tickets officiels dans <#1541136722375614524>.\n\n` +
          `────────────────────────────────────────\n` +
          `⚖️ *Le non-respect de ces règles peut entraîner un avertissement, une expulsion ou un bannissement définitif par l'équipe de modération.*`
        )
        .setColor(0x5865f2)
        .setFooter({ text: 'FHub Community Guidelines • Mis à jour en 2026', iconURL: guild.iconURL() });

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('rules_ack')
          .setLabel('📜 J\'ai lu et j\'accepte le règlement')
          .setStyle(ButtonStyle.Primary)
      );

      await ch.send({ embeds: [embed], components: [row] });
      console.log('✅ #règlement rempli');
    });

    // C. #🌐・charte-langue (1541136654440333382)
    await purgeAndSend('1541136654440333382', async (ch) => {
      const embed = new EmbedBuilder()
        .setTitle('🌐 CHARTE LINGUISTIQUE / LANGUAGE CHARTER')
        .setDescription(
          `**🇫🇷 Zone Francophone :**\n` +
          `La langue principale du serveur est le **Français**. Veuillez l'utiliser dans les salons généraux pour garantir la bonne compréhension de tous.\n\n` +
          `**🇬🇧 English Zone :**\n` +
          `International members are very welcome! If you need support for **FCord** or **Opsec PRO**, you can speak English directly in your private support ticket or in dedicated technical channels.\n\n` +
          `💡 *Pour toute assistance technique internationale, ouvrez un ticket dans <#1541136722375614524>.*`
        )
        .setColor(0x3ba55d)
        .setFooter({ text: 'FHub Language Policy', iconURL: guild.iconURL() });

      await ch.send({ embeds: [embed] });
      console.log('✅ #charte-langue rempli');
    });

    // D. #📢・announcements (1541136657527480422)
    await purgeAndSend('1541136657527480422', async (ch) => {
      const embed = new EmbedBuilder()
        .setTitle('📢 LANCEMENT OFFICIEL DE L\'INFRASTRUCTURE FHUB 2.0')
        .setDescription(
          `🎉 **Bienvenue à tous sur la nouvelle version de FHub !**\n\n` +
          `Nous avons déployé notre infrastructure complète avec hébergement haute disponibilité 24/7 et de nouvelles versions de nos projets phares :\n\n` +
          `✨ **FCord v2.x** : Le client Discord haute performance avec stealth evasion et patchs de sécurité intégrés.\n` +
          `🛡️ **Opsec PRO** : Suite complète de protection de la vie privée, token vault chiffré et suppression des traces.\n` +
          `🍯 **Honeypot RiskyMH** : Protection automatisée du serveur contre les raids et bots malveillants.\n` +
          `🌐 **Site Web Interactif** : Découvrez nos outils sur [fhubdev.vercel.app](https://fhubdev.vercel.app/)\n\n` +
          `Restez connectés pour les prochaines annonces et giveaways ! 🚀`
        )
        .setColor(0x00f3ff)
        .setThumbnail('https://cdn.discordapp.com/attachments/1541136848674627654/1541146373246943344/fhub_logo.png')
        .setFooter({ text: 'FHub News Desk', iconURL: guild.iconURL() })
        .setTimestamp();

      await ch.send({ embeds: [embed] });
      console.log('✅ #announcements rempli');
    });

    // E. #🎁・giveaways (1541136661885231164)
    await purgeAndSend('1541136661885231164', async (ch) => {
      const embed = new EmbedBuilder()
        .setTitle('🎁 SALON DES CONCOURS & GIVEAWAYS')
        .setDescription(
          `C'est ici que seront organisés les concours officiels de la communauté **FHub** !\n\n` +
          `**Récompenses à gagner régulièrement :**\n` +
          `💎 Clés de licence à vie pour **Opsec PRO**\n` +
          `⭐ Accès anticipés aux betas privées de **FCord**\n` +
          `👑 Rôles exclusifs et avantages VIP sur le serveur\n\n` +
          `🔔 *Activez les notifications pour ne rater aucun drop !*`
        )
        .setColor(0xf1c40f)
        .setFooter({ text: 'FHub Giveaways', iconURL: guild.iconURL() });

      await ch.send({ embeds: [embed] });
      console.log('✅ #giveaways rempli');
    });

    // F. #⚡・fcord (1541136737051349062)
    await purgeAndSend('1541136737051349062', async (ch) => {
      const embed = new EmbedBuilder()
        .setTitle('⚡ FCORD — LE CLIENT DISCORD NOUVELLE GÉNÉRATION')
        .setDescription(
          `**FCord** est une modification avancée du client Discord conçue pour la performance, la sécurité et la personnalisation absolue sans compromis.\n\n` +
          `### 🌟 Fonctionnalités Clés :\n` +
          `• 🚀 **Performance & Légèreté** : Optimisation poussée du moteur Webpack, temps de réponse quasi-instantané et consommation mémoire réduite.\n` +
          `• 🛡️ **Stealth & Anti-Detection** : Contournement des empreintes JA3/JA4 et protection contre les flags télémétriques.\n` +
          `• 🧩 **Plugin Ecosystem** : Compatible avec une vaste bibliothèque de plugins natifs (Sniper OP 0, Voice DAVE MLS, In-Chat Dispatcher, UI Tweaks).\n` +
          `• 🔒 **Zero Telemetry** : Blocage total des requêtes de tracking et de collecte de données Discord.\n` +
          `• 🎨 **Thèmes & Customisation** : Support des styles CSS modernes et personnalisation intégrale de l'interface.\n\n` +
          `────────────────────────────────────────\n` +
          `📖 **Consultez le guide d'installation dans** <#1541136682148175962> !\n` +
          `🌐 **Site Web** : [fhubdev.vercel.app](https://fhubdev.vercel.app/)`
        )
        .setColor(0x5865f2)
        .setThumbnail('https://cdn.discordapp.com/attachments/1541136848674627654/1541146373246943344/fhub_logo.png')
        .setFooter({ text: 'FCord Client Mod • Powered by FHub', iconURL: guild.iconURL() });

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setLabel('📥 Comment Télécharger')
          .setStyle(ButtonStyle.Link)
          .setURL('https://discord.com/channels/1541136404782915665/1541136682148175962'),
        new ButtonBuilder()
          .setLabel('🌐 Voir sur le Site')
          .setStyle(ButtonStyle.Link)
          .setURL('https://fhubdev.vercel.app/')
      );

      await ch.send({ embeds: [embed], components: [row] });
      console.log('✅ #fcord rempli');
    });

    // G. #🛡️・opsec-pro (1541136743955431515)
    await purgeAndSend('1541136743955431515', async (ch) => {
      const embed = new EmbedBuilder()
        .setTitle('🛡️ OPSEC PRO — SUITE DE SÉCURITÉ & ANTI-FORENSICS')
        .setDescription(
          `**Opsec PRO** est la solution tout-en-un développée par **FHub** pour garantir l'anonymat, la sécurité de vos identifiants et la protection de votre vie privée.\n\n` +
          `### 🛠️ Modules Inclus :\n` +
          `• 🔐 **Token Vault DPAPI & AES-256-GCM** : Stockage et gestion ultra-sécurisée de vos jetons avec inspection sans risque des métadonnées (Nitro, Billing).\n` +
          `• 🚫 **Telemetry & Forensic Killer** : Blocage actif des traqueurs Windows/Discord et nettoyage automatisé des logs et caches sensibles.\n` +
          `• 🎭 **Hardware ID & Proxy Routing** : Isolation des connexions par compte et simulation d'empreintes numériques propres.\n` +
          `• 🧹 **Clean Uninstaller** : Suppression définitive sans laisser la moindre trace sur le système hôte.\n\n` +
          `────────────────────────────────────────\n` +
          `💰 **Tarif Exclusif de Lancement :** \`5,00 €\` *(Licence Lifetime • Accès à Vie)*\n` +
          `💳 **Moyens de paiement :** PayPal & Crypto\n` +
          `💎 **Obtenir votre licence :** Cliquez sur le bouton ci-dessous ou ouvrez un ticket dans <#1541136722375614524> !`
        )
        .setColor(0x00f3ff)
        .setThumbnail('https://cdn.discordapp.com/attachments/1541136848674627654/1541146373246943344/fhub_logo.png')
        .setFooter({ text: 'Opsec PRO Security Suite • FHub', iconURL: guild.iconURL() });

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('ticket_buy_opsec')
          .setLabel('💎 Acheter une Licence (5,00 €)')
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setLabel('🌐 Découvrir sur le Site')
          .setStyle(ButtonStyle.Link)
          .setURL('https://fhubdev.vercel.app/#security')
      );

      await ch.send({ embeds: [embed], components: [row] });
      console.log('✅ #opsec-pro rempli');
    });

    // H. #📥・how-to-download (1541136682148175962)
    await purgeAndSend('1541136682148175962', async (ch) => {
      const embed = new EmbedBuilder()
        .setTitle('📥 GUIDE DE TÉLÉCHARGEMENT & INSTALLATION')
        .setDescription(
          `Suivez les étapes ci-dessous pour installer nos outils en toute sécurité :\n\n` +
          `### ⚡ Installation de FCord :\n` +
          `1. Rendez-vous sur la page officielle : [fhubdev.vercel.app](https://fhubdev.vercel.app/)\n` +
          `2. Téléchargez la dernière release correspondant à votre système (Windows / Linux / macOS).\n` +
          `3. Lancez l'installeur et sélectionnez votre version de Discord (Stable / PTB / Canary).\n` +
          `4. Redémarrez Discord pour profiter de l'expérience FCord.\n\n` +
          `### 🛡️ Installation d'Opsec PRO :\n` +
          `1. Obtenez votre clé de licence via un ticket dans <#1541136722375614524>.\n` +
          `2. Téléchargez l'archive sécurisée fournie dans votre ticket privé.\n` +
          `3. Entrez votre clé de validation lors du premier lancement.\n\n` +
          `⚠️ *N'acceptez aucun fichier provenant de messages privés. Nos seuls canaux de distribution sont le site web officiel et les tickets de support FHub.*`
        )
        .setColor(0x3ba55d)
        .setFooter({ text: 'FHub Safe Download Guide', iconURL: guild.iconURL() });

      await ch.send({ embeds: [embed] });
      console.log('✅ #how-to-download rempli');
    });

    // I. #📝・patch-notes (1541136674766196859)
    await purgeAndSend('1541136674766196859', async (ch) => {
      const embed = new EmbedBuilder()
        .setTitle('📝 JOURNAL DES VERSIONS & CHANGELOGS')
        .setDescription(
          `### 🚀 Version 2.0.2 (Dernière Mise à Jour)\n` +
          `• **Infrastructure** : Migration vers l'hébergement 24/7 Bot-Hosting avec passerelle SFTP.\n` +
          `• **Sécurité** : Intégration du Honeypot RiskyMH avec auto-ban et purge 24h des attaquants.\n` +
          `• **FCord** : Stabilisation des patchs Webpack et compatibilité React 19.\n` +
          `• **Opsec PRO** : Optimisation du vault DPAPI et support des nouvelles structures de tokens.\n` +
          `• **Serveur Discord** : Restructuration complète des salons, compteurs vocaux temps réel et boutons interactifs.\n\n` +
          `*Les notes de mise à jour seront publiées ici à chaque nouvelle release.*`
        )
        .setColor(0x7289da)
        .setFooter({ text: 'FHub Version History', iconURL: guild.iconURL() })
        .setTimestamp();

      await ch.send({ embeds: [embed] });
      console.log('✅ #patch-notes rempli');
    });

    // J. #💻・open-source (1541136678264250491)
    await purgeAndSend('1541136678264250491', async (ch) => {
      const embed = new EmbedBuilder()
        .setTitle('💻 PROJETS OPEN-SOURCE & RESSOURCES')
        .setDescription(
          `**FHub** contribue activement à la communauté des développeurs et chercheurs en sécurité.\n\n` +
          `**Repositories & Outils publics :**\n` +
          `• 🛡️ **Honeypot Anti-Raid System** : Inspiré de la norme [RiskyMH/honeypot](https://github.com/RiskyMH/honeypot).\n` +
          `• 🤖 **Discord Core Bot Template** : Architecture modulaire avec slash commands et gestionnaires d'événements.\n` +
          `• 🔍 **Scripts d'audit de sécurité** : Outils de vérification des permissions et des séparateurs de rôles.\n\n` +
          `⭐ *Consultez nos projets et contribuez sur notre GitHub officiel !*`
        )
        .setColor(0x2f3136)
        .setFooter({ text: 'FHub Open Source Initiative', iconURL: guild.iconURL() });

      await ch.send({ embeds: [embed] });
      console.log('✅ #open-source rempli');
    });

    // K. #🎫・support-ticket (1541136722375614524)
    await purgeAndSend('1541136722375614524', async (ch) => {
      const embed = new EmbedBuilder()
        .setTitle('🎫 CENTRE D\'ASSISTANCE & COMMANDES FHUB')
        .setDescription(
          `Besoin d'aide, d'une assistance technique ou d'acheter une licence **Opsec PRO** ?\n\n` +
          `Sélectionnez le type de demande ci-dessous pour ouvrir un salon privé avec notre équipe de support :\n\n` +
          `💎 **Achat & Licences** : Commander une licence Opsec PRO ou demander des informations tarifaires.\n` +
          `⚡ **Support FCord** : Aide à l'installation, configuration de plugins ou signalement de bug.\n` +
          `🛡️ **Support Opsec PRO** : Assistance technique et configuration de la suite de sécurité.\n` +
          `❓ **Question Générale** : Partenariat, question sur l'écosystème FHub ou autre.\n\n` +
          `🔒 *Chaque ticket est strictement privé et accessible uniquement par vous et le staff.*`
        )
        .setColor(0x00f3ff)
        .setThumbnail('https://cdn.discordapp.com/attachments/1541136848674627654/1541146373246943344/fhub_logo.png')
        .setFooter({ text: 'FHub Support Desk • Temps de réponse moyen < 1h', iconURL: guild.iconURL() });

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('ticket_buy_opsec')
          .setLabel('💎 Achat Opsec PRO (5,00 €)')
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId('ticket_fcord_support')
          .setLabel('⚡ Support FCord')
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId('ticket_opsec_support')
          .setLabel('🛡️ Support Opsec PRO')
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId('ticket_general_help')
          .setLabel('❓ Question / Autre')
          .setStyle(ButtonStyle.Secondary)
      );

      await ch.send({ embeds: [embed], components: [row] });
      console.log('✅ #support-ticket rempli');
    });

    // L. #💡・vos-idées (1541136715454873670)
    await purgeAndSend('1541136715454873670', async (ch) => {
      const embed = new EmbedBuilder()
        .setTitle('💡 BOÎTE À IDÉES & SUGGESTIONS')
        .setDescription(
          `Vous avez une idée de fonctionnalité pour **FCord**, un plugin à proposer ou une amélioration pour **Opsec PRO** ?\n\n` +
          `Partagez vos suggestions directement dans ce salon !\n\n` +
          `📌 **Format recommandé :**\n` +
          `• **Projet concerné** : FCord / Opsec PRO / Bot / Serveur\n` +
          `• **Description de l'idée** : Ce que vous aimeriez voir ajouté\n` +
          `• **Pourquoi** : Pourquoi cette idée est utile à la communauté\n\n` +
          `Les membres peuvent réagir avec 👍 / 👎 pour soutenir vos propositions !`
        )
        .setColor(0xf39c12)
        .setFooter({ text: 'FHub Community Feedback', iconURL: guild.iconURL() });

      await ch.send({ embeds: [embed] });
      console.log('✅ #vos-idées rempli');
    });

    console.log('\n🎉 RESTRUCTURATION ET REMPLISSAGE TERMINÉS AVEC SUCCÈS !');
    client.destroy();
  } catch (err) {
    console.error('Erreur globale:', err);
    client.destroy();
  }
});

client.login(process.env.DISCORD_TOKEN);
