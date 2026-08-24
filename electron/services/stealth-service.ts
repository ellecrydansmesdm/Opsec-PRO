import fs from 'fs';
import path from 'path';
import { app } from 'electron';

export interface SuperPropertiesData {
    os: string;
    browser: string;
    release_channel: string;
    client_version: string;
    os_version: string;
    os_arch: string;
    app_arch: string;
    system_locale: string;
    browser_user_agent: string;
    browser_version: string;
    client_build_number: number;
    native_build_number: number | null;
    client_event_source: string | null;
}

export class StealthService {
    private static instance: StealthService;
    private cacheFilePath: string;
    private cachedBuildNumber: number = 339482;
    private lastFetchTime: number = 0;
    private readonly CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours

    private constructor() {
        const userDataPath = app?.getPath ? app.getPath('userData') : path.join(process.cwd(), '.data');
        this.cacheFilePath = path.join(userDataPath, 'stealth_cache.json');
        this.loadCache();
    }

    public static getInstance(): StealthService {
        if (!StealthService.instance) {
            StealthService.instance = new StealthService();
        }
        return StealthService.instance;
    }

    private loadCache() {
        try {
            if (fs.existsSync(this.cacheFilePath)) {
                const data = JSON.parse(fs.readFileSync(this.cacheFilePath, 'utf-8'));
                if (data.buildNumber && typeof data.buildNumber === 'number') {
                    this.cachedBuildNumber = data.buildNumber;
                    this.lastFetchTime = data.lastFetchTime || 0;
                }
            }
        } catch (_) {}
    }

    private saveCache() {
        try {
            fs.writeFileSync(
                this.cacheFilePath,
                JSON.stringify({
                    buildNumber: this.cachedBuildNumber,
                    lastFetchTime: this.lastFetchTime
                }, null, 2),
                'utf-8'
            );
        } catch (_) {}
    }

    public async fetchDiscordBuildNumber(): Promise<number> {
        const now = Date.now();
        if (this.cachedBuildNumber && (now - this.lastFetchTime < this.CACHE_TTL_MS)) {
            return this.cachedBuildNumber;
        }

        try {
            const res = await fetch('https://discord.com/app', {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
                }
            });

            if (!res.ok) return this.cachedBuildNumber;
            const html = await res.text();

            // Extract script asset tags
            const scriptMatches = html.match(/\/assets\/[a-zA-Z0-9_\.\-]+\.js/g);
            if (!scriptMatches || scriptMatches.length === 0) return this.cachedBuildNumber;

            // Pick candidate bootstrap or app scripts (from the end of document usually)
            const candidates = scriptMatches.slice(-8);

            for (const scriptPath of candidates) {
                try {
                    const scriptRes = await fetch(`https://discord.com${scriptPath}`, {
                        headers: {
                            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36'
                        }
                    });

                    if (scriptRes.ok) {
                        const code = await scriptRes.text();
                        // Regex search buildNumber pattern
                        const match = code.match(/buildNumber\s*:\s*\"?([0-9]{6,7})\"?/) || code.match(/client_build_number\s*:\s*([0-9]{6,7})/);
                        if (match && match[1]) {
                            const parsed = parseInt(match[1], 10);
                            if (!isNaN(parsed) && parsed > 200000) {
                                this.cachedBuildNumber = parsed;
                                this.lastFetchTime = Date.now();
                                this.saveCache();
                                return parsed;
                            }
                        }
                    }
                } catch (_) {}
            }
        } catch (_) {}

        return this.cachedBuildNumber;
    }

    public getSuperProperties(customBuild?: number): { payload: SuperPropertiesData; base64: string } {
        const build = customBuild || this.cachedBuildNumber || 339482;
        const payload: SuperPropertiesData = {
            os: "Windows",
            browser: "Discord Client",
            release_channel: "stable",
            client_version: "1.0.9168",
            os_version: "10.0.22631",
            os_arch: "x64",
            app_arch: "x64",
            system_locale: "fr-FR",
            browser_user_agent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) discord/1.0.9168 Chrome/128.0.6613.186 Electron/32.2.7 Safari/537.36",
            browser_version: "32.2.7",
            client_build_number: build,
            native_build_number: null,
            client_event_source: null
        };

        const jsonString = JSON.stringify(payload);
        const base64 = Buffer.from(jsonString, 'utf-8').toString('base64');

        return { payload, base64 };
    }

    public getStealthHeaders(token?: string): Record<string, string> {
        const { base64 } = this.getSuperProperties();
        const headers: Record<string, string> = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) discord/1.0.9168 Chrome/128.0.6613.186 Electron/32.2.7 Safari/537.36',
            'Accept': '*/*',
            'Accept-Language': 'fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7',
            'X-Super-Properties': base64,
            'X-Discord-Locale': 'fr',
            'X-Discord-Timezone': 'Europe/Paris',
            'Sec-Ch-Ua': '"Chromium";v="128", "Not;A=Brand";v="24", "Discord";v="1"',
            'Sec-Ch-Ua-Mobile': '?0',
            'Sec-Ch-Ua-Platform': '"Windows"',
            'Sec-Fetch-Dest': 'empty',
            'Sec-Fetch-Mode': 'cors',
            'Sec-Fetch-Site': 'same-origin'
        };

        if (token) {
            headers['Authorization'] = token;
        }

        return headers;
    }
}

export const stealthService = StealthService.getInstance();
