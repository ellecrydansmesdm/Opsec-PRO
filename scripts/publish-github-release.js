const fs = require('fs');
const path = require('path');
const https = require('https');
const { execSync } = require('child_process');

async function getGitHubToken() {
  if (process.env.GH_TOKEN || process.env.GITHUB_TOKEN) {
    return process.env.GH_TOKEN || process.env.GITHUB_TOKEN;
  }
  try {
    const input = 'protocol=https\nhost=github.com\n\n';
    const output = execSync('git credential fill', { input, encoding: 'utf8' });
    const match = output.match(/password=(.+)/);
    if (match && match[1]) {
      return match[1].trim();
    }
  } catch (err) {
    console.error('Error fetching git credential:', err.message);
  }
  return null;
}

function request(options, body = null) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        let json = null;
        try {
          json = JSON.parse(data);
        } catch (_) {
          json = data;
        }
        resolve({ statusCode: res.statusCode, headers: res.headers, body: json });
      });
    });
    req.on('error', reject);
    if (body) {
      if (Buffer.isBuffer(body)) {
        req.write(body);
      } else if (typeof body === 'string') {
        req.write(body);
      } else {
        req.write(JSON.stringify(body));
      }
    }
    req.end();
  });
}

function uploadFileStream(uploadUrl, filePath, fileName, token) {
  return new Promise((resolve, reject) => {
    const stat = fs.statSync(filePath);
    const cleanUrl = uploadUrl.replace(/\{.*?\}$/, '');
    const parsedUrl = new URL(cleanUrl + '?name=' + encodeURIComponent(fileName));

    const options = {
      hostname: parsedUrl.hostname,
      path: parsedUrl.pathname + parsedUrl.search,
      method: 'POST',
      headers: {
        'User-Agent': 'Opsec-PRO-Release-Uploader',
        'Authorization': 'token ' + token,
        'Content-Type': 'application/octet-stream',
        'Content-Length': stat.size
      }
    };

    console.log('Uploading ' + fileName + ' (' + (stat.size / (1024 * 1024)).toFixed(2) + ' MB)...');
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve({ statusCode: res.statusCode, body: json });
        } catch (_) {
          resolve({ statusCode: res.statusCode, body: data });
        }
      });
    });

    req.on('error', reject);

    const stream = fs.createReadStream(filePath);
    stream.pipe(req);
  });
}

async function main() {
  const token = await getGitHubToken();
  if (!token) {
    console.error('No GitHub token found!');
    process.exit(1);
  }

  const pkg = JSON.parse(fs.readFileSync(path.resolve(__dirname, '..', 'package.json'), 'utf8'));
  const owner = 'ellecrydansmesdm';
  const repo = 'opsec-pro';
  const tag = process.env.RELEASE_TAG || ('v' + pkg.version);
  const releaseName = `Opsec PRO ${tag} - Official Release`;
  const releaseBody = `## 🛡️ Opsec PRO ${tag} — Windows Setup Executable

### 📦 Installation
1. Téléchargez **Opsec PRO Setup RELEASE.exe** ci-dessous.
2. Lancez l'exécutable sur Windows (10/11 x64).
3. Connectez votre compte Discord en toute sécurité.

---

### ✨ Nouveautés & Correctifs ${tag}
- **Badges Profil Discord Officiels (Août 2026)** : Intégration fidèle des 37 badges et assets Discord officiels extraits du projet FCord (Legacy Username \`#\`, Discord Quests, Discord Orbs, Nitro Tiers, Boost Tiers, Bug Hunter, etc.).
- **Audit & Validation Complète Settings & IPC** : Persistance bidirectionnelle, synchronisation instantanée du renderer et Electron Main.
- **Vanity URL Claimer Pro** : Auto-reconnect intelligent, anti-rate-limit jitter, surveillance temps-réel Gateway OP 0.
- **Spotify Lyrics Pro** : Visualiseur synchronisé au beat, palette dynamique extraite de la cover et mode plein écran.
- **Intégration x64dbg MCP Fixée** : STDIO propre sans pollution stdout, handshake JSON-RPC 2.0 vérifié.
`;

  console.log('Checking existing release for tag ' + tag + '...');
  let releaseRes = await request({
    hostname: 'api.github.com',
    path: '/repos/' + owner + '/' + repo + '/releases/tags/' + tag,
    method: 'GET',
    headers: {
      'User-Agent': 'Opsec-PRO-Release-Uploader',
      'Authorization': 'token ' + token,
      'Accept': 'application/vnd.github.v3+json'
    }
  });

  let releaseData = null;

  if (releaseRes.statusCode === 200) {
    console.log('Release found with ID ' + releaseRes.body.id);
    releaseData = releaseRes.body;
  } else {
    console.log('Creating new release for ' + tag + '...');
    const createRes = await request({
      hostname: 'api.github.com',
      path: '/repos/' + owner + '/' + repo + '/releases',
      method: 'POST',
      headers: {
        'User-Agent': 'Opsec-PRO-Release-Uploader',
        'Authorization': 'token ' + token,
        'Content-Type': 'application/json',
        'Accept': 'application/vnd.github.v3+json'
      }
    }, {
      tag_name: tag,
      name: releaseName,
      body: releaseBody,
      draft: false,
      prerelease: false
    });

    if (createRes.statusCode !== 201) {
      console.error('Failed to create release:', createRes.statusCode, createRes.body);
      process.exit(1);
    }
    releaseData = createRes.body;
    console.log('Release created successfully with ID ' + releaseData.id + '!');
  }

  // Delete existing assets with same name if any
  if (releaseData.assets && releaseData.assets.length > 0) {
    for (const asset of releaseData.assets) {
      if (asset.name === 'Opsec PRO Setup RELEASE.exe' || asset.name === 'latest.yml') {
        console.log('Deleting previous asset ' + asset.name + ' (ID: ' + asset.id + ')...');
        await request({
          hostname: 'api.github.com',
          path: '/repos/' + owner + '/' + repo + '/releases/assets/' + asset.id,
          method: 'DELETE',
          headers: {
            'User-Agent': 'Opsec-PRO-Release-Uploader',
            'Authorization': 'token ' + token,
            'Accept': 'application/vnd.github.v3+json'
          }
        });
      }
    }
  }

  const exePath = path.resolve(__dirname, '..', 'release', 'Opsec PRO Setup RELEASE.exe');
  if (!fs.existsSync(exePath)) {
    console.error('Executable not found at ' + exePath);
    process.exit(1);
  }

  console.log('Uploading asset to release: ' + releaseData.upload_url);
  const uploadRes = await uploadFileStream(releaseData.upload_url, exePath, 'Opsec PRO Setup RELEASE.exe', token);

  if (uploadRes.statusCode === 201) {
    console.log('Asset Opsec PRO Setup RELEASE.exe uploaded successfully!');
    console.log('Download URL: ' + uploadRes.body.browser_download_url);
  } else {
    console.error('Failed to upload asset:', uploadRes.statusCode, uploadRes.body);
    process.exit(1);
  }

  const ymlPath = path.resolve(__dirname, '..', 'release', 'latest.yml');
  if (fs.existsSync(ymlPath)) {
    console.log('Uploading latest.yml for auto-updater...');
    const ymlRes = await uploadFileStream(releaseData.upload_url, ymlPath, 'latest.yml', token);
    if (ymlRes.statusCode === 201) {
      console.log('latest.yml uploaded successfully!');
    }
  }

  console.log('\n🎉 RELEASE LIVE AT: https://github.com/' + owner + '/' + repo + '/releases/tag/' + tag);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
