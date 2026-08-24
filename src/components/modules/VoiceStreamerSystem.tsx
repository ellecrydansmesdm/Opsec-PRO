import React, { useState, useEffect } from 'react';
import { Volume2, Radio, Play, Square, LogOut, Music, Sparkles, FolderOpen, Sliders } from 'lucide-react';
import { useSettingsStore } from '@/store/useSettingsStore';

interface VoiceStreamerSystemProps {
    showToast?: (message: string, type: 'success' | 'danger') => void;
}

export const VoiceStreamerSystem: React.FC<VoiceStreamerSystemProps> = ({ showToast }) => {
    const { settings } = useSettingsStore();
    const isFr = settings.language === 'fr';

    const [channelId, setChannelId] = useState('');
    const [audioSource, setAudioSource] = useState('');
    const [status, setStatus] = useState<any>({ connected: false, channelName: null, guildName: null, playing: false, currentTrack: null, volume: 100 });
    const [isJoining, setIsJoining] = useState(false);
    const [volume, setVolume] = useState(100);

    const refreshStatus = async () => {
        if (window.electronAPI?.voiceStatus) {
            const res = await window.electronAPI.voiceStatus();
            if (res?.data) {
                setStatus(res.data);
                setVolume(res.data.volume || 100);
            }
        }
    };

    useEffect(() => {
        refreshStatus();
        const interval = setInterval(refreshStatus, 3000);
        return () => clearInterval(interval);
    }, []);

    const handleJoin = async () => {
        if (!channelId.trim()) {
            showToast?.(isFr ? 'Renseignez l\'ID du salon vocal' : 'Provide voice channel ID', 'danger');
            return;
        }

        setIsJoining(true);
        try {
            const res = await window.electronAPI?.voiceJoin(channelId.trim());
            if (res?.success) {
                showToast?.(isFr ? 'Connecté au salon vocal !' : 'Connected to voice channel!', 'success');
                await refreshStatus();
            } else {
                showToast?.(res?.error || (isFr ? 'Échec de connexion' : 'Failed to join'), 'danger');
            }
        } catch (e: any) {
            showToast?.(e.message, 'danger');
        } finally {
            setIsJoining(false);
        }
    };

    const handleLeave = async () => {
        await window.electronAPI?.voiceLeave();
        showToast?.(isFr ? 'Déconnecté du salon vocal' : 'Disconnected from voice', 'success');
        await refreshStatus();
    };

    const handlePlay = async () => {
        if (!audioSource.trim()) {
            showToast?.(isFr ? 'Renseignez le chemin du fichier audio' : 'Provide audio file path', 'danger');
            return;
        }

        const res = await window.electronAPI?.voicePlay(audioSource.trim());
        if (res?.success) {
            showToast?.(isFr ? 'Lecture audio lancée !' : 'Playback started!', 'success');
            await refreshStatus();
        } else {
            showToast?.(res?.error || (isFr ? 'Échec de la lecture' : 'Playback failed'), 'danger');
        }
    };

    const handleStop = async () => {
        await window.electronAPI?.voiceStop();
        showToast?.(isFr ? 'Lecture arrêtée' : 'Playback stopped', 'success');
        await refreshStatus();
    };

    const handleVolumeChange = async (newVol: number) => {
        setVolume(newVol);
        if (window.electronAPI?.voiceSetVolume) {
            await window.electronAPI.voiceSetVolume(newVol);
        }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Header Status Card */}
            <div className="card" style={{
                padding: '24px',
                borderRadius: '16px',
                background: 'linear-gradient(135deg, rgba(0, 210, 255, 0.05) 0%, rgba(138, 43, 226, 0.05) 100%)',
                border: '1px solid rgba(0, 210, 255, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '16px'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{
                        width: '48px',
                        height: '48px',
                        borderRadius: '12px',
                        background: status.connected ? 'rgba(0, 255, 128, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                        border: `1px solid ${status.connected ? '#00ff80' : 'rgba(255, 255, 255, 0.1)'}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}>
                        <Radio size={24} color={status.connected ? '#00ff80' : '#888'} />
                    </div>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                            <span style={{ fontSize: '10px', fontWeight: '900', color: 'var(--accent)', letterSpacing: '1px' }}>
                                WEBRTC VOICE STREAMER
                            </span>
                            <span style={{
                                fontSize: '10px',
                                padding: '2px 6px',
                                borderRadius: '4px',
                                background: status.connected ? 'rgba(0, 255, 128, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                                color: status.connected ? '#00ff80' : '#888',
                                fontWeight: 'bold'
                            }}>
                                {status.connected ? 'CONNECTED' : 'DISCONNECTED'}
                            </span>
                        </div>
                        <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '800' }}>
                            {status.connected ? `${status.channelName} (${status.guildName})` : (isFr ? 'Lecteur Audio en Salon Vocal' : 'Voice Channel Sound Streamer')}
                        </h3>
                        <p style={{ margin: '4px 0 0 0', fontSize: '12px', opacity: 0.6 }}>
                            {isFr 
                                ? 'Diffusez de la musique ou des effets sonores dans les salons vocaux Discord.' 
                                : 'Stream music and custom sound effects directly inside Discord voice channels.'}
                        </p>
                    </div>
                </div>

                {status.connected && (
                    <button
                        onClick={handleLeave}
                        className="btn-danger"
                        style={{
                            height: '40px',
                            padding: '0 18px',
                            borderRadius: '10px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            fontSize: '12px',
                            fontWeight: 'bold'
                        }}
                    >
                        <LogOut size={14} />
                        {isFr ? 'Quitter Vocal' : 'Leave Voice'}
                    </button>
                )}
            </div>

            {/* Main Controls Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                {/* Connection Box */}
                <div className="card" style={{ padding: '20px', borderRadius: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <Radio size={18} color="var(--accent)" />
                        <h4 style={{ margin: 0, fontSize: '14px', fontWeight: '800' }}>
                            {isFr ? 'Connexion au Salon Vocal' : 'Voice Channel Connection'}
                        </h4>
                    </div>

                    <div style={{ display: 'flex', gap: '8px' }}>
                        <input
                            type="text"
                            placeholder={isFr ? 'ID du Salon Vocal...' : 'Voice Channel ID...'}
                            value={channelId}
                            onChange={(e) => setChannelId(e.target.value)}
                            style={{
                                flex: 1,
                                height: '40px',
                                background: 'rgba(0, 0, 0, 0.4)',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                borderRadius: '10px',
                                padding: '0 14px',
                                color: '#fff',
                                fontSize: '12px'
                            }}
                        />
                        <button
                            onClick={handleJoin}
                            disabled={isJoining}
                            className="btn-primary"
                            style={{
                                height: '40px',
                                padding: '0 16px',
                                borderRadius: '10px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                fontSize: '12px',
                                fontWeight: 'bold'
                            }}
                        >
                            <Play size={14} />
                            {isJoining ? (isFr ? 'Connexion...' : 'Joining...') : (isFr ? 'Rejoindre' : 'Join')}
                        </button>
                    </div>

                    {/* Volume Slider */}
                    <div style={{ marginTop: 'auto', background: 'rgba(255, 255, 255, 0.02)', padding: '14px', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 'bold' }}>
                                <Volume2 size={15} color="var(--accent)" />
                                <span>{isFr ? 'Volume de diffusion' : 'Broadcast Volume'}</span>
                            </div>
                            <span style={{ fontSize: '12px', fontWeight: '900', color: 'var(--accent)' }}>{volume}%</span>
                        </div>
                        <input
                            type="range"
                            min="0"
                            max="200"
                            value={volume}
                            onChange={(e) => handleVolumeChange(parseInt(e.target.value, 10))}
                            style={{ width: '100%', accentColor: 'var(--accent)', cursor: 'pointer' }}
                        />
                    </div>
                </div>

                {/* Playback Box */}
                <div className="card" style={{ padding: '20px', borderRadius: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <Music size={18} color="var(--accent)" />
                        <h4 style={{ margin: 0, fontSize: '14px', fontWeight: '800' }}>
                            {isFr ? 'Lecteur Audio' : 'Audio Player'}
                        </h4>
                    </div>

                    <div style={{ display: 'flex', gap: '8px' }}>
                        <input
                            type="text"
                            placeholder={isFr ? 'Chemin du fichier (MP3, WAV, OGG)...' : 'File path (MP3, WAV, OGG)...'}
                            value={audioSource}
                            onChange={(e) => setAudioSource(e.target.value)}
                            style={{
                                flex: 1,
                                height: '40px',
                                background: 'rgba(0, 0, 0, 0.4)',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                borderRadius: '10px',
                                padding: '0 14px',
                                color: '#fff',
                                fontSize: '12px'
                            }}
                        />
                        <button
                            type="button"
                            onClick={async () => {
                                try {
                                    const res = await window.electronAPI?.selectFile();
                                    if (res?.data) {
                                        setAudioSource(res.data);
                                    }
                                } catch (_) {}
                            }}
                            className="btn-secondary"
                            style={{
                                height: '40px',
                                padding: '0 14px',
                                borderRadius: '10px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                fontSize: '11px',
                                fontWeight: 'bold'
                            }}
                        >
                            <FolderOpen size={14} />
                            {isFr ? 'Parcourir' : 'Browse'}
                        </button>
                    </div>

                    <div style={{ display: 'flex', gap: '10px' }}>
                        <button
                            onClick={handlePlay}
                            disabled={!status.connected}
                            className="btn-primary"
                            style={{
                                flex: 1,
                                height: '40px',
                                borderRadius: '10px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '8px',
                                fontSize: '12px',
                                fontWeight: 'bold'
                            }}
                        >
                            <Play size={14} />
                            {isFr ? 'Jouer Audio' : 'Play Audio'}
                        </button>

                        <button
                            onClick={handleStop}
                            disabled={!status.connected || !status.playing}
                            className="btn-secondary"
                            style={{
                                height: '40px',
                                padding: '0 18px',
                                borderRadius: '10px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                fontSize: '12px',
                                fontWeight: 'bold'
                            }}
                        >
                            <Square size={14} />
                            {isFr ? 'Stop' : 'Stop'}
                        </button>
                    </div>

                    {status.playing && (
                        <div style={{
                            background: 'rgba(0, 210, 255, 0.08)',
                            border: '1px solid var(--accent)',
                            borderRadius: '10px',
                            padding: '10px 14px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px'
                        }}>
                            <Sparkles size={14} color="var(--accent)" />
                            <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#fff' }}>
                                {isFr ? 'Lecture en cours :' : 'Now Playing :'} {status.currentTrack}
                            </span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
