const assert = require('assert');
const crypto = require('crypto');

// Extracted from electron/services/update-checker.ts
function compareSemver(v1, v2) {
    const parse = (v) => String(v || '').replace(/^v/i, '').trim().split('.').map(n => parseInt(n, 10) || 0);
    const p1 = parse(v1);
    const p2 = parse(v2);
    const len = Math.max(p1.length, p2.length, 3);
    for (let i = 0; i < len; i++) {
        const n1 = p1[i] || 0;
        const n2 = p2[i] || 0;
        if (n1 > n2) return 1;
        if (n1 < n2) return -1;
    }
    return 0;
}

function isNewerSemver(remote, current) {
    return compareSemver(remote, current) > 0;
}

function verifyChecksum(buffer, expectedHash) {
    const computed = crypto.createHash('sha256').update(buffer).digest('hex').toLowerCase();
    return computed === expectedHash.toLowerCase();
}

console.log('🧪 Starting Opsec PRO Update Checker Automated Test Suite...\n');

let passed = 0;
let total = 0;

function test(name, fn) {
    total++;
    try {
        fn();
        console.log(`  ✅ PASS: ${name}`);
        passed++;
    } catch (err) {
        console.error(`  ❌ FAIL: ${name}`);
        console.error(`     Error: ${err.message}`);
    }
}

// 1. SemVer Comparison Tests
console.log('--- 1. SemVer Comparison Tests ---');

test('2.0.2 -> 2.0.3 (Patch Upgrade)', () => {
    assert.strictEqual(isNewerSemver('2.0.3', '2.0.2'), true);
});

test('2.0.2 -> v2.0.3 (With v prefix)', () => {
    assert.strictEqual(isNewerSemver('v2.0.3', '2.0.2'), true);
    assert.strictEqual(isNewerSemver('2.0.3', 'v2.0.2'), true);
    assert.strictEqual(isNewerSemver('v2.0.3', 'v2.0.2'), true);
});

test('2.0.2 -> 2.1.0 (Minor Upgrade)', () => {
    assert.strictEqual(isNewerSemver('2.1.0', '2.0.2'), true);
});

test('2.0.2 -> 3.0.0 (Major Upgrade)', () => {
    assert.strictEqual(isNewerSemver('3.0.0', '2.0.2'), true);
});

test('2.0.2 -> 2.0.2 (Identical Version - No update)', () => {
    assert.strictEqual(isNewerSemver('2.0.2', '2.0.2'), false);
    assert.strictEqual(isNewerSemver('v2.0.2', '2.0.2'), false);
    assert.strictEqual(isNewerSemver('2.0.2', 'v2.0.2'), false);
});

test('2.0.10 -> 2.0.9 (Downgrade / Older - No update)', () => {
    // Current is 2.0.10, Remote is 2.0.9
    assert.strictEqual(isNewerSemver('2.0.9', '2.0.10'), false);
});

test('2.0.9 -> 2.0.10 (Double digit patch upgrade)', () => {
    // Current is 2.0.9, Remote is 2.0.10
    assert.strictEqual(isNewerSemver('2.0.10', '2.0.9'), true);
});

test('2.0.2 -> 2.0.2.1 (Sub-patch / 4 segments)', () => {
    assert.strictEqual(isNewerSemver('2.0.2.1', '2.0.2'), true);
});

test('Invalid or garbage tag handling', () => {
    assert.strictEqual(isNewerSemver('invalid-tag', '2.0.2'), false);
    assert.strictEqual(isNewerSemver('', '2.0.2'), false);
    assert.strictEqual(isNewerSemver(null, '2.0.2'), false);
});

// 2. Asset & Checksum Extraction Tests
console.log('\n--- 2. Asset & Checksum Tests ---');

test('Exe asset extraction from GitHub release payload', () => {
    const mockRelease = {
        tag_name: 'v2.0.3',
        html_url: 'https://github.com/ellecrydansmesdm/Opsec-PRO/releases/tag/v2.0.3',
        assets: [
            { name: 'latest.yml', browser_download_url: 'https://.../latest.yml' },
            { name: 'Opsec.PRO.Setup.RELEASE.exe', browser_download_url: 'https://github.com/.../Opsec.PRO.Setup.RELEASE.exe' }
        ]
    };

    const exeAsset = mockRelease.assets.find(a => a.name && a.name.endsWith('.exe'));
    assert.ok(exeAsset);
    assert.strictEqual(exeAsset.browser_download_url, 'https://github.com/.../Opsec.PRO.Setup.RELEASE.exe');
});

test('Fallback to release page when no exe asset is attached', () => {
    const mockRelease = {
        tag_name: 'v2.0.3',
        html_url: 'https://github.com/ellecrydansmesdm/Opsec-PRO/releases/tag/v2.0.3',
        assets: []
    };

    const exeAsset = mockRelease.assets.find(a => a.name && a.name.endsWith('.exe'));
    const downloadUrl = exeAsset ? exeAsset.browser_download_url : mockRelease.html_url;
    assert.strictEqual(downloadUrl, 'https://github.com/ellecrydansmesdm/Opsec-PRO/releases/tag/v2.0.3');
});

test('SHA-256 Checksum Verification', () => {
    const data = Buffer.from('Opsec PRO Test Executable Content');
    const hash = crypto.createHash('sha256').update(data).digest('hex');
    
    assert.strictEqual(verifyChecksum(data, hash), true);
    assert.strictEqual(verifyChecksum(data, hash.toUpperCase()), true); // Case insensitive
    assert.strictEqual(verifyChecksum(data, '0000000000000000000000000000000000000000000000000000000000000000'), false);
});

// 3. Network Mock & Error Handling Simulation Tests
console.log('\n--- 3. Network Error & Mock Tests ---');

async function simulateUpdateCheck(currentVersion, mockStatus, mockPayload, networkError = null) {
    if (networkError) {
        return {
            updateAvailable: false,
            currentVersion,
            latestVersion: currentVersion,
            error: networkError.message
        };
    }

    if (mockStatus === 200 && mockPayload && mockPayload.tag_name) {
        const cleanLatest = mockPayload.tag_name.replace(/^v/i, '').trim();
        const cleanCurrent = currentVersion.replace(/^v/i, '').trim();
        if (isNewerSemver(cleanLatest, cleanCurrent)) {
            const exe = mockPayload.assets?.find(a => a.name?.endsWith('.exe'));
            return {
                updateAvailable: true,
                currentVersion,
                latestVersion: mockPayload.tag_name,
                downloadUrl: exe?.browser_download_url || mockPayload.html_url,
                releaseNotes: mockPayload.body || 'Default notes'
            };
        }
    }

    return {
        updateAvailable: false,
        currentVersion,
        latestVersion: currentVersion
    };
}

async function runAsyncTests() {
    await (async () => {
        total++;
        const res = await simulateUpdateCheck('2.0.2', 200, {
            tag_name: 'v2.0.3',
            html_url: 'https://github.com/ellecrydansmesdm/Opsec-PRO/releases/tag/v2.0.3',
            assets: [{ name: 'Opsec.PRO.Setup.exe', browser_download_url: 'https://download/Opsec.PRO.Setup.exe' }],
            body: 'Changelog 2.0.3'
        });
        assert.strictEqual(res.updateAvailable, true);
        assert.strictEqual(res.latestVersion, 'v2.0.3');
        assert.strictEqual(res.downloadUrl, 'https://download/Opsec.PRO.Setup.exe');
        console.log('  ✅ PASS: Simulated GitHub Release 2.0.3 Detection');
        passed++;
    })();

    await (async () => {
        total++;
        const res = await simulateUpdateCheck('2.0.2', 200, {
            tag_name: 'v2.0.2',
            assets: []
        });
        assert.strictEqual(res.updateAvailable, false);
        console.log('  ✅ PASS: Simulated Same Version 2.0.2 (No update triggered)');
        passed++;
    })();

    await (async () => {
        total++;
        const res = await simulateUpdateCheck('2.0.2', 403, { message: 'API rate limit exceeded' });
        assert.strictEqual(res.updateAvailable, false);
        console.log('  ✅ PASS: Handled HTTP 403 Rate Limit Gracefully (No crash)');
        passed++;
    })();

    await (async () => {
        total++;
        const res = await simulateUpdateCheck('2.0.2', 404, { message: 'Not Found' });
        assert.strictEqual(res.updateAvailable, false);
        console.log('  ✅ PASS: Handled HTTP 404 Release Not Found Gracefully');
        passed++;
    })();

    await (async () => {
        total++;
        const res = await simulateUpdateCheck('2.0.2', 500, null, new Error('fetch failed (ENOTFOUND)'));
        assert.strictEqual(res.updateAvailable, false);
        console.log('  ✅ PASS: Handled Network Offline / DNS Failure Gracefully');
        passed++;
    })();

    console.log(`\n========================================`);
    console.log(`🎯 Test Results: ${passed}/${total} Passed (${Math.round(passed/total*100)}%)`);
    console.log(`========================================\n`);

    if (passed !== total) process.exit(1);
}

runAsyncTests();
