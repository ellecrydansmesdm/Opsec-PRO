const logger = require('../utils/logger');

module.exports = {
    name: 'clear',
    description: 'Efface vos propres messages du channel ou des MPs',
    async execute(message, args, client) {
        // Validation de l'argument (+clear 10)
        let limit = args[0] ? parseInt(args[0]) : 10;
        
        if (isNaN(limit) || limit <= 0) {
            return message.edit('❌ Veuillez fournir un nombre valide (ex: `+clear 10`)');
        }

        // On se limite à 100 max d'une traite par sécurité API
        if (limit > 100) limit = 100;

        await message.edit(`🔄 **Clear Opsec** : Recherche de vos ${limit} derniers messages...`);

        try {
            // Fetch des messages du channel/DM (100 maximum par call Discord API)
            // On fetch 100 messages en espérant qu'il y ait 'limit' messages de l'utilisateur dedans.
            const fetched = await message.channel.messages.fetch({ limit: 100 });
            
            // On filtre pour ne garder que VOS messages
            const myMessages = fetched.filter(m => m.author.id === client.user.id).first(limit);
            
            if (myMessages.length === 0) {
                return message.edit(`❌ Aucun message de vous trouvé dans les 100 derniers du salon.`);
            }

            let deleted = 0;
            // On supprime msg par msg car le bulkDelete est STRICTEMENT RESERVÉ aux bot accounts. Un user aura une erreur 403.
            for (const msg of myMessages) {
                if (msg.deletable) {
                    await msg.delete();
                    deleted++;
                    // Delay anti API rate-limit (très important pour les selfbots : sinon = ban)
                    await new Promise(r => setTimeout(r, 650)); 
                }
            }
            logger.success(`[CLEAR] Terminé avec succès: ${deleted} messages effacés !`);
        } catch (err) {
            logger.error(`[CLEAR ERROR] ${err.stack}`);
        }
    }
};
