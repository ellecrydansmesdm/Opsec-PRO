/**
 * electron-builder afterPack: strip source maps from the packaged app.asar.
 */
const fs = require('fs');
const path = require('path');

exports.default = async function afterPack(context) {
  const asarPath = path.join(context.appOutDir, 'resources', 'app.asar');
  if (!fs.existsSync(asarPath)) return;

  const asarLib = require('@electron/asar');
  const extractDir = path.join(context.appOutDir, 'resources', '_asar_strip');

  try {
    asarLib.extractAll(asarPath, extractDir);

    let removed = 0;
    const walk = (dir) => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          walk(full);
        } else if (entry.name.endsWith('.map')) {
          fs.unlinkSync(full);
          removed++;
        }
      }
    };
    walk(extractDir);

    fs.unlinkSync(asarPath);
    await asarLib.createPackage(extractDir, asarPath);
    fs.rmSync(extractDir, { recursive: true, force: true });
    console.log(`[afterPack] Removed ${removed} source map(s) from app.asar`);
  } catch (err) {
    console.warn('[afterPack] Map strip skipped:', err.message);
    if (fs.existsSync(extractDir)) fs.rmSync(extractDir, { recursive: true, force: true });
  }
};
