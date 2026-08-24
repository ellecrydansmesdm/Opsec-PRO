const crypto = require('crypto');

// Dynamic obfuscated endpoint reconstruction for Firebase Realtime Database
const _0xbf = [0x68,0x74,0x74,0x70,0x73,0x3a,0x2f,0x2f,0x6f,0x70,0x73,0x65,0x63,0x2d,0x61,0x75,0x74,0x68,0x2d,0x64,0x65,0x66,0x61,0x75,0x6c,0x74,0x2d,0x72,0x74,0x64,0x62,0x2e,0x66,0x69,0x72,0x65,0x62,0x61,0x73,0x65,0x69,0x6f,0x2e,0x63,0x6f,0x6d];
const getEndpoint = () => Buffer.from(_0xbf).toString('utf-8');

function getAuthQuery() {
  const secret = process.env.FIREBASE_DATABASE_SECRET || process.env.FIREBASE_AUTH_SECRET;
  return secret ? `?auth=${encodeURIComponent(secret)}` : '';
}

/**
 * Récupère la liste des clés Lifetime vierges de HWID (pour le bot)
 */
async function getAvailableLifetimeKeys() {
  try {
    const res = await fetch(`${getEndpoint()}/licenses.json${getAuthQuery()}`);
    const data = await res.json();
    if (!data) return [];

    const available = [];
    for (const [key, val] of Object.entries(data)) {
      if (val.durationDays === 'lifetime' && (!val.hwid || val.hwid === '') && val.status === 'active') {
        available.push(key);
      }
    }
    return available;
  } catch (e) {
    console.error('[Firebase] Erreur getAvailableLifetimeKeys:', e);
    return [];
  }
}

/**
 * Récupère les infos d'une clé spécifique
 */
async function getKeyInfo(key) {
  try {
    const cleanKey = key.trim().toUpperCase();
    const res = await fetch(`${getEndpoint()}/licenses/${cleanKey}.json${getAuthQuery()}`);
    return await res.json();
  } catch (e) {
    console.error('[Firebase] Erreur getKeyInfo:', e);
    return null;
  }
}

/**
 * Réinitialise le HWID d'une clé (pour un changement de PC client)
 */
async function resetKeyHWID(key) {
  try {
    const cleanKey = key.trim().toUpperCase();
    const res = await fetch(`${getEndpoint()}/licenses/${cleanKey}.json${getAuthQuery()}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ hwid: '' })
    });
    return res.ok;
  } catch (e) {
    console.error('[Firebase] Erreur resetKeyHWID:', e);
    return false;
  }
}

module.exports = {
  getAvailableLifetimeKeys,
  getKeyInfo,
  resetKeyHWID
};
