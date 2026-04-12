import React from 'react';
import { AlertTriangle, Shield } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  type?: 'danger' | 'info';
}

export const ConfirmModal = ({ isOpen, title, message, onConfirm, onCancel, type = 'danger' }: ConfirmModalProps) => {
  if (!isOpen) return null;
  return (
    <div className="modal-overlay" style={{ zIndex: 11000 }} onClick={onCancel}>
      <div className="modal-content glass-card animate-slide-up" onClick={e => e.stopPropagation()} style={{ maxWidth: '400px', padding: '35px', textAlign: 'center' }}>
        <div style={{ width: '60px', height: '60px', background: type === 'danger' ? 'rgba(231,76,60,0.1)' : 'rgba(62,99,221,0.1)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
           {type === 'danger' ? <AlertTriangle size={30} color="var(--danger)" /> : <Shield size={30} color="var(--accent)" />}
        </div>
        <h2 style={{ marginBottom: '15px' }}>{title}</h2>
        <p style={{ marginBottom: '30px', fontSize: '14px', color: 'var(--text-dim)' }}>{message}</p>
        <div style={{ display: 'flex', gap: '15px' }}>
          <button onClick={onCancel} className="btn-primary" style={{ flex: 1, background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)' }}>Annuler</button>
          <button onClick={() => { onConfirm(); onCancel(); }} className="btn-primary" style={{ flex: 1, background: type === 'danger' ? 'var(--danger)' : 'var(--accent)' }}>Confirmer</button>
        </div>
      </div>
    </div>
  );
};
