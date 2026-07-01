import React, { useState } from 'react';
import { KeyRound, ShieldAlert, CheckCircle, HelpCircle, ExternalLink, RefreshCw } from 'lucide-react';
import { audioService } from '@/services/AudioService';

interface LicenseScreenProps {
  initialKey?: string;
  onSuccess: () => void;
}

export const LicenseScreen = ({ initialKey = '', onSuccess }: LicenseScreenProps) => {
  const [key, setKey] = useState(initialKey);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  React.useEffect(() => {
    if (initialKey) {
      setKey(initialKey);
    }
  }, [initialKey]);

  const handleActivate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!key.trim()) {
      audioService.play('log_error_critical');
      setError('Veuillez entrer une clé de licence.');
      return;
    }

    setLoading(true);
    setError(null);
    audioService.play('action_btn_primary');

    try {
      const res = await window.electronAPI.checkAuth({ licenseKey: key.trim() });
      if (res.success) {
        audioService.play('account_login_success');
        setSuccess(true);
        setTimeout(() => {
          onSuccess();
        }, 1500);
      } else {
        audioService.play('log_error_critical');
        setError(res.error || 'Clé de licence invalide ou expirée.');
      }
    } catch (err: any) {
      audioService.play('log_error_critical');
      setError(`Erreur d'activation : ${err.message || 'Serveur injoignable'}`);
    } finally {
      setLoading(false);
    }
  };

  const openStore = () => {
    audioService.play('action_btn_secondary');
    window.electronAPI.openExternal('https://whop.com/@mecsuperstyle');
  };

  return (
    <div style={{
      width: '100%',
      maxWidth: '450px',
      margin: '0 auto',
      padding: '40px',
      background: 'rgba(5, 7, 15, 0.45)',
      backdropFilter: 'blur(30px)',
      border: '1px solid rgba(0, 210, 255, 0.12)',
      borderRadius: '24px',
      boxShadow: '0 25px 60px rgba(0,0,0,0.6), 0 0 40px rgba(0, 210, 255, 0.05)',
      position: 'relative',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      animation: 'fade-in 0.4s ease-out'
    }}>
      {/* Decorative cyber grid */}
      <div style={{
        position: 'absolute',
        top: 0, left: 0, right: 0, height: '4px',
        background: 'linear-gradient(90deg, transparent, var(--accent), transparent)',
        animation: 'glow 2s infinite alternate'
      }} />

      <div style={{
        width: '60px',
        height: '60px',
        borderRadius: '16px',
        background: success ? 'rgba(98, 255, 65, 0.1)' : 'rgba(0, 210, 255, 0.05)',
        border: `1px solid ${success ? 'rgba(98, 255, 65, 0.25)' : 'rgba(0, 210, 255, 0.15)'}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: '25px',
        boxShadow: success ? '0 0 20px rgba(98, 255, 65, 0.15)' : 'none',
        transition: 'all 0.3s'
      }}>
        {success ? (
          <CheckCircle size={30} color="#62ff41" style={{ animation: 'bounce-once 0.5s ease-out' }} />
        ) : (
          <KeyRound size={28} color="var(--accent)" style={{ filter: 'drop-shadow(0 0 8px var(--accent-glow))' }} />
        )}
      </div>

      <h2 style={{
        fontFamily: 'Orbitron',
        fontSize: '18px',
        letterSpacing: '3px',
        fontWeight: 900,
        color: '#fff',
        margin: '0 0 10px 0',
        textAlign: 'center',
        textTransform: 'uppercase',
        textShadow: '0 0 15px rgba(255,255,255,0.1)'
      }}>
        {success ? 'Licence Activer' : 'Activation Requise'}
      </h2>

      <p style={{
        fontSize: '11px',
        color: 'var(--text-dim)',
        lineHeight: '1.5',
        textAlign: 'center',
        margin: '0 0 30px 0',
        fontWeight: 'bold',
        maxWidth: '300px'
      }}>
        {success 
          ? 'Validation réussie ! Redirection en cours...' 
          : 'Entrez votre clé Sell.app pour déverrouiller et utiliser Opsec PRO.'}
      </p>

      {error && (
        <div style={{
          width: '100%',
          padding: '12px 16px',
          background: 'rgba(239, 68, 68, 0.08)',
          border: '1px solid rgba(239, 68, 68, 0.25)',
          borderRadius: '12px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          marginBottom: '20px',
          animation: 'shake 0.3s ease-in-out'
        }}>
          <ShieldAlert size={16} color="var(--danger)" style={{ flexShrink: 0 }} />
          <span style={{ fontSize: '10px', color: 'var(--danger)', fontWeight: 'bold', lineHeight: '1.4' }}>{error}</span>
        </div>
      )}

      <form onSubmit={handleActivate} style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '15px' }}>
        <div style={{ position: 'relative', width: '100%' }}>
          <input
            type="text"
            placeholder="OPSEC-XXXX-XXXX-XXXX"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            disabled={loading || success}
            style={{
              width: '100%',
              padding: '16px 20px',
              background: 'rgba(0,0,0,0.35)',
              border: '1px solid var(--border)',
              borderRadius: '14px',
              color: '#fff',
              fontSize: '12px',
              fontWeight: '900',
              fontFamily: 'monospace',
              letterSpacing: '1px',
              textAlign: 'center',
              outline: 'none',
              transition: 'all 0.3s',
              boxSizing: 'border-box'
            }}
            className="license-input-field"
          />
        </div>

        <button
          type="submit"
          disabled={loading || success}
          className="btn-primary"
          style={{
            width: '100%',
            padding: '16px',
            borderRadius: '14px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '10px',
            cursor: (loading || success) ? 'default' : 'pointer',
            background: success ? '#62ff41' : 'var(--accent)',
            color: success ? '#000' : 'black',
            fontWeight: '900',
            fontSize: '11px',
            letterSpacing: '2px',
            boxShadow: success ? '0 0 25px rgba(98, 255, 65, 0.35)' : '0 0 20px var(--accent-glow)'
          }}
        >
          {loading ? (
            <RefreshCw className="animate-spin" size={14} />
          ) : (
            <span>{success ? 'ACTIVÉ' : 'ACTIVER LA LICENCE'}</span>
          )}
        </button>
      </form>

      {!success && (
        <div style={{
          marginTop: '30px',
          width: '100%',
          display: 'flex',
          justifyContent: 'center',
          gap: '20px',
          borderTop: '1px solid rgba(255,255,255,0.03)',
          paddingTop: '20px'
        }}>
          <button
            onClick={() => window.electronAPI.openExternal('https://opsecpro.sell.app')}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--accent)',
              fontSize: '10px',
              fontWeight: '900',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer',
              opacity: 0.7,
              transition: 'opacity 0.2s',
              outline: 'none'
            }}
            onMouseEnter={(e) => { e.currentTarget.style.opacity = '1'; }}
            onMouseLeave={(e) => { e.currentTarget.style.opacity = '0.7'; }}
          >
            <span>Boutique Sell.app</span>
            <ExternalLink size={10} />
          </button>
        </div>
      )}
    </div>
  );
};
