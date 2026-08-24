const fs = require('fs');
const path = require('path');

const SECRET = 'NQUOXN6Wjj8WJqI4y3kgP5aWMfcf1hTJCHYWfV3P';
const DB_URL = `https://opsec-auth-default-rtdb.firebaseio.com/.json?auth=${SECRET}`;

async function main() {
  const jsonPath = path.join(__dirname, '..', 'firebase-licenses-import.json');
  const payload = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

  console.log(`📡 Connexion à Firebase avec le Secret Admin...`);
  console.log(`📤 Écrasement des anciennes clés et injection des ${Object.keys(payload.licenses).length} nouvelles licences...`);

  try {
    const res = await fetch(DB_URL, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (res.ok) {
      const data = await res.json();
      console.log('🎉 BASE DE DONNÉES FIREBASE NETTOYÉE ET SYNCHRONISÉE AVEC SUCCÈS !');
      console.log(`📊 Clés en stock : ${Object.keys(data.licenses || {}).length}`);
      
      const lifetime = Object.entries(data.licenses).filter(([k, v]) => v.durationDays === 'lifetime').length;
      const monthly = Object.entries(data.licenses).filter(([k, v]) => v.durationDays === 30).length;
      const yearly = Object.entries(data.licenses).filter(([k, v]) => v.durationDays === 365).length;
      
      console.log(`  • Clés Lifetime (À vie) : ${lifetime}`);
      console.log(`  • Clés Monthly (30 Jours) : ${monthly}`);
      console.log(`  • Clés Yearly (1 An) : ${yearly}`);
    } else {
      const text = await res.text();
      console.error(`❌ Échec Firebase (${res.status}):`, text);
    }
  } catch (err) {
    console.error('❌ Erreur réseau:', err);
  }
}

main();
