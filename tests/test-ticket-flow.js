const path = require('path');
const dotenv = require(path.join(__dirname, '..', 'fhub-bot', 'node_modules', 'dotenv'));
const { Client, GatewayIntentBits } = require(path.join(__dirname, '..', 'fhub-bot', 'node_modules', 'discord.js'));
const handleTicket = require(path.join(__dirname, '..', 'fhub-bot', 'src', 'handlers', 'ticketHandler.js'));

dotenv.config({ path: path.join(__dirname, '..', 'fhub-bot', '.env') });

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages]
});

client.once('ready', async () => {
  try {
    const guild = client.guilds.cache.first();
    console.log('Testing on guild:', guild.name);

    const fakeInteraction = {
      client,
      customId: 'ticket_buy_opsec',
      user: { id: client.user.id, username: 'testuser', tag: client.user.tag },
      guild,
      reply: async (msg) => {
        console.log('Interaction reply called:', msg);
      }
    };

    console.log('Running handleTicket...');
    await handleTicket(fakeInteraction);
    console.log('✅ Ticket handler executed with zero errors!');

    // Clean up created test channel
    const testChannel = guild.channels.cache.find(c => c.name && c.name.startsWith('achat-opsec-testuser'));
    if (testChannel) {
      console.log('Cleaning up test channel:', testChannel.name);
      await testChannel.delete();
      console.log('✅ Test channel cleaned up!');
    }

    client.destroy();
    process.exit(0);
  } catch (err) {
    console.error('❌ Test failed:', err);
    client.destroy();
    process.exit(1);
  }
});

client.login(process.env.DISCORD_TOKEN);
