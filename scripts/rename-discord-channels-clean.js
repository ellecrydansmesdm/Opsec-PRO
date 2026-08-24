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

// Mapping des renommages propres (sans emojis / sans points japonais '・')
const CHANNEL_RENAMES = {
  // Catégories
  '1541136581270831155': 'PROJETS & RELEASES',
  '1541136610228441088': 'LOGS & SECURITE',

  // Salons textuels
  '1541136634840617050': 'verify',
  '1541136650418126918': 'reglement',
  '1541136654440333382': 'charte-langue',
  '1541136657527480422': 'announcements',
  '1541136661885231164': 'giveaways',
  '1541136737051349062': 'fcord',
  '1541136743955431515': 'opsec-pro',
  '1541136678264250491': 'open-source',
  '1541136674766196859': 'patch-notes',
  '1541136682148175962': 'how-to-download',
  '1541136697411240016': 'general',
  '1541136711709364344': 'bot-commands',
  '1541136715454873670': 'vos-idees',
  '1541136722375614524': 'support-ticket',
  '1541136814776131624': 'staff-lounge',
  '1541136837353938975': 'do-not-type',

  // Salons vocaux de stats
  '1541136613504196608': 'Membres: 2',
  '1541136616985198753': 'Humains: 1',
  '1541136620462542898': 'Bots: 1'
};

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

client.once('ready', async () => {
  try {
    console.log(`🤖 Bot connecté : ${client.user.tag}`);
    const guild = client.guilds.cache.first();
    if (!guild) {
      console.error('❌ Aucun serveur trouvé.');
      process.exit(1);
    }

    console.log(`📡 Serveur : ${guild.name} (${guild.id})`);
    console.log(`🧹 Renommage propre de tous les salons et catégories (sans emojis)...`);

    const channels = await guild.channels.fetch();

    for (const [id, targetName] of Object.entries(CHANNEL_RENAMES)) {
      const ch = channels.get(id);
      if (!ch) {
        console.warn(`⚠️ Salon ID ${id} introuvable sur le serveur.`);
        continue;
      }

      if (ch.name === targetName) {
        console.log(`⚡ Déjà à jour : "${ch.name}" (${id})`);
        continue;
      }

      const oldName = ch.name;
      try {
        await ch.setName(targetName);
        console.log(`✅ Renommé : "${oldName}" ➔ "${targetName}" (${id})`);
      } catch (err) {
        console.error(`❌ Erreur renommage ${oldName} (${id}) : ${err.message}`);
      }

      // Petite pause pour respecter les rate-limits Discord sur les modifications de channels
      await delay(800);
    }

    console.log(`\n🎉 Tous les salons et catégories ont été renommés proprement sans emojis !`);
    client.destroy();
    process.exit(0);
  } catch (err) {
    console.error('❌ Erreur globale :', err);
    client.destroy();
    process.exit(1);
  }
});

client.login(process.env.DISCORD_TOKEN);
