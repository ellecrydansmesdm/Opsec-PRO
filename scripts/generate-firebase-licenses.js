const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

function generateOpsecKey() {
  const part = () => crypto.randomBytes(2).toString('hex').toUpperCase();
  return `OPSEC-${part()}-${part()}-${part()}`;
}

function buildLicenseDatabase({ lifetimeCount = 50, monthlyCount = 50, yearlyCount = 20 } = {}) {
  const database = {
    licenses: {},
    settings: {
      latestVersion: '2.0.2',
      maintenance: false,
      motd: 'Bienvenue sur Opsec PRO v2.0.2 • FHUB Ecosystem'
    }
  };

  const now = Date.now();

  // 1. Clés Lifetime (À vie)
  for (let i = 0; i < lifetimeCount; i++) {
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

  // 2. Clés 30 Jours (Mensuelles)
  for (let i = 0; i < monthlyCount; i++) {
    const key = generateOpsecKey();
    database.licenses[key] = {
      status: 'active',
      durationDays: 30,
      hwid: '',
      createdAt: now,
      activatedAt: null,
      notes: 'Monthly 30-Day License'
    };
  }

  // 3. Clés 365 Jours (Annuelles)
  for (let i = 0; i < yearlyCount; i++) {
    const key = generateOpsecKey();
    database.licenses[key] = {
      status: 'active',
      durationDays: 365,
      hwid: '',
      createdAt: now,
      activatedAt: null,
      notes: 'Yearly 1-Year License'
    };
  }

  return database;
}

const db = buildLicenseDatabase({ lifetimeCount: 50, monthlyCount: 30, yearlyCount: 10 });
const outPath = path.join(__dirname, '..', 'firebase-licenses-import.json');
fs.writeFileSync(outPath, JSON.stringify(db, null, 2));

console.log(`✅ Fichier JSON d'import généré avec succès à : ${outPath}`);
console.log(`📊 Total clés générées : ${Object.keys(db.licenses).length}`);
console.log(`  • Lifetime (À vie) : 50`);
console.log(`  • Monthly (30 Jours) : 30`);
console.log(`  • Yearly (1 An) : 10`);
