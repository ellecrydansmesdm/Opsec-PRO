import React from 'react';
import { Zap } from 'lucide-react';

interface BadgeProps {
  type: string;
}

export const Badge = ({ type }: BadgeProps) => (
  <div className={`badge-item ${type === 'nitro' ? 'nitro' : ''}`}>
    {type === 'nitro' && <Zap size={10} />}
    {type}
  </div>
);
