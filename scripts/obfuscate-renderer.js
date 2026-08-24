/**
 * Aggressive obfuscation for the renderer bundle only.
 * Main/preload are protected via V8 bytecode (bytenode), not JS obfuscation.
 */
const JavaScriptObfuscator = require('javascript-obfuscator');
const fs = require('fs');
const path = require('path');

if (process.env.SKIP_OBFUSCATE === 'true' || process.env.NODE_ENV === 'development') {
  console.log('⚡ Secondary JS obfuscator skipped (esbuild minification active).');
  process.exit(0);
}

const assetsDir = path.join(__dirname, '..', 'dist', 'assets');

if (!fs.existsSync(assetsDir)) {
  console.error('Error: dist/assets not found. Run build:client first.');
  process.exit(1);
}

const OBFUSCATOR_OPTIONS = {
  compact: true,
  controlFlowFlattening: false,
  deadCodeInjection: false,
  disableConsoleOutput: false,
  identifierNamesGenerator: 'mangled',
  numbersToExpressions: false,
  renameGlobals: false,
  selfDefending: false,
  simplify: true,
  splitStrings: false,
  stringArray: false,
  transformObjectKeys: false,
  unicodeEscapeSequence: false,
};

const jsFiles = fs.readdirSync(assetsDir).filter((f) => f.endsWith('.js') && !f.endsWith('.map'));

if (jsFiles.length === 0) {
  console.error('Error: no JS bundles found in dist/assets.');
  process.exit(1);
}

console.log('=== Renderer Obfuscation ===');
for (const file of jsFiles) {
  const filePath = path.join(assetsDir, file);
  const source = fs.readFileSync(filePath, 'utf8');
  console.log(`Obfuscating ${file} (${(source.length / 1024).toFixed(0)} KB)...`);
  const result = JavaScriptObfuscator.obfuscate(source, OBFUSCATOR_OPTIONS);
  fs.writeFileSync(filePath, result.getObfuscatedCode(), 'utf8');

  const mapPath = `${filePath}.map`;
  if (fs.existsSync(mapPath)) fs.unlinkSync(mapPath);
}

console.log('Renderer obfuscation completed.');
