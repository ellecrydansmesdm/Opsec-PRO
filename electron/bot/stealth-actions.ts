import { appBus } from '../services/event-bus';

export interface TypingOptions {
    wpm?: number;         // Words per minute (default ~65)
    minDelayMs?: number;  // Minimum typing duration in ms (default 400)
    maxDelayMs?: number;  // Maximum typing duration cap in ms (default 4000)
}

export interface ZeroTraceOptions {
    placeholder?: string; // String to replace content with before deletion
    editDelayMs?: number; // Micro-delay between edit and delete (ms)
}

/**
 * Calculates human-like typing duration based on text length and target WPM
 */
export function calculateTypingDelay(text: string, options: TypingOptions = {}): number {
    const wpm = options.wpm || (55 + Math.floor(Math.random() * 25)); // 55 to 80 WPM
    const words = Math.max(1, text.length / 5);
    const baseDurationMs = (words / wpm) * 60 * 1000;
    
    // Add ±15% natural human jitter
    const jitter = (Math.random() * 0.3 - 0.15) * baseDurationMs;
    const duration = Math.round(baseDurationMs + jitter);

    const minDelay = options.minDelayMs ?? 400;
    const maxDelay = options.maxDelayMs ?? 4000;

    return Math.max(minDelay, Math.min(maxDelay, duration));
}

/**
 * Simulates typing in a Discord channel for a realistic duration before message dispatch
 */
export async function simulateTyping(channel: any, text: string, options: TypingOptions = {}): Promise<number> {
    if (!channel || typeof channel.sendTyping !== 'function') return 0;

    const delayMs = calculateTypingDelay(text, options);
    try {
        await channel.sendTyping();
        await new Promise(resolve => setTimeout(resolve, delayMs));
    } catch (_) {
        // Fallback without failing
    }
    return delayMs;
}

/**
 * Zero-Trace deletion: overwrites message content with a neutral payload before deleting,
 * neutralizing external message logger bots and snipers that only capture deletion events.
 */
export async function zeroTraceDelete(message: any, options: ZeroTraceOptions = {}): Promise<boolean> {
    if (!message) return false;

    const placeholder = options.placeholder || '.';
    const editDelay = options.editDelayMs ?? 100;

    try {
        if (typeof message.edit === 'function') {
            await message.edit(placeholder).catch(() => {});
        }
        if (editDelay > 0) {
            await new Promise(resolve => setTimeout(resolve, editDelay));
        }
        if (typeof message.delete === 'function') {
            await message.delete();
        }
        return true;
    } catch (err: any) {
        appBus.warn(`ZeroTraceDelete failed: ${err.message}`, 'STEALTH');
        return false;
    }
}
