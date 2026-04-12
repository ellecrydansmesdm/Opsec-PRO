const { Client } = require('discord.js-selfbot-v13');
const client = new Client();
console.log(Object.keys(client.options));
console.log(client.options.syncStatus);
