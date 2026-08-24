const path = require('path');
const fs = require('fs');
const { Client } = require(path.join(__dirname, '..', 'fhub-bot', 'node_modules', 'ssh2'));

const conn = new Client();

const config = {
  host: 'fi12.bot-hosting.cloud',
  port: 2022,
  username: 'd4e8e587-e99a-4a67-bb5a-39698ee02bb3.rtepbovn',
  password: 'WulS7x2tA-SlfNGuzsCiw1P_',
  readyTimeout: 20000
};

conn.on('ready', () => {
  console.log('✅ SFTP Client :: ready');
  conn.sftp((err, sftp) => {
    if (err) throw err;

    const localBotDir = path.join(__dirname, '..', 'fhub-bot');

    function ensureDir(remoteDir, cb) {
      sftp.mkdir(remoteDir, (err) => {
        // ignore if already exists
        cb();
      });
    }

    const filesToUpload = [];

    function collect(dir, base) {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.name === 'node_modules' || entry.name === '.git') continue;
        const fullLocal = path.join(dir, entry.name);
        const rel = base ? base + '/' + entry.name : entry.name;
        if (entry.isDirectory()) {
          collect(fullLocal, rel);
        } else {
          filesToUpload.push({ local: fullLocal, remote: '/' + rel });
        }
      }
    }

    collect(localBotDir, '');
    console.log(`Found ${filesToUpload.length} files to upload.`);

    // Extract unique directories needed
    const dirs = new Set();
    for (const f of filesToUpload) {
      const dirParts = f.remote.split('/').slice(0, -1).filter(Boolean);
      let cur = '';
      for (const p of dirParts) {
        cur += '/' + p;
        dirs.add(cur);
      }
    }

    const dirList = Array.from(dirs).sort((a, b) => a.length - b.length);

    function createDirs(index, cb) {
      if (index >= dirList.length) return cb();
      const d = dirList[index];
      console.log(`Creating directory: ${d}`);
      sftp.mkdir(d, (err) => {
        createDirs(index + 1, cb);
      });
    }

    function uploadFiles(index, cb) {
      if (index >= filesToUpload.length) return cb();
      const item = filesToUpload[index];
      console.log(`Uploading [${index + 1}/${filesToUpload.length}] ${item.remote}...`);
      sftp.fastPut(item.local, item.remote, (err) => {
        if (err) {
          console.error(`Error uploading ${item.remote}:`, err);
        }
        uploadFiles(index + 1, cb);
      });
    }

    createDirs(0, () => {
      uploadFiles(0, () => {
        console.log('🎉 ALL FILES SUCCESSFULLY UPLOADED TO BOT CONTAINER!');
        sftp.readdir('/', (err, list) => {
          if (!err) {
            console.log('Remote Root directory contents:', list.map(i => i.filename));
          }
          conn.end();
        });
      });
    });
  });
}).on('error', (err) => {
  console.error('Connection error:', err);
}).connect(config);
