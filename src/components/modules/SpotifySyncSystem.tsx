import React, { useState, useEffect, useRef } from 'react';
import {
    Activity, Music, Mic2, Disc, Play, Pause, FastForward,
    Radio, Settings, Sliders, Shield, Volume2, Sparkles,
    Upload, Trash2, CheckCircle2, AlertCircle, RefreshCw,
    Layers, ExternalLink, Zap
} from 'lucide-react';
import { useSettingsStore } from '@/store/useSettingsStore';
import { HubSectionCard, HubToggleRow } from '@/components/layout/HubPageLayout';
import { SpotifyConfig, SpotifyLiveStatus } from '../../../shared/types';
import { audioService } from '@/services/AudioService';

interface SpotifySyncSystemProps {
    showToast: (message: string, type?: 'success' | 'danger') => void;
}

export const SpotifySyncSystem: React.FC<SpotifySyncSystemProps> = ({ showToast }) => {
    const { settings, updateSetting } = useSettingsStore();
    const isFr = settings.language === 'fr';

    // Local Config State
    const [config, setConfig] = useState<SpotifyConfig>(() => ({
        enabled: settings.spotifyLyricsEnabled || settings.spotifyConfig?.enabled || false,
        prefix: settings.spotifyConfig?.prefix ?? '🎵 ',
        offsetMs: settings.spotifyConfig?.offsetMs ?? 800,
        fallbackMode: settings.spotifyConfig?.fallbackMode ?? 'song_info',
        customFallback: settings.spotifyConfig?.customFallback ?? 'Listening to Spotify 🎧',
        showInstrumental: settings.spotifyConfig?.showInstrumental ?? true,
        instrumentalText: settings.spotifyConfig?.instrumentalText ?? '🎶 (Instrumental)',
        cleanActivity: settings.spotifyConfig?.cleanActivity ?? true,
        sourceMode: settings.spotifyConfig?.sourceMode ?? 'auto'
    }));

    // Live Telemetry
    const [liveStatus, setLiveStatus] = useState<SpotifyLiveStatus>({
        isRunning: false,
        isConnected: false,
        source: 'NONE',
        track: null
    });

    // Custom Lyrics Vault
    const [customLyricsList, setCustomLyricsList] = useState<Array<{ fileName: string; artist: string; title: string; size: number; updatedAt: number }>>([]);
    const [showVaultModal, setShowVaultModal] = useState(false);
    const [newLrcArtist, setNewLrcArtist] = useState('');
    const [newLrcTitle, setNewLrcTitle] = useState('');
    const [newLrcContent, setNewLrcContent] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Polling live status
    useEffect(() => {
        let isMounted = true;
        const fetchStatus = async () => {
            try {
                if (window.electronAPI?.getSpotifyLiveStatus) {
                    const status = await window.electronAPI.getSpotifyLiveStatus();
                    if (isMounted && status) {
                        setLiveStatus(status);
                    }
                }
            } catch (_) {}
        };

        fetchStatus();
        const interval = setInterval(fetchStatus, 1000);
        return () => {
            isMounted = false;
            clearInterval(interval);
        };
    }, []);

    // Load custom lyrics list
    const refreshCustomLyrics = async () => {
        try {
            if (window.electronAPI?.getCustomLyricsList) {
                const list = await window.electronAPI.getCustomLyricsList();
                setCustomLyricsList(list || []);
            }
        } catch (_) {}
    };

    useEffect(() => {
        refreshCustomLyrics();
    }, []);

    const handleSaveConfig = async (newConfig: Partial<SpotifyConfig>) => {
        const merged = { ...config, ...newConfig };
        setConfig(merged);
        updateSetting('spotifyConfig', merged);
        try {
            await window.electronAPI.saveSpotifyConfig(merged);
        } catch (_) {}
    };

    const handleToggleMaster = async () => {
        const nextState = !config.enabled;
        const newCfg = { ...config, enabled: nextState };
        setConfig(newCfg);
        updateSetting('spotifyLyricsEnabled', nextState);
        updateSetting('spotifyConfig', newCfg);

        audioService.play(nextState ? 'module_launch' : 'module_stop');
        await window.electronAPI.toggleSpotifyLyrics({
            enabled: nextState,
            config: newCfg
        });

        showToast(
            nextState
                ? (isFr ? "Spotify Lyrics Pro activé !" : "Spotify Lyrics Pro enabled!")
                : (isFr ? "Spotify Lyrics désactivé." : "Spotify Lyrics disabled."),
            nextState ? 'success' : 'danger'
        );
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (event) => {
            const text = event.target?.result as string;
            if (!text) return;

            setNewLrcContent(text);

            // Try to extract artist and title from file name
            const rawName = file.name.replace(/\.lrc$/i, '');
            if (rawName.includes(' - ')) {
                const [a, ...t] = rawName.split(' - ');
                setNewLrcArtist(a.trim());
                setNewLrcTitle(t.join(' - ').trim());
            } else {
                setNewLrcTitle(rawName);
            }
        };
        reader.readAsText(file);
    };

    const handleSaveCustomLrc = async () => {
        if (!newLrcArtist.trim() || !newLrcTitle.trim() || !newLrcContent.trim()) {
            showToast(isFr ? "Veuillez remplir l'artiste, le titre et le contenu LRC." : "Please fill in artist, title, and LRC content.", 'danger');
            return;
        }

        const res = await window.electronAPI.saveCustomLyrics({
            artist: newLrcArtist.trim(),
            title: newLrcTitle.trim(),
            content: newLrcContent.trim()
        });

        if (res.success) {
            showToast(isFr ? "Paroles personnalisées enregistrées dans le Vault !" : "Custom lyrics saved to Vault!", 'success');
            setNewLrcArtist('');
            setNewLrcTitle('');
            setNewLrcContent('');
            refreshCustomLyrics();
        } else {
            showToast(isFr ? "Erreur lors de l'enregistrement." : "Failed to save lyrics.", 'danger');
        }
    };

    const handleDeleteCustomLrc = async (fileName: string) => {
        const res = await window.electronAPI.deleteCustomLyrics(fileName);
        if (res.success) {
            showToast(isFr ? "Paroles supprimées du Vault." : "Lyrics removed from Vault.", 'success');
            refreshCustomLyrics();
        }
    };

    // Format preview text
    const sampleLyric = liveStatus.track?.currentLyric || (isFr ? "J'écoute ma musique préférée" : "Listening to my favorite track");
    const getPreviewFormatted = (prefixVal: string) => {
        if (prefixVal === '[ {lyrics} ]') return `[ ${sampleLyric} ]`;
        if (prefixVal === '« {lyrics} »') return `« ${sampleLyric} »`;
        if (prefixVal === '✨ {lyrics}') return `✨ ${sampleLyric}`;
        if (prefixVal === '🎶 {lyrics}') return `🎶 ${sampleLyric}`;
        return `${prefixVal}${sampleLyric}`.trim();
    };

    const formatMs = (ms: number) => {
        const totalSec = Math.floor(ms / 1000);
        const m = Math.floor(totalSec / 60);
        const s = totalSec % 60;
        return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    const prefixes = [
        { label: '🎵 Classic Note', value: '🎵 ' },
        { label: '🎶 Double Note', value: '🎶 {lyrics}' },
        { label: '🎧 Headset', value: '🎧 ' },
        { label: '[ Cyber Brackets ]', value: '[ {lyrics} ]' },
        { label: '« French Quotes »', value: '« {lyrics} »' },
        { label: '✨ Sparkles', value: '✨ {lyrics}' },
        { label: 'Raw (Sans préfixe)', value: '' }
    ];

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            {/* Top Control & Status Banner */}
            <div style={{
                background: 'linear-gradient(135deg, rgba(29, 185, 84, 0.08) 0%, rgba(10, 15, 25, 0.6) 100%)',
                border: '1px solid rgba(29, 185, 84, 0.3)',
                borderRadius: '16px',
                padding: '24px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                boxShadow: config.enabled ? '0 0 30px rgba(29, 185, 84, 0.15)' : 'none',
                position: 'relative',
                overflow: 'hidden'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                    <div style={{
                        width: '56px',
                        height: '56px',
                        borderRadius: '14px',
                        background: config.enabled ? 'rgba(29, 185, 84, 0.2)' : 'rgba(255, 255, 255, 0.03)',
                        border: `1px solid ${config.enabled ? 'rgba(29, 185, 84, 0.5)' : 'rgba(255, 255, 255, 0.1)'}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: config.enabled ? '0 0 20px rgba(29, 185, 84, 0.3)' : 'none'
                    }}>
                        <Music size={28} color={config.enabled ? '#1DB954' : '#6b7280'} />
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <h2 style={{ fontSize: '18px', fontWeight: '900', color: 'white', letterSpacing: '0.5px', margin: 0 }}>
                                SPOTIFY SYNCED LYRICS PRO
                            </h2>
                            <span style={{
                                fontSize: '10px',
                                fontWeight: '900',
                                padding: '3px 8px',
                                borderRadius: '20px',
                                background: config.enabled ? 'rgba(29, 185, 84, 0.2)' : 'rgba(239, 68, 68, 0.15)',
                                color: config.enabled ? '#1DB954' : '#ef4444',
                                border: `1px solid ${config.enabled ? 'rgba(29, 185, 84, 0.4)' : 'rgba(239, 68, 68, 0.3)'}`
                            }}>
                                {config.enabled ? (isFr ? 'SYNC ACTIVE' : 'LIVE SYNC') : (isFr ? 'HORS LIGNE' : 'STANDBY')}
                            </span>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '11px', color: 'var(--text-dim)' }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <Radio size={12} color={liveStatus.source === 'DISCORD_GATEWAY' ? '#10b981' : liveStatus.source === 'WINDOWS_LOCAL' ? '#00e5ff' : '#6b7280'} />
                                {isFr ? 'Source :' : 'Source :'} <strong style={{ color: 'white' }}>
                                    {liveStatus.source === 'DISCORD_GATEWAY' ? 'Discord Gateway (RPC)' : liveStatus.source === 'WINDOWS_LOCAL' ? 'Windows Process Radar' : 'En attente de musique'}
                                </strong>
                            </span>
                            <span>•</span>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <Zap size={12} color="#1DB954" />
                                {isFr ? 'Base de données :' : 'Database :'} <strong style={{ color: '#1DB954' }}>LRCLIB Synced API + Vault Local</strong>
                            </span>
                        </div>
                    </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <button
                        onClick={() => setShowVaultModal(true)}
                        style={{
                            padding: '10px 16px',
                            borderRadius: '10px',
                            background: 'rgba(255, 255, 255, 0.05)',
                            border: '1px solid rgba(255, 255, 255, 0.15)',
                            color: 'white',
                            fontSize: '11px',
                            fontWeight: '800',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            transition: '0.2s'
                        }}
                    >
                        <Layers size={14} color="#00e5ff" />
                        <span>{isFr ? `LRC Vault (${customLyricsList.length})` : `LRC Vault (${customLyricsList.length})`}</span>
                    </button>

                    <button
                        onClick={handleToggleMaster}
                        style={{
                            padding: '12px 24px',
                            borderRadius: '12px',
                            background: config.enabled ? '#ef4444' : '#1DB954',
                            border: 'none',
                            color: 'white',
                            fontSize: '12px',
                            fontWeight: '900',
                            letterSpacing: '0.5px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            boxShadow: config.enabled ? '0 0 20px rgba(239, 68, 68, 0.4)' : '0 0 25px rgba(29, 185, 84, 0.4)',
                            transition: '0.2s'
                        }}
                    >
                        {config.enabled ? <Pause size={16} /> : <Play size={16} />}
                        <span>{config.enabled ? (isFr ? 'DÉSACTIVER' : 'DEACTIVATE') : (isFr ? 'ACTIVER LE STATUT' : 'ACTIVATE STATUS')}</span>
                    </button>
                </div>
            </div>

            {/* Live Now Playing & Karaoke Telemetry Screen */}
            <div style={{
                background: 'rgba(5, 7, 15, 0.8)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '16px',
                padding: '24px',
                display: 'grid',
                gridTemplateColumns: '1fr 1.6fr',
                gap: '24px',
                position: 'relative'
            }}>
                {/* Left Column: Track Info & Audio Visualizer */}
                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    background: 'rgba(0, 0, 0, 0.3)',
                    padding: '20px',
                    borderRadius: '12px',
                    border: '1px solid rgba(255, 255, 255, 0.05)'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <div style={{
                            width: '64px',
                            height: '64px',
                            borderRadius: '50%',
                            background: 'radial-gradient(circle, #1a1a24 0%, #000 100%)',
                            border: '2px solid #1DB954',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: '0 0 15px rgba(29, 185, 84, 0.3)',
                            animation: liveStatus.track ? 'spin 8s linear infinite' : 'none'
                        }}>
                            <Disc size={32} color="#1DB954" />
                        </div>

                        <div style={{ flex: 1, minWidth: 0 }}>
                            <span style={{ fontSize: '10px', fontWeight: '900', color: '#1DB954', letterSpacing: '1px', textTransform: 'uppercase' }}>
                                {liveStatus.track ? (isFr ? 'EN COURS DE LECTURE' : 'NOW PLAYING') : (isFr ? 'AUCUNE MUSIQUE' : 'NO TRACK DETECTED')}
                            </span>
                            <h3 style={{
                                fontSize: '16px',
                                fontWeight: '900',
                                color: 'white',
                                margin: '4px 0 2px 0',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis'
                            }}>
                                {liveStatus.track?.title || (isFr ? 'Lancez Spotify...' : 'Play a song on Spotify...')}
                            </h3>
                            <p style={{
                                fontSize: '12px',
                                color: 'var(--text-dim)',
                                margin: 0,
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis'
                            }}>
                                {liveStatus.track?.artist || (isFr ? 'Détection automatique' : 'Auto detection active')}
                            </p>
                        </div>
                    </div>

                    {/* Progress Bar */}
                    <div style={{ marginTop: '20px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--text-dim)', marginBottom: '6px', fontWeight: '800' }}>
                            <span>{formatMs(liveStatus.track?.progressMs || 0)}</span>
                            <span>{liveStatus.track?.durationMs ? formatMs(liveStatus.track.durationMs) : '--:--'}</span>
                        </div>
                        <div style={{ width: '100%', height: '4px', background: 'rgba(255, 255, 255, 0.08)', borderRadius: '4px', overflow: 'hidden' }}>
                            <div style={{
                                width: liveStatus.track?.durationMs ? `${Math.min(100, ((liveStatus.track.progressMs || 0) / liveStatus.track.durationMs) * 100)}%` : '0%',
                                height: '100%',
                                background: '#1DB954',
                                boxShadow: '0 0 10px rgba(29, 185, 84, 0.6)',
                                transition: 'width 1s linear'
                            }}></div>
                        </div>
                    </div>
                </div>

                {/* Right Column: Live Karaoke Telemetry */}
                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    background: 'rgba(0, 0, 0, 0.4)',
                    border: '1px solid rgba(255, 255, 255, 0.05)',
                    borderRadius: '12px',
                    padding: '20px',
                    justifyContent: 'center',
                    gap: '12px',
                    position: 'relative'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '10px', fontWeight: '900', color: 'var(--text-dim)', letterSpacing: '1px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Mic2 size={12} color="#00e5ff" />
                            {isFr ? 'TÉLÉMÉTRIE KARAOKÉ EN DIRECT' : 'LIVE KARAOKE TELEMETRY'}
                        </span>
                        {liveStatus.track?.hasSyncedLyrics && (
                            <span style={{ fontSize: '9px', fontWeight: '900', color: '#10b981', background: 'rgba(16, 185, 129, 0.1)', padding: '2px 6px', borderRadius: '4px', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                                {liveStatus.track.lyricsCount} {isFr ? 'lignes synchronisées' : 'synced lines'}
                            </span>
                        )}
                    </div>

                    {/* Active Line (Big Neon Text) */}
                    <div style={{
                        background: 'rgba(0, 229, 255, 0.06)',
                        border: '1px solid rgba(0, 229, 255, 0.25)',
                        borderRadius: '10px',
                        padding: '16px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '6px',
                        boxShadow: '0 0 20px rgba(0, 229, 255, 0.1)'
                    }}>
                        <span style={{ fontSize: '9px', color: '#00e5ff', fontWeight: '900', letterSpacing: '1px' }}>
                            {isFr ? 'PHRASE ACTIVE SUR DISCORD :' : 'ACTIVE PHRASE ON DISCORD :'}
                        </span>
                        <div style={{
                            fontSize: '15px',
                            fontWeight: '900',
                            color: '#ffffff',
                            textShadow: '0 0 12px rgba(0, 229, 255, 0.5)',
                            lineHeight: '1.4'
                        }}>
                            {liveStatus.track?.currentLyric 
                                ? getPreviewFormatted(config.prefix)
                                : (config.enabled 
                                    ? (isFr ? '— Attente de la prochaine phrase —' : '— Waiting for next lyric phrase —')
                                    : (isFr ? 'Statut inactif' : 'Status inactive'))}
                        </div>
                    </div>

                    {/* Upcoming Line */}
                    {liveStatus.track?.nextLyric && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', color: 'var(--text-dim)', paddingLeft: '8px' }}>
                            <span style={{ fontSize: '9px', fontWeight: '900', color: 'rgba(255,255,255,0.4)' }}>SUIVANT :</span>
                            <span style={{ fontStyle: 'italic', opacity: 0.7 }}>{liveStatus.track.nextLyric}</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Customization & Preferences Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '20px' }}>
                
                {/* Prefix & Formatting Presets */}
                <HubSectionCard icon={Sparkles} title={isFr ? 'STYLE & FORMAT DU STATUT' : 'STATUS STYLE & FORMAT'}>
                    <p className="hub-field-hint" style={{ marginTop: 0, marginBottom: '16px' }}>
                        {isFr ? 'Choisissez un préfixe ou template visuel pour habiller vos paroles' : 'Choose a prefix or visual template for your lyrics'}
                    </p>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '8px' }}>
                            {prefixes.map((p) => {
                                const isSelected = config.prefix === p.value;
                                return (
                                    <button
                                        key={p.value}
                                        onClick={() => handleSaveConfig({ prefix: p.value })}
                                        style={{
                                            padding: '10px 12px',
                                            borderRadius: '8px',
                                            background: isSelected ? 'rgba(29, 185, 84, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                                            border: `1px solid ${isSelected ? '#1DB954' : 'rgba(255, 255, 255, 0.08)'}`,
                                            color: isSelected ? '#1DB954' : 'white',
                                            fontSize: '11px',
                                            fontWeight: '800',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            transition: '0.2s'
                                        }}
                                    >
                                        <span>{p.label}</span>
                                        {isSelected && <CheckCircle2 size={12} color="#1DB954" />}
                                    </button>
                                );
                            })}
                        </div>

                        {/* Live Preview Box */}
                        <div style={{
                            padding: '12px 16px',
                            background: 'rgba(0, 0, 0, 0.3)',
                            borderRadius: '10px',
                            border: '1px solid rgba(255, 255, 255, 0.08)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px'
                        }}>
                            <span style={{ fontSize: '10px', fontWeight: '900', color: 'var(--text-dim)' }}>{isFr ? 'APERÇU :' : 'PREVIEW :'}</span>
                            <span style={{ fontSize: '12px', fontWeight: '800', color: '#10b981' }}>
                                {getPreviewFormatted(config.prefix)}
                            </span>
                        </div>
                    </div>
                </HubSectionCard>

                {/* Timing Offset Calibrator */}
                <HubSectionCard icon={Sliders} title={isFr ? 'CALIBRATION DU DÉCALAGE (MS)' : 'TIMING OFFSET CALIBRATION'}>
                    <p className="hub-field-hint" style={{ marginTop: 0, marginBottom: '16px' }}>
                        {isFr ? 'Ajustez le timing à la milliseconde près pour compenser le ping Discord' : 'Fine-tune millisecond offset to compensate for network latency'}
                    </p>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <div style={{
                            padding: '16px',
                            background: 'rgba(0, 0, 0, 0.2)',
                            borderRadius: '12px',
                            border: '1px solid var(--border)'
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                <span className="caption">{isFr ? 'Décalage Audio / Paroles' : 'Audio / Lyrics Offset'}</span>
                                <span style={{ color: '#00e5ff', fontWeight: '900' }}>
                                    {config.offsetMs > 0 ? `+${config.offsetMs}ms` : `${config.offsetMs}ms`}
                                </span>
                            </div>
                            <input
                                type="range"
                                min="-3000"
                                max="3000"
                                step="50"
                                value={config.offsetMs}
                                onChange={(e) => handleSaveConfig({ offsetMs: parseInt(e.target.value) })}
                                style={{ width: '100%', accentColor: '#00e5ff', cursor: 'pointer' }}
                            />
                        </div>

                        {/* Quick Offset Presets */}
                        <div style={{ display: 'flex', gap: '8px' }}>
                            {[
                                { label: '0ms (Brut)', val: 0 },
                                { label: '+500ms', val: 500 },
                                { label: '+800ms (Optimal)', val: 800 },
                                { label: '+1200ms', val: 1200 },
                            ].map(pr => (
                                <button
                                    key={pr.val}
                                    onClick={() => handleSaveConfig({ offsetMs: pr.val })}
                                    style={{
                                        flex: 1,
                                        padding: '8px',
                                        fontSize: '10px',
                                        fontWeight: '800',
                                        borderRadius: '8px',
                                        background: config.offsetMs === pr.val ? 'rgba(0, 229, 255, 0.15)' : 'rgba(255,255,255,0.03)',
                                        border: `1px solid ${config.offsetMs === pr.val ? '#00e5ff' : 'rgba(255,255,255,0.08)'}`,
                                        color: config.offsetMs === pr.val ? '#00e5ff' : 'var(--text-dim)',
                                        cursor: 'pointer'
                                    }}
                                >
                                    {pr.label}
                                </button>
                            ))}
                        </div>
                    </div>
                </HubSectionCard>
            </div>

            {/* Advanced Fallback & Stealth Rules */}
            <HubSectionCard icon={Shield} title={isFr ? 'RÈGLES DE REPLI & OPSEC STEALTH' : 'FALLBACK RULES & OPSEC STEALTH'}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                        <HubToggleRow
                            title={isFr ? 'Profil Stealth (Masquer Spotify RPC)' : 'Stealth Profile (Suppress Spotify RPC)'}
                            description={isFr 
                                ? 'Masque "Écoute Spotify" de votre profil Discord pour n\'afficher que vos paroles dans le statut' 
                                : 'Suppresses "Listening to Spotify" from your Discord activity to only show lyrics in status'}
                            active={config.cleanActivity}
                            onToggle={() => handleSaveConfig({ cleanActivity: !config.cleanActivity })}
                            accent="#1DB954"
                        />

                        <HubToggleRow
                            title={isFr ? 'Indicateur de Solo / Instrumental' : 'Instrumental & Solo Indicator'}
                            description={isFr 
                                ? 'Affiche "🎶 (Instrumental)" lors des solos de guitare ou longues pauses sans paroles' 
                                : 'Shows "🎶 (Instrumental)" during guitar solos or long lyrical breaks'}
                            active={config.showInstrumental}
                            onToggle={() => handleSaveConfig({ showInstrumental: !config.showInstrumental })}
                            accent="#00e5ff"
                        />
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <span style={{ fontSize: '11px', fontWeight: '900', color: 'white' }}>
                            {isFr ? 'COMPORTEMENT SI AUCUNE PAROLE DISPONIBLE :' : 'BEHAVIOR WHEN NO LYRICS FOUND :'}
                        </span>

                        {[
                            { id: 'song_info', label: isFr ? 'Afficher Titre & Artiste (🎵 Song - Artist)' : 'Show Song & Artist (🎵 Song - Artist)' },
                            { id: 'clear', label: isFr ? 'Effacer le statut (Silence total)' : 'Clear status (Pure silence)' },
                            { id: 'custom', label: isFr ? 'Message personnalisé' : 'Custom status message' }
                        ].map((m) => (
                            <button
                                key={m.id}
                                onClick={() => handleSaveConfig({ fallbackMode: m.id as any })}
                                style={{
                                    padding: '12px 14px',
                                    borderRadius: '10px',
                                    background: config.fallbackMode === m.id ? 'rgba(29, 185, 84, 0.12)' : 'rgba(255,255,255,0.02)',
                                    border: `1px solid ${config.fallbackMode === m.id ? '#1DB954' : 'rgba(255,255,255,0.06)'}`,
                                    color: config.fallbackMode === m.id ? '#1DB954' : 'var(--text-dim)',
                                    fontSize: '11px',
                                    fontWeight: '800',
                                    textAlign: 'left',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between'
                                }}
                            >
                                <span>{m.label}</span>
                                {config.fallbackMode === m.id && <CheckCircle2 size={14} color="#1DB954" />}
                            </button>
                        ))}
                    </div>
                </div>
            </HubSectionCard>

            {/* Custom LRC Vault Modal */}
            {showVaultModal && (
                <div style={{
                    position: 'fixed',
                    inset: 0,
                    zIndex: 99999,
                    background: 'rgba(5, 7, 15, 0.85)',
                    backdropFilter: 'blur(20px)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '20px'
                }}>
                    <div style={{
                        width: '700px',
                        maxHeight: '85vh',
                        background: '#0d111a',
                        border: '1px solid rgba(0, 229, 255, 0.3)',
                        borderRadius: '20px',
                        padding: '30px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '20px',
                        boxShadow: '0 0 50px rgba(0, 229, 255, 0.2)',
                        overflow: 'hidden'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <Layers size={22} color="#00e5ff" />
                                <h3 style={{ fontSize: '18px', fontWeight: '900', color: 'white', margin: 0 }}>
                                    {isFr ? 'LRC CUSTOM VAULT (PAROLES LOCALES)' : 'LRC CUSTOM VAULT (LOCAL LYRICS)'}
                                </h3>
                            </div>
                            <button
                                onClick={() => setShowVaultModal(false)}
                                style={{
                                    background: 'transparent',
                                    border: 'none',
                                    color: 'var(--text-dim)',
                                    fontSize: '14px',
                                    fontWeight: '900',
                                    cursor: 'pointer'
                                }}
                            >
                                ✕
                            </button>
                        </div>

                        <p style={{ fontSize: '11px', color: 'var(--text-dim)', margin: 0 }}>
                            {isFr 
                                ? 'Importez vos propres fichiers de paroles synchronisées (.lrc) pour les sons non répertoriés sur Spotify / Soundcloud.' 
                                : 'Import your own synchronized lyrics files (.lrc) for unreleased or underground tracks.'}
                        </p>

                        {/* Import Box */}
                        <div style={{
                            background: 'rgba(0, 0, 0, 0.3)',
                            border: '1px dashed rgba(255, 255, 255, 0.15)',
                            borderRadius: '12px',
                            padding: '16px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '12px'
                        }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                <input
                                    type="text"
                                    placeholder={isFr ? "Nom de l'artiste..." : "Artist name..."}
                                    value={newLrcArtist}
                                    onChange={e => setNewLrcArtist(e.target.value)}
                                    style={{ padding: '10px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: 'white', fontSize: '11px' }}
                                />
                                <input
                                    type="text"
                                    placeholder={isFr ? "Titre du morceau..." : "Track title..."}
                                    value={newLrcTitle}
                                    onChange={e => setNewLrcTitle(e.target.value)}
                                    style={{ padding: '10px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: 'white', fontSize: '11px' }}
                                />
                            </div>

                            <textarea
                                placeholder="[00:12.30] Contenu LRC avec timestamps..."
                                value={newLrcContent}
                                onChange={e => setNewLrcContent(e.target.value)}
                                style={{
                                    height: '80px',
                                    background: 'rgba(255,255,255,0.04)',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    borderRadius: '8px',
                                    padding: '10px',
                                    color: 'white',
                                    fontSize: '10px',
                                    fontFamily: 'monospace',
                                    resize: 'none'
                                }}
                            />

                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    accept=".lrc,.txt"
                                    onChange={handleFileUpload}
                                    style={{ display: 'none' }}
                                />
                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    style={{
                                        padding: '8px 14px',
                                        borderRadius: '8px',
                                        background: 'rgba(255, 255, 255, 0.05)',
                                        border: '1px solid rgba(255, 255, 255, 0.15)',
                                        color: 'white',
                                        fontSize: '11px',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '6px'
                                    }}
                                >
                                    <Upload size={12} />
                                    <span>{isFr ? 'Charger un fichier .lrc' : 'Upload .lrc file'}</span>
                                </button>

                                <button
                                    type="button"
                                    onClick={handleSaveCustomLrc}
                                    style={{
                                        padding: '8px 16px',
                                        borderRadius: '8px',
                                        background: '#00e5ff',
                                        border: 'none',
                                        color: 'black',
                                        fontSize: '11px',
                                        fontWeight: '900',
                                        cursor: 'pointer'
                                    }}
                                >
                                    {isFr ? 'ENREGISTRER DANS LE VAULT' : 'SAVE TO VAULT'}
                                </button>
                            </div>
                        </div>

                        {/* List of Saved Custom LRCs */}
                        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '250px' }}>
                            <span style={{ fontSize: '10px', fontWeight: '900', color: 'var(--text-dim)' }}>
                                {isFr ? `FICHIERS ENREGISTRÉS (${customLyricsList.length}) :` : `SAVED FILES (${customLyricsList.length}) :`}
                            </span>

                            {customLyricsList.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-dim)', fontSize: '11px' }}>
                                    {isFr ? 'Aucun fichier LRC importé pour le moment.' : 'No custom LRC files imported yet.'}
                                </div>
                            ) : (
                                customLyricsList.map((item) => (
                                    <div
                                        key={item.fileName}
                                        style={{
                                            padding: '10px 14px',
                                            background: 'rgba(255, 255, 255, 0.03)',
                                            border: '1px solid rgba(255, 255, 255, 0.08)',
                                            borderRadius: '8px',
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center'
                                        }}
                                    >
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                            <span style={{ fontSize: '12px', fontWeight: '800', color: 'white' }}>{item.title}</span>
                                            <span style={{ fontSize: '10px', color: '#1DB954' }}>{item.artist}</span>
                                        </div>
                                        <button
                                            onClick={() => handleDeleteCustomLrc(item.fileName)}
                                            style={{
                                                background: 'rgba(239, 68, 68, 0.1)',
                                                border: '1px solid rgba(239, 68, 68, 0.2)',
                                                color: '#ef4444',
                                                borderRadius: '6px',
                                                padding: '6px 10px',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '4px'
                                            }}
                                        >
                                            <Trash2 size={12} />
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
