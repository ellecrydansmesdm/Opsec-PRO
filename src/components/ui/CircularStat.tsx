import React from 'react';

interface CircularStatProps {
  value: number;
  max: number;
  label: string;
  color?: 'cyan' | 'green' | 'red';
  size?: 'sm' | 'md' | 'lg';
}

export const CircularStat: React.FC<CircularStatProps> = ({ 
  value, max, label, color = 'cyan', size = 'md' 
}) => {
  const percentage = Math.min((value / max) * 100, 100);
  const radius = size === 'sm' ? 40 : size === 'md' ? 50 : 60;
  const stroke = size === 'sm' ? 6 : 8;
  const normalizedRadius = radius - stroke;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  const colors = {
    cyan: '#00D9FF',
    green: '#00FF88',
    red: '#FF4444'
  };

  const sizeClasses = {
    sm: 'w-24 h-24 text-xl',
    md: 'w-32 h-32 text-3xl',
    lg: 'w-40 h-40 text-4xl'
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <div className={`relative ${sizeClasses[size]}`} style={{ width: radius * 2, height: radius * 2 }}>
        <svg 
           width={radius * 2} 
           height={radius * 2} 
           style={{ transform: 'rotate(-90deg)' }}
        >
          <circle
            stroke="rgba(255,255,255,0.05)"
            strokeWidth={stroke}
            fill="transparent"
            r={normalizedRadius}
            cx={radius}
            cy={radius}
          />
          <circle
            stroke={colors[color]}
            strokeWidth={stroke}
            strokeLinecap="round"
            fill="transparent"
            r={normalizedRadius}
            cx={radius}
            cy={radius}
            style={{
              strokeDasharray: `${circumference} ${circumference}`,
              strokeDashoffset,
              filter: `drop-shadow(0 0 10px ${colors[color]})`,
              transition: 'stroke-dashoffset 1s cubic-bezier(0.4, 0, 0.2, 1)'
            }}
          />
        </svg>
        <div 
          style={{ 
            position: 'absolute', 
            inset: 0, 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center', 
            justifyContent: 'center' 
          }}
        >
          <span style={{ fontWeight: '900', color: 'white', fontSize: size === 'sm' ? '14px' : '18px' }}>{value}</span>
          <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', fontWeight: '700' }}>/ {max}</span>
        </div>
      </div>
      <span style={{ fontSize: '10px', fontWeight: '900', color: 'rgba(255,255,255,0.4)', letterSpacing: '2px', textTransform: 'uppercase', marginTop: '5px' }}>
        {label}
      </span>
    </div>
  );
};
