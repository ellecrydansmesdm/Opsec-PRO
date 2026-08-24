const fs = require('fs');
const path = require('path');
const https = require('https');
const { execSync } = require('child_process');

const TOOLS_DIR = 'C:\\Users\\dell\\tools\\x64dbg';
const MCP_REPO_ZIP = 'https://github.com/duty1g/x64dbg-mcp-server/releases/download/1.0/x64dbg-MCP-Server-v1.0.zip';
const X64DBG_ZIP = 'https://github.com/x64dbg/x64dbg/releases/download/snapshot/snapshot_2025-03-15_15-57.zip';

function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    console.log(`📥 Téléchargement: ${url} -> ${dest}`);
    const file = fs.createWriteStream(dest);
    
    function get(u) {
      https.get(u, (response) => {
        if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
          return get(response.headers.location);
        }
        if (response.statusCode !== 200) {
          return reject(new Error(`Failed to download ${u}: status ${response.statusCode}`));
        }
        response.pipe(file);
        file.on('finish', () => {
          file.close(resolve);
        });
      }).on('error', (err) => {
        fs.unlink(dest, () => reject(err));
      });
    }
    
    get(url);
  });
}

async function main() {
  if (!fs.existsSync(TOOLS_DIR)) {
    fs.mkdirSync(TOOLS_DIR, { recursive: true });
  }

  const x64dbgZipPath = path.join(TOOLS_DIR, 'x64dbg.zip');
  const mcpZipPath = path.join(TOOLS_DIR, 'mcp.zip');

  // 1. Download x64dbg
  if (!fs.existsSync(path.join(TOOLS_DIR, 'release', 'x64', 'x64dbg.exe'))) {
    await downloadFile(X64DBG_ZIP, x64dbgZipPath);
    console.log('📦 Extraction de x64dbg...');
    execSync(`powershell -Command "Expand-Archive -Path '${x64dbgZipPath}' -DestinationPath '${TOOLS_DIR}' -Force"`);
    fs.unlinkSync(x64dbgZipPath);
  } else {
    console.log('ℹ️ x64dbg déjà présent.');
  }

  // 2. Download x64dbg MCP plugin
  await downloadFile(MCP_REPO_ZIP, mcpZipPath);
  console.log('📦 Extraction du plugin x64dbg-MCP-Server...');
  const mcpTemp = path.join(TOOLS_DIR, 'mcp_temp');
  if (fs.existsSync(mcpTemp)) {
    fs.rmSync(mcpTemp, { recursive: true, force: true });
  }
  execSync(`powershell -Command "Expand-Archive -Path '${mcpZipPath}' -DestinationPath '${mcpTemp}' -Force"`);
  fs.unlinkSync(mcpZipPath);

  // 3. Find release root and copy plugin files into release/x64/plugins and release/x32/plugins
  console.log('📂 Contenu de mcp_temp :');
  const files = fs.readdirSync(mcpTemp, { recursive: true });
  console.log(files);

  const releaseRoot = path.join(TOOLS_DIR, 'release');
  
  // Find where .dp64 and .dp32 are located in mcpTemp
  function copyIfExists(srcRelative, destRelative) {
    const src = path.join(mcpTemp, srcRelative);
    const dest = path.join(releaseRoot, destRelative);
    if (fs.existsSync(src)) {
      const destDir = path.dirname(dest);
      if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });
      fs.copyFileSync(src, dest);
      console.log(`✅ Copié : ${srcRelative} -> ${destRelative}`);
    }
  }

  // Search for .dp64 and .dp32 files in mcpTemp
  files.forEach(f => {
    const fullPath = path.join(mcpTemp, f);
    if (fs.statSync(fullPath).isFile()) {
      if (f.endsWith('.dp64')) {
        const dest = path.join(releaseRoot, 'x64', 'plugins', path.basename(f));
        fs.mkdirSync(path.dirname(dest), { recursive: true });
        fs.copyFileSync(fullPath, dest);
        console.log(`✅ Plugin x64 installé : ${dest}`);
      } else if (f.endsWith('.dp32')) {
        const dest = path.join(releaseRoot, 'x32', 'plugins', path.basename(f));
        fs.mkdirSync(path.dirname(dest), { recursive: true });
        fs.copyFileSync(fullPath, dest);
        console.log(`✅ Plugin x32 installé : ${dest}`);
      }
    }
  });

  // Clean mcpTemp
  fs.rmSync(mcpTemp, { recursive: true, force: true });

  console.log('\n🎉 INSTALLATION COMPLÈTE DE x64dbg + x64dbg-MCP-Server !');
  console.log(`📁 x64 executable : ${path.join(releaseRoot, 'x64', 'x64dbg.exe')}`);
  console.log(`📁 x32 executable : ${path.join(releaseRoot, 'x32', 'x32dbg.exe')}`);
}

main().catch(err => {
  console.error('❌ Erreur setup:', err);
});
