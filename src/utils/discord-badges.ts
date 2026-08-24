// ============================================================================
// OPSEC PRO — DISCORD PROFILE BADGES REGISTRY & PROGRESSION ENGINE (2026)
// ============================================================================

// Nitro Evolving Badges (Official Discord CDN PNG)
import nitro0 from '@/assets/badges/nitro_0.png';
import nitro1 from '@/assets/badges/nitro_1.png';
import nitro2 from '@/assets/badges/nitro_2.png';
import nitro3 from '@/assets/badges/nitro_3.png';
import nitro4 from '@/assets/badges/nitro_4.png';
import nitro5 from '@/assets/badges/nitro_5.png';
import nitro6 from '@/assets/badges/nitro_6.png';
import nitro7 from '@/assets/badges/nitro_7.png';
import nitro8 from '@/assets/badges/nitro_8.png';

// Server Booster Evolving Badges (Official Discord CDN PNG)
import boost1 from '@/assets/badges/boost_1.png';
import boost2 from '@/assets/badges/boost_1.png';
import boost3 from '@/assets/badges/boost_3.png';
import boost4 from '@/assets/badges/boost_3.png';
import boost5 from '@/assets/badges/boost_5.png';
import boost6 from '@/assets/badges/boost_6.png';
import boost7 from '@/assets/badges/boost_7.png';
import boost8 from '@/assets/badges/boost_8.png';
import boost9 from '@/assets/badges/boost_9.png';

// Standard & Special Official Badges (Direct from Discord CDN & FCord)
import staffIcon from '@/assets/badges/discord_staff.png';
import partnerIcon from '@/assets/badges/partnered_server_owner.png';
import hypesquadEventsIcon from '@/assets/badges/hypesquad_events.png';
import braveryIcon from '@/assets/badges/hypesquad_bravery.png';
import brillianceIcon from '@/assets/badges/hypesquad_brilliance.png';
import balanceIcon from '@/assets/badges/hypesquad_balance.png';
import bugHunter1Icon from '@/assets/badges/bug_hunter_level_1.png';
import bugHunter2Icon from '@/assets/badges/bug_hunter_level_2.png';
import earlySupporterIcon from '@/assets/badges/early_supporter.png';
import botDevIcon from '@/assets/badges/early_verified_bot_developer.png';
import modAlumniIcon from '@/assets/badges/moderator_programs_alumni.png';
import legacyUsernameIcon from '@/assets/badges/legacy_username.png';
import questsIcon from '@/assets/badges/discord_quests.png';
import orbsIcon from '@/assets/badges/discord_orbs.png';
import lastMeadowIcon from '@/assets/badges/last_meadow_online.svg';
import giftingIcon from '@/assets/badges/gifting_champion.png';
import accountAgeIcon from '@/assets/badges/account_age_badge.svg';
import streamingIcon from '@/assets/badges/streaming_badge.svg';
import gameTimeIcon from '@/assets/badges/game_time_badge.svg';
import gameVarietyIcon from '@/assets/badges/game_variety_badge.svg';
import verifiedBotIcon from '@/assets/badges/verified_bot.svg';
import unknownBadgeIcon from '@/assets/badges/unknown_badge.svg';

export type BadgeCategory = 'CURRENT' | 'LEGACY_VISIBLE' | 'EXPERIMENTAL' | 'BOT_ONLY' | 'REMOVED' | 'UNKNOWN';

export interface MilestoneTier {
    tier: number;
    monthsRequired: number;
    nameFr: string;
    nameEn: string;
    asset: string;
}

export interface BadgeDefinition {
    id: string;
    nameFr: string;
    nameEn: string;
    descriptionFr: string;
    descriptionEn: string;
    category: BadgeCategory;
    detection: 'publicFlag' | 'profileBadge' | 'premium' | 'boost' | 'legacyUsername' | 'experiment' | 'custom';
    bitfieldFlag?: number;
    asset: string;
    evolves: boolean;
    milestones?: MilestoneTier[];
}

export interface ResolvedUserBadge {
    id: string;
    name: string;
    description: string;
    category: BadgeCategory;
    asset: string;
    evolves: boolean;
    earnedDate?: string | null;
    currentTier?: number;
    nextTier?: MilestoneTier | null;
    monthsElapsed?: number;
    progressPercentage?: number;
    daysUntilNextMilestone?: number;
}

// ----------------------------------------------------------------------------
// 1. MILESTONES DEFINITIONS
// ----------------------------------------------------------------------------

export const NITRO_MILESTONES: MilestoneTier[] = [
    { tier: 1, monthsRequired: 1, nameFr: 'Bronze (1 mois)', nameEn: 'Bronze (1 month)', asset: nitro1 },
    { tier: 2, monthsRequired: 3, nameFr: 'Argent (3 mois)', nameEn: 'Silver (3 months)', asset: nitro2 },
    { tier: 3, monthsRequired: 6, nameFr: 'Or (6 mois)', nameEn: 'Gold (6 months)', asset: nitro3 },
    { tier: 4, monthsRequired: 12, nameFr: 'Platine (1 an)', nameEn: 'Platinum (1 year)', asset: nitro4 },
    { tier: 5, monthsRequired: 24, nameFr: 'Diamant (2 ans)', nameEn: 'Diamond (2 years)', asset: nitro5 },
    { tier: 6, monthsRequired: 36, nameFr: 'Émeraude (3 ans)', nameEn: 'Emerald (3 years)', asset: nitro6 },
    { tier: 7, monthsRequired: 60, nameFr: 'Rubis (5 ans)', nameEn: 'Ruby (5 years)', asset: nitro7 },
    { tier: 8, monthsRequired: 72, nameFr: 'Opale (6 ans+)', nameEn: 'Opal (6+ years)', asset: nitro8 },
];

export const BOOST_MILESTONES: MilestoneTier[] = [
    { tier: 1, monthsRequired: 1, nameFr: 'Niveau 1 (1 mois)', nameEn: 'Level 1 (1 month)', asset: boost1 },
    { tier: 2, monthsRequired: 2, nameFr: 'Niveau 2 (2 mois)', nameEn: 'Level 2 (2 months)', asset: boost2 },
    { tier: 3, monthsRequired: 3, nameFr: 'Niveau 3 (3 mois)', nameEn: 'Level 3 (3 months)', asset: boost3 },
    { tier: 4, monthsRequired: 6, nameFr: 'Niveau 4 (6 mois)', nameEn: 'Level 4 (6 months)', asset: boost4 },
    { tier: 5, monthsRequired: 9, nameFr: 'Niveau 5 (9 mois)', nameEn: 'Level 5 (9 months)', asset: boost5 },
    { tier: 6, monthsRequired: 12, nameFr: 'Niveau 6 (1 an)', nameEn: 'Level 6 (1 year)', asset: boost6 },
    { tier: 7, monthsRequired: 15, nameFr: 'Niveau 7 (15 mois)', nameEn: 'Level 7 (15 months)', asset: boost7 },
    { tier: 8, monthsRequired: 18, nameFr: 'Niveau 8 (18 mois)', nameEn: 'Level 8 (18 months)', asset: boost8 },
    { tier: 9, monthsRequired: 24, nameFr: 'Niveau 9 (2 ans+)', nameEn: 'Level 9 (2+ years)', asset: boost9 },
];

// ----------------------------------------------------------------------------
// 2. CENTRALIZED BADGE REGISTRY
// ----------------------------------------------------------------------------

export const DISCORD_BADGE_REGISTRY: Record<string, BadgeDefinition> = {
    // === COMMON ===
    nitro: {
        id: 'nitro',
        nameFr: 'Discord Nitro',
        nameEn: 'Discord Nitro',
        descriptionFr: 'Abonné à Discord Nitro',
        descriptionEn: 'Subscribed to Discord Nitro',
        category: 'CURRENT',
        detection: 'premium',
        asset: nitro1,
        evolves: true,
        milestones: NITRO_MILESTONES,
    },
    nitro_basic: {
        id: 'nitro_basic',
        nameFr: 'Discord Nitro Basic',
        nameEn: 'Discord Nitro Basic',
        descriptionFr: 'Abonné à Discord Nitro Basic',
        descriptionEn: 'Subscribed to Discord Nitro Basic',
        category: 'CURRENT',
        detection: 'premium',
        asset: nitro1,
        evolves: false,
    },
    nitro_classic: {
        id: 'nitro_classic',
        nameFr: 'Discord Nitro Classic',
        nameEn: 'Discord Nitro Classic',
        descriptionFr: 'Abonné à Discord Nitro Classic (Legacy)',
        descriptionEn: 'Subscribed to Discord Nitro Classic (Legacy)',
        category: 'CURRENT',
        detection: 'premium',
        asset: nitro1,
        evolves: false,
    },
    guild_booster: {
        id: 'guild_booster',
        nameFr: 'Server Booster',
        nameEn: 'Server Booster',
        descriptionFr: 'Soutient un serveur Discord avec des Boosts',
        descriptionEn: 'Boosting a Discord server',
        category: 'CURRENT',
        detection: 'boost',
        asset: boost1,
        evolves: true,
        milestones: BOOST_MILESTONES,
    },
    quest_completed: {
        id: 'quest_completed',
        nameFr: 'Discord Quests',
        nameEn: 'Discord Quests',
        descriptionFr: 'A complété une quête sponsorisée Discord',
        descriptionEn: 'Completed a Discord Sponsored Quest',
        category: 'CURRENT',
        detection: 'profileBadge',
        asset: questsIcon,
        evolves: false,
    },
    orbs: {
        id: 'orbs',
        nameFr: 'Discord Orbs',
        nameEn: 'Discord Orbs',
        descriptionFr: 'Badge du programme Discord Orbs',
        descriptionEn: 'Discord Orbs Reward Program',
        category: 'CURRENT',
        detection: 'profileBadge',
        asset: orbsIcon,
        evolves: false,
    },
    legacy_username: {
        id: 'legacy_username',
        nameFr: 'Nom d\'utilisateur d\'origine',
        nameEn: 'Originally Known As',
        descriptionFr: 'Possédait un tag à 4 chiffres (#0001) avant la migration',
        descriptionEn: 'Originally had a 4-digit discriminator before username migration',
        category: 'CURRENT',
        detection: 'legacyUsername',
        asset: legacyUsernameIcon,
        evolves: false,
    },

    // === RARE & MYTHIC ===
    discord_staff: {
        id: 'discord_staff',
        nameFr: 'Employé Discord',
        nameEn: 'Discord Staff',
        descriptionFr: 'Membre du personnel officiel de Discord',
        descriptionEn: 'Official Discord Employee',
        category: 'CURRENT',
        detection: 'publicFlag',
        bitfieldFlag: 1 << 0, // 1
        asset: staffIcon,
        evolves: false,
    },
    bug_hunter_level_1: {
        id: 'bug_hunter_level_1',
        nameFr: 'Chasseur de bugs Niveau 1',
        nameEn: 'Bug Hunter Level 1',
        descriptionFr: 'A trouvé et signalé des bugs à Discord',
        descriptionEn: 'Reported verified bugs to Discord',
        category: 'CURRENT',
        detection: 'publicFlag',
        bitfieldFlag: 1 << 3, // 8
        asset: bugHunter1Icon,
        evolves: false,
    },
    bug_hunter_level_2: {
        id: 'bug_hunter_level_2',
        nameFr: 'Chasseur de bugs Niveau 2 (Doré)',
        nameEn: 'Bug Hunter Level 2 (Golden)',
        descriptionFr: 'Chasseur de bugs d\'élite Discord',
        descriptionEn: 'Elite Discord Bug Hunter',
        category: 'CURRENT',
        detection: 'publicFlag',
        bitfieldFlag: 1 << 14, // 16384
        asset: bugHunter2Icon,
        evolves: false,
    },

    // === LEGACY VISIBLE ===
    partnered_server_owner: {
        id: 'partnered_server_owner',
        nameFr: 'Propriétaire de serveur partenaire',
        nameEn: 'Partnered Server Owner',
        descriptionFr: 'Propriétaire d\'un serveur partenaire officiel Discord',
        descriptionEn: 'Owner of an official Discord Partnered Server',
        category: 'LEGACY_VISIBLE',
        detection: 'publicFlag',
        bitfieldFlag: 1 << 1, // 2
        asset: partnerIcon,
        evolves: false,
    },
    hypesquad_events: {
        id: 'hypesquad_events',
        nameFr: 'HypeSquad Events',
        nameEn: 'HypeSquad Events',
        descriptionFr: 'Coordinateur d\'événements HypeSquad',
        descriptionEn: 'HypeSquad Events Coordinator',
        category: 'LEGACY_VISIBLE',
        detection: 'publicFlag',
        bitfieldFlag: 1 << 2, // 4
        asset: hypesquadEventsIcon,
        evolves: false,
    },
    hypesquad_house_1: {
        id: 'hypesquad_house_1',
        nameFr: 'HypeSquad Bravery',
        nameEn: 'HypeSquad Bravery',
        descriptionFr: 'Membre de la Maison HypeSquad Bravery',
        descriptionEn: 'Member of HypeSquad House Bravery',
        category: 'LEGACY_VISIBLE',
        detection: 'publicFlag',
        bitfieldFlag: 1 << 6, // 64
        asset: braveryIcon,
        evolves: false,
    },
    hypesquad_house_2: {
        id: 'hypesquad_house_2',
        nameFr: 'HypeSquad Brilliance',
        nameEn: 'HypeSquad Brilliance',
        descriptionFr: 'Membre de la Maison HypeSquad Brilliance',
        descriptionEn: 'Member of HypeSquad House Brilliance',
        category: 'LEGACY_VISIBLE',
        detection: 'publicFlag',
        bitfieldFlag: 1 << 7, // 128
        asset: brillianceIcon,
        evolves: false,
    },
    hypesquad_house_3: {
        id: 'hypesquad_house_3',
        nameFr: 'HypeSquad Balance',
        nameEn: 'HypeSquad Balance',
        descriptionFr: 'Membre de la Maison HypeSquad Balance',
        descriptionEn: 'Member of HypeSquad House Balance',
        category: 'LEGACY_VISIBLE',
        detection: 'publicFlag',
        bitfieldFlag: 1 << 8, // 256
        asset: balanceIcon,
        evolves: false,
    },
    early_supporter: {
        id: 'early_supporter',
        nameFr: 'Soutien de la première heure',
        nameEn: 'Early Supporter',
        descriptionFr: 'A soutenu Discord avant le 10 octobre 2018',
        descriptionEn: 'Supported Discord prior to October 10th, 2018',
        category: 'LEGACY_VISIBLE',
        detection: 'publicFlag',
        bitfieldFlag: 1 << 9, // 512
        asset: earlySupporterIcon,
        evolves: false,
    },
    moderator_programs_alumni: {
        id: 'moderator_programs_alumni',
        nameFr: 'Ancien du programme de modération',
        nameEn: 'Moderator Programs Alumni',
        descriptionFr: 'Diplômé certifié de la Discord Moderator Academy',
        descriptionEn: 'Certified Discord Moderator Program Alumni',
        category: 'LEGACY_VISIBLE',
        detection: 'publicFlag',
        bitfieldFlag: 1 << 18, // 262144
        asset: modAlumniIcon,
        evolves: false,
    },
    last_meadow_online: {
        id: 'last_meadow_online',
        nameFr: 'Last Meadow Online',
        nameEn: 'Last Meadow Online',
        descriptionFr: 'Événement interactif Last Meadow Online (2025/2026)',
        descriptionEn: 'Last Meadow Online event participant',
        category: 'LEGACY_VISIBLE',
        detection: 'profileBadge',
        asset: lastMeadowIcon,
        evolves: false,
    },

    // === EXPERIMENTAL (2026) ===
    gifting_badge: {
        id: 'gifting_badge',
        nameFr: 'Gifting Champion',
        nameEn: 'Gifting Champion',
        descriptionFr: 'A envoyé des cadeaux Nitro à des amis',
        descriptionEn: 'Sent Nitro gifts to friends',
        category: 'EXPERIMENTAL',
        detection: 'profileBadge',
        asset: giftingIcon,
        evolves: true,
    },
    account_age: {
        id: 'account_age',
        nameFr: 'Ancienneté du compte',
        nameEn: 'Account Veteran',
        descriptionFr: 'Membre actif Discord depuis plusieurs années',
        descriptionEn: 'Veteran Discord member',
        category: 'EXPERIMENTAL',
        detection: 'experiment',
        asset: accountAgeIcon,
        evolves: true,
    },
    streaming_badge: {
        id: 'streaming_badge',
        nameFr: 'Diffuseur actif',
        nameEn: 'Active Streamer',
        descriptionFr: 'Partage régulièrement ses écrans et sessions de jeu',
        descriptionEn: 'Frequently streams gameplay to friends',
        category: 'EXPERIMENTAL',
        detection: 'experiment',
        asset: streamingIcon,
        evolves: false,
    },
    game_time: {
        id: 'game_time',
        nameFr: 'Temps de jeu',
        nameEn: 'Game Time',
        descriptionFr: 'Accumule des heures de jeu sur Discord',
        descriptionEn: 'Logged extensive gaming sessions',
        category: 'EXPERIMENTAL',
        detection: 'experiment',
        asset: gameTimeIcon,
        evolves: false,
    },
    game_variety: {
        id: 'game_variety',
        nameFr: 'Explorateur de jeux',
        nameEn: 'Game Explorer',
        descriptionFr: 'Joue à une grande diversité de titres sur Discord',
        descriptionEn: 'Plays a broad variety of titles on Discord',
        category: 'EXPERIMENTAL',
        detection: 'experiment',
        asset: gameVarietyIcon,
        evolves: false,
    },

    // === BOT ONLY ===
    early_verified_bot_developer: {
        id: 'early_verified_bot_developer',
        nameFr: 'Développeur de bot vérifié pionnier',
        nameEn: 'Early Verified Bot Developer',
        descriptionFr: 'A développé un bot vérifié avant le 19 août 2020',
        descriptionEn: 'Developed a verified bot prior to August 19, 2020',
        category: 'BOT_ONLY',
        detection: 'publicFlag',
        bitfieldFlag: 1 << 17, // 131072
        asset: botDevIcon,
        evolves: false,
    },
    verified_bot: {
        id: 'verified_bot',
        nameFr: 'Bot Vérifié',
        nameEn: 'Verified Bot',
        descriptionFr: 'Application / Bot officiel vérifié par Discord',
        descriptionEn: 'Official Verified Discord Application',
        category: 'BOT_ONLY',
        detection: 'publicFlag',
        bitfieldFlag: 1 << 16, // 65536
        asset: verifiedBotIcon,
        evolves: false,
    },

    // === REMOVED / DECOMMISSIONED ===
    active_developer: {
        id: 'active_developer',
        nameFr: 'Développeur Actif (Retiré)',
        nameEn: 'Active Developer (Decommissioned)',
        descriptionFr: 'Ce badge a été décommissionné par Discord en décembre 2025.',
        descriptionEn: 'This badge was decommissioned by Discord in December 2025.',
        category: 'REMOVED',
        detection: 'publicFlag',
        bitfieldFlag: 1 << 22, // 4194304
        asset: unknownBadgeIcon,
        evolves: false,
    }
};

// ----------------------------------------------------------------------------
// 3. PROGRESSION & CALCULATION HELPERS
// ----------------------------------------------------------------------------

export function calculateMonthsElapsed(startDateStr?: string | Date | null): number {
    if (!startDateStr) return -1;
    const start = new Date(startDateStr);
    if (isNaN(start.getTime())) return -1;
    const now = new Date();
    const months = (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth());
    return Math.max(0, months);
}

export const getMonthsElapsed = calculateMonthsElapsed;

export function resolveEvolvingBadge(
    milestones: MilestoneTier[],
    startDateStr?: string | Date | null,
    isFr: boolean = true
): { currentTier: MilestoneTier; nextTier: MilestoneTier | null; monthsElapsed: number; progressPercentage: number; daysUntilNext: number } | null {
    const months = calculateMonthsElapsed(startDateStr);
    if (months < 0 || milestones.length === 0) return null;

    let currentTier = milestones[0];
    let nextTier: MilestoneTier | null = null;

    for (let i = milestones.length - 1; i >= 0; i--) {
        if (months >= milestones[i].monthsRequired) {
            currentTier = milestones[i];
            nextTier = milestones[i + 1] || null;
            break;
        }
    }

    if (months < milestones[0].monthsRequired) {
        currentTier = milestones[0];
        nextTier = milestones[1] || null;
    }

    let progressPercentage = 100;
    let daysUntilNext = 0;

    if (nextTier && startDateStr) {
        const start = new Date(startDateStr);
        const nextMilestoneDate = new Date(start);
        nextMilestoneDate.setMonth(nextMilestoneDate.getMonth() + nextTier.monthsRequired);

        const currentMilestoneDate = new Date(start);
        currentMilestoneDate.setMonth(currentMilestoneDate.getMonth() + currentTier.monthsRequired);

        const totalSpanMs = Math.max(1, nextMilestoneDate.getTime() - currentMilestoneDate.getTime());
        const elapsedSpanMs = Math.max(0, Date.now() - currentMilestoneDate.getTime());

        progressPercentage = Math.min(100, Math.max(0, Math.round((elapsedSpanMs / totalSpanMs) * 100)));
        daysUntilNext = Math.max(0, Math.ceil((nextMilestoneDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
    }

    return {
        currentTier,
        nextTier,
        monthsElapsed: months,
        progressPercentage,
        daysUntilNext
    };
}

// ----------------------------------------------------------------------------
// 4. MASTER RESOLVER: DECODE ALL BADGES WITH ZERO DUPLICATES
// ----------------------------------------------------------------------------

export interface RawProfileInput {
    publicFlags?: number;
    flags?: number;
    premiumType?: number | null;
    premiumSince?: string | null;
    premiumGuildSince?: string | null;
    legacyUsername?: string | null;
    profileBadges?: Array<{ id: string; description?: string; icon?: string; link?: string }>;
    rawBadgesList?: string[];
}

export function resolveUserBadges(
    input: RawProfileInput,
    language: 'fr' | 'en' = 'fr'
): ResolvedUserBadge[] {
    const isFr = language === 'fr';
    const resolvedMap = new Map<string, ResolvedUserBadge>();

    const publicFlags = Number(input.publicFlags ?? input.flags ?? 0);

    // 1. Resolve from Public Flags (Bitfields)
    for (const def of Object.values(DISCORD_BADGE_REGISTRY)) {
        // Strict anti-regression: Filter out REMOVED badges like Active Developer
        if (def.category === 'REMOVED') continue;

        if (def.bitfieldFlag && (publicFlags & def.bitfieldFlag) === def.bitfieldFlag) {
            resolvedMap.set(def.id, {
                id: def.id,
                name: isFr ? def.nameFr : def.nameEn,
                description: isFr ? def.descriptionFr : def.descriptionEn,
                category: def.category,
                asset: def.asset,
                evolves: def.evolves
            });
        }
    }

    // 2. Resolve Nitro
    const premiumType = input.premiumType;
    const hasNitro = premiumType !== undefined && premiumType !== 0 && premiumType !== null;
    if (hasNitro || input.premiumSince) {
        if (premiumType === 3) {
            // Nitro Basic (Non-evolving)
            const def = DISCORD_BADGE_REGISTRY.nitro_basic;
            resolvedMap.set('nitro', {
                id: 'nitro_basic',
                name: isFr ? def.nameFr : def.nameEn,
                description: isFr ? def.descriptionFr : def.descriptionEn,
                category: 'CURRENT',
                asset: def.asset,
                evolves: false
            });
        } else if (premiumType === 1) {
            // Nitro Classic (Legacy)
            const def = DISCORD_BADGE_REGISTRY.nitro_classic;
            resolvedMap.set('nitro', {
                id: 'nitro_classic',
                name: isFr ? def.nameFr : def.nameEn,
                description: isFr ? def.descriptionFr : def.descriptionEn,
                category: 'CURRENT',
                asset: def.asset,
                evolves: false
            });
        } else {
            // Standard Evolving Nitro
            const def = DISCORD_BADGE_REGISTRY.nitro;
            const evo = resolveEvolvingBadge(NITRO_MILESTONES, input.premiumSince, isFr);
            resolvedMap.set('nitro', {
                id: 'nitro',
                name: isFr ? def.nameFr : def.nameEn,
                description: input.premiumSince 
                    ? (isFr ? `Abonné depuis le ${new Date(input.premiumSince).toLocaleDateString()}` : `Subscriber since ${new Date(input.premiumSince).toLocaleDateString()}`)
                    : (isFr ? def.descriptionFr : def.descriptionEn),
                category: 'CURRENT',
                asset: evo ? evo.currentTier.asset : def.asset,
                evolves: true,
                earnedDate: input.premiumSince,
                currentTier: evo?.currentTier.tier || 1,
                nextTier: evo?.nextTier || null,
                monthsElapsed: evo?.monthsElapsed || 0,
                progressPercentage: evo?.progressPercentage || 0,
                daysUntilNextMilestone: evo?.daysUntilNext || 0
            });
        }
    }

    // 3. Resolve Server Booster
    if (input.premiumGuildSince) {
        const def = DISCORD_BADGE_REGISTRY.guild_booster;
        const evo = resolveEvolvingBadge(BOOST_MILESTONES, input.premiumGuildSince, isFr);
        resolvedMap.set('guild_booster', {
            id: 'guild_booster',
            name: isFr ? def.nameFr : def.nameEn,
            description: isFr 
                ? `Booste depuis le ${new Date(input.premiumGuildSince).toLocaleDateString()}` 
                : `Boosting since ${new Date(input.premiumGuildSince).toLocaleDateString()}`,
            category: 'CURRENT',
            asset: evo ? evo.currentTier.asset : def.asset,
            evolves: true,
            earnedDate: input.premiumGuildSince,
            currentTier: evo?.currentTier.tier || 1,
            nextTier: evo?.nextTier || null,
            monthsElapsed: evo?.monthsElapsed || 0,
            progressPercentage: evo?.progressPercentage || 0,
            daysUntilNextMilestone: evo?.daysUntilNext || 0
        });
    }

    // 4. Resolve Legacy Username
    if (input.legacyUsername) {
        const def = DISCORD_BADGE_REGISTRY.legacy_username;
        resolvedMap.set('legacy_username', {
            id: 'legacy_username',
            name: isFr ? def.nameFr : def.nameEn,
            description: isFr ? `Ancien tag : ${input.legacyUsername}` : `Originally ${input.legacyUsername}`,
            category: 'CURRENT',
            asset: def.asset,
            evolves: false
        });
    }

    // 5. Ingest profile.badges array from Discord internal profile payload
    if (input.profileBadges && Array.isArray(input.profileBadges)) {
        for (const pb of input.profileBadges) {
            if (!pb || !pb.id) continue;
            const badgeId = pb.id.toLowerCase();

            // Anti-regression: Skip decommissioned active_developer
            if (badgeId === 'active_developer' || badgeId.includes('active_dev')) continue;

            // Map common Discord internal badge IDs
            let mappedId = badgeId;
            if (badgeId.startsWith('guild_booster') || badgeId.includes('boost') || badgeId === 'premium_guild_subscription') {
                if (resolvedMap.has('guild_booster')) continue;
                mappedId = 'guild_booster';
            } else if (badgeId.includes('nitro') || badgeId.includes('premium')) {
                if (resolvedMap.has('nitro')) continue;
                mappedId = 'nitro';
            } else if (badgeId.includes('hypesquad_house_1') || badgeId.includes('bravery')) mappedId = 'hypesquad_house_1';
            else if (badgeId.includes('hypesquad_house_2') || badgeId.includes('brilliance')) mappedId = 'hypesquad_house_2';
            else if (badgeId.includes('hypesquad_house_3') || badgeId.includes('balance')) mappedId = 'hypesquad_house_3';
            else if (badgeId === 'bug_hunter_lvl1') mappedId = 'bug_hunter_level_1';
            else if (badgeId === 'bug_hunter_lvl2') mappedId = 'bug_hunter_level_2';
            else if (badgeId === 'staff') mappedId = 'discord_staff';
            else if (badgeId === 'partner') mappedId = 'partnered_server_owner';

            const registryDef = DISCORD_BADGE_REGISTRY[mappedId];

            if (registryDef) {
                // Merge if not already defined or enrich description
                if (!resolvedMap.has(mappedId)) {
                    resolvedMap.set(mappedId, {
                        id: registryDef.id,
                        name: isFr ? registryDef.nameFr : registryDef.nameEn,
                        description: pb.description || (isFr ? registryDef.descriptionFr : registryDef.descriptionEn),
                        category: registryDef.category,
                        asset: registryDef.asset,
                        evolves: registryDef.evolves
                    });
                }
            } else {
                // Graceful fallback for UNKNOWN / FUTURE Discord badges
                if (!resolvedMap.has(badgeId) && !badgeId.includes('nitro') && !badgeId.includes('boost')) {
                    console.log(`[OPSEC] Detected UNKNOWN_DISCORD_BADGE: id='${badgeId}'`);
                    resolvedMap.set(badgeId, {
                        id: badgeId,
                        name: pb.description || `Badge Discord (${badgeId})`,
                        description: pb.description || 'Badge Discord non répertorié',
                        category: 'UNKNOWN',
                        asset: pb.icon ? `https://cdn.discordapp.com/badge-icons/${pb.icon}.png` : unknownBadgeIcon,
                        evolves: false
                    });
                }
            }
        }
    }

    // 6. Ingest string list from legacy rawBadgesList
    if (input.rawBadgesList && Array.isArray(input.rawBadgesList)) {
        for (const raw of input.rawBadgesList) {
            const rawLower = raw.toLowerCase().replace(/[\s-]/g, '_');
            if (rawLower.includes('active_dev')) continue; // Skip decommissioned
            if (rawLower.includes('nitro') && resolvedMap.has('nitro')) continue; // Avoid duplicate nitro
            if (rawLower.includes('boost') && resolvedMap.has('guild_booster')) continue; // Avoid duplicate boost

            let matchedId: string | null = null;
            if (rawLower.includes('bravery') || rawLower.includes('house_1')) matchedId = 'hypesquad_house_1';
            else if (rawLower.includes('brilliance') || rawLower.includes('house_2')) matchedId = 'hypesquad_house_2';
            else if (rawLower.includes('balance') || rawLower.includes('house_3')) matchedId = 'hypesquad_house_3';
            else if (rawLower.includes('early_supporter')) matchedId = 'early_supporter';
            else if (rawLower.includes('bug_hunter_2') || rawLower.includes('bug_hunter_level_2')) matchedId = 'bug_hunter_level_2';
            else if (rawLower.includes('bug_hunter')) matchedId = 'bug_hunter_level_1';
            else if (rawLower.includes('staff')) matchedId = 'discord_staff';
            else if (rawLower.includes('partner')) matchedId = 'partnered_server_owner';
            else if (rawLower.includes('quest')) matchedId = 'quest_completed';
            else if (rawLower.includes('orbs')) matchedId = 'orbs';

            if (matchedId && !resolvedMap.has(matchedId)) {
                const def = DISCORD_BADGE_REGISTRY[matchedId];
                if (def) {
                    resolvedMap.set(matchedId, {
                        id: def.id,
                        name: isFr ? def.nameFr : def.nameEn,
                        description: isFr ? def.descriptionFr : def.descriptionEn,
                        category: def.category,
                        asset: def.asset,
                        evolves: def.evolves
                    });
                }
            }
        }
    }

    return Array.from(resolvedMap.values());
}
