import { app } from 'electron';
import crypto from 'crypto';
import { appBus } from './event-bus';

function compareSemver(v1: string, v2: string): number {
    const parse = (v: string) => v.replace(/^v/i, '').split(/[-+]/)[0].trim().split('.').map(n => parseInt(n, 10) || 0);
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

function isNewerSemver(remote: string, current: string): boolean {
    return compareSemver(remote, current) > 0;
}

export interface UpdateInfo {
    updateAvailable: boolean;
    currentVersion: string;
    latestVersion: string;
    downloadUrl?: string;
    releaseNotes?: string;
    publishedAt?: string;
    sha256?: string;
}

const GITHUB_OWNER = process.env.OPSEC_OVERRIDE_GITHUB_OWNER || 'ellecrydansmesdm';
const GITHUB_REPO = process.env.OPSEC_OVERRIDE_GITHUB_REPO || 'opsec-pro';

export class UpdateChecker {
    /**
     * Checks for updates and verifies release metadata integrity
     */
    public static async checkForUpdates(currentAppVersion?: string): Promise<UpdateInfo> {
        const currentVersion = currentAppVersion || app.getVersion() || '2.0.3';
        const cleanCurrent = currentVersion.replace(/^v/i, '').trim();

        const endpoint = process.env.OPSEC_UPDATE_API_URL || `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/releases/latest`;

        // 1. Check GitHub Releases API
        try {
            const response = await fetch(endpoint, {
                headers: {
                    'User-Agent': 'OpsecPro-AutoUpdater',
                    'Accept': 'application/vnd.github+json'
                }
            });

            if (response.ok) {
                const releaseData: any = await response.json();
                if (releaseData && releaseData.tag_name) {
                    const cleanLatestTag = releaseData.tag_name.replace(/^v/i, '').trim();

                    const isNewer = isNewerSemver(cleanLatestTag, cleanCurrent);

                    if (isNewer) {
                        let downloadUrl = releaseData.html_url;
                        let sha256: string | undefined = undefined;

                        if (releaseData.assets && Array.isArray(releaseData.assets)) {
                            const exeAsset = releaseData.assets.find((a: any) => a.name && a.name.endsWith('.exe'));
                            if (exeAsset && exeAsset.browser_download_url) {
                                downloadUrl = exeAsset.browser_download_url;
                            }

                            // Look for sha256 checksum asset or body hash
                            const checksumAsset = releaseData.assets.find((a: any) => a.name && (a.name.endsWith('.sha256') || a.name.includes('checksum')));
                            if (checksumAsset) {
                                try {
                                    const sumRes = await fetch(checksumAsset.browser_download_url);
                                    if (sumRes.ok) {
                                        const sumText = await sumRes.text();
                                        const match = sumText.match(/[a-f0-9]{64}/i);
                                        if (match) sha256 = match[0].toLowerCase();
                                    }
                                } catch (_) {}
                            }
                        }

                        appBus.emitTyped('update:found', { version: releaseData.tag_name, url: downloadUrl });
                        appBus.audit('UPDATE_CHECK', 'ALLOW', `Mise à jour ${releaseData.tag_name} détectée`, { currentVersion, latestVersion: releaseData.tag_name });

                        return {
                            updateAvailable: true,
                            currentVersion,
                            latestVersion: releaseData.tag_name,
                            downloadUrl,
                            releaseNotes: releaseData.body || 'Nouvelles fonctionnalités et optimisations du système.',
                            publishedAt: releaseData.published_at,
                            sha256
                        };
                    }
                }
            }
        } catch (e) {
            // Network fallback
        }

        // 2. Fallback: package.json raw check
        try {
            const rawResponse = await fetch(`https://raw.githubusercontent.com/${GITHUB_OWNER}/${GITHUB_REPO}/main/package.json`, {
                headers: { 'Cache-Control': 'no-cache' }
            });

            if (rawResponse.ok) {
                const remotePkg: any = await rawResponse.json();
                if (remotePkg && remotePkg.version) {
                    const remoteVersion = remotePkg.version.replace(/^v/i, '').trim();
                    if (isNewerSemver(remoteVersion, cleanCurrent)) {
                        return {
                            updateAvailable: true,
                            currentVersion,
                            latestVersion: `v${remoteVersion}`,
                            downloadUrl: `https://github.com/${GITHUB_OWNER}/${GITHUB_REPO}/releases/latest`,
                            releaseNotes: `Nouvelle version v${remoteVersion} disponible sur GitHub.`,
                            publishedAt: new Date().toISOString()
                        };
                    }
                }
            }
        } catch (e) {
            // Offline
        }

        return {
            updateAvailable: false,
            currentVersion,
            latestVersion: currentVersion
        };
    }

    /**
     * Compute SHA-256 of downloaded buffer
     */
    public static verifyChecksum(buffer: Buffer, expectedHash: string): boolean {
        const computed = crypto.createHash('sha256').update(buffer).digest('hex').toLowerCase();
        return computed === expectedHash.toLowerCase();
    }
}
