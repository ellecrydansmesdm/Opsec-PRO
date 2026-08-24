const fs = require('fs');
const path = require('path');
const https = require('https');

const targetDir = path.join(__dirname, '..', 'src', 'assets', 'badges');
if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
}

const BADGE_MAP = {
    // Legacy Username & Quests & Orbs
    'legacy_username.png': 'https://cdn.discordapp.com/badge-icons/6de6d34650760ba5551a79732e98ed60.png',
    'discord_quests.png': 'https://cdn.discordapp.com/badge-icons/7d9ae358c8c5e118768335dbe68b4fb8.png',
    'discord_orbs.png': 'https://cdn.discordapp.com/badge-icons/83d8a1eb09a8d64e59233eec5d4d5c2d.png',

    // Core Badges
    'discord_staff.png': 'https://cdn.discordapp.com/badge-icons/5e74e9b61934fc1f67c65515d1f7e60d.png',
    'partnered_server_owner.png': 'https://cdn.discordapp.com/badge-icons/3f9748e53446a137a052f3454e2de41e.png',
    'hypesquad_events.png': 'https://cdn.discordapp.com/badge-icons/bf01d1073931f921909045f3a39fd264.png',
    'bug_hunter_level_1.png': 'https://cdn.discordapp.com/badge-icons/2717692c7dca7289b35297368a940dd0.png',
    'hypesquad_bravery.png': 'https://cdn.discordapp.com/badge-icons/8a88d63823d8a71cd5e390baa45efa02.png',
    'hypesquad_brilliance.png': 'https://cdn.discordapp.com/badge-icons/011940fd013da3f7fb926e4a1cd2e618.png',
    'hypesquad_balance.png': 'https://cdn.discordapp.com/badge-icons/3aa41de486fa12454c3761e8e223442e.png',
    'early_supporter.png': 'https://cdn.discordapp.com/badge-icons/7060786766c9c840eb3019e725d2b358.png',
    'moderator_programs_alumni.png': 'https://cdn.discordapp.com/badge-icons/fee1624003e2fee35cb398e125dc479b.png',
    'bug_hunter_level_2.png': 'https://cdn.discordapp.com/badge-icons/848f79194d4be5ff5f81505cbd0ce1e6.png',
    'early_verified_bot_developer.png': 'https://cdn.discordapp.com/badge-icons/6df5892e0f35b051f8b61eace34f4967.png',

    // Nitro Evolving Badges (Official CDN PNGs)
    'nitro_0.png': 'https://cdn.discordapp.com/badge-icons/2ba85e8026a8614b640c2837bcdfe21b.png',
    'nitro_1.png': 'https://cdn.discordapp.com/badge-icons/4f33c4a9c64ce221936bd256c356f91f.png',
    'nitro_2.png': 'https://cdn.discordapp.com/badge-icons/4514fab914bdbfb4ad2fa23df76121a6.png',
    'nitro_3.png': 'https://cdn.discordapp.com/badge-icons/2895086c18d5531d499862e41d1155a6.png',
    'nitro_4.png': 'https://cdn.discordapp.com/badge-icons/0334688279c8359120922938dcb1d6f8.png',
    'nitro_5.png': 'https://cdn.discordapp.com/badge-icons/0d61871f72bb9a33a7ae568c1fb4f20a.png',
    'nitro_6.png': 'https://cdn.discordapp.com/badge-icons/11e2d339068b55d3a506cff34d3780f3.png',
    'nitro_7.png': 'https://cdn.discordapp.com/badge-icons/cd5e2cfd9d7f27a8cdcd3e8a8d5dc9f4.png',
    'nitro_8.png': 'https://cdn.discordapp.com/badge-icons/5b154df19c53dce2af92c9b61e6be5e2.png',

    // Server Boost Badges (Official CDN PNGs)
    'boost_1.png': 'https://cdn.discordapp.com/badge-icons/51040c70d4f20a921ad6674ff86fc95c.png',
    'boost_2.png': 'https://cdn.discordapp.com/badge-icons/0e4093c2b7046729797c5f8e08546098.png',
    'boost_3.png': 'https://cdn.discordapp.com/badge-icons/72bed924410c304dbe3d00a6e593ff59.png',
    'boost_4.png': 'https://cdn.discordapp.com/badge-icons/dfd7b4cd9ab3765103a3111f18544c44.png',
    'boost_5.png': 'https://cdn.discordapp.com/badge-icons/996b3e870e8a22ce519b3a50e6bdd52f.png',
    'boost_6.png': 'https://cdn.discordapp.com/badge-icons/991c9f39ee33d7537d9f408c3e53141e.png',
    'boost_7.png': 'https://cdn.discordapp.com/badge-icons/cb3ae83c15e970e8f3d410bc62cb8b99.png',
    'boost_8.png': 'https://cdn.discordapp.com/badge-icons/7142225d31238f6387d9f09efaa02759.png',
    'boost_9.png': 'https://cdn.discordapp.com/badge-icons/ec92202290b48d0879b7413d2dde3bab.png',

    // Gifting Badges
    'gifting_icon.png': 'https://cdn.discordapp.com/badge-icons/64f2413c9b9803661322aaad25826b62.png',
    'gifting_patron.png': 'https://cdn.discordapp.com/badge-icons/ac305d1b9481f312ce4419e7f8296558.png',
    'gifting_champion.png': 'https://cdn.discordapp.com/badge-icons/8b7792c4f65953d3ff564f23429cb79e.png',
    'gifting_luminary.png': 'https://cdn.discordapp.com/badge-icons/3119f5504b2cd09576a323908c7c3517.png',
    'gifting_hero.png': 'https://cdn.discordapp.com/badge-icons/77d65b1f210014a11eb1582ee06ab684.png',
    'gifting_legend.png': 'https://cdn.discordapp.com/badge-icons/7fe346cfc5da1340087d8759a9e7a395.png',
    'gifting_level.png': 'https://cdn.discordapp.com/badge-icons/ca105ad9cfc8580c765101d17bbb2323.png',

    // Account Age Veteran (1y -> 10y)
    'account_age_1y.png': 'https://cdn.discordapp.com/badge-icons/dda73966211a0c16533f8fcd9f1f27c27a628ef562927270e79df9b9c5e6cb12.png',
    'account_age_2y.png': 'https://cdn.discordapp.com/badge-icons/74e1884f930b0d69986f92aeea77d3ff3d3d00c540f386b63e6ebb382d5e927d.png',
    'account_age_3y.png': 'https://cdn.discordapp.com/badge-icons/217dab12dcb72d4c95f2863e9dddd5c42003345a001684ea55a736172f32eea1.png',
    'account_age_4y.png': 'https://cdn.discordapp.com/badge-icons/26b89419a4f562ab31a1a72eac04833aa1026af937f1d53c088ec258df3db84b.png',
    'account_age_5y.png': 'https://cdn.discordapp.com/badge-icons/1db184b6d10a61a37dc30efdc74d587560fac5291c8bb329977e93bb5a312602.png',
    'account_age_6y.png': 'https://cdn.discordapp.com/badge-icons/6b0f2ed5be272942eeabea3a0289027d164c7b1ce6a76166d1c928a57db762c5.png',
    'account_age_7y.png': 'https://cdn.discordapp.com/badge-icons/c095e3e73591843a22dc979d1fcfe3d6cf6841d1f51387d208d19f8bed01deb7.png',
    'account_age_8y.png': 'https://cdn.discordapp.com/badge-icons/867feeff5acd481c80bae557c586718fb5390bbaaa1cbde55fae296a7884e799.png',
    'account_age_9y.png': 'https://cdn.discordapp.com/badge-icons/a6f4c487be2aa012f41f1fba40e664f914ede9251f4b967d890ab5c065a29fb7.png',
    'account_age_10y.png': 'https://cdn.discordapp.com/badge-icons/1d8caace0299b12bcc469c35ce927e838abd9c645a22fe7c556f4394e57fa79b.png'
};

async function downloadFile(url, dest) {
    return new Promise((resolve, reject) => {
        const file = fs.createWriteStream(dest);
        https.get(url, (response) => {
            if (response.statusCode !== 200) {
                file.close();
                fs.unlinkSync(dest);
                return reject(new Error(`Failed to download ${url}: Status ${response.statusCode}`));
            }
            response.pipe(file);
            file.on('finish', () => {
                file.close();
                resolve();
            });
        }).on('error', (err) => {
            file.close();
            try { fs.unlinkSync(dest); } catch (_) {}
            reject(err);
        });
    });
}

async function run() {
    console.log(`📥 Downloading ${Object.keys(BADGE_MAP).length} official Discord CDN badge assets...\n`);
    let count = 0;
    for (const [filename, url] of Object.entries(BADGE_MAP)) {
        const dest = path.join(targetDir, filename);
        try {
            await downloadFile(url, dest);
            count++;
            console.log(`✅ [${count}/${Object.keys(BADGE_MAP).length}] Saved: ${filename}`);
        } catch (err) {
            console.error(`❌ Failed: ${filename} - ${err.message}`);
        }
    }
    console.log(`\n🎉 All ${count} official Discord badge assets downloaded successfully!`);
}

run();
