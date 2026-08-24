const esbuild = require('esbuild');
const path = require('path');

async function buildElectron() {
  console.log('Building Electron main process...');
  await esbuild.build({
    entryPoints: [path.join(__dirname, '..', 'electron', 'main.ts')],
    bundle: true,
    platform: 'node',
    packages: 'external',
    minify: true,
    outfile: path.join(__dirname, '..', 'dist-electron', 'main.js'),
  });

  console.log('Building Electron preload script...');
  await esbuild.build({
    entryPoints: [path.join(__dirname, '..', 'electron', 'preload.ts')],
    bundle: true,
    platform: 'node',
    packages: 'external',
    minify: true,
    outfile: path.join(__dirname, '..', 'dist-electron', 'preload.js'),
  });

  const fs = require('fs');
  // Remove stale main.jsc so fresh main.js is always used during execution
  const staleBytecode = path.join(__dirname, '..', 'dist-electron', 'main.jsc');
  if (fs.existsSync(staleBytecode)) {
    fs.unlinkSync(staleBytecode);
  }
  const loaderContent = `'use strict';
const fs = require('fs');
const path = require('path');
const bytecodePath = path.join(__dirname, 'main.jsc');
if (fs.existsSync(bytecodePath)) {
  require('bytenode');
  require(bytecodePath);
} else {
  require('./main.js');
}
`;
  fs.writeFileSync(path.join(__dirname, '..', 'dist-electron', 'main-loader.js'), loaderContent, 'utf8');

  console.log('Electron build completed successfully.');
}

buildElectron().catch((err) => {
  console.error('Electron build failed:', err);
  process.exit(1);
});
