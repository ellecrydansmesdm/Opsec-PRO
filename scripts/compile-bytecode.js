const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const projectDir = path.resolve(__dirname, '..');
const distElectronDir = path.join(projectDir, 'dist-electron');

const mainJsPath = path.join(distElectronDir, 'main.js');
const preloadJsPath = path.join(distElectronDir, 'preload.js');

console.log('=== Bytecode V8 Compilation Script ===');

// 1. Check if source build files exist
if (!fs.existsSync(mainJsPath) || !fs.existsSync(preloadJsPath)) {
    console.error('Error: compiled main.js or preload.js not found in dist-electron. Run build first.');
    process.exit(1);
}

try {
    // Compile using Electron's exact V8 engine to guarantee version compatibility
    console.log('Compiling dist-electron/main.js to main.jsc...');
    execSync('npx electron ./node_modules/bytenode/lib/cli.js --compile dist-electron/main.js', { 
        cwd: projectDir, 
        stdio: 'inherit',
        env: { ...process.env, ELECTRON_RUN_AS_NODE: '1' }
    });

    console.log('V8 Bytecode compilation completed successfully.');
} catch (error) {
    console.error('Error during bytecode compilation:', error.message);
    process.exit(1);
}

// 2. Generate Loader files
const mainLoaderContent = `// Opsec PRO - Main Entrypoint Loader
const bytenode = require('bytenode');
const fs = require('fs');
const path = require('path');

const bytecodePath = path.join(__dirname, 'main.jsc');
const sourcePath = path.join(__dirname, 'main.js');

if (fs.existsSync(bytecodePath)) {
    require(bytecodePath);
} else if (fs.existsSync(sourcePath)) {
    require(sourcePath);
} else {
    throw new Error('Cannot find main process entrypoint');
}
`;

console.log('Writing main-loader.js...');
fs.writeFileSync(path.join(distElectronDir, 'main-loader.js'), mainLoaderContent, 'utf-8');

// 3. Clean up JS source files if --clean flag is present (for final packaging)
if (process.argv.includes('--clean')) {
    console.log('Cleaning up original JS source files in dist-electron/ for packaging...');
    try {
        if (fs.existsSync(mainJsPath)) fs.unlinkSync(mainJsPath);
        console.log('Original JS source files removed. Only loader and .jsc remain.');
    } catch (e) {
        console.error('Warning: Failed to delete source JS files:', e.message);
    }
}
