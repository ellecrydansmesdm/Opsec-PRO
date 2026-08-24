import React, { useState, useEffect } from 'react';
import { Copy, Server, Download, ShieldCheck, Zap, Trash2, ArrowRight, Activity, Play, Square, Layers } from 'lucide-react';
import { useSettingsStore } from '@/store/useSettingsStore';

interface ServerClonerSystemProps {
    showToast?: (message: string, type: 'success' | 'danger') => void;
}

export const ServerClonerSystem: React.FC<ServerClonerSystemProps> = ({ showToast }) => {
    const { settings } = useSettingsStore();
    const isFr = settings.language === 'fr';

    // Backup state
    const [sourceGuildId, setSourceGuildId] = useState('');
    const [isBackingUp, setIsBackingUp] = useState(false);
    const [backups, setBackups] = useState<any[]>([]);
    const [selectedBackup, setSelectedBackup] = useState<any | null>(null);

    // Clone state
    const [targetGuildId, setTargetGuildId] = useState('');
    const [clearExisting, setClearExisting] = useState(true);
    const [delayMs, setDelayMs] = useState(1000);
    const [isCloning, setIsCloning] = useState(false);

    // Vanity Sniper state
    const [vanityTargetGuildId, setVanityTargetGuildId] = useState('');
    const [vanityCode, setVanityCode] = useState('');
    const [vanityDelay, setVanityDelay] = useState(500);
    const [vanityRunning, setVanityRunning] = useState(false);
    const [vanityChecks, setVanityChecks] = useState(0);

    const refreshBackups = async () => {
        if (window.electronAPI?.backupList) {
            const res = await window.electronAPI.backupList();
            if (res?.data) {
                setBackups(res.data);
                if (res.data.length > 0 && !selectedBackup) {
                    setSelectedBackup(res.data[0]);
                }
            }
        }
    };

    const refreshVanityStatus = async () => {
        if (window.electronAPI?.vanityStatus) {
            const res = await window.electronAPI.vanityStatus();
            if (res?.data) {
                setVanityRunning(res.data.running);
                setVanityChecks(res.data.checks || 0);
            }
        }
    };

    useEffect(() => {
        refreshBackups();
        refreshVanityStatus();
        const interval = setInterval(refreshVanityStatus, 3000);
        return () => clearInterval(interval);
    }, []);

    const handleCreateBackup = async () => {
        if (!sourceGuildId.trim()) {
            showToast?.(isFr ? 'Veuillez renseigner l\'ID du serveur source' : 'Please provide source guild ID', 'danger');
            return;
        }

        setIsBackingUp(true);
        try {
            const res = await window.electronAPI?.backupCreate(sourceGuildId.trim());
            if (res?.success) {
                showToast?.(isFr ? 'Sauvegarde 1:1 créée avec succès !' : '1:1 Backup created successfully!', 'success');
                setSourceGuildId('');
                await refreshBackups();
            } else {
                showToast?.(res?.error || (isFr ? 'Échec de la sauvegarde' : 'Backup failed'), 'danger');
            }
        } catch (e: any) {
            showToast?.(e.message, 'danger');
        } finally {
            setIsBackingUp(false);
        }
    };

    const handleStartClone = async () => {
        if (!selectedBackup) {
            showToast?.(isFr ? 'Sélectionnez une sauvegarde à cloner' : 'Select a backup to clone', 'danger');
            return;
        }
        if (!targetGuildId.trim()) {
            showToast?.(isFr ? 'Veuillez renseigner l\'ID du serveur cible' : 'Please provide target guild ID', 'danger');
            return;
        }

        setIsCloning(true);
        try {
            const res = await window.electronAPI?.backupClone({
                backup: selectedBackup.data,
                targetGuildId: targetGuildId.trim(),
                clearExisting,
                delayMs
            });

            if (res?.success) {
                showToast?.(isFr ? 'Serveur cloné avec succès !' : 'Server cloned successfully!', 'success');
            } else {
                showToast?.(res?.error || (isFr ? 'Échec du clonage' : 'Cloning failed'), 'danger');
            }
        } catch (e: any) {
            showToast?.(e.message, 'danger');
        } finally {
            setIsCloning(false);
        }
    };

    const handleToggleVanity = async () => {
        if (vanityRunning) {
            await window.electronAPI?.vanityStop();
            setVanityRunning(false);
            showToast?.(isFr ? 'Vanity Sniper arrêté' : 'Vanity Sniper stopped', 'success');
        } else {
            if (!vanityTargetGuildId.trim() || !vanityCode.trim()) {
                showToast?.(isFr ? 'Renseignez l\'ID serveur et le code vanity' : 'Provide guild ID and vanity code', 'danger');
                return;
            }

            const res = await window.electronAPI?.vanityStart({
                targetGuildId: vanityTargetGuildId.trim(),
                vanityCode: vanityCode.trim(),
                delayMs: vanityDelay
            });

            if (res?.success) {
                setVanityRunning(true);
                showToast?.(isFr ? 'Surveillance Vanity lancée !' : 'Vanity monitoring started!', 'success');
            } else {
                showToast?.(res?.error || (isFr ? 'Échec du lancement' : 'Failed to start'), 'danger');
            }
        }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Top Row: Server Backup & Cloner */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                {/* 1. Server Backup Creator */}
                <div className="card" style={{ padding: '24px', borderRadius: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '10px',
                            background: 'rgba(0, 210, 255, 0.12)',
                            border: '1px solid var(--accent)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}>
                            <Download size={20} color="var(--accent)" />
                        </div>
                        <div>
                            <h4 style={{ margin: 0, fontSize: '15px', fontWeight: '800' }}>
                                {isFr ? 'Créer une Sauvegarde 1:1' : 'Create 1:1 Server Backup'}
                            </h4>
                            <p style={{ margin: 0, fontSize: '11px', opacity: 0.6 }}>
                                {isFr ? 'Exporte salons, rôles, permissions et structure' : 'Exports channels, roles, permissions and layout'}
                            </p>
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: '8px' }}>
                        <input
                            type="text"
                            placeholder={isFr ? 'ID du Serveur Source...' : 'Source Server ID...'}
                            value={sourceGuildId}
                            onChange={(e) => setSourceGuildId(e.target.value)}
                            style={{
                                flex: 1,
                                height: '42px',
                                background: 'rgba(0, 0, 0, 0.4)',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                borderRadius: '10px',
                                padding: '0 14px',
                                color: '#fff',
                                fontSize: '12px'
                            }}
                        />
                        <button
                            onClick={handleCreateBackup}
                            disabled={isBackingUp}
                            className="btn-primary"
                            style={{
                                height: '42px',
                                padding: '0 18px',
                                borderRadius: '10px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                fontSize: '12px',
                                fontWeight: 'bold'
                            }}
                        >
                            <Download size={14} />
                            {isBackingUp ? (isFr ? 'Export...' : 'Saving...') : (isFr ? 'Sauvegarder' : 'Backup')}
                        </button>
                    </div>

                    {/* Backups List Selector */}
                    <div>
                        <label style={{ fontSize: '11px', fontWeight: 'bold', opacity: 0.7, marginBottom: '6px', display: 'block' }}>
                            {isFr ? 'Sauvegardes Enregistrées :' : 'Saved Backups :'}
                        </label>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '160px', overflowY: 'auto' }}>
                            {backups.length === 0 ? (
                                <div style={{ fontSize: '11px', opacity: 0.4, textAlign: 'center', padding: '16px' }}>
                                    {isFr ? 'Aucune sauvegarde enregistrée' : 'No backups saved yet'}
                                </div>
                            ) : (
                                backups.map((b, i) => {
                                    const isSelected = selectedBackup?.fileName === b.fileName;
                                    return (
                                        <div
                                            key={i}
                                            onClick={() => setSelectedBackup(b)}
                                            style={{
                                                padding: '10px 14px',
                                                borderRadius: '10px',
                                                background: isSelected ? 'rgba(0, 210, 255, 0.12)' : 'rgba(255, 255, 255, 0.02)',
                                                border: `1px solid ${isSelected ? 'var(--accent)' : 'rgba(255, 255, 255, 0.05)'}`,
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'space-between'
                                            }}
                                        >
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <Server size={14} color={isSelected ? 'var(--accent)' : '#888'} />
                                                <span style={{ fontSize: '12px', fontWeight: 'bold', color: isSelected ? '#fff' : 'rgba(255, 255, 255, 0.8)' }}>
                                                    {b.data?.name || b.fileName}
                                                </span>
                                            </div>
                                            <div style={{ fontSize: '10px', opacity: 0.6 }}>
                                                {b.data?.channels?.length || 0} salons • {b.data?.roles?.length || 0} rôles
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                </div>

                {/* 2. 1:1 Server Cloner Replicator */}
                <div className="card" style={{ padding: '24px', borderRadius: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '10px',
                            background: 'rgba(138, 43, 226, 0.15)',
                            border: '1px solid #8a2be2',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}>
                            <Copy size={20} color="#b366ff" />
                        </div>
                        <div>
                            <h4 style={{ margin: 0, fontSize: '15px', fontWeight: '800' }}>
                                {isFr ? 'Cloner vers un Serveur Cible' : 'Clone to Target Server'}
                            </h4>
                            <p style={{ margin: 0, fontSize: '11px', opacity: 0.6 }}>
                                {isFr ? 'Reconstruit la structure complète avec anti-rate limit' : 'Reconstructs entire layout with anti-rate limit'}
                            </p>
                        </div>
                    </div>

                    <input
                        type="text"
                        placeholder={isFr ? 'ID du Serveur Cible (Où coller)...' : 'Target Server ID (Destination)...'}
                        value={targetGuildId}
                        onChange={(e) => setTargetGuildId(e.target.value)}
                        style={{
                            height: '42px',
                            background: 'rgba(0, 0, 0, 0.4)',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            borderRadius: '10px',
                            padding: '0 14px',
                            color: '#fff',
                            fontSize: '12px'
                        }}
                    />

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(255, 255, 255, 0.02)', padding: '10px 14px', borderRadius: '10px', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                        <span style={{ fontSize: '11px', opacity: 0.8 }}>
                            {isFr ? 'Supprimer les salons & rôles existants' : 'Purge existing channels & roles'}
                        </span>
                        <input
                            type="checkbox"
                            checked={clearExisting}
                            onChange={(e) => setClearExisting(e.target.checked)}
                            style={{ cursor: 'pointer', accentColor: 'var(--accent)' }}
                        />
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(255, 255, 255, 0.02)', padding: '10px 14px', borderRadius: '10px', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                        <span style={{ fontSize: '11px', opacity: 0.8 }}>
                            {isFr ? 'Délai Anti-Rate Limit (ms)' : 'Anti-Rate Limit Delay (ms)'}
                        </span>
                        <input
                            type="number"
                            value={delayMs}
                            onChange={(e) => setDelayMs(Math.max(500, parseInt(e.target.value, 10) || 1000))}
                            style={{
                                width: '70px',
                                textAlign: 'center',
                                background: 'rgba(0, 0, 0, 0.4)',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                borderRadius: '6px',
                                color: '#fff',
                                padding: '4px'
                            }}
                        />
                    </div>

                    <button
                        onClick={handleStartClone}
                        disabled={isCloning || !selectedBackup}
                        className="btn-primary"
                        style={{
                            height: '44px',
                            borderRadius: '10px',
                            fontWeight: '900',
                            fontSize: '13px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px',
                            background: 'linear-gradient(135deg, var(--accent) 0%, #8a2be2 100%)',
                            marginTop: 'auto'
                        }}
                    >
                        <Zap size={16} />
                        {isCloning ? (isFr ? 'Clonage en cours...' : 'Cloning in progress...') : (isFr ? 'Lancer le Clonage 1:1' : 'Start 1:1 Clone')}
                    </button>
                </div>
            </div>

            {/* Bottom Row: Vanity URL Sniper */}
            <div className="card" style={{
                padding: '24px',
                borderRadius: '16px',
                background: 'linear-gradient(135deg, rgba(255, 215, 0, 0.04) 0%, rgba(255, 100, 0, 0.04) 100%)',
                border: '1px solid rgba(255, 215, 0, 0.2)'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '10px',
                            background: 'rgba(255, 215, 0, 0.15)',
                            border: '1px solid #ffd700',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}>
                            <Activity size={20} color="#ffd700" />
                        </div>
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ fontSize: '10px', fontWeight: '900', color: '#ffd700', letterSpacing: '1px' }}>
                                    ULTRA-FAST CLAIMER
                                </span>
                                {vanityRunning && (
                                    <span style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '4px', background: 'rgba(0, 255, 128, 0.2)', color: '#00ff80', fontWeight: 'bold' }}>
                                        ACTIVE ({vanityChecks} checks)
                                    </span>
                                )}
                            </div>
                            <h4 style={{ margin: 0, fontSize: '15px', fontWeight: '800' }}>
                                {isFr ? 'Vanity URL Sniper' : 'Vanity URL Sniper'}
                            </h4>
                        </div>
                    </div>

                    <button
                        onClick={handleToggleVanity}
                        className={vanityRunning ? 'btn-danger' : 'btn-primary'}
                        style={{
                            height: '40px',
                            padding: '0 20px',
                            borderRadius: '10px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            fontWeight: 'bold',
                            fontSize: '12px'
                        }}
                    >
                        {vanityRunning ? <Square size={14} /> : <Play size={14} />}
                        {vanityRunning ? (isFr ? 'Arrêter Sniper' : 'Stop Sniper') : (isFr ? 'Lancer Sniper' : 'Start Sniper')}
                    </button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 0.8fr', gap: '12px' }}>
                    <input
                        type="text"
                        placeholder={isFr ? 'ID Serveur Bénéficiaire...' : 'Recipient Server ID...'}
                        value={vanityTargetGuildId}
                        disabled={vanityRunning}
                        onChange={(e) => setVanityTargetGuildId(e.target.value)}
                        style={{
                            height: '40px',
                            background: 'rgba(0, 0, 0, 0.4)',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            borderRadius: '10px',
                            padding: '0 14px',
                            color: '#fff',
                            fontSize: '12px'
                        }}
                    />

                    <input
                        type="text"
                        placeholder={isFr ? 'Code Vanity (ex: opsec)...' : 'Vanity Code (e.g. opsec)...'}
                        value={vanityCode}
                        disabled={vanityRunning}
                        onChange={(e) => setVanityCode(e.target.value)}
                        style={{
                            height: '40px',
                            background: 'rgba(0, 0, 0, 0.4)',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            borderRadius: '10px',
                            padding: '0 14px',
                            color: '#fff',
                            fontSize: '12px'
                        }}
                    />

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(0, 0, 0, 0.4)', padding: '0 12px', borderRadius: '10px', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
                        <span style={{ fontSize: '11px', opacity: 0.6 }}>Vitesse:</span>
                        <input
                            type="number"
                            value={vanityDelay}
                            disabled={vanityRunning}
                            onChange={(e) => setVanityDelay(Math.max(100, parseInt(e.target.value, 10) || 500))}
                            style={{
                                width: '50px',
                                textAlign: 'center',
                                background: 'transparent',
                                border: 'none',
                                color: '#fff',
                                fontWeight: 'bold'
                            }}
                        />
                        <span style={{ fontSize: '11px', opacity: 0.6 }}>ms</span>
                    </div>
                </div>
            </div>
        </div>
    );
};
