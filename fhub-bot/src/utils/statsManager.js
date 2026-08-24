/**
 * Dynamic Server Stats Manager (Voice Channels Counters)
 * Respects Discord rate limits (updates every 10 minutes or on member join/leave debounced)
 */

const STATS_CHANNELS = {
  total: '1541136613504196608',    // Users / Total
  humans: '1541136616985198753',   // Humains
  botsOrClients: '1541136620462542898' // Bots / Clients
};

let lastUpdate = 0;
const RATE_LIMIT_DELAY = 10 * 60 * 1000; // 10 minutes

async function updateServerStats(guild) {
  const now = Date.now();
  if (now - lastUpdate < RATE_LIMIT_DELAY && lastUpdate !== 0) {
    return; // Évite d'être rate-limit par Discord
  }

  try {
    const members = await guild.members.fetch();
    const totalCount = members.size;
    const botsCount = members.filter(m => m.user.bot).size;
    const humansCount = totalCount - botsCount;
    
    // Rôle client si configuré
    const customerRoleId = process.env.CUSTOMER_ROLE_ID;
    const customersCount = customerRoleId ? members.filter(m => m.roles.cache.has(customerRoleId)).size : 0;

    // 1. Total Membres
    const totalChannel = guild.channels.cache.get(STATS_CHANNELS.total);
    if (totalChannel) {
      const newName = `Membres: ${totalCount}`;
      if (totalChannel.name !== newName) {
        await totalChannel.setName(newName).catch(() => null);
      }
    }

    // 2. Humains
    const humansChannel = guild.channels.cache.get(STATS_CHANNELS.humans);
    if (humansChannel) {
      const newName = `Humains: ${humansCount}`;
      if (humansChannel.name !== newName) {
        await humansChannel.setName(newName).catch(() => null);
      }
    }

    // 3. Clients Opsec ou Bots
    const thirdChannel = guild.channels.cache.get(STATS_CHANNELS.botsOrClients);
    if (thirdChannel) {
      const newName = customersCount > 0 ? `Clients: ${customersCount}` : `Bots: ${botsCount}`;
      if (thirdChannel.name !== newName) {
        await thirdChannel.setName(newName).catch(() => null);
      }
    }

    lastUpdate = now;
    console.log(`[Stats] 📊 Salons vocaux mis à jour : Total: ${totalCount} | Humains: ${humansCount} | Clients: ${customersCount}`);
  } catch (err) {
    console.error('[Stats] Erreur mise à jour stats:', err.message);
  }
}

function initStatsCron(client) {
  // Mise à jour immédiate au démarrage
  const guild = client.guilds.cache.first();
  if (guild) {
    updateServerStats(guild);
  }

  // Intervalle régulier toutes les 10 minutes
  setInterval(() => {
    const g = client.guilds.cache.first();
    if (g) updateServerStats(g);
  }, RATE_LIMIT_DELAY);

  // Événements d'arrivée / départ
  client.on('guildMemberAdd', (member) => {
    updateServerStats(member.guild);
  });

  client.on('guildMemberRemove', (member) => {
    updateServerStats(member.guild);
  });
}

module.exports = {
  updateServerStats,
  initStatsCron
};
