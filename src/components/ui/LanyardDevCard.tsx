import React, { useEffect, useState } from 'react';
import { useSettingsStore } from '@/store/useSettingsStore';

const DEV_DISCORD_ID = '1113108440575922236';

interface LanyardData {
  discord_status: 'online' | 'idle' | 'dnd' | 'offline';
  discord_user: {
    username: string;
    global_name?: string;
    avatar?: string;
  };
  spotify?: {
    song: string;
    artist: string;
  };
}

const STATUS_COLORS: Record<string, string> = {
  online: '#23a55a',
  idle: '#f0b232',
  dnd: '#f23f43',
  offline: '#80848e',
};

export const LanyardDevCard = ({ variant = 'vertical' }: { variant?: 'vertical' | 'horizontal' }) => {
  const { settings } = useSettingsStore();
  const isFr = settings.language === 'fr';
  const [profile, setProfile] = useState<LanyardData | null>(null);

  useEffect(() => {
    const fetchStatus = () => {
      fetch(`https://api.lanyard.rest/v1/users/${DEV_DISCORD_ID}`)
        .then((res) => res.json())
        .then((res) => {
          if (res.success && res.data) {
            setProfile(res.data);
          }
        })
        .catch(() => {});
    };
    fetchStatus();
    const interval = setInterval(fetchStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  const avatarUrl = profile?.discord_user?.avatar
    ? `https://cdn.discordapp.com/avatars/${DEV_DISCORD_ID}/${profile.discord_user.avatar}.png`
    : 'https://cdn.discordapp.com/embed/avatars/0.png';

  const displayName =
    profile?.discord_user?.global_name ||
    profile?.discord_user?.username ||
    'Fahd';

  const status = profile?.discord_status || 'offline';

  return (
    <div className={`lanyard-dev-card dev-credit-hover lanyard-dev-card--${variant}`} title={`@${profile?.discord_user?.username || 'fahd'}`}>
      <div className="lanyard-dev-avatar-wrap">
        <img src={avatarUrl} alt={displayName} className="lanyard-dev-avatar" />
        <span
          className="lanyard-dev-status-dot"
          style={{ background: STATUS_COLORS[status] || STATUS_COLORS.offline }}
        />
      </div>
      <div className="lanyard-dev-info">
        <span className="lanyard-dev-label">{isFr ? 'Créé par' : 'Created by'}</span>
        <span className="lanyard-dev-name">{displayName}</span>
        {profile?.spotify && (
          <span className="lanyard-dev-activity">
            🎵 {profile.spotify.song}
          </span>
        )}
      </div>
    </div>
  );
};
