import { Client } from 'discord.js-selfbot-v13';
import { Account, AppSettings } from '../../shared/types';
import fs from 'fs';
import path from 'path';
import { encryptToken, decryptToken } from '../utils/settings';

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
            
            // Decrypt tokens
            loadedAccounts = loadedAccounts.map((acc: any) => {
                if (acc && acc.token) {
                    acc.token = decryptToken(acc.token);
                }
                return acc;
            });
            
            // Deduplicate by Discord User ID only.
            // If the same account was added multiple times with different tokens,
            // keep only the LAST one (most recent token = most likely valid).
            const uniqueAccounts: Account[] = [];
            const seenIds = new Set<string>();
            // Iterate in reverse to keep the last (most recent) entry
            for (let i = loadedAccounts.length - 1; i >= 0; i--) {
                const acc = loadedAccounts[i];
                if (!seenIds.has(acc.id)) {
                    uniqueAccounts.unshift(acc); // Prepend to maintain order
                    seenIds.add(acc.id);
                }
            }
            this.accounts = uniqueAccounts;

            // Integrity check: Ensure only one account is selected
            let modified = false;
            const selectedCount = this.accounts.filter(a => a.selected).length;
            if (selectedCount > 1) {
                const firstSelected = this.accounts.find(a => a.selected);
                this.accounts.forEach(a => a.selected = (a === firstSelected));
                modified = true;
            } else if (selectedCount === 0 && this.accounts.length > 0) {
                this.accounts[0].selected = true;
                modified = true;
            }

            if (modified) {
                this.save();
            }
            
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
                        hypesquadHouse: 0,
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
        // Replace existing account with the same Discord User ID (prevents expired token stacking)
        this.accounts = this.accounts.filter(a => a.id !== account.id);
        if (account.selected) {
            this.accounts.forEach(a => a.selected = false);
        }
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
            const { getSettings } = require('../utils/settings');
            const currentSettings = getSettings();
            
            // Get currently selected ID for global field
            const selected = this.getSelectedAccount();
            
            // Encrypt tokens
            const encryptedAccounts = this.accounts.map((acc: any) => {
                const copy = { ...acc };
                if (copy.token) {
                    copy.token = encryptToken(copy.token);
                }
                return copy;
            });
            
            const newData = {
                ...currentSettings,
                accounts: encryptedAccounts,
                lastActiveAccountId: selected?.id || currentSettings.lastActiveAccountId
            };
            
            fs.writeFileSync(this.configPath, JSON.stringify(newData, null, 2));
        } catch (e) {
            console.error('[AccountManager] Save error:', e);
        }
    }
}
