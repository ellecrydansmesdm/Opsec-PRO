import React, { useState } from 'react';
import { KeyRound, ShieldAlert, CheckCircle, ExternalLink, RefreshCw, Zap, ShieldCheck, Infinity, Sparkles } from 'lucide-react';
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
      setError('Veuillez entrer votre clé de licence.');
      return;
    }

    setLoading(true);
    setError(null);
    audioService.play('action_btn_primary');

    try {
      const res = await window.electronAPI.checkAuth({ licenseKey: key.trim() });
      if (res.success && !res.data?.requireLicense) {
        audioService.play('account_login_success');
        setSuccess(true);
        setTimeout(() => {
          onSuccess();
        }, 1500);
      } else {
        audioService.play('log_error_critical');
        setError(res.error || 'Clé de licence invalide, expirée ou déjà liée à un autre PC.');
      }
    } catch (err: any) {
      audioService.play('log_error_critical');
      setError(`Erreur d'activation : ${err.message || 'Serveur injoignable'}`);
    } finally {
      setLoading(false);
    }
  };

  const openPayPal = () => {
    audioService.play('action_btn_secondary');
    window.electronAPI.openExternal('https://paypal.me/mecsuperstyle/5EUR');
  };

  return (
    <div style={{
      width: '100%',
      maxWidth: '480px',
      margin: '0 auto',
      padding: '36px 32px',
      background: 'rgba(7, 10, 20, 0.65)',
      backdropFilter: 'blur(35px)',
      border: '1px solid rgba(0, 210, 255, 0.15)',
      borderRadius: '24px',
      boxShadow: '0 30px 70px rgba(0,0,0,0.7), 0 0 45px rgba(0, 210, 255, 0.08)',
      position: 'relative',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      animation: 'fade-in 0.4s ease-out'
    }}>
      {/* Decorative cyber grid bar */}
      <div style={{
        position: 'absolute',
        top: 0, left: 0, right: 0, height: '3px',
        background: 'linear-gradient(90deg, transparent, var(--accent), transparent)',
        animation: 'glow 2s infinite alternate'
      }} />

      {/* Header Icon */}
      <div style={{
        width: '56px',
        height: '56px',
        borderRadius: '16px',
        background: success ? 'rgba(98, 255, 65, 0.12)' : 'rgba(0, 210, 255, 0.08)',
        border: `1px solid ${success ? 'rgba(98, 255, 65, 0.3)' : 'rgba(0, 210, 255, 0.2)'}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: '18px',
        boxShadow: success ? '0 0 25px rgba(98, 255, 65, 0.2)' : '0 0 20px rgba(0, 210, 255, 0.1)',
        transition: 'all 0.3s'
      }}>
        {success ? (
          <CheckCircle size={28} color="#62ff41" style={{ animation: 'bounce-once 0.5s ease-out' }} />
        ) : (
          <KeyRound size={26} color="var(--accent)" style={{ filter: 'drop-shadow(0 0 8px var(--accent-glow))' }} />
        )}
      </div>

      <h2 style={{
        fontFamily: 'Orbitron',
        fontSize: '17px',
        letterSpacing: '2.5px',
        fontWeight: 900,
        color: '#fff',
        margin: '0 0 6px 0',
        textAlign: 'center',
        textTransform: 'uppercase',
        textShadow: '0 0 15px rgba(255,255,255,0.15)'
      }}>
        {success ? 'Licence Validée' : 'Accès & Licence'}
      </h2>

      <p style={{
        fontSize: '11px',
        color: 'var(--text-dim)',
        lineHeight: '1.4',
        textAlign: 'center',
        margin: '0 0 22px 0',
        fontWeight: 600
      }}>
        {success 
          ? 'Authentification réussie ! Redirection en cours...' 
          : 'Opsec PRO requiert une clé valide pour déverrouiller la suite.'}
      </p>

      {/* SINGLE PLAN CARD: LIFETIME 5€ */}
      {!success && (
        <div style={{
          width: '100%',
          background: 'linear-gradient(145deg, rgba(0, 210, 255, 0.06), rgba(10, 15, 30, 0.6))',
          border: '1px solid rgba(0, 210, 255, 0.2)',
          borderRadius: '16px',
          padding: '16px 20px',
          marginBottom: '22px',
          boxSizing: 'border-box',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '10px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Sparkles size={14} color="var(--accent)" />
              <span style={{
                fontSize: '12px',
                fontWeight: 900,
                letterSpacing: '1px',
                color: '#fff',
                textTransform: 'uppercase',
                fontFamily: 'Orbitron'
              }}>
                Pass Lifetime
              </span>
            </div>
            <div style={{
              background: 'rgba(0, 210, 255, 0.15)',
              border: '1px solid var(--accent)',
              padding: '3px 10px',
              borderRadius: '20px',
              color: 'var(--accent)',
              fontWeight: 900,
              fontSize: '12px',
              fontFamily: 'Orbitron',
              letterSpacing: '0.5px'
            }}>
              5,00 €
            </div>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '8px',
            marginBottom: '14px',
            fontSize: '10px',
            color: 'rgba(255,255,255,0.7)',
            fontWeight: 600
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <Infinity size={12} color="var(--accent)" />
              <span>Accès Illimité à Vie</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <Zap size={12} color="var(--accent)" />
              <span>Tous les Snipers & Fermes</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <ShieldCheck size={12} color="var(--accent)" />
              <span>Protection Sentinel Active</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <CheckCircle size={12} color="var(--accent)" />
              <span>Mises à Jour Incluses</span>
            </div>
          </div>

          <button
            type="button"
            onClick={openPayPal}
            style={{
              width: '100%',
              padding: '11px',
              borderRadius: '10px',
              background: 'linear-gradient(90deg, #0070ba, #003087)',
              border: '1px solid rgba(0, 112, 186, 0.5)',
              color: '#fff',
              fontWeight: 900,
              fontSize: '11px',
              letterSpacing: '1px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              boxShadow: '0 4px 15px rgba(0, 112, 186, 0.3)',
              transition: 'all 0.2s',
              outline: 'none'
            }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(0, 112, 186, 0.45)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 15px rgba(0, 112, 186, 0.3)'; }}
          >
            <span>ACHETER VIA PAYPAL (5€)</span>
            <ExternalLink size={12} />
          </button>
        </div>
      )}

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
          marginBottom: '18px',
          animation: 'shake 0.3s ease-in-out',
          boxSizing: 'border-box'
        }}>
          <ShieldAlert size={16} color="var(--danger)" style={{ flexShrink: 0 }} />
          <span style={{ fontSize: '10px', color: 'var(--danger)', fontWeight: 'bold', lineHeight: '1.4' }}>{error}</span>
        </div>
      )}

      {/* ACTIVATION FORM */}
      <form onSubmit={handleActivate} style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div style={{ position: 'relative', width: '100%' }}>
          <input
            type="text"
            placeholder="OPSEC-XXXX-XXXX-XXXX"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            disabled={loading || success}
            style={{
              width: '100%',
              padding: '14px 18px',
              background: 'rgba(0,0,0,0.4)',
              border: '1px solid var(--border)',
              borderRadius: '12px',
              color: '#fff',
              fontSize: '12px',
              fontWeight: '900',
              fontFamily: 'monospace',
              letterSpacing: '1.5px',
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
            padding: '14px',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            cursor: (loading || success) ? 'default' : 'pointer',
            background: success ? '#62ff41' : 'var(--accent)',
            color: success ? '#000' : 'black',
            fontWeight: 900,
            fontSize: '11px',
            letterSpacing: '1.5px',
            boxShadow: success ? '0 0 25px rgba(98, 255, 65, 0.35)' : '0 0 20px var(--accent-glow)'
          }}
        >
          {loading ? (
            <RefreshCw className="animate-spin" size={14} />
          ) : (
            <span>{success ? 'LICENCE VALIDÉE' : 'ACTIVER MA LICENCE'}</span>
          )}
        </button>
      </form>
    </div>
  );
};
