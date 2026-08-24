const assert = require('assert');
const fs = require('fs');
const path = require('path');
const http = require('http');
const { spawn } = require('child_process');

async function runAudit() {
    console.log('🧪 Starting End-to-End Settings Technical Audit...\n');

    console.log('--- 1. Testing Electron Runtime, IPC, and Settings Page ---');
    const electronCli = path.join(__dirname, '..', 'node_modules', 'electron', 'cli.js');
    const proc = spawn(process.execPath, [
        electronCli,
        '.',
        '--remote-debugging-port=9463'
    ], {
        cwd: path.resolve(__dirname, '..'),
        env: { ...process.env, SKIP_OBFUSCATE: '1' },
        stdio: 'ignore'
    });

    let target = null;
    for (let i = 0; i < 15; i++) {
        await new Promise(r => setTimeout(r, 1000));
        try {
            const data = await new Promise((resolve, reject) => {
                http.get('http://127.0.0.1:9463/json', res => {
                    let d = '';
                    res.on('data', c => d += c);
                    res.on('end', () => resolve(JSON.parse(d)));
                }).on('error', reject);
            });
            target = data.find(t => t.type === 'page') || data[0];
            if (target && target.webSocketDebuggerUrl) break;
        } catch (_) {}
    }

    if (!target) {
        proc.kill();
        throw new Error('Could not connect to Electron CDP');
    }

    const WebSocket = require(path.join(__dirname, '..', 'fhub-bot', 'node_modules', 'ws'));
    const ws = new WebSocket(target.webSocketDebuggerUrl);

    await new Promise((resolve, reject) => {
        ws.on('open', () => {
            let id = 1;
            ws.send(JSON.stringify({ id: id++, method: 'Page.enable' }));
            ws.send(JSON.stringify({ id: id++, method: 'Runtime.enable' }));

            setTimeout(async () => {
                // Navigate to Settings tab
                ws.send(JSON.stringify({
                    id: 200,
                    method: 'Runtime.evaluate',
                    params: {
                        expression: `(() => {
                            const buttons = Array.from(document.querySelectorAll('.sidebar .nav-button'));
                            const settingsBtn = buttons.find(b => b.innerHTML.includes('lucide-settings') || (b.innerText && b.innerText.includes('Settings'))) || buttons[buttons.length - 1];
                            if (settingsBtn) settingsBtn.click();
                            return { clicked: true };
                        })()`,
                        returnByValue: true
                    }
                }));

                // Verify setting updates via IPC
                setTimeout(() => {
                    ws.send(JSON.stringify({
                        id: 201,
                        method: 'Runtime.evaluate',
                        params: {
                            expression: `(async () => {
                                // Test IPC getSettings
                                const initial = await window.electronAPI.getSettings();
                                
                                // Test IPC saveSettings
                                await window.electronAPI.saveSettings({
                                    themeBlur: 15,
                                    themeOpacity: 0.9,
                                    silentMode: false,
                                    privateMode: true,
                                    allowActiveAppDetection: true
                                });

                                const updated = await window.electronAPI.getSettings();
                                return {
                                    initialSuccess: initial.success,
                                    updatedSuccess: updated.success,
                                    blur: updated.data?.themeBlur,
                                    opacity: updated.data?.themeOpacity,
                                    silent: updated.data?.silentMode,
                                    private: updated.data?.privateMode,
                                    appDetection: updated.data?.allowActiveAppDetection
                                };
                            })()`,
                            awaitPromise: true,
                            returnByValue: true
                        }
                    }));
                }, 1500);

                // Capture screenshot of Settings page
                setTimeout(() => {
                    ws.send(JSON.stringify({
                        id: 202,
                        method: 'Page.captureScreenshot',
                        params: { format: 'png' }
                    }));
                }, 3000);
            }, 7500);
        });

        ws.on('message', (msg) => {
            const data = JSON.parse(msg.toString());
            if (data.id === 201) {
                const val = data.result?.result?.value;
                console.log('📊 IPC Evaluation Result:', val);
                assert.ok(val, 'Result value should exist');
                assert.strictEqual(val.blur, 15, 'themeBlur should be 15');
                assert.strictEqual(val.opacity, 0.9, 'themeOpacity should be 0.9');
                assert.strictEqual(val.silent, false, 'silentMode should be false');
                assert.strictEqual(val.private, true, 'privateMode should be true');
                assert.strictEqual(val.appDetection, true, 'allowActiveAppDetection should be true');
                console.log('✅ IPC saveSettings -> getSettings roundtrip verified.');
            }

            if (data.id === 202 && data.result?.data) {
                const buffer = Buffer.from(data.result.data, 'base64');
                fs.writeFileSync(path.join(__dirname, '..', 'settings_audit_screenshot.png'), buffer);
                console.log('📸 settings_audit_screenshot.png saved!');
                resolve();
            }
        });
    });

    ws.close();
    proc.kill();
    console.log('\n🎉 Settings End-to-End Audit & Verification 100% SUCCESSFUL!');
}

runAudit().catch(err => {
    console.error('❌ Audit Failed:', err);
    process.exit(1);
});
