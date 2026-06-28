const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const projectDir = path.resolve(__dirname, '..');
const distElectronDir = path.join(projectDir, 'dist-electron');

const targets = [
  { source: 'main.js', bytecode: 'main.jsc', loader: 'main-loader.js' },
  { source: 'preload.js', bytecode: 'preload.jsc', loader: 'preload-loader.js' },
];

function compileToBytecode(relativePath) {
  console.log(`Compiling dist-electron/${relativePath}...`);
  execSync(`npx electron ./node_modules/bytenode/lib/cli.js --compile dist-electron/${relativePath}`, {
    cwd: projectDir,
    stdio: 'inherit',
    env: { ...process.env, ELECTRON_RUN_AS_NODE: '1' },
  });
}

function writeLoader(name, bytecodeFile) {
  const content = `'use strict';
require('bytenode');
const fs = require('fs');
const path = require('path');
const bytecodePath = path.join(__dirname, '${bytecodeFile}');
if (!fs.existsSync(bytecodePath)) {
  throw new Error('Opsec PRO: protected module missing (${bytecodeFile})');
}
require(bytecodePath);
`;
  fs.writeFileSync(path.join(distElectronDir, name), content, 'utf8');
}

console.log('=== V8 Bytecode Compilation ===');

for (const { source } of targets) {
  const sourcePath = path.join(distElectronDir, source);
  if (!fs.existsSync(sourcePath)) {
    console.error(`Error: ${source} not found in dist-electron. Run build:electron first.`);
    process.exit(1);
  }
}

try {
  for (const { source } of targets) {
    compileToBytecode(source);
  }
  console.log('Bytecode compilation completed.');
} catch (error) {
  console.error('Bytecode compilation failed:', error.message);
  process.exit(1);
}

for (const { loader, bytecode } of targets) {
  writeLoader(loader, bytecode);
  console.log(`Wrote ${loader}`);
}

if (process.argv.includes('--clean')) {
  console.log('Removing JS sources from dist-electron (bytecode-only packaging)...');
  for (const { source } of targets) {
    const sourcePath = path.join(distElectronDir, source);
    if (fs.existsSync(sourcePath)) fs.unlinkSync(sourcePath);
  }
  console.log('Source JS removed. Package ships .jsc + loaders only.');
}
