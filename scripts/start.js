const { spawn } = require('child_process');
const path = require('path');

const electronCli = path.join(__dirname, '..', 'node_modules', 'electron', 'cli.js');
console.log('🚀 Lancement de Opsec PRO...');

const child = spawn(process.execPath, [electronCli, '.'], {
    cwd: path.resolve(__dirname, '..'),
    stdio: 'inherit',
    windowsHide: false
});

child.on('close', (code) => {
    process.exit(code || 0);
});
