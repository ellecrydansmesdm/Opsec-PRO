const fs = require('fs');
const path = require('path');
const https = require('https');

const configPath = path.join(process.env.APPDATA, 'opsec-selfbot', 'opsec_config.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
const activeAccount = config.accounts.find(a => a.selected);

const req = https.request({
    hostname: 'discord.com',
    port: 443,
    path: `/api/v9/users/${activeAccount.id}/profile?with_mutual_guilds=false`,
    method: 'GET',
    headers: {
        'Authorization': activeAccount.token,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    }
}, (res) => {
    let data = '';
    res.on('data', d => data += d);
    res.on('end', () => {
        try {
            const profile = JSON.parse(data);
            const userProfile = profile.user_profile || {};
            // Look for connected accounts or if presence is returned?
            // Actually Discord's profile endpoint doesn't return presence.
            console.log("Profile keys:", Object.keys(profile));
        } catch(e) {}
    });
});
req.end();
