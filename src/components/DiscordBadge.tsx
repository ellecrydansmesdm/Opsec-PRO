import React from 'react';
import { Tooltip } from './ui/Tooltip';
import { 
    ResolvedUserBadge, 
    resolveUserBadges, 
    RawProfileInput, 
    calculateMonthsElapsed,
    resolveEvolvingBadge,
    NITRO_MILESTONES,
    BOOST_MILESTONES
} from '@/utils/discord-badges';

export { getMonthsElapsed } from '@/utils/discord-badges';

interface BadgeProps {
    startDate?: string | Date | undefined | null;
    language: 'en' | 'fr';
    size?: number;
}

// ----------------------------------------------------------------------------
// 1. INDIVIDUAL BADGE ITEM WITH RICH TOOLTIP
// ----------------------------------------------------------------------------

export const DiscordBadgeItem: React.FC<{ badge: ResolvedUserBadge; size?: number; language?: 'fr' | 'en' }> = ({
    badge,
    size = 20,
    language = 'fr'
}) => {
    const isFr = language === 'fr';

    let categoryLabel = '';
    let categoryBg = 'rgba(255,255,255,0.1)';
    let categoryColor = '#fff';

    switch (badge.category) {
        case 'CURRENT':
            categoryLabel = isFr ? 'Actuel' : 'Current';
            categoryBg = 'rgba(88,101,242,0.2)';
            categoryColor = '#5865F2';
            break;
        case 'LEGACY_VISIBLE':
            categoryLabel = 'Legacy';
            categoryBg = 'rgba(244,123,103,0.2)';
            categoryColor = '#F47B67';
            break;
        case 'EXPERIMENTAL':
            categoryLabel = 'Beta 2026';
            categoryBg = 'rgba(235,69,158,0.2)';
            categoryColor = '#EB459E';
            break;
        case 'BOT_ONLY':
            categoryLabel = 'Bot';
            categoryBg = 'rgba(87,242,135,0.2)';
            categoryColor = '#57F287';
            break;
        case 'UNKNOWN':
            categoryLabel = 'Discord';
            categoryBg = 'rgba(255,255,255,0.15)';
            categoryColor = '#aaa';
            break;
    }

    const tooltipContent = (
        <div style={{ textAlign: 'left', minWidth: '130px', maxWidth: '200px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginBottom: '4px' }}>
                <span style={{ fontWeight: 'bold', fontSize: '11px', color: '#fff' }}>{badge.name}</span>
                {categoryLabel && (
                    <span style={{ 
                        fontSize: '8px', 
                        padding: '1px 5px', 
                        borderRadius: '4px', 
                        background: categoryBg, 
                        color: categoryColor,
                        fontWeight: '700',
                        textTransform: 'uppercase'
                    }}>
                        {categoryLabel}
                    </span>
                )}
            </div>
            <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.7)', margin: 0, lineHeight: 1.3 }}>
                {badge.description}
            </p>
            {badge.evolves && badge.nextTier && (
                <div style={{ marginTop: '6px', paddingTop: '6px', borderTop: '1px solid rgba(255,255,255,0.1)', fontSize: '9px', color: '#00ff80' }}>
                    {isFr ? `Prochain palier : ${badge.nextTier.nameFr}` : `Next tier: ${badge.nextTier.nameEn}`}
                </div>
            )}
        </div>
    );

    return (
        <Tooltip text={tooltipContent}>
            <div 
                className="discord-badge-mini cursor-help"
                style={{ 
                    width: `${size}px`, 
                    height: `${size}px`, 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    transition: 'transform 0.15s ease',
                    filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.35))'
                }}
                onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.15)')}
                onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1.0)')}
            >
                <img 
                    src={badge.asset} 
                    alt={badge.name} 
                    style={{ width: '100%', height: '100%', objectFit: 'contain' }} 
                    onError={(e) => {
                        // Fallback image if remote url fails
                        (e.target as HTMLElement).style.display = 'none';
                    }}
                />
            </div>
        </Tooltip>
    );
};

// ----------------------------------------------------------------------------
// 2. NITRO & BOOST COMPATIBILITY BADGES
// ----------------------------------------------------------------------------

export const NitroBadge: React.FC<BadgeProps> = ({ startDate, language, size = 20 }) => {
    const isFr = language === 'fr';
    const evo = resolveEvolvingBadge(NITRO_MILESTONES, startDate, isFr);
    if (!evo) return null;

    const badge: ResolvedUserBadge = {
        id: 'nitro',
        name: 'Discord Nitro',
        description: startDate 
            ? (isFr ? `Abonné depuis le ${new Date(startDate).toLocaleDateString()}` : `Subscriber since ${new Date(startDate).toLocaleDateString()}`)
            : 'Discord Nitro',
        category: 'CURRENT',
        asset: evo.currentTier.asset,
        evolves: true,
        currentTier: evo.currentTier.tier,
        nextTier: evo.nextTier,
        monthsElapsed: evo.monthsElapsed,
        progressPercentage: evo.progressPercentage,
        daysUntilNextMilestone: evo.daysUntilNext
    };

    return <DiscordBadgeItem badge={badge} size={size} language={language} />;
};

export const BoostBadge: React.FC<BadgeProps> = ({ startDate, language, size = 20 }) => {
    const isFr = language === 'fr';
    const evo = resolveEvolvingBadge(BOOST_MILESTONES, startDate, isFr);
    if (!evo) return null;

    const badge: ResolvedUserBadge = {
        id: 'guild_booster',
        name: 'Server Booster',
        description: startDate 
            ? (isFr ? `Booste depuis le ${new Date(startDate).toLocaleDateString()}` : `Boosting since ${new Date(startDate).toLocaleDateString()}`)
            : 'Server Booster',
        category: 'CURRENT',
        asset: evo.currentTier.asset,
        evolves: true,
        currentTier: evo.currentTier.tier,
        nextTier: evo.nextTier,
        monthsElapsed: evo.monthsElapsed,
        progressPercentage: evo.progressPercentage,
        daysUntilNextMilestone: evo.daysUntilNext
    };

    return <DiscordBadgeItem badge={badge} size={size} language={language} />;
};

// ----------------------------------------------------------------------------
// 3. ROW OF BADGES RESOLVED FROM USER PROFILE
// ----------------------------------------------------------------------------

export const DiscordBadgesRow: React.FC<{
    userProfile: RawProfileInput;
    language?: 'fr' | 'en';
    size?: number;
}> = ({ userProfile, language = 'fr', size = 20 }) => {
    const badges = React.useMemo(() => {
        return resolveUserBadges(userProfile, language);
    }, [userProfile, language]);

    if (badges.length === 0) return null;

    return (
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
            {badges.map((badge) => (
                <DiscordBadgeItem key={badge.id} badge={badge} size={size} language={language} />
            ))}
        </div>
    );
};

// ----------------------------------------------------------------------------
// 4. EVOLVING PROGRESSION CARDS (NITRO & BOOST TRACKERS)
// ----------------------------------------------------------------------------

export const DiscordBadgeProgressionCard: React.FC<{
    type: 'nitro' | 'boost';
    startDate?: string | Date | null;
    language?: 'fr' | 'en';
}> = ({ type, startDate, language = 'fr' }) => {
    const isFr = language === 'fr';
    const milestones = type === 'nitro' ? NITRO_MILESTONES : BOOST_MILESTONES;
    const evo = resolveEvolvingBadge(milestones, startDate, isFr);

    if (!evo || !startDate) return null;

    const title = type === 'nitro' ? 'Discord Nitro' : (isFr ? 'Server Booster' : 'Server Booster');
    const startFormatted = new Date(startDate).toLocaleDateString();

    return (
        <div style={{
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '12px',
            padding: '14px 16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            position: 'relative',
            overflow: 'hidden'
        }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <img 
                        src={evo.currentTier.asset} 
                        alt={evo.currentTier.nameEn} 
                        style={{ width: '26px', height: '26px', objectFit: 'contain', filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.4))' }} 
                    />
                    <div>
                        <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#fff' }}>
                            {title} — {isFr ? evo.currentTier.nameFr : evo.currentTier.nameEn}
                        </div>
                        <div style={{ fontSize: '10px', color: 'var(--text-dim)', opacity: 0.7 }}>
                            {isFr ? `Actif depuis le ${startFormatted} (${evo.monthsElapsed} mois)` : `Active since ${startFormatted} (${evo.monthsElapsed} months)`}
                        </div>
                    </div>
                </div>

                {evo.nextTier ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.6)' }}>
                            {isFr ? 'Prochain :' : 'Next:'}
                        </span>
                        <img 
                            src={evo.nextTier.asset} 
                            alt={evo.nextTier.nameEn} 
                            style={{ width: '20px', height: '20px', objectFit: 'contain', opacity: 0.8 }} 
                        />
                    </div>
                ) : (
                    <span style={{ fontSize: '10px', fontWeight: 'bold', color: 'var(--success)' }}>
                        {isFr ? 'Niveau Max Atteint 👑' : 'Max Level Reached 👑'}
                    </span>
                )}
            </div>

            {/* Progress Bar */}
            {evo.nextTier && (
                <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', marginBottom: '4px' }}>
                        <span style={{ color: 'rgba(255,255,255,0.6)' }}>
                            {isFr ? `Progression vers ${evo.nextTier.nameFr}` : `Progress to ${evo.nextTier.nameEn}`}
                        </span>
                        <span style={{ fontWeight: 'bold', color: type === 'nitro' ? '#f47fff' : '#ff73fa' }}>
                            {evo.progressPercentage}% {evo.daysUntilNext > 0 && `(${evo.daysUntilNext} ${isFr ? 'jours restants' : 'days left'})`}
                        </span>
                    </div>
                    <div style={{ 
                        width: '100%', 
                        height: '6px', 
                        background: 'rgba(0, 0, 0, 0.4)', 
                        borderRadius: '3px', 
                        overflow: 'hidden' 
                    }}>
                        <div style={{ 
                            width: `${evo.progressPercentage}%`, 
                            height: '100%', 
                            background: type === 'nitro' 
                                ? 'linear-gradient(90deg, #5865F2, #EB459E)' 
                                : 'linear-gradient(90deg, #F47B67, #FF73FA)',
                            borderRadius: '3px',
                            transition: 'width 0.4s ease'
                        }} />
                    </div>
                </div>
            )}
        </div>
    );
};
