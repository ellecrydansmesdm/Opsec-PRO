require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { Client, GatewayIntentBits } = require('discord.js');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildPresences
  ]
});

client.once('ready', async () => {
  const guild = client.guilds.cache.first();
  if (!guild) process.exit(1);

  console.log(`\n======================================================`);
  console.log(`🔍 AUDIT DES RÔLES & PERMISSIONS : ${guild.name}`);
  console.log(`======================================================\n`);

  const roles = await guild.roles.fetch();
  const sorted = [...roles.values()].sort((a, b) => b.position - a.position);

  sorted.forEach(r => {
    const perms = r.permissions.toArray();
    console.log(`[Pos ${r.position.toString().padStart(2, '0')}] ${r.name} (${r.id})`);
    console.log(`   Color: ${r.hexColor} | Hoist: ${r.hoist} | Mentionable: ${r.mentionable}`);
    console.log(`   Permissions (${perms.length}): ${perms.slice(0, 10).join(', ')}${perms.length > 10 ? ' ...' : ''}`);
    console.log('------------------------------------------------------');
  });

  process.exit(0);
});

client.login(process.env.DISCORD_TOKEN);
