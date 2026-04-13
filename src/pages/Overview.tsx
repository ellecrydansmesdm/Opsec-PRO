import React from 'react';
import { ExternalLink, Activity, ShieldCheck, Cpu } from 'lucide-react';
import { useUserStore } from "@/store/useUserStore";
import { useLogsStore } from "@/store/useLogsStore";
import { useSettingsStore } from "@/store/useSettingsStore";
import { StatCircle } from "@/components/ui/StatCircle";
import { NotificationCard } from "@/components/ui/NotificationCard";
import { UptimeCounter } from "@/components/ui/UptimeCounter";

interface OverviewProps {
  onSwitch: () => void;
  onAdd: () => void;
}

export const Overview = ({ onSwitch, onAdd }: OverviewProps) => {
  const { user } = useUserStore();
  const { logs } = useLogsStore();
  const { settings, updateSetting } = useSettingsStore();
  const [commandsCount, setCommandsCount] = React.useState(0);

  React.useEffect(() => {
    if (user?.id) {
        (window as any).electronAPI.getCommandsCount(user.id).then((res: any) => {
            if (res.success) setCommandsCount(res.count);
        }).catch((err: any) => {
            console.error("[OPSEC] Stats not ready:", err);
        });
    }
  }, [user?.id, logs.length]);

  if (!user) return null;

  return (
    <div className="animate-fade-in" style={{ padding: '20px', height: 'calc(100vh - 32px)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      
      {/* Greeting Prefix */}
      <h1 style={{ 
        fontSize: '22px', 
        fontWeight: '700', 
        color: 'white', 
        flexShrink: 0,
        maxWidth: '100%',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap'
      }}>
        Hello, {user.displayName || user.username} 👋
      </h1>

      <div className="dashboard-grid" style={{ flex: 1, display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '16px', minHeight: 0 }}>
        {/* Left Column: Main Dashboard */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          {/* FUSED Profile & Stats Card (Nighty Style) */}
          <div className="glass-card" style={{ 
            padding: '30px', 
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            gap: '40px',
            boxShadow: '0 10px 40px rgba(0,0,0,0.4), 0 0 20px rgba(62, 99, 221, 0.1)',
            minHeight: '280px'
          }}>
            {/* Ligne du haut : avatar + username + boutons */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
                {/* Avatar Section */}
                <div style={{ position: 'relative', flexShrink: 0 }}>
                   <div style={{ 
                     width: '80px', height: '80px', borderRadius: '50%', 
                     border: '2px solid var(--accent)', padding: '3px', 
                     background: 'var(--bg-main)',
                     boxShadow: '0 0 20px var(--accent-glow)'
                   }}>
                      <img src={user.avatarURL} alt="pfp" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                   </div>
                   <div style={{ 
                     position: 'absolute', bottom: '2px', right: '2px', 
                     width: '18px', height: '18px', background: '#10b981', 
                     borderRadius: '50%', border: '3px solid #0d0d14',
                     boxShadow: '0 0 10px rgba(16, 185, 129, 0.5)'
                   }}></div>
                </div>

                {/* User Info Section */}
                <div style={{ minWidth: 0 }}>
                  <h2 style={{ 
                    fontSize: '20px', 
                    color: 'white', 
                    marginBottom: '2px', 
                    fontWeight: '900',
                    maxWidth: '220px',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }} title={user.displayName || user.username}>{user.displayName || user.username}</h2>
                  <p style={{ fontSize: '12px', color: 'var(--text-dim)', opacity: 0.6 }}>{user.username}#{user.id.slice(-4)}</p>
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '10px', flexShrink: 0 }}>
                 <button onClick={onSwitch} className="btn-primary" style={{ padding: '8px 16px', fontSize: '11px' }}>Switch Account</button>
                 <button onClick={onAdd} className="btn-primary" style={{ padding: '8px 16px', fontSize: '11px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', boxShadow: 'none' }}>Add new</button>
              </div>
            </div>

            {/* Ligne du bas : User ID/Nitro à gauche + StatCircles à droite */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
              
              {/* IDs & Nitro (Left) */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                <div>
                  <p className="caption" style={{ fontSize: '9px', marginBottom: '6px', opacity: 0.4 }}>User ID</p>
                  <p style={{ fontSize: '12px', color: 'white', fontWeight: '600', opacity: 0.8 }}>{user.id}</p>
                </div>
                <div>
                  <p className="caption" style={{ fontSize: '9px', marginBottom: '6px', opacity: 0.4 }}>Nitro status</p>
                  <p style={{ fontSize: '13px', color: user.nitro ? '#10b981' : 'var(--text-dim)', fontWeight: '800' }}>
                    {user.nitroExpiry || (user.nitro ? 'Active' : 'Inactive')}
                  </p>
                </div>
              </div>

              {/* StatCircles (Right) */}
              <div style={{ display: 'flex', gap: '32px' }}>
                <StatCircle count={user.guildsCount} max={100} label="SERVERS" size={120} fontSize="28px" strokeWidth={8} />
                <StatCircle count={user.friendsCount} max={1000} label="FRIENDS" size={120} fontSize="28px" strokeWidth={8} />
              </div>

            </div>
          </div>

          {/* Unified Bottom Info Card */}
          <div className="glass-card" style={{ padding: '24px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '0px', flexShrink: 0 }}>
             {/* Section 1: Version */}
             <div style={{ paddingRight: '15px' }}>
                <p className="caption" style={{ marginBottom: '10px', fontSize: '9px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <ShieldCheck size={10} color="var(--accent)" /> Version
                </p>
                <h2 style={{ fontSize: '20px', marginBottom: '2px' }}>v1.2.1</h2>
             </div>

             {/* Section 2: Commands Used */}
             <div style={{ padding: '0 15px', borderLeft: '1px solid rgba(255,255,255,0.08)' }}>
                <p className="caption" style={{ marginBottom: '10px', fontSize: '9px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                   <Cpu size={10} /> Commands used
                </p>
                <h2 style={{ fontSize: '20px', marginBottom: '2px' }}>{commandsCount}</h2>
             </div>

             {/* Section 3: Toggles (Silent & Private) */}
             <div style={{ padding: '0 15px', borderLeft: '1px solid rgba(255,255,255,0.08)', display: 'flex', flexDirection: 'column', gap: '8px', justifyContent: 'center' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                   <p className="caption" style={{ fontSize: '8px', opacity: 0.5 }}>SILENT PROTECTION</p>
                   <div onClick={() => updateSetting('silentMode', !settings.silentMode)} className={`nighty-toggle ${settings.silentMode ? 'active' : ''}`} style={{ transform: 'scale(0.8)' }}>
                      <div className="nighty-toggle-handle"></div>
                   </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                   <p className="caption" style={{ fontSize: '8px', opacity: 0.5 }}>PRIVATE MODE</p>
                   <div onClick={() => updateSetting('privateMode', !settings.privateMode)} className={`nighty-toggle ${settings.privateMode ? 'active' : ''}`} style={{ transform: 'scale(0.8)' }}>
                      <div className="nighty-toggle-handle"></div>
                   </div>
                </div>
             </div>

             {/* Section 4: Uptime */}
             <div style={{ paddingLeft: '15px', borderLeft: '1px solid rgba(255,255,255,0.08)' }}>
                <UptimeCounter startTime={user.uptime} />
             </div>
          </div>
        </div>

        {/* Right Column: Notification Center */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', padding: '24px', height: '100%', overflow: 'hidden' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Activity size={16} color="var(--accent)" /> Notification Center
              </h3>
              <ExternalLink size={16} style={{ opacity: 0.3, cursor: 'pointer' }} />
            </div>
            
            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px', paddingRight: '4px' }} className="custom-scrollbar">
              {logs.length === 0 ? (
                <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', opacity: 0.1 }}>
                  <Activity size={40} strokeWidth={1} />
                  <p className="caption" style={{ marginTop: '15px', fontSize: '9px' }}>No Activity Recorded</p>
                </div>
              ) : (
                logs.map((log, index) => <NotificationCard key={index} log={log} />)
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
