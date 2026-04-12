const { Client } = require('discord.js-selfbot-v13');
const fs = require('fs');
const path = require('path');

const configPath = path.join(process.env.APPDATA, 'opsec-selfbot', 'opsec_config.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
const activeAccount = config.accounts.find(a => a.selected);

const client = new Client({ checkUpdate: false });

client.on('ready', async () => {
    console.log(`Logged in as ${client.user.tag}`);
    
    // Simulate what the animation engine does: set a custom status
    console.log("Setting a custom status (this might trample the local cache)...");
    await client.user.setPresence({
        activities: [{ name: 'Custom Status', type: 'CUSTOM', state: 'Testing...' }]
    });

    setInterval(async () => {
        console.log("--- CHECKING PRESENCE ---");
        console.log("ClientUser Activities:", JSON.stringify(client.user.presence.activities.map(a => a.name)));
        
        // Find self in ANY guild
        let found = false;
        for (const guild of client.guilds.cache.values()) {
            const me = guild.members.me;
            if (me && me.presence && me.presence.activities.length > 0) {
                console.log(`Found Presence in Guild [${guild.name}]:`, JSON.stringify(me.presence.activities.map(a => a.name)));
                found = true;
                break;
            }
        }
        if (!found) console.log("No presence found in any guild member cache.");
    }, 5000);
});

client.login(activeAccount.token);
