const { Client } = require('discord.js-selfbot-v13');
const fs = require('fs');
const path = require('path');

const configPath = path.join(process.env.APPDATA, 'opsec-selfbot', 'opsec_config.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
const activeAccount = config.accounts.find(a => a.selected);

const client = new Client({ checkUpdate: false });

client.on('raw', (packet) => {
    if (packet.t === 'PRESENCE_UPDATE') {
        if (packet.d.user.id === client.user?.id) {
            console.log("RAW PRESENCE UPDATE FOR ME:", JSON.stringify(packet.d.activities.map(a => a.name)));
        }
    }
});

client.on('ready', () => {
    console.log(`Logged in as ${client.user.tag}`);
    console.log("Waiting for raw WebSocket packets...");
});

client.login(activeAccount.token);
