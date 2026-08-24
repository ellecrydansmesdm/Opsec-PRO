/**
 * Universal Token Parser & Normalizer
 * Inspired by Discord-Token-Format-Changer & discord-token-vault architecture
 */

export interface ParsedTokenEntry {
    token: string;
    userId?: string;
    email?: string;
    password?: string;
    proxy?: string;
    isValidStructure: boolean;
    formatType: 'raw' | 'email_pass_token' | 'token_proxy' | 'bearer' | 'json';
}

export class TokenVaultParser {
    // Discord Token Structure: [Base64_UserID].[Base64_Timestamp].[HMAC_Signature]
    // User tokens typically have 3 dot-separated parts: 24-28 chars . 6 chars . 27-38 chars
    private static readonly TOKEN_REGEX = /([a-zA-Z0-9_\-]{24,28})\.([a-zA-Z0-9_\-]{6})\.([a-zA-Z0-9_\-]{27,45})/;

    /**
     * Extracts and validates the Discord User ID snowflake from token part 1
     */
    public static extractSnowflake(token: string): string | null {
        const parts = token.trim().split('.');
        if (parts.length < 3) return null;

        try {
            const decoded = Buffer.from(parts[0], 'base64').toString('utf-8');
            // Snowflake is a numeric string (17-20 digits)
            if (/^\d{17,20}$/.test(decoded)) {
                return decoded;
            }
        } catch (_) {}
        return null;
    }

    /**
     * Checks if a string conforms to Discord token cryptographic structure
     */
    public static isValidTokenStructure(token: string): boolean {
        const clean = token.replace(/^(Bearer|Bot)\s+/i, '').trim();
        if (!this.TOKEN_REGEX.test(clean)) return false;
        
        const snowflake = this.extractSnowflake(clean);
        return snowflake !== null;
    }

    /**
     * Parses a single line/string of unknown format into a normalized token entry
     */
    public static parseLine(rawInput: string): ParsedTokenEntry | null {
        if (!rawInput || !rawInput.trim()) return null;

        let input = rawInput.trim();

        // 1. Check for JSON format: {"token": "...", "email": "..."}
        if (input.startsWith('{') && input.endsWith('}')) {
            try {
                const parsed = JSON.parse(input);
                if (parsed.token) {
                    const token = parsed.token.replace(/^(Bearer|Bot)\s+/i, '').trim();
                    return {
                        token,
                        email: parsed.email,
                        password: parsed.password,
                        proxy: parsed.proxy,
                        userId: this.extractSnowflake(token) || undefined,
                        isValidStructure: this.isValidTokenStructure(token),
                        formatType: 'json'
                    };
                }
            } catch (_) {}
        }

        // 2. Strip surrounding quotes and whitespace
        input = input.replace(/^["']|["']$/g, '').trim();

        // 3. Check for Bearer / Bot prefix
        if (/^(Bearer|Bot)\s+/i.test(input)) {
            const cleanToken = input.replace(/^(Bearer|Bot)\s+/i, '').trim();
            return {
                token: cleanToken,
                userId: this.extractSnowflake(cleanToken) || undefined,
                isValidStructure: this.isValidTokenStructure(cleanToken),
                formatType: 'bearer'
            };
        }

        // 4. Colon-separated formats: email:pass:token, email:pass:token:proxy, token:proxy
        if (input.includes(':')) {
            const parts = input.split(':').map(p => p.trim());

            // Format: email:password:token:proxy
            if (parts.length >= 4 && this.TOKEN_REGEX.test(parts[2])) {
                const token = parts[2];
                return {
                    token,
                    email: parts[0],
                    password: parts[1],
                    proxy: parts.slice(3).join(':'),
                    userId: this.extractSnowflake(token) || undefined,
                    isValidStructure: this.isValidTokenStructure(token),
                    formatType: 'email_pass_token'
                };
            }

            // Format: email:password:token
            if (parts.length === 3 && this.TOKEN_REGEX.test(parts[2])) {
                const token = parts[2];
                return {
                    token,
                    email: parts[0],
                    password: parts[1],
                    userId: this.extractSnowflake(token) || undefined,
                    isValidStructure: this.isValidTokenStructure(token),
                    formatType: 'email_pass_token'
                };
            }

            // Format: token:proxy
            if (this.TOKEN_REGEX.test(parts[0])) {
                const token = parts[0];
                return {
                    token,
                    proxy: parts.slice(1).join(':'),
                    userId: this.extractSnowflake(token) || undefined,
                    isValidStructure: this.isValidTokenStructure(token),
                    formatType: 'token_proxy'
                };
            }
        }

        // 5. Match standalone token inside dirty text
        const tokenMatch = input.match(this.TOKEN_REGEX);
        if (tokenMatch) {
            const token = tokenMatch[0];
            return {
                token,
                userId: this.extractSnowflake(token) || undefined,
                isValidStructure: this.isValidTokenStructure(token),
                formatType: 'raw'
            };
        }

        return null;
    }

    /**
     * Batch parses multiple lines from a textarea or text file
     */
    public static parseBulk(text: string): { valid: ParsedTokenEntry[]; invalidCount: number } {
        const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
        const valid: ParsedTokenEntry[] = [];
        let invalidCount = 0;

        for (const line of lines) {
            const parsed = this.parseLine(line);
            if (parsed && parsed.isValidStructure) {
                valid.push(parsed);
            } else {
                invalidCount++;
            }
        }

        return { valid, invalidCount };
    }
}
