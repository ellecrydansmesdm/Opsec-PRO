const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const SECRET = 'NQUOXN6Wjj8WJqI4y3kgP5aWMfcf1hTJCHYWfV3P';
const DB_URL = `https://opsec-auth-default-rtdb.firebaseio.com/.json?auth=${SECRET}`;

function generateOpsecKey() {
  const part = () => crypto.randomBytes(2).toString('hex').toUpperCase();
  return `OPSEC-${part()}-${part()}-${part()}`;
}

async function main() {
  const count = 100;
  const now = Date.now();
  const database = {
    licenses: {},
    settings: {
      latestVersion: '2.0.2',
      maintenance: false,
      motd: 'Bienvenue sur Opsec PRO v2.0.2 • FHUB Ecosystem'
    }
  };

  for (let i = 0; i < count; i++) {
    const key = generateOpsecKey();
    database.licenses[key] = {
      status: 'active',
      durationDays: 'lifetime',
      hwid: '',
      createdAt: now,
      activatedAt: null,
      notes: 'Lifetime License'
    };
  }

  // Save local json
  const outPath = path.join(__dirname, '..', 'firebase-licenses-import.json');
  fs.writeFileSync(outPath, JSON.stringify(database, null, 2));

  console.log(`📤 Injection de ${count} clés 100% LIFETIME dans Firebase...`);

  try {
    const res = await fetch(DB_URL, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(database)
    });

    if (res.ok) {
      const data = await res.json();
      console.log('🎉 BASE FIREBASE 100% LIFETIME SYNCHRONISÉE AVEC SUCCÈS !');
      console.log(`📊 Total clés Lifetime en stock : ${Object.keys(data.licenses || {}).length}`);
      console.log('✅ Aucune clé mensuelle ou temporaire. Uniquement du Lifetime.');
    } else {
      console.error(`❌ Échec:`, await res.text());
    }
  } catch (err) {
    console.error('❌ Erreur réseau:', err);
  }
}

main();
