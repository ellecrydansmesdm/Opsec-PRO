import React, { useEffect, useState } from 'react';

interface StatCircleProps {
  count: number;
  max: number;
  label: string;
  size?: number;
  strokeWidth?: number;
  fontSize?: string;
}

export const StatCircle = ({ 
  count, 
  max, 
  label, 
  size = 90, 
  strokeWidth = 6,
  fontSize = "22px"
}: StatCircleProps) => {
  const [animatedCount, setAnimatedCount] = useState(0);
  const radius = (size / 2) - (strokeWidth * 2);
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;
  
  useEffect(() => {
    const timer = setTimeout(() => {
      setAnimatedCount(count);
    }, 50);
    return () => clearTimeout(timer);
  }, [count]);

  const progress = Math.max(0.01, Math.min((animatedCount / max), 1));
  const offset = circumference - (progress * circumference);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '15px' }}>
      <div style={{ position: 'relative', width: `${size}px`, height: `${size}px`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <svg width={size} height={size}>
          <circle cx={center} cy={center} r={radius} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={strokeWidth} />
          <circle 
            cx={center} 
            cy={center} 
            r={radius} 
            fill="none" 
            stroke="var(--accent)" 
            strokeWidth={strokeWidth} 
            strokeDasharray={circumference} 
            strokeDashoffset={offset} 
            strokeLinecap="round" 
            style={{ 
              transform: 'rotate(-90deg)',
              transformOrigin: '50% 50%',
              transition: 'stroke-dashoffset 800ms cubic-bezier(0.4, 0, 0.2, 1)',
              filter: 'drop-shadow(0 0 10px var(--accent-glow))' 
            }} 
          />
        </svg>
        <div style={{ position: 'absolute', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <span style={{ fontSize: fontSize, fontWeight: '900', color: 'white', letterSpacing: '-0.5px' }}>{count}</span>
          <span className="caption" style={{ fontSize: '8px', opacity: 0.3 }}>/ {max}</span>
        </div>
      </div>
      <p className="caption" style={{ color: 'var(--text-dim)', fontSize: '10px' }}>{label}</p>
    </div>
  );
};
