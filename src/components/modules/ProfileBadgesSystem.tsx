import React from 'react';
import { ShieldCheck, Zap, Activity, Trash2, CheckCircle2 } from 'lucide-react';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useUserStore } from '@/store/useUserStore';
import { HubSectionCard } from '@/components/layout/HubPageLayout';

interface ProfileBadgesSystemProps {
  showToast: (message: string, type?: 'success' | 'danger') => void;
}

export const ProfileBadgesSystem: React.FC<ProfileBadgesSystemProps> = ({ showToast }) => {
  const { settings, updateSetting } = useSettingsStore();
  const { user } = useUserStore();
  const isFr = settings.language === 'fr';

  const currentAccount = React.useMemo(() => settings.accounts?.find(a => a.id === user?.id), [settings.accounts, user?.id]);
  const rotator = currentAccount?.rotator;

  const handleHouseUpdate = (houseId: number) => {
    if (!settings.accounts || !user) return;
    const updatedAccounts = settings.accounts.map(acc => {
        if (acc.id === user.id && acc.rotator) {
            return { 
                ...acc, 
                rotator: { ...acc.rotator, hypesquadHouse: houseId }
            };
        }
        return acc;
    });
    updateSetting('accounts', updatedAccounts);
  };

  return (
    <HubSectionCard icon={ShieldCheck} iconColor="#5865F2" glowColor="#5865F2" title={isFr ? "GESTIONNAIRE DE BADGES & HYPESQUAD" : "DISCORD BADGES & HYPESQUAD"} className="animate-fade-in">
      <p className="hub-field-hint" style={{ marginTop: 0, marginBottom: '16px' }}>
        {isFr ? "Changez votre maison HypeSquad ou supprimez totalement votre badge pour un profil 100% furtif (Stealth Clean Profile)" : "Switch your HypeSquad house or completely remove your badge for a 100% stealth clean profile"}
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
          {[
            { id: 1, name: 'Bravery', color: '#9b84ee', icon: ShieldCheck },
            { id: 2, name: 'Brilliance', color: '#f47b67', icon: Zap },
            { id: 3, name: 'Balance', color: '#45ddc0', icon: Activity }
          ].map(house => {
            const HouseIcon = house.icon;
            const isSelected = rotator?.hypesquadHouse === house.id;
            return (
              <button 
                key={house.id}
                onClick={async () => {
                  const res = await window.electronAPI.setHypeSquadBadge(house.id);
                  if (res.success) {
                    handleHouseUpdate(house.id);
                    showToast(isFr ? `Badge ${house.name} activé !` : `Badge ${house.name} active!`);
                  } else {
                    showToast(isFr ? (res.error || 'Erreur HypeSquad') : (res.error || 'HypeSquad Error'), 'danger');
                  }
                }}
                style={{ 
                  padding: '20px 12px', borderRadius: '14px', 
                  background: isSelected ? `color-mix(in srgb, ${house.color} 15%, transparent)` : 'rgba(0,0,0,0.25)',
                  border: `1px solid ${isSelected ? house.color : 'rgba(255,255,255,0.06)'}`,
                  boxShadow: isSelected ? `0 0 20px color-mix(in srgb, ${house.color} 30%, transparent)` : 'none',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', transition: '0.2s', position: 'relative',
                  cursor: 'pointer'
                }}
              >
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '12px',
                  background: `color-mix(in srgb, ${house.color} 18%, transparent)`,
                  border: `1px solid color-mix(in srgb, ${house.color} 35%, transparent)`,
                  boxShadow: `0 0 15px color-mix(in srgb, ${house.color} 25%, transparent)`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <HouseIcon size={18} color={house.color} />
                </div>
                <span style={{ fontSize: '11px', fontWeight: '900', color: isSelected ? house.color : '#fff', letterSpacing: '0.5px' }}>{house.name.toUpperCase()}</span>
                {isSelected && (
                  <div style={{ position: 'absolute', top: '8px', right: '8px' }}>
                    <CheckCircle2 size={14} color={house.color} />
                  </div>
                )}
              </button>
            );
          })}
        </div>

        <button 
          onClick={async () => {
            const res = await window.electronAPI.setHypeSquadBadge(0);
            if (res.success) {
              handleHouseUpdate(0);
              showToast(isFr ? 'Badge HypeSquad supprimé — Profil Stealth Actif' : 'HypeSquad badge removed — Stealth Profile Active');
            }
          }}
          className="btn-primary"
          style={{ 
            width: '100%', marginTop: '5px', padding: '14px', fontSize: '11px', fontWeight: '900',
            background: 'rgba(239, 68, 68, 0.08)', color: 'var(--danger)', border: '1px solid rgba(239, 68, 68, 0.25)',
            boxShadow: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
          }}
        >
          <Trash2 size={14} /> {isFr ? 'SUPPRIMER LE BADGE (PROFIL STEALTH CLEAN)' : 'REMOVE BADGE (STEALTH CLEAN PROFILE)'}
        </button>
      </div>
    </HubSectionCard>
  );
};
