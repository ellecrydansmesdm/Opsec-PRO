import React from 'react';
import { Tooltip } from './ui/Tooltip';

// Import Nitro SVG badges
import nitro1 from '@/assets/nitro_1.svg';
import nitro2 from '@/assets/nitro_2.svg';
import nitro3 from '@/assets/nitro_3.svg';
import nitro4 from '@/assets/nitro_4.svg';
import nitro5 from '@/assets/nitro_5.svg';
import nitro6 from '@/assets/nitro_6.svg';
import nitro7 from '@/assets/nitro_7.svg';
import nitro8 from '@/assets/nitro_8.svg';

// Import Boost SVG badges
import boost1 from '@/assets/boost_1.svg';
import boost2 from '@/assets/boost_2.svg';
import boost3 from '@/assets/boost_3.svg';
import boost4 from '@/assets/boost_4.svg';
import boost5 from '@/assets/boost_5.svg';
import boost6 from '@/assets/boost_6.svg';
import boost7 from '@/assets/boost_7.svg';
import boost8 from '@/assets/boost_8.svg';
import boost9 from '@/assets/boost_9.svg';

// Helper to calculate months elapsed
export function getMonthsElapsed(startDateStr: string | Date | undefined | null): number {
  if (!startDateStr) return -1;
  const start = new Date(startDateStr);
  if (isNaN(start.getTime())) return -1;
  const end = new Date();
  const months = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
  return Math.max(0, months);
}

interface BadgeProps {
  startDate: string | Date | undefined | null;
  language: 'en' | 'fr';
  size?: number;
}

export const NitroBadge = ({ startDate, language, size = 16 }: BadgeProps) => {
  const months = getMonthsElapsed(startDate);
  if (months < 0) return null;

  let tierName = '';
  let badgeSrc = '';

  if (months >= 72) {
    // Opal (6+ years)
    tierName = language === 'fr' ? 'Nitro (6 ans+ - Opale)' : 'Nitro (6+ Years - Opal)';
    badgeSrc = nitro8;
  } else if (months >= 60) {
    // Ruby (5 years)
    tierName = language === 'fr' ? 'Nitro (5 ans - Rubis)' : 'Nitro (5 Years - Ruby)';
    badgeSrc = nitro7;
  } else if (months >= 36) {
    // Emerald (3 years)
    tierName = language === 'fr' ? 'Nitro (3 ans - Émeraude)' : 'Nitro (3 Years - Emerald)';
    badgeSrc = nitro6;
  } else if (months >= 24) {
    // Diamond (2 years)
    tierName = language === 'fr' ? 'Nitro (2 ans - Diamant)' : 'Nitro (2 Years - Diamond)';
    badgeSrc = nitro5;
  } else if (months >= 12) {
    // Platinum (1 year)
    tierName = language === 'fr' ? 'Nitro (1 an - Platine)' : 'Nitro (1 Year - Platinum)';
    badgeSrc = nitro4;
  } else if (months >= 6) {
    // Gold (6 months)
    tierName = language === 'fr' ? 'Nitro (6 mois - Or)' : 'Nitro (6 Months - Gold)';
    badgeSrc = nitro3;
  } else if (months >= 3) {
    // Silver (3 months)
    tierName = language === 'fr' ? 'Nitro (3 mois - Argent)' : 'Nitro (3 Months - Silver)';
    badgeSrc = nitro2;
  } else {
    // Bronze (1 month)
    tierName = language === 'fr' ? 'Nitro (1 mois - Bronze)' : 'Nitro (1 Month - Bronze)';
    badgeSrc = nitro1;
  }

  return (
    <Tooltip text={tierName}>
      <div className="discord-badge cursor-help flex items-center justify-center" style={{ width: `${size}px`, height: `${size}px`, filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))' }}>
        <img src={badgeSrc} alt={tierName} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
      </div>
    </Tooltip>
  );
};

export const BoostBadge = ({ startDate, language, size = 16 }: BadgeProps) => {
  const months = getMonthsElapsed(startDate);
  if (months < 0) return null;

  let levelText = '';
  let badgeSrc = '';

  if (months >= 24) {
    // Level 9 (24 months)
    levelText = language === 'fr' ? 'Boost de Serveur (Niveau 9 - 24 mois+)' : 'Server Booster (Level 9 - 24+ Months)';
    badgeSrc = boost9;
  } else if (months >= 18) {
    // Level 8 (18 months)
    levelText = language === 'fr' ? 'Boost de Serveur (Niveau 8 - 18 mois)' : 'Server Booster (Level 8 - 18 Months)';
    badgeSrc = boost8;
  } else if (months >= 15) {
    // Level 7 (15 months)
    levelText = language === 'fr' ? 'Boost de Serveur (Niveau 7 - 15 mois)' : 'Server Booster (Level 7 - 15 Months)';
    badgeSrc = boost7;
  } else if (months >= 12) {
    // Level 6 (12 months)
    levelText = language === 'fr' ? 'Boost de Serveur (Niveau 6 - 12 mois)' : 'Server Booster (Level 6 - 12 Months)';
    badgeSrc = boost6;
  } else if (months >= 9) {
    // Level 5 (9 months)
    levelText = language === 'fr' ? 'Boost de Serveur (Niveau 5 - 9 mois)' : 'Server Booster (Level 5 - 9 Months)';
    badgeSrc = boost5;
  } else if (months >= 6) {
    // Level 4 (6 months)
    levelText = language === 'fr' ? 'Boost de Serveur (Niveau 4 - 6 mois)' : 'Server Booster (Level 4 - 6 Months)';
    badgeSrc = boost4;
  } else if (months >= 3) {
    // Level 3 (3 months)
    levelText = language === 'fr' ? 'Boost de Serveur (Niveau 3 - 3 mois)' : 'Server Booster (Level 3 - 3 Months)';
    badgeSrc = boost3;
  } else if (months >= 2) {
    // Level 2 (2 months)
    levelText = language === 'fr' ? 'Boost de Serveur (Niveau 2 - 2 mois)' : 'Server Booster (Level 2 - 2 Months)';
    badgeSrc = boost2;
  } else {
    // Level 1 (1 month)
    levelText = language === 'fr' ? 'Boost de Serveur (Niveau 1 - 1 mois)' : 'Server Booster (Level 1 - 1 Month)';
    badgeSrc = boost1;
  }

  return (
    <Tooltip text={levelText}>
      <div className="discord-badge cursor-help flex items-center justify-center" style={{ width: `${size}px`, height: `${size}px`, filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))' }}>
        <img src={badgeSrc} alt={levelText} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
      </div>
    </Tooltip>
  );
};
