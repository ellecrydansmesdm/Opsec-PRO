import React from 'react';
import { audioService } from '../../services/AudioService';

interface GradientCardProps {
  children: React.ReactNode;
  accent?: 'cyan' | 'green' | 'yellow' | 'red' | 'purple';
  className?: string;
  hoverSound?: boolean;
}

export const GradientCard: React.FC<GradientCardProps> = ({ 
  children, accent = 'cyan', className = '', hoverSound = true 
}) => {
  const accentMap = {
    cyan: 'rgba(0, 217, 255, 0.05)',
    green: 'rgba(0, 255, 136, 0.05)',
    yellow: 'rgba(255, 215, 0, 0.05)',
    red: 'rgba(255, 68, 68, 0.05)',
    purple: 'rgba(168, 85, 247, 0.05)'
  };
  
  const borderMap = {
    cyan: 'rgba(0, 217, 255, 0.2)',
    green: 'rgba(0, 255, 136, 0.2)',
    yellow: 'rgba(255, 215, 0, 0.2)',
    red: 'rgba(255, 68, 68, 0.2)',
    purple: 'rgba(168, 85, 247, 0.2)'
  };

  const hoverBorderMap = {
    cyan: 'rgba(0, 217, 255, 0.5)',
    green: 'rgba(0, 255, 136, 0.5)',
    yellow: 'rgba(255, 215, 0, 0.5)',
    red: 'rgba(255, 68, 68, 0.5)',
    purple: 'rgba(168, 85, 247, 0.5)'
  };

  return (
    <div 
      className={`glass-card group ${className}`}
      style={{ 
        position: 'relative',
        padding: '24px',
        background: `linear-gradient(135deg, ${accentMap[accent]} 0%, rgba(10, 12, 16, 0.95) 100%)`,
        borderColor: borderMap[accent],
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      }}
      onMouseEnter={() => {
        if (hoverSound) audioService.play('hover', { volume: 0.1 });
      }}
    >
      <style>{`
        .group:hover {
            border-color: ${hoverBorderMap[accent]} !important;
            box-shadow: 0 0 30px ${accentMap[accent]} !important;
            transform: translateY(-2px);
        }
      `}</style>
      
      {/* Barre supérieure néon */}
      <div 
        style={{ 
          position: 'absolute',
          top: 0,
          left: '20px',
          width: '40px',
          height: '2px',
          background: hoverBorderMap[accent],
          boxShadow: `0 0 10px ${hoverBorderMap[accent]}`,
          transition: 'all 0.4s'
        }} 
        className="top-accent-bar"
      />
      
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
};
