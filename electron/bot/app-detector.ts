import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface DetectedApp {
    name: string;
    processName: string;
    type: 'game' | 'app' | 'media';
    applicationId?: string;
}

const APP_DATABASE: DetectedApp[] = [
    { name: 'Visual Studio Code', processName: 'Code.exe', type: 'app', applicationId: '383226320970055681' },
    { name: 'Valorant', processName: 'VALORANT-Win64-Shipping.exe', type: 'game', applicationId: '700136079562375258' },
    { name: 'League of Legends', processName: 'LeagueClient.exe', type: 'game', applicationId: '401511684347756544' },
    { name: 'Counter-Strike 2', processName: 'cs2.exe', type: 'game', applicationId: '740706442113155143' },
    { name: 'Minecraft', processName: 'javaw.exe', type: 'game', applicationId: '416922332150333440' },
    { name: 'Roblox', processName: 'RobloxPlayerBeta.exe', type: 'game', applicationId: '435443372270026752' },
    { name: 'Google Chrome', processName: 'chrome.exe', type: 'app', applicationId: '584443105432371200' },
    { name: 'IntelliJ IDEA', processName: 'idea64.exe', type: 'app', applicationId: '382946281242361858' },
    { name: 'Steam', processName: 'steam.exe', type: 'app', applicationId: '282213813894742016' }
];

export class AppDetector {
    public async getActiveApps(): Promise<DetectedApp[]> {
        if (process.platform !== 'win32') return [];

        try {
            // tasklist /NH /FO CSV lists processes without header in CSV format
            const { stdout } = await execAsync('tasklist /NH /FO CSV');
            const lines = stdout.split('\n');
            const runningProcesses = new Set<string>();

            for (const line of lines) {
                const match = line.match(/"([^"]+)"/);
                if (match && match[1]) {
                    runningProcesses.add(match[1].toLowerCase());
                }
            }

            return APP_DATABASE.filter(app => runningProcesses.has(app.processName.toLowerCase()));
        } catch (e) {
            console.error('[DETECTOR] Error scanning processes:', e);
            return [];
        }
    }
}
