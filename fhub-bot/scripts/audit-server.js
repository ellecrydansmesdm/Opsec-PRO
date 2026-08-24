require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { Client, GatewayIntentBits, ChannelType } = require('discord.js');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMembers
  ]
});

const channelTypeMap = {
  [ChannelType.GuildText]: 'TEXT',
  [ChannelType.GuildVoice]: 'VOICE',
  [ChannelType.GuildCategory]: 'CATEGORY',
  [ChannelType.GuildAnnouncement]: 'ANNOUNCEMENT',
  [ChannelType.GuildStageVoice]: 'STAGE',
  [ChannelType.GuildForum]: 'FORUM'
};

client.once('ready', async () => {
  console.log(`\n======================================================`);
  console.log(`📡 BOT CONNECTÉ : ${client.user.tag} (ID: ${client.user.id})`);
  console.log(`======================================================\n`);

  if (client.guilds.cache.size === 0) {
    console.log('⚠️ Le bot n’est actuellement sur AUCUN serveur Discord !');
    console.log('👉 Invitez le bot avec ce lien administrateur :');
    console.log('https://discord.com/oauth2/authorize?client_id=1541146373246943344&permissions=8&integration_type=0&scope=bot\n');
    process.exit(0);
  }

  for (const [guildId, guild] of client.guilds.cache) {
    console.log(`\n======================================================`);
    console.log(`🏰 SERVEUR : ${guild.name} (ID: ${guild.id})`);
    console.log(`👥 Membres : ${guild.memberCount} | Propriétaire ID : ${guild.ownerId}`);
    console.log(`======================================================\n`);

    // 1. RÔLES
    console.log('--- 🎭 RÔLES DU SERVEUR ---');
    const roles = await guild.roles.fetch();
    const sortedRoles = [...roles.values()].sort((a, b) => b.position - a.position);
    sortedRoles.forEach(r => {
      console.log(`[Pos ${r.position.toString().padStart(2, '0')}] ${r.name} (ID: ${r.id}) - Couleur: ${r.hexColor} - Hoist: ${r.hoist}`);
    });

    // 2. SALONS & CATÉGORIES
    console.log('\n--- 📁 SALONS & CATÉGORIES ---');
    const channels = await guild.channels.fetch();
    const categories = channels.filter(c => c && c.type === ChannelType.GuildCategory);
    const noCatChannels = channels.filter(c => c && c.type !== ChannelType.GuildCategory && !c.parentId);

    if (noCatChannels.size > 0) {
      console.log('\n📂 [SANS CATÉGORIE]');
      noCatChannels.forEach(c => {
        const typeStr = channelTypeMap[c.type] || c.type;
        console.log(`   ├── 📄 #${c.name} (ID: ${c.id}) [${typeStr}]`);
      });
    }

    categories.forEach(cat => {
      console.log(`\n📁 CATÉGORIE : ${cat.name} (ID: ${cat.id})`);
      const childChannels = channels.filter(c => c && c.parentId === cat.id);
      childChannels.forEach(c => {
        const typeStr = channelTypeMap[c.type] || c.type;
        console.log(`   ├── 📄 #${c.name} (ID: ${c.id}) [${typeStr}]`);
      });
    });

    // 3. WEBHOOKS
    console.log('\n--- 🔗 WEBHOOKS DU SERVEUR ---');
    try {
      const webhooks = await guild.fetchWebhooks();
      if (webhooks.size === 0) {
        console.log('Aucun webhook existant sur le serveur.');
      } else {
        webhooks.forEach(w => {
          console.log(`- Webhook: ${w.name} (ID: ${w.id}) -> Salon: <#${w.channelId}>`);
        });
      }
    } catch (e) {
      console.log('Impossible de récupérer les webhooks (permissions manquantes ?):', e.message);
    }
  }

  process.exit(0);
});

client.login(process.env.DISCORD_TOKEN).catch(err => {
  console.error('❌ Erreur de connexion:', err.message);
  process.exit(1);
});
