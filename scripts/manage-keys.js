/**
 * Opsec PRO — License Key Manager CLI
 * 
 * Usage:
 *   node scripts/manage-keys.js list             -> Affiche toutes les clés Lifetime vierges prêtes à la vente
 *   node scripts/manage-keys.js generate <count>  -> Génère <count> nouvelles clés Lifetime dans Firebase
 *   node scripts/manage-keys.js reset <key>       -> Réinitialise le HWID d'une clé client
 */

const crypto = require('crypto');
const path = require('path');
const dotenv = require(path.join(__dirname, '..', 'fhub-bot', 'node_modules', 'dotenv'));

dotenv.config({ path: path.join(__dirname, '..', 'fhub-bot', '.env') });

const SECRET = process.env.FIREBASE_DATABASE_SECRET || 'NQUOXN6Wjj8WJqI4y3kgP5aWMfcf1hTJCHYWfV3P';
const FIREBASE_URL = 'https://opsec-auth-default-rtdb.firebaseio.com';
const getAuthQuery = () => `?auth=${SECRET}`;

function generateRandomKey() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const block = (len) => {
    let res = '';
    const bytes = crypto.randomBytes(len);
    for (let i = 0; i < len; i++) {
      res += chars[bytes[i] % chars.length];
    }
    return res;
  };
  return `OPSEC-${block(4)}-${block(4)}-${block(4)}`;
}

async function listAvailableKeys() {
  console.log('\n📡 Interrogation de la base de données Firebase...');
  try {
    const res = await fetch(`${FIREBASE_URL}/licenses.json${getAuthQuery()}`);
    const data = await res.json();
    if (!data) {
      console.log('❌ Aucune clé trouvée.');
      return;
    }

    const availableLifetime = [];
    const usedLifetime = [];
    const others = [];

    for (const [key, info] of Object.entries(data)) {
      if (info.durationDays === 'lifetime') {
        if (!info.hwid || info.hwid === '') {
          availableLifetime.push(key);
        } else {
          usedLifetime.push({ key, hwid: info.hwid.slice(0, 12) + '...' });
        }
      } else {
        others.push({ key, duration: info.durationDays });
      }
    }

    console.log('\n======================================================');
    console.log(`🔑 CLÉS LIFETIME DISPONIBLES À LA VENTE (5€) : ${availableLifetime.length}`);
    console.log('======================================================');
    availableLifetime.forEach((k, idx) => {
      console.log(`  [${(idx + 1).toString().padStart(2, '0')}] ${k}`);
    });

    console.log('\n------------------------------------------------------');
    console.log(`🔒 Clés Lifetime déjà activées (liées à un PC) : ${usedLifetime.length}`);
    console.log(`📦 Autres clés (temporaires) : ${others.length}`);
    console.log('------------------------------------------------------\n');

  } catch (e) {
    console.error('❌ Erreur:', e.message);
  }
}

async function generateKeys(count = 5) {
  console.log(`\n🚀 Génération de ${count} clés Lifetime (5€)...`);
  const newKeys = [];
  const payload = {};
  const now = Date.now();

  for (let i = 0; i < count; i++) {
    const key = generateRandomKey();
    newKeys.push(key);
    payload[key] = {
      createdAt: now,
      durationDays: 'lifetime',
      hwid: '',
      status: 'active'
    };
  }

  try {
    const res = await fetch(`${FIREBASE_URL}/licenses.json${getAuthQuery()}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (res.ok) {
      console.log(`✅ ${count} clés générées et injectées avec succès dans Firebase !\n`);
      newKeys.forEach((k, idx) => {
        console.log(`  [${(idx + 1).toString().padStart(2, '0')}] ${k}`);
      });
      console.log('\n');
    } else {
      console.error(`❌ Échec Firebase: code ${res.status}`);
    }
  } catch (e) {
    console.error('❌ Erreur:', e.message);
  }
}

async function resetKey(key) {
  if (!key) {
    console.log('❌ Veuillez spécifier la clé à réinitialiser. Ex: node scripts/manage-keys.js reset OPSEC-XXXX-XXXX-XXXX');
    return;
  }
  const cleanKey = key.trim().toUpperCase();
  console.log(`\n🔄 Réinitialisation du HWID pour la clé : ${cleanKey}...`);

  try {
    const checkRes = await fetch(`${FIREBASE_URL}/licenses/${cleanKey}.json${getAuthQuery()}`);
    const data = await checkRes.json();

    if (!data) {
      console.log(`❌ Clé ${cleanKey} introuvable.`);
      return;
    }

    const patchRes = await fetch(`${FIREBASE_URL}/licenses/${cleanKey}.json${getAuthQuery()}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ hwid: '' })
    });

    if (patchRes.ok) {
      console.log(`✅ HWID réinitialisé avec succès ! Le client peut maintenant activer la clé sur son nouveau PC.\n`);
    } else {
      console.error(`❌ Échec Firebase: code ${patchRes.status}`);
    }
  } catch (e) {
    console.error('❌ Erreur:', e.message);
  }
}

const args = process.argv.slice(2);
const command = args[0] || 'list';

if (command === 'list') {
  listAvailableKeys();
} else if (command === 'generate') {
  const count = parseInt(args[1] || '5', 10);
  generateKeys(count);
} else if (command === 'reset') {
  resetKey(args[1]);
} else {
  console.log(`
Usage:
  node scripts/manage-keys.js list             -> Lister les clés vierges disponibles
  node scripts/manage-keys.js generate <n>     -> Créer <n> clés Lifetime dans Firebase
  node scripts/manage-keys.js reset <key>      -> Réinitialiser le HWID d'une clé
`);
}
