const path = require('path');
const dotenv = require(path.join(__dirname, '..', 'fhub-bot', 'node_modules', 'dotenv'));
const { Client, GatewayIntentBits, PermissionFlagsBits } = require(path.join(__dirname, '..', 'fhub-bot', 'node_modules', 'discord.js'));

dotenv.config({ path: path.join(__dirname, '..', 'fhub-bot', '.env') });

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers]
});

client.once('ready', async () => {
  try {
    const guild = client.guilds.cache.first();
    console.log('Guild:', guild.name, guild.id);
    const botMember = await guild.members.fetch(client.user.id);
    console.log('Bot roles:', botMember.roles.cache.map(r => r.name + ' (' + r.id + ')'));
    console.log('Bot permissions Administrator:', botMember.permissions.has(PermissionFlagsBits.Administrator));
    console.log('Bot permissions ManageChannels:', botMember.permissions.has(PermissionFlagsBits.ManageChannels));
    
    const categoryId = process.env.TICKET_CATEGORY_ID;
    console.log('TICKET_CATEGORY_ID:', categoryId);
    const category = categoryId ? await guild.channels.fetch(categoryId).catch(() => null) : null;
    console.log('Category found:', category ? category.name + ' (type: ' + category.type + ')' : 'NOT FOUND');

    const staffRoleId = process.env.STAFF_ROLE_ID;
    console.log('STAFF_ROLE_ID:', staffRoleId);
    const staffRole = staffRoleId ? await guild.roles.fetch(staffRoleId).catch(() => null) : null;
    console.log('Staff role found:', staffRole ? staffRole.name : 'NOT FOUND');

    // List all channels currently under TICKET_CATEGORY_ID
    const allChannels = await guild.channels.fetch();
    const tickets = allChannels.filter(c => c.parentId === categoryId);
    console.log('Existing channels in ticket category:', tickets.map(c => c.name + ' (' + c.id + ')'));

    client.destroy();
  } catch (e) {
    console.error(e);
    client.destroy();
  }
});

client.login(process.env.DISCORD_TOKEN);
