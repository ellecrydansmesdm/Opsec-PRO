import { appBus } from './event-bus';

export type PolicyVerdict = 'ALLOW' | 'WARN' | 'DENY';

export interface ActionPolicy {
    name: string;
    maxPerMinute: number;
    requireUserConfirmation?: boolean;
    costPoints?: number;
}

export class PolicyEngine {
    private static instance: PolicyEngine;
    private requestBuckets: Map<string, { count: number; windowStart: number }> = new Map();
    
    // Default safe policies
    private policies: Map<string, ActionPolicy> = new Map([
        ['MASS_PURGE', { name: 'MASS_PURGE', maxPerMinute: 60, costPoints: 5 }],
        ['MASS_DM', { name: 'MASS_DM', maxPerMinute: 30, costPoints: 10 }],
        ['GUILD_CLONE', { name: 'GUILD_CLONE', maxPerMinute: 50, costPoints: 15 }],
        ['ACCOUNT_SWITCH', { name: 'ACCOUNT_SWITCH', maxPerMinute: 10, costPoints: 2 }],
        ['STATUS_CHANGE', { name: 'STATUS_CHANGE', maxPerMinute: 20, costPoints: 1 }]
    ]);

    private constructor() {}

    public static getInstance(): PolicyEngine {
        if (!PolicyEngine.instance) {
            PolicyEngine.instance = new PolicyEngine();
        }
        return PolicyEngine.instance;
    }

    /**
     * Check if an action is permitted by security policy and rate limits
     */
    public checkAction(actionName: string, accountTag?: string): { verdict: PolicyVerdict; reason?: string } {
        const policy = this.policies.get(actionName);
        if (!policy) {
            return { verdict: 'ALLOW' };
        }

        const now = Date.now();
        const bucketKey = `${actionName}_${accountTag || 'global'}`;
        const bucket = this.requestBuckets.get(bucketKey) || { count: 0, windowStart: now };

        // Reset window after 60 seconds
        if (now - bucket.windowStart > 60000) {
            bucket.count = 0;
            bucket.windowStart = now;
        }

        bucket.count++;
        this.requestBuckets.set(bucketKey, bucket);

        if (bucket.count > policy.maxPerMinute) {
            const reason = `Limite de sécurité dépassée pour ${actionName} (${bucket.count}/${policy.maxPerMinute} req/min). Action temporairement différée.`;
            appBus.audit(actionName, 'DENY', reason, { count: bucket.count, max: policy.maxPerMinute }, accountTag);
            return { verdict: 'DENY', reason };
        }

        if (bucket.count > policy.maxPerMinute * 0.8) {
            const reason = `Volume de requêtes élevé pour ${actionName} (${bucket.count}/${policy.maxPerMinute} req/min).`;
            appBus.audit(actionName, 'WARN', reason, { count: bucket.count, max: policy.maxPerMinute }, accountTag);
            return { verdict: 'WARN', reason };
        }

        appBus.audit(actionName, 'ALLOW', `Action ${actionName} autorisée`, { count: bucket.count }, accountTag);
        return { verdict: 'ALLOW' };
    }
}

export const policyEngine = PolicyEngine.getInstance();
