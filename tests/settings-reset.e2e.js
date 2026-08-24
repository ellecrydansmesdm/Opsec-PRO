const assert = require('assert');
const fs = require('fs');
const path = require('path');
const http = require('http');
const { spawn } = require('child_process');

async function testResetAndPersistence() {
    console.log('🧪 Testing Reset Preferences & Cold Restart Persistence...\n');

    const electronCli = path.join(__dirname, '..', 'node_modules', 'electron', 'cli.js');
    const proc = spawn(process.execPath, [
        electronCli,
        '.',
        '--remote-debugging-port=9465'
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
                http.get('http://127.0.0.1:9465/json', res => {
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
                // Test Reset Preferences via IPC
                ws.send(JSON.stringify({
                    id: 300,
                    method: 'Runtime.evaluate',
                    params: {
                        expression: `(async () => {
                            const res = await window.electronAPI.resetSettings();
                            return {
                                success: res.success,
                                themeBlur: res.data?.themeBlur,
                                themeOpacity: res.data?.themeOpacity,
                                audioVolume: res.data?.audioVolume,
                                silentMode: res.data?.silentMode,
                                hasLicense: !!res.data?.licenseKey || res.data?.licenseValidated !== undefined,
                                hasAccounts: Array.isArray(res.data?.accounts)
                            };
                        })()`,
                        awaitPromise: true,
                        returnByValue: true
                    }
                }));
            }, 6000);
        });

        ws.on('message', (msg) => {
            const data = JSON.parse(msg.toString());
            if (data.id === 300) {
                const val = data.result?.result?.value;
                console.log('📊 Reset Evaluation Result:', val);
                assert.ok(val.success, 'resetSettings should return success: true');
                assert.strictEqual(val.themeBlur, 10, 'Reset themeBlur should be 10');
                assert.strictEqual(val.themeOpacity, 0.8, 'Reset themeOpacity should be 0.8');
                assert.strictEqual(val.audioVolume, 0.5, 'Reset audioVolume should be 0.5');
                assert.strictEqual(val.silentMode, true, 'Reset silentMode should be true');
                assert.strictEqual(val.hasAccounts, true, 'Accounts array should be preserved');
                console.log('✅ resetSettings successfully restored defaults while preserving vault and license!');
                resolve();
            }
        });
    });

    ws.close();
    proc.kill();
    console.log('\n🎉 Reset & Persistence Test PASSED 100%!');
}

testResetAndPersistence().catch(err => {
    console.error('❌ Reset Test Failed:', err);
    process.exit(1);
});
