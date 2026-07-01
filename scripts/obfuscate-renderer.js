/**
 * Aggressive obfuscation for the renderer bundle only.
 * Main/preload are protected via V8 bytecode (bytenode), not JS obfuscation.
 */
const JavaScriptObfuscator = require('javascript-obfuscator');
const fs = require('fs');
const path = require('path');

const assetsDir = path.join(__dirname, '..', 'dist', 'assets');

if (!fs.existsSync(assetsDir)) {
  console.error('Error: dist/assets not found. Run build:client first.');
  process.exit(1);
}

const OBFUSCATOR_OPTIONS = {
  compact: true,
  controlFlowFlattening: true,
  controlFlowFlatteningThreshold: 0.5,
  deadCodeInjection: true,
  deadCodeInjectionThreshold: 0.15,
  disableConsoleOutput: false,
  identifierNamesGenerator: 'hexadecimal',
  numbersToExpressions: true,
  renameGlobals: false,
  selfDefending: false,
  simplify: true,
  splitStrings: true,
  splitStringsChunkLength: 4,
  stringArray: true,
  stringArrayCallsTransform: true,
  stringArrayCallsTransformThreshold: 0.5,
  stringArrayEncoding: ['base64'],
  stringArrayIndexShift: true,
  stringArrayRotate: true,
  stringArrayShuffle: true,
  stringArrayWrappersCount: 2,
  stringArrayWrappersChainedCalls: true,
  stringArrayWrappersParametersMaxCount: 3,
  stringArrayWrappersType: 'function',
  stringArrayThreshold: 0.75,
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
