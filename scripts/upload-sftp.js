const SftpClient = require('ssh2-sftp-client');
const path = require('path');
const fs = require('fs');

const sftp = new SftpClient();

const config = {
  host: 'fi12.bot-hosting.cloud',
  port: 2022,
  username: 'd4e8e587-e99a-4a67-bb5a-39698ee02bb3.rtepbovn',
  password: 'WulS7x2tA-SlfNGuzsCiw1P_'
};

async function main() {
  try {
    console.log('Connecting to SFTP...');
    await sftp.connect(config);
    console.log('Connected to SFTP successfully!');

    const remoteRoot = '/';
    console.log('Listing remote files...');
    const list = await sftp.list(remoteRoot);
    console.log('Remote files:', list.map(f => f.name));

    const localDir = path.join(__dirname, '..', 'fhub-bot');
    
    // Recursive upload
    async function uploadDir(dir, remoteBase) {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.name === 'node_modules' || entry.name === '.git') continue;
        const localPath = path.join(dir, entry.name);
        const remotePath = remoteBase + (remoteBase.endsWith('/') ? '' : '/') + entry.name;
        
        if (entry.isDirectory()) {
          console.log(`Creating remote dir: ${remotePath}`);
          await sftp.mkdir(remotePath, true).catch(() => {});
          await uploadDir(localPath, remotePath);
        } else {
          console.log(`Uploading ${localPath} -> ${remotePath}...`);
          await sftp.put(localPath, remotePath);
        }
      }
    }

    console.log('Uploading all bot files...');
    await uploadDir(localDir, '/');
    console.log('✅ ALL BOT FILES UPLOADED SUCCESSFULLY VIA SFTP!');
    
    const finalList = await sftp.list('/');
    console.log('Final remote root contents:', finalList.map(f => f.name));
  } catch (err) {
    console.error('SFTP Error:', err);
  } finally {
    await sftp.end();
  }
}

main();
