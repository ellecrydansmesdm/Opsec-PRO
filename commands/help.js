// Note: L'affichage de MessageEmbed() sur notre propre compte (selfbot) affiché aux autres n'est plus supporté par l'API Discord v10+, mais on l'édite avec un bloc code à la place pour un style hacker/premium

module.exports = {
    name: 'help',
    description: 'Affiche le The Ultimate Toolkit menu',
    async execute(message, args, client) {
        // En Selfbot il est souvent impossible d'envoyer des embeds "vides" en tant qu'utilisateur standard
        // On contourne ça en créant un rendu magnifique en bloc de code ansi/markdown
        
        const menu = `\`\`\`ansi
[1;34m================================================================[0m
[1;36m                 OPSEC - YOUR ULTIMATE TOOLKIT                  [0m
[1;34m================================================================[0m
[0m
Better notifications, commands everywhere, powerful automations, 
fun tools, and even some trolling.

[1;35m[🛠️] COMMANDE LIST[0m
[1;33m+help[0m           » Affiche ce menu The Ultimate Toolkit
[1;33m+clear [x][0m      » Supprime vos x derniers messages (Serveur & DMs)

[1;31m[⚠️] MODULES A VENIR[0m
- Sniper (Nitro / Giveaways)
- Trolling Tools (No-leave, Ghost-ping, etc.)
- User & Profile Animations (Bio, Custom Status)

[1;30mOpsec Selfbot • Built for Every Discord User[0m
\`\`\``;

        await message.edit(menu);
    }
};
