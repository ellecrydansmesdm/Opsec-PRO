const fs = require('fs');
const path = require('path');
const os = require('os');

// Standard Electron userData path on Windows
const userData = path.join(os.homedir(), 'AppData', 'Roaming', 'Opsec PRO');
const configPath = path.join(userData, 'opsec_config.json');

if (fs.existsSync(configPath)) {
    console.log("CONFIG FOUND:");
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    console.log(JSON.stringify(config, null, 2));
} else {
    console.log("CONFIG NOT FOUND AT:", configPath);
}
