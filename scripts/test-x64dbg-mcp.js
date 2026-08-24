const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const X64DBG_DIR = 'C:\\Users\\dell\\tools\\x64dbg\\release\\x64';
const X64DBG_EXE = path.join(X64DBG_DIR, 'x64dbg.exe');

async function checkEndpoint() {
  try {
    const res = await fetch('http://127.0.0.1:9094/');
    return { ok: true, status: res.status, headers: Object.fromEntries(res.headers.entries()) };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

async function main() {
  console.log('🔍 Vérification de la présence de x64dbg...');
  if (!fs.existsSync(X64DBG_EXE)) {
    console.error('❌ Exécutable introuvable :', X64DBG_EXE);
    return;
  }

  console.log('🚀 Lancement de x64dbg en arrière-plan...');
  const proc = spawn(X64DBG_EXE, [], {
    detached: true,
    stdio: 'ignore',
    cwd: X64DBG_DIR
  });
  proc.unref();

  console.log('⏳ Attente du démarrage du serveur MCP (port 9094)...');
  for (let i = 0; i < 20; i++) {
    await new Promise(r => setTimeout(r, 1000));
    const status = await checkEndpoint();
    if (status.ok) {
      console.log(`✅ Serveur MCP x64dbg détecté sur port 9094 ! (HTTP ${status.status})`);
      
      // Check if mcp_config.json was generated in X64DBG_DIR
      const configFiles = fs.readdirSync(X64DBG_DIR).filter(f => f.includes('mcp') || f.endsWith('.json') || f.endsWith('.ini'));
      console.log('📂 Fichiers de configuration générés :', configFiles);
      
      const config = JSON.parse(fs.readFileSync(path.join(X64DBG_DIR, 'mcp_config.json'), 'utf8'));
      const token = config.AuthToken;
      console.log(`🔑 Clé Auth Token détectée : ${token}`);

      // Let's test MCP tools/list
      try {
        const mcpReq = await fetch('http://127.0.0.1:9094/', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            jsonrpc: '2.0',
            id: 1,
            method: 'tools/list',
            params: {}
          })
        });
        
        const mcpRes = await mcpReq.json();
        console.log(`🛠️ Réponse MCP tools/list (Status ${mcpReq.status}) :`);
        if (mcpRes.result && mcpRes.result.tools) {
          console.log(`✨ ${mcpRes.result.tools.length} outils MCP disponibles !`);
          console.log('Liste des outils :', mcpRes.result.tools.map(t => t.name).join(', '));
        } else {
          console.log(mcpRes);
        }

        // Test tool: GetDebugState
        const stateReq = await fetch('http://127.0.0.1:9094/', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            jsonrpc: '2.0',
            id: 2,
            method: 'tools/call',
            params: {
              name: 'GetDebugState',
              arguments: {}
            }
          })
        });
        const stateRes = await stateReq.json();
        console.log('\n🎯 Test d’exécution outil GetDebugState :');
        console.log(JSON.stringify(stateRes, null, 2));

        // Test tool: Echo
        const echoReq = await fetch('http://127.0.0.1:9094/', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            jsonrpc: '2.0',
            id: 3,
            method: 'tools/call',
            params: {
              name: 'Echo',
              arguments: { message: 'Hello from Antigravity AI Pair Programmer!' }
            }
          })
        });
        const echoRes = await echoReq.json();
        console.log('\n💬 Test Echo :');
        console.log(JSON.stringify(echoRes, null, 2));

      } catch (e) {
        console.error('⚠️ Erreur requête MCP:', e.message);
      }
      
      return;
    }
  }
  
  console.error('❌ Délai dépassé: le serveur MCP x64dbg n’a pas répondu sur le port 9094.');
}

main();
