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

const TICKET_CHANNEL_ID = '1541136722375614524';

async function purgeAndSend(guild, channelId, sendFn) {
  const channel = await guild.channels.fetch(channelId).catch(() => null);
  if (!channel) return;
  try {
    const messages = await channel.messages.fetch({ limit: 50 });
    const botMessages = messages.filter(m => m.author.id === client.user.id);
    for (const m of botMessages.values()) {
      await m.delete().catch(() => null);
    }
  } catch (err) {
    console.warn(`Purge sur ${channel.name}: ${err.message}`);
  }
  await sendFn(channel);
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
    console.log(`🔄 Mise à jour et nettoyage des messages de tous les salons...`);

    // 1. #verify (1541136634840617050)
    await purgeAndSend(guild, '1541136634840617050', async (ch) => {
      const embed = new EmbedBuilder()
        .setTitle('BIENVENUE SUR FHUB')
        .setDescription(
          `**FHub** est la plateforme dédiée au développement d'applications desktop, à la sécurité et à l'écosystème Discord.\n\n` +
          `• **FCord** : Client Discord modulaire sans wrapper, rapide et sans télémétrie.\n` +
          `• **Opsec PRO** : Suite desktop de sécurité, gestion de comptes et automatisation locale.\n` +
          `• **Open Source** : Outils, scripts et modules communautaires.\n\n` +
          `Site officiel : https://fhubdev.vercel.app/\n\n` +
          `────────────────────────────────────────\n` +
          `Cliquez sur le bouton ci-dessous pour valider votre arrivée et débloquer l'accès aux salons.`
        )
        .setColor(0x2b2d31)
        .setFooter({ text: 'FHub Security' });

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('verify_member')
          .setLabel('Accéder au serveur')
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setLabel('Site Web')
          .setStyle(ButtonStyle.Link)
          .setURL('https://fhubdev.vercel.app/')
      );

      await ch.send({ embeds: [embed], components: [row] });
      console.log('✅ #verify mis à jour');
    });

    // 2. #reglement (1541136650418126918)
    await purgeAndSend(guild, '1541136650418126918', async (ch) => {
      const embed = new EmbedBuilder()
        .setTitle('REGLEMENT DU SERVEUR')
        .setDescription(
          `Pour préserver un espace d'échange constructif, merci de respecter ces consignes :\n\n` +
          `1. **Respect et courtoisie** : Aucun propos haineux, harcèlement ou comportement toxique.\n` +
          `2. **Publicité et spam** : Aucun lien d'invitation non sollicité ou promotion en messages privés.\n` +
          `3. **Sécurité** : Ne partagez jamais vos jetons Discord, mots de passe ou données confidentielles.\n` +
          `4. **Support & Achats** : Pour toute demande d'aide ou acquisition de licence, ouvrez un ticket dans <#${TICKET_CHANNEL_ID}>.\n\n` +
          `Tout manquement est passible de sanctions immédiates.`
        )
        .setColor(0x2b2d31)
        .setFooter({ text: 'FHub Guidelines' });

      await ch.send({ embeds: [embed] });
      console.log('✅ #reglement mis à jour');
    });

    // 3. #announcements (1541136657527480422)
    await purgeAndSend(guild, '1541136657527480422', async (ch) => {
      const embed = new EmbedBuilder()
        .setTitle('NOUVELLE VERSION DISPONIBLE : OPSEC PRO v2.0.3')
        .setDescription(
          `La version **2.0.3** d'Opsec PRO est disponible en téléchargement.\n\n` +
          `• 37 badges officiels Discord CDN intégrés fidèlement.\n` +
          `• Vanity Claimer Pro optimisé avec reconnexion instantanée.\n` +
          `• Spotify Lyrics Pro synchronisé au tempo.\n` +
          `• Binaire sécurisé et obfusqué en V8 Bytecode.\n` +
          `• Formule unique Lifetime disponible via ticket privé.\n\n` +
          `Site web : https://fhubdev.vercel.app/\n` +
          `Changelog complet consultable dans <#1541136674766196859>.\n` +
          `Pour toute acquisition de licence, ouvrez un ticket dans <#${TICKET_CHANNEL_ID}>.`
        )
        .setColor(0x2b2d31)
        .setFooter({ text: 'FHub Announcements • v2.0.3' })
        .setTimestamp();

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setLabel('Télécharger (.exe)')
          .setStyle(ButtonStyle.Link)
          .setURL('https://github.com/ellecrydansmesdm/opsec-pro/releases/tag/v2.0.3'),
        new ButtonBuilder()
          .setLabel('Ouvrir un Ticket')
          .setStyle(ButtonStyle.Link)
          .setURL(`https://discord.com/channels/${guild.id}/${TICKET_CHANNEL_ID}`),
        new ButtonBuilder()
          .setLabel('Site Web')
          .setStyle(ButtonStyle.Link)
          .setURL('https://fhubdev.vercel.app/')
      );

      await ch.send({ embeds: [embed], components: [row] });
      console.log('✅ #announcements mis à jour');
    });

    // 4. #fcord (1541136737051349062)
    await purgeAndSend(guild, '1541136737051349062', async (ch) => {
      const embed = new EmbedBuilder()
        .setTitle('FCORD — CLIENT DISCORD MODULAIRE')
        .setDescription(
          `**FCord** est une modification client légère conçue pour offrir des performances maximales et une personnalisation avancée sans surcouche inutile.\n\n` +
          `• **SoundPad DSP Intégré** : Normalisation audio anti-saturation, routage multi-sorties et raccourcis globaux.\n` +
          `• **Bibliothèque d'Extensions** : Plus de 770 plugins et thèmes modulaires.\n` +
          `• **Vie Privée** : Neutralisation de la télémétrie et chiffrement local des paramètres.\n` +
          `• **Désinstallation Propre** : Restauration du client officiel en un clic.\n\n` +
          `Découvrez le projet sur https://fhubdev.vercel.app/`
        )
        .setColor(0x2b2d31)
        .setFooter({ text: 'FCord Desktop' });

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setLabel('Code Source GitHub')
          .setStyle(ButtonStyle.Link)
          .setURL('https://github.com/ellecrydansmesdm/FCord'),
        new ButtonBuilder()
          .setLabel('Site Officiel')
          .setStyle(ButtonStyle.Link)
          .setURL('https://fhubdev.vercel.app/')
      );

      await ch.send({ embeds: [embed], components: [row] });
      console.log('✅ #fcord mis à jour');
    });

    // 5. #opsec-pro (1541136743955431515)
    await purgeAndSend(guild, '1541136743955431515', async (ch) => {
      const embed = new EmbedBuilder()
        .setTitle('OPSEC PRO — SUITE DE SÉCURITÉ & AUTOMATISATION')
        .setDescription(
          `**Opsec PRO** est une application desktop dédiée à la protection de la vie privée, la gestion avancée d'identifiants et l'automatisation locale.\n\n` +
          `• **Token Vault AES-256-GCM & DPAPI** : Stockage sécurisé des identifiants et métadonnées.\n` +
          `• **Vanity Claimer Pro** : Réclamation temps réel avec surveillance Gateway OP 0.\n` +
          `• **Telemetry & Forensic Cleaner** : Nettoyage automatisé des traces et logs locaux.\n` +
          `• **Spotify Lyrics Pro** : Paroles synchronisées et visualiseur réactif au tempo.\n\n` +
          `────────────────────────────────────────\n` +
          `Tarif de lancement : 5,00 € (Licence Lifetime définitive)\n` +
          `Pour commander votre accès à vie, ouvrez un ticket dans <#${TICKET_CHANNEL_ID}>.`
        )
        .setColor(0x2b2d31)
        .setFooter({ text: 'Opsec PRO Suite' });

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('ticket_buy_opsec')
          .setLabel('Acheter une Licence (5,00 €)')
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setLabel('Site Web')
          .setStyle(ButtonStyle.Link)
          .setURL('https://fhubdev.vercel.app/')
      );

      await ch.send({ embeds: [embed], components: [row] });
      console.log('✅ #opsec-pro mis à jour');
    });

    // 6. #patch-notes (1541136674766196859)
    await purgeAndSend(guild, '1541136674766196859', async (ch) => {
      const embed = new EmbedBuilder()
        .setTitle('OPSEC PRO v2.0.3 — CHANGELOG')
        .setDescription(
          `Mise à jour majeure **v2.0.3** d'Opsec PRO.\n\n` +
          `• **37 Badges Officiels Discord CDN** : Intégration fidèle des assets PNG officiels extraits du projet FCord (Ancien pseudo, Discord Quests, Nitro tiers 1m-72m, Boost tiers 1m-24m, Bug Hunter L1 & L2 doré).\n` +
          `• **Vanity URL Claimer Pro** : Surveillance directe OP 0, reconnexion automatique et protection anti-429.\n` +
          `• **Spotify Lyrics Pro** : Synchronisation temps réel des paroles et visualiseur réactif au tempo.\n` +
          `• **Audit Settings** : Pipeline complet validé (UI -> Zustand -> IPC -> Electron Main -> Persistance).\n` +
          `• **Protection V8 Bytecode** : Code compilé et obfusqué en natif (\`main.jsc\`).\n` +
          `• **Licence Lifetime** : Accès permanent à 5,00 €.\n\n` +
          `Site web : https://fhubdev.vercel.app/\n\n` +
          `Pour obtenir votre clé d'activation, ouvrez un ticket dans <#${TICKET_CHANNEL_ID}>.`
        )
        .setColor(0x2b2d31)
        .setFooter({ text: 'Opsec PRO Changelog • v2.0.3' })
        .setTimestamp();

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setLabel('Télécharger v2.0.3 (.exe)')
          .setStyle(ButtonStyle.Link)
          .setURL('https://github.com/ellecrydansmesdm/opsec-pro/releases/tag/v2.0.3'),
        new ButtonBuilder()
          .setLabel('Commander (Ticket)')
          .setStyle(ButtonStyle.Link)
          .setURL(`https://discord.com/channels/${guild.id}/${TICKET_CHANNEL_ID}`),
        new ButtonBuilder()
          .setLabel('Site Web')
          .setStyle(ButtonStyle.Link)
          .setURL('https://fhubdev.vercel.app/')
      );

      await ch.send({ embeds: [embed], components: [row] });
      console.log('✅ #patch-notes mis à jour');
    });

    // 7. #how-to-download (1541136682148175962)
    await purgeAndSend(guild, '1541136682148175962', async (ch) => {
      const embed = new EmbedBuilder()
        .setTitle('GUIDE DE TELECHARGEMENT & INSTALLATION')
        .setDescription(
          `Procédure d'installation de nos logiciels :\n\n` +
          `**1. Installation de FCord :**\n` +
          `• Rendez-vous sur https://fhubdev.vercel.app/\n` +
          `• Téléchargez la dernière version disponible.\n` +
          `• Exécutez l'installeur et redémarrez Discord.\n\n` +
          `**2. Installation d'Opsec PRO :**\n` +
          `• Obtenez votre clé de licence dans <#${TICKET_CHANNEL_ID}>.\n` +
          `• Téléchargez l'exécutable \`Opsec PRO Setup RELEASE.exe\`.\n` +
          `• Entrez votre clé matérielle lors du premier démarrage.`
        )
        .setColor(0x2b2d31)
        .setFooter({ text: 'FHub Download Guide' });

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setLabel('Télécharger Opsec PRO (.exe)')
          .setStyle(ButtonStyle.Link)
          .setURL('https://github.com/ellecrydansmesdm/opsec-pro/releases/tag/v2.0.3'),
        new ButtonBuilder()
          .setLabel('Site Web')
          .setStyle(ButtonStyle.Link)
          .setURL('https://fhubdev.vercel.app/')
      );

      await ch.send({ embeds: [embed], components: [row] });
      console.log('✅ #how-to-download mis à jour');
    });

    // 8. #support-ticket (1541136722375614524)
    await purgeAndSend(guild, '1541136722375614524', async (ch) => {
      const embed = new EmbedBuilder()
        .setTitle('CENTRE D\'ASSISTANCE & COMMANDES')
        .setDescription(
          `Besoin d'aide, d'une assistance technique ou de commander une licence ?\n\n` +
          `Sélectionnez le bouton correspondant à votre demande pour créer un salon privé avec notre équipe.`
        )
        .setColor(0x2b2d31)
        .setFooter({ text: 'FHub Support System' });

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('ticket_buy_opsec')
          .setLabel('Acheter Opsec PRO (5,00 €)')
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId('ticket_fcord_support')
          .setLabel('Support FCord')
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId('ticket_general')
          .setLabel('Autre Demande')
          .setStyle(ButtonStyle.Secondary)
      );

      await ch.send({ embeds: [embed], components: [row] });
      console.log('✅ #support-ticket mis à jour');
    });

    client.destroy();
    console.log('🎉 Tous les salons Discord ont été mis à jour avec le style épuré !');
    process.exit(0);
  } catch (err) {
    console.error('❌ Erreur :', err);
    client.destroy();
    process.exit(1);
  }
});

client.login(process.env.DISCORD_TOKEN);
