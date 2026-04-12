import React, { useState } from 'react';

interface TooltipProps {
  text: string;
  children: React.ReactNode;
}

export const Tooltip = ({ text, children }: TooltipProps) => {
  const [visible, setVisible] = useState(false);
  return (
    <div style={{ position: 'relative', display: 'inline-block' }} onMouseEnter={() => setVisible(true)} onMouseLeave={() => setVisible(false)}>
      {children}
      {visible && (
        <div style={{
          position: 'fixed', transform: 'translateY(-120%) translateX(-20%)',
          background: 'rgba(10, 10, 15, 0.98)', color: 'white', padding: '10px 15px', borderRadius: '10px',
          fontSize: '11px', whiteSpace: 'nowrap', border: '1px solid var(--border)', backdropFilter: 'blur(10px)',
          boxShadow: '0 10px 20px rgba(0,0,0,0.5)', zIndex: 9999, pointerEvents: 'none',
          animation: 'fade-in 0.2s ease-out'
        }} className="tooltip-portal">
          {text}
        </div>
      )}
    </div>
  );
};
