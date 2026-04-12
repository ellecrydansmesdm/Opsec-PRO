import React, { useEffect } from 'react';
import { CheckCircle, XCircle, Info, X } from 'lucide-react';

interface NotificationProps {
  message: string;
  type: 'success' | 'error' | 'info';
  onClose: () => void;
}

export const Notification: React.FC<NotificationProps> = ({ message, type, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 5000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const icons = {
    success: <CheckCircle size={18} color="#10b981" />,
    error: <XCircle size={18} color="#ef4444" />,
    info: <Info size={18} color="#3e63dd" />
  };

  const colors = {
    success: '#10b981',
    error: '#ef4444',
    info: '#3e63dd'
  };

  return (
    <div 
      className="glass-card animate-slide-up"
      style={{
        position: 'fixed',
        bottom: '30px',
        right: '30px',
        padding: '15px 20px',
        zIndex: 10000,
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        minWidth: '300px',
        borderLeft: `4px solid ${colors[type]}`,
        boxShadow: '0 10px 40px rgba(0,0,0,0.5)',
        background: 'rgba(15, 15, 20, 0.95)',
        backdropFilter: 'blur(10px)'
      }}
    >
      {icons[type]}
      <div style={{ flex: 1 }}>
        <p style={{ fontSize: '13px', fontWeight: '800', color: 'white' }}>
          {type === 'success' ? 'SUCCÈS' : type === 'error' ? 'ERREUR' : 'SYSTEME'}
        </p>
        <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)', marginTop: '2px', fontWeight: '600' }}>
          {message}
        </p>
      </div>
      <X 
        size={14} 
        color="rgba(255,255,255,0.3)" 
        style={{ cursor: 'pointer' }}
        onClick={onClose}
      />
    </div>
  );
};
