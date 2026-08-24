const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const X64DBG_DIR = 'C:\\Users\\dell\\tools\\x64dbg\\release\\x64';
const X64DBG_EXE = path.join(X64DBG_DIR, 'x64dbg.exe');

async function isPortListening() {
  try {
    const res = await fetch('http://127.0.0.1:9094/');
    return true;
  } catch (err) {
    return false;
  }
}

async function callTool(token, name, args = {}) {
  const res = await fetch('http://127.0.0.1:9094/', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
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
  console.log('==> 1. Démarrage de x64dbg...');
  const proc = spawn(X64DBG_EXE, [], {
    detached: true,
    stdio: 'ignore',
    cwd: X64DBG_DIR
  });
  proc.unref();

  console.log('==> 2. Attente de la disponibilité du serveur MCP...');
  let ready = false;
  for (let i = 0; i < 15; i++) {
    await new Promise(r => setTimeout(r, 1000));
    if (await isPortListening()) {
      ready = true;
      break;
    }
  }

  if (!ready) {
    console.error('❌ Le serveur MCP x64dbg n’a pas répondu à temps.');
    return;
  }

  const configPath = path.join(X64DBG_DIR, 'mcp_config.json');
  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  const token = config.AuthToken;

  console.log(`✅ Serveur MCP en ligne sur http://127.0.0.1:9094/ (Auth Token: ${token})`);

  console.log('\n==> 3. Envoi de l’outil Echo...');
  const echoRes = await callTool(token, 'Echo', { message: 'Connexion Antigravity AI confirmée !' });
  console.log('Echo Response :', JSON.stringify(echoRes.result || echoRes, null, 2));

  console.log('\n==> 4. État du débogueur (GetDebugState)...');
  const stateRes = await callTool(token, 'GetDebugState');
  console.log('Debug State :', JSON.stringify(stateRes.result || stateRes, null, 2));

  console.log('\n==> 5. Exécution d’une commande x64dbg (ExecuteDebuggerCommand)...');
  const cmdRes = await callTool(token, 'ExecuteDebuggerCommand', {
    command: 'log "Antigravity AI connected to x64dbg Engine."'
  });
  console.log('Command Result :', JSON.stringify(cmdRes.result || cmdRes, null, 2));

  console.log('\n🎉 TEST COMPLET VALITÉ !');
}

main().catch(console.error);
