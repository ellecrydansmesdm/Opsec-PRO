require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { 
  Client, 
  GatewayIntentBits, 
  Collection, 
  REST, 
  Routes, 
  ActivityType 
} = require('discord.js');

const handleTicket = require('./handlers/ticketHandler');
const handleRules = require('./handlers/rulesHandler');
const handleHoneypot = require('./handlers/honeypotHandler');
const { initStatsCron } = require('./utils/statsManager');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.MessageContent
  ]
});

// Listener anti-spam Honeypot 24/7
client.on('messageCreate', async (message) => {
  try {
    await handleHoneypot(message);
  } catch (e) {
    console.error('[Honeypot] Erreur listener:', e);
  }
});

client.commands = new Collection();
const commands = [];

// Chargement des commandes Slash
const commandsPath = path.join(__dirname, 'commands');
if (fs.existsSync(commandsPath)) {
  const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
  for (const file of commandFiles) {
    const command = require(path.join(commandsPath, file));
    if ('data' in command && 'execute' in command) {
      client.commands.set(command.data.name, command);
      commands.push(command.data.toJSON());
    }
  }
}

// Enregistrement des commandes Slash auprès de l'API Discord
async function registerSlashCommands() {
  const token = process.env.DISCORD_TOKEN;
  const clientId = process.env.CLIENT_ID;
  const guildId = process.env.GUILD_ID;

  if (!token || !clientId) {
    console.log('⚠️ DISCORD_TOKEN ou CLIENT_ID manquant dans le .env, enregistrement des slash commands reporté.');
    return;
  }

  const rest = new REST({ version: '10' }).setToken(token);

  try {
    console.log(`📡 Enregistrement de ${commands.length} commandes Slash...`);
    // Enregistrement global
    await rest.put(Routes.applicationCommands(clientId), { body: commands });
    console.log('✅ Commandes Slash enregistrées globalement !');

    // Enregistrement immédiat sur chaque serveur où le bot est présent
    for (const [gId, g] of client.guilds.cache) {
      try {
        await rest.put(Routes.applicationGuildCommands(clientId, gId), { body: commands });
        console.log(`✅ Commandes Slash synchronisées sur le serveur : ${g.name} (${gId})`);
      } catch (err) {
        console.warn(`⚠️ Impossible d'enregistrer les commandes sur ${g.name}:`, err.message);
      }
    }
  } catch (error) {
    console.error('❌ Erreur enregistrement slash commands:', error);
  }
}

client.once('ready', async () => {
  console.log(`\n======================================================`);
  console.log(`🤖 FHUB CORE BOT CONNECTÉ EN TANT QUE : ${client.user.tag}`);
  console.log(`🛡️ Serveurs surveillés : ${client.guilds.cache.size}`);
  console.log(`======================================================\n`);

  // Définition de l'activité
  client.user.setPresence({
    activities: [
      {
        name: 'FHUB Community • /opsec',
        type: ActivityType.Watching
      }
    ],
    status: 'online'
  });

  await registerSlashCommands();
  initStatsCron(client);
});

// Gestionnaire d'interactions (Slash Commands & Boutons)
client.on('interactionCreate', async (interaction) => {
  try {
    // 1. Boutons Interactifs
    if (interaction.isButton()) {
      if (interaction.customId.startsWith('ticket_')) {
        delete require.cache[require.resolve('./handlers/ticketHandler')];
        const ticketHandler = require('./handlers/ticketHandler');
        return await ticketHandler(interaction);
      }
      if (interaction.customId === 'rules_accept' || interaction.customId === 'rules_ack' || interaction.customId === 'verify_member') {
        delete require.cache[require.resolve('./handlers/rulesHandler')];
        const rulesHandler = require('./handlers/rulesHandler');
        return await rulesHandler(interaction);
      }
    }

    // 2. Commandes Slash
    if (interaction.isChatInputCommand()) {
      const command = client.commands.get(interaction.commandName);
      if (!command) return;

      await command.execute(interaction);
    }
  } catch (err) {
    console.error(`❌ Erreur lors de l'exécution de l'interaction:`, err);
    const replyContent = { content: '❌ Une erreur est survenue lors du traitement.', ephemeral: true };
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(replyContent).catch(() => null);
    } else {
      await interaction.reply(replyContent).catch(() => null);
    }
  }
});

// Connexion du bot
const token = process.env.DISCORD_TOKEN;
if (token) {
  client.login(token).catch(err => {
    console.error('❌ Échec de connexion du bot:', err.message);
  });
} else {
  console.log('ℹ️ Prêt ! Veuillez renseigner votre DISCORD_TOKEN dans le fichier .env pour lancer le bot.');
}
