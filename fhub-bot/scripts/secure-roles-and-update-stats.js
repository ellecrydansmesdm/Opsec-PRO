require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { 
  Client, 
  GatewayIntentBits, 
  PermissionFlagsBits 
} = require('discord.js');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildPresences
  ]
});

client.once('ready', async () => {
  console.log(`\n======================================================`);
  console.log(`🛡️ SÉCURISATION DES RÔLES & MISE À JOUR DES STATS VOCALES`);
  console.log(`======================================================\n`);

  const guild = client.guilds.cache.first();
  if (!guild) {
    console.error('❌ Aucun serveur trouvé.');
    process.exit(1);
  }

  // 1. CORRECTION DES FAILLLES DE SÉCURITÉ SUR LES RÔLES SÉPARATEURS
  console.log('🔒 [1/4] Retrait des permissions Admin sur les rôles décoratifs...');
  const dangerousSeparatorRoleIds = [
    '1541136464429973505', // //
    '1541136468142203050', // FHub Badge
    '1541136519350456370', // $
    '1541136525624877197'  // @
  ];

  for (const rId of dangerousSeparatorRoleIds) {
    const role = guild.roles.cache.get(rId);
    if (role) {
      try {
        await role.setPermissions([], 'Sécurisation: retrait permissions sur rôle décoratif');
        console.log(`  ✅ Permissions retirées sur : ${role.name} (${rId})`);
      } catch (e) {
        console.warn(`  ⚠️ Impossible de modifier le rôle ${rId}: ${e.message}`);
      }
    }
  }

  // 2. SÉCURISATION DU RÔLE @everyone (ANTI-RAID MENTIONS)
  console.log('\n🛡️ [2/4] Sécurisation du rôle @everyone (Anti-Mention Spam)...');
  try {
    const everyoneRole = guild.roles.everyone;
    const currentPerms = everyoneRole.permissions;
    // Retirer MentionEveryone
    const newPerms = currentPerms.remove(PermissionFlagsBits.MentionEveryone);
    await everyoneRole.setPermissions(newPerms, 'Sécurisation: désactivation MentionEveryone pour @everyone');
    console.log('  ✅ Permission MentionEveryone désactivée pour @everyone !');
  } catch (e) {
    console.warn(`  ⚠️ Erreur modification @everyone: ${e.message}`);
  }

  // 3. SUPPRESSION DES RÔLES DÉCHETS
  console.log('\n🧹 [3/4] Suppression des rôles résiduels inutiles...');
  const uselessRoleIds = [
    '1541136528670068877', // nouveau rôle
    '1541136538186948768', // nouveau rôle
    '1541136545648476200'  // booster test placeholder
  ];

  for (const rId of uselessRoleIds) {
    const role = guild.roles.cache.get(rId);
    if (role) {
      try {
        await role.delete('Nettoyage rôle résiduel');
        console.log(`  🗑️ Supprimé rôle : ${role.name} (${rId})`);
      } catch (e) {
        console.warn(`  ⚠️ Impossible de supprimer le rôle ${rId}: ${e.message}`);
      }
    }
  }

  // 4. VERROUILLAGE & ACTUALISATION DES SALONS STATS
  console.log('\n📊 [4/4] Actualisation dynamique des salons vocaux de stats...');
  const members = await guild.members.fetch();
  const totalCount = members.size;
  const botsCount = members.filter(m => m.user.bot).size;
  const humansCount = totalCount - botsCount;
  const customerRoleId = process.env.CUSTOMER_ROLE_ID;
  const customersCount = customerRoleId ? members.filter(m => m.roles.cache.has(customerRoleId)).size : 0;

  const statChannels = [
    { id: '1541136613504196608', name: `👥 Membres: ${totalCount}` },
    { id: '1541136616985198753', name: `🛡️ Humains: ${humansCount}` },
    { id: '1541136620462542898', name: customersCount > 0 ? `💎 Clients: ${customersCount}` : `🤖 Bots: ${botsCount}` }
  ];

  for (const sc of statChannels) {
    const ch = guild.channels.cache.get(sc.id);
    if (ch) {
      try {
        await ch.setName(sc.name);
        // Verrouiller pour que personne ne puisse s'y connecter
        await ch.permissionOverwrites.edit(guild.roles.everyone, {
          ViewChannel: true,
          Connect: false
        });
        console.log(`  ✅ Salon Stat mis à jour : ${sc.name}`);
      } catch (e) {
        console.error(`  ❌ Erreur mise à jour stat ${sc.id}:`, e.message);
      }
    }
  }

  console.log('\n======================================================');
  console.log('🎉 AUDIT DES RÔLES & STATS TERMINÉ AVEC SUCCÈS !');
  console.log(`👥 Chiffres réels : Total: ${totalCount} | Humains: ${humansCount} | Bots: ${botsCount}`);
  console.log('======================================================\n');

  process.exit(0);
});

client.login(process.env.DISCORD_TOKEN).catch(err => {
  console.error('❌ Erreur de connexion:', err.message);
  process.exit(1);
});
