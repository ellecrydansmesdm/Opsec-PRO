import { Client } from 'discord.js-selfbot-v13';
import { Account, AppSettings } from '../../shared/types';
import fs from 'fs';
import path from 'path';

export class AccountManager {
    private accounts: Account[] = [];
    private configPath: string;

    constructor(configPath: string) {
        this.configPath = configPath;
        this.loadAccounts();
    }

    private loadAccounts() {
        if (!fs.existsSync(this.configPath)) return;
        try {
            const data = JSON.parse(fs.readFileSync(this.configPath, 'utf-8'));
            let loadedAccounts: Account[] = data.accounts || [];
            
            // Deduplicate only if BOTH ID and Token match (Total duplicate)
            // If tokens are different, keep them separate even if IDs are placeholders
            const uniqueAccounts: Account[] = [];
            const seenKeys = new Set();
            for (const acc of loadedAccounts) {
                const key = `${acc.id}-${acc.token}`;
                if (!seenKeys.has(key)) {
                    uniqueAccounts.push(acc);
                    seenKeys.add(key);
                }
            }
            this.accounts = uniqueAccounts;
            
            // Migration if old format exists
            if (data.token && this.accounts.length === 0) {
                this.accounts.push({
                    id: 'legacy-' + Date.now(),
                    token: data.token,
                    username: 'Ancien Compte',
                    tag: '',
                    avatarURL: '',
                    selected: true,
                    rotator: {
                        enabled: false,
                        interval: 60,
                        statuses: [],
                        bios: [],
                        usernames: [],
                        activities: [],
                        customRPCs: [],
                        clanTags: [],
                        currentStatusIndex: 0,
                        currentBioIndex: 0,
                        currentUsernameIndex: 0,
                        currentActivityIndex: 0,
                        currentClanTagIndex: 0,
                        enabledSections: {
                            status: true,
                            bio: true,
                            username: false,
                            activity: true,
                            clanTag: false
                        },
                        stats: {
                            messagesToday: 0,
                            totalMessages: 0
                        },
                        totalRotations: 0
                    }
                });
                this.save();
            }
        } catch (e) {
            console.error('[AccountManager] Load error:', e);
        }
    }

    public getAccounts(): Account[] {
        return this.accounts;
    }

    public getSelectedAccount(): Account | undefined {
        return this.accounts.find(a => a.selected);
    }

    public setAccounts(accounts: Account[]) {
        this.accounts = accounts;
    }

    public addAccount(account: Account) {
        // Prevent duplicates by Token (Unique session)
        this.accounts = this.accounts.filter(a => a.token !== account.token);
        this.accounts.push(account);
        this.save();
    }

    public removeAccount(id: string) {
        this.accounts = this.accounts.filter(a => a.id !== id);
        if (this.accounts.length > 0 && !this.getSelectedAccount()) {
            this.accounts[0].selected = true;
        }
        this.save();
    }

    public selectAccount(id: string) {
        this.accounts.forEach(a => a.selected = (a.id === id));
        this.save();
    }

    public updateAccount(id: string, updates: Partial<Account>) {
        const account = this.accounts.find(a => a.id === id);
        if (account) {
            Object.assign(account, updates);
            this.save();
        }
    }

    private save() {
        try {
            // Read latest file content to preserve other settings (like theme/autoLogin)
            const currentRaw = fs.existsSync(this.configPath) 
                ? fs.readFileSync(this.configPath, 'utf-8')
                : '{}';
            const currentData = JSON.parse(currentRaw);
            
            const newData = {
                ...currentData,
                accounts: this.accounts
            };
            
            fs.writeFileSync(this.configPath, JSON.stringify(newData, null, 2));
        } catch (e) {
            console.error('[AccountManager] Save error:', e);
        }
    }
}
