const fs = require('fs');
const path = require('path');

async function main() {
  const jsonPath = path.join(__dirname, '..', 'firebase-licenses-import.json');
  const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

  console.log(`📤 Envoi des ${Object.keys(data.licenses).length} clés vers Firebase...`);
  
  try {
    const res = await fetch('https://opsec-auth-default-rtdb.firebaseio.com/.json', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });

    if (res.ok) {
      const result = await res.json();
      console.log('✅ Base de données Firebase Realtime Database mise à jour avec succès !');
      console.log('📊 Total clés actives :', Object.keys(result.licenses || {}).length);
    } else {
      const errText = await res.text();
      console.log(`⚠️ Réponse Firebase (${res.status}):`, errText);
    }
  } catch (err) {
    console.error('❌ Erreur réseau Firebase:', err);
  }
}

main();
