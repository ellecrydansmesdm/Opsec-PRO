const fs = require('fs');
const path = require('path');

const X64DBG_DIR = 'C:\\Users\\dell\\tools\\x64dbg\\release\\x64';
const config = JSON.parse(fs.readFileSync(path.join(X64DBG_DIR, 'mcp_config.json'), 'utf8'));
const TOKEN = config.AuthToken;

async function callTool(name, args = {}) {
  const res = await fetch('http://127.0.0.1:9094/', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${TOKEN}`
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: Date.now(),
      method: 'tools/call',
      params: {
        name,
        arguments: args
      }
    })
  });
  return await res.json();
}

async function main() {
  console.log('1️⃣ Chargement du binaire C:\\Windows\\notepad.exe...');
  const loadRes = await callTool('LoadBinary', {
    path: 'C:\\Windows\\notepad.exe'
  });
  console.log('Résultat LoadBinary :', JSON.stringify(loadRes, null, 2));

  await new Promise(r => setTimeout(r, 2000));

  console.log('\n2️⃣ Récupération de l’état du débogueur (GetDebugState)...');
  const stateRes = await callTool('GetDebugState');
  console.log(JSON.stringify(stateRes, null, 2));

  console.log('\n3️⃣ Récupération des registres (GetAllRegisters)...');
  const regRes = await callTool('GetAllRegisters');
  console.log(JSON.stringify(regRes, null, 2));

  console.log('\n4️⃣ Envoi d’une commande personnalisée au moteur de x64dbg (ExecuteDebuggerCommand)...');
  const cmdRes = await callTool('ExecuteDebuggerCommand', {
    command: 'log "Commande test réussie depuis Antigravity AI !"'
  });
  console.log(JSON.stringify(cmdRes, null, 2));
}

main().catch(console.error);
