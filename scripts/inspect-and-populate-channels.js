const path = require('path');
const dotenv = require(path.join(__dirname, '..', 'fhub-bot', 'node_modules', 'dotenv'));
const { Client, GatewayIntentBits } = require(path.join(__dirname, '..', 'fhub-bot', 'node_modules', 'discord.js'));

dotenv.config({ path: path.join(__dirname, '..', 'fhub-bot', '.env') });

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

client.once('ready', async () => {
  try {
    const guild = client.guilds.cache.first();
    console.log(`Serveur: ${guild.name} (${guild.id})`);

    const channels = await guild.channels.fetch();
    const categories = [];
    const textChannels = [];
    const voiceChannels = [];

    channels.forEach(ch => {
      if (!ch) return;
      if (ch.type === 4) {
        categories.push({ id: ch.id, name: ch.name, position: ch.position });
      } else if (ch.type === 0 || ch.type === 5) {
        textChannels.push({
          id: ch.id,
          name: ch.name,
          parentId: ch.parentId,
          parentName: ch.parent?.name || 'SANS CATEGORIE',
          topic: ch.topic,
          position: ch.position
        });
      } else if (ch.type === 2) {
        voiceChannels.push({
          id: ch.id,
          name: ch.name,
          parentId: ch.parentId,
          parentName: ch.parent?.name || 'SANS CATEGORIE'
        });
      }
    });

    console.log('\n--- CATEGORIES ---');
    console.log(JSON.stringify(categories.sort((a, b) => a.position - b.position), null, 2));

    console.log('\n--- TEXT CHANNELS ---');
    console.log(JSON.stringify(textChannels.sort((a, b) => a.position - b.position), null, 2));

    console.log('\n--- VOICE CHANNELS ---');
    console.log(JSON.stringify(voiceChannels, null, 2));

    client.destroy();
  } catch (err) {
    console.error(err);
    client.destroy();
  }
});

client.login(process.env.DISCORD_TOKEN);
