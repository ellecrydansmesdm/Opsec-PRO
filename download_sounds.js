const fs = require('fs');
const path = require('path');
const https = require('https');

const soundMap = {
  boot: 'https://assets.mixkit.co/sounds/preview/mixkit-sci-fi-device-power-up-2913.mp3',
  ready: 'https://assets.mixkit.co/sounds/preview/mixkit-software-interface-start-2574.mp3',
  click: 'https://assets.mixkit.co/sounds/preview/mixkit-modern-technology-select-3124.mp3',
  toggle: 'https://assets.mixkit.co/sounds/preview/mixkit-switch-click-2583.mp3',
  hover: 'https://assets.mixkit.co/sounds/preview/mixkit-mouse-click-1114.mp3',
  success: 'https://assets.mixkit.co/sounds/preview/mixkit-positive-notification-951.mp3',
  error: 'https://assets.mixkit.co/sounds/preview/mixkit-error-tone-2865.mp3',
  failure: 'https://assets.mixkit.co/sounds/preview/mixkit-negative-tone-2865.mp3',
  denied: 'https://assets.mixkit.co/sounds/preview/mixkit-software-interface-error-2578.mp3',
  module_start: 'https://assets.mixkit.co/sounds/preview/mixkit-sci-fi-reject-2593.mp3',
  module_stop: 'https://assets.mixkit.co/sounds/preview/mixkit-sci-fi-turn-off-2582.mp3',
  module_error: 'https://assets.mixkit.co/sounds/preview/mixkit-robot-error-2586.mp3',
  target_required: 'https://assets.mixkit.co/sounds/preview/mixkit-alert-quick-chime-2345.mp3'
};

const dir = path.join(__dirname, 'public', 'sounds');

if (!fs.existsSync(dir)){
    fs.mkdirSync(dir, { recursive: true });
}

Object.entries(soundMap).forEach(([key, url]) => {
  const filePath = path.join(dir, `${key}.mp3`);
  const file = fs.createWriteStream(filePath);
  https.get(url, function(response) {
    if (response.statusCode === 200) {
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        console.log(`Downloaded ${key}.mp3`);
      });
    } else {
      console.log(`Failed to download ${key}: ${response.statusCode}`);
      file.close();
    }
  }).on('error', (err) => {
    console.error(`Error downloading ${key}: `, err);
  });
});
