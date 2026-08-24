const assert = require('assert');
const fs = require('fs');
const path = require('path');
const http = require('http');
const { spawn } = require('child_process');

async function runAudit() {
    console.log('🧪 Testing Option A, B & C Runtime End-to-End...\n');

    const electronCli = path.join(__dirname, '..', 'node_modules', 'electron', 'cli.js');
    const proc = spawn(process.execPath, [
        electronCli,
        '.',
        '--remote-debugging-port=9471'
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
                http.get('http://127.0.0.1:9471/json', res => {
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
                // Test Network Hub and Voice Streamer IPC
                ws.send(JSON.stringify({
                    id: 400,
                    method: 'Runtime.evaluate',
                    params: {
                        expression: `(async () => {
                            // Test testProxies handler
                            const proxyRes = await window.electronAPI.testProxies(['127.0.0.1:9050']);
                            // Test voiceStatus
                            const voiceRes = await window.electronAPI.voiceStatus();
                            // Test inChatStatus
                            const inChatRes = await window.electronAPI.inChatGetStatus();

                            return {
                                proxyResSuccess: proxyRes.success,
                                proxyCount: proxyRes.data?.length,
                                voiceResSuccess: voiceRes.success,
                                voiceConnected: voiceRes.data?.connected,
                                inChatSuccess: inChatRes.success,
                                inChatEnabled: inChatRes.data?.enabled
                            };
                        })()`,
                        awaitPromise: true,
                        returnByValue: true
                    }
                }));

                // Navigate to Network Hub & take screenshot
                setTimeout(() => {
                    ws.send(JSON.stringify({
                        id: 401,
                        method: 'Runtime.evaluate',
                        params: {
                            expression: `(() => {
                                const buttons = Array.from(document.querySelectorAll('.sidebar .nav-button'));
                                const netBtn = buttons.find(b => b.innerHTML.includes('lucide-globe') || (b.innerText && b.innerText.includes('Network')));
                                if (netBtn) netBtn.click();
                                return { clicked: true };
                            })()`,
                            returnByValue: true
                        }
                    }));
                }, 1500);

                setTimeout(() => {
                    ws.send(JSON.stringify({
                        id: 402,
                        method: 'Page.captureScreenshot',
                        params: { format: 'png' }
                    }));
                }, 3000);
            }, 6000);
        });

        ws.on('message', (msg) => {
            const data = JSON.parse(msg.toString());
            if (data.id === 400) {
                const val = data.result?.result?.value;
                console.log('📊 IPC Evaluation Result:', val);
                assert.ok(val.proxyResSuccess, 'testProxies should succeed');
                assert.ok(val.voiceResSuccess, 'voiceStatus should succeed');
                assert.ok(val.inChatSuccess, 'inChatGetStatus should succeed');
                console.log('✅ Network, Voice & In-Chat IPC channels verified.');
            }

            if (data.id === 402 && data.result?.data) {
                const buffer = Buffer.from(data.result.data, 'base64');
                fs.writeFileSync(path.join(__dirname, '..', 'network_hub_screenshot.png'), buffer);
                console.log('📸 network_hub_screenshot.png saved!');
                resolve();
            }
        });
    });

    ws.close();
    proc.kill();
    console.log('\n🎉 Option A, B & C End-to-End Verification 100% SUCCESSFUL!');
}

runAudit().catch(err => {
    console.error('❌ Audit Failed:', err);
    process.exit(1);
});
