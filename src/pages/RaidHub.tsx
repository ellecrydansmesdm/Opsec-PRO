import React, { useState } from 'react';
import { Users, Crosshair, Box, Radio } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Modules } from '@/pages/Modules';
import { GroupSystem } from '@/components/modules/GroupSystem';

interface RaidHubProps {
    showToast: (message: string, type: 'success' | 'danger') => void;
    onConfirm: (data: any) => void;
}

export const RaidHub = ({ showToast, onConfirm }: RaidHubProps) => {
    const [activeSubTab, setActiveSubTab] = useState<'utility' | 'network'>('utility');

    const tabs = [
        { id: 'utility', name: 'UTILITIES', icon: Box, desc: 'Purge, DM All, Sanitizer' },
        { id: 'network', name: 'NETWORK PRO', icon: Users, desc: 'Mass Add & Group Management' },
    ];

    return (
        <div className="animate-fade-in" style={{ padding: '30px', display: 'flex', flexDirection: 'column', gap: '30px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                    <div style={{ padding: '15px', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '14px', color: 'var(--danger)', boxShadow: '0 0 20px rgba(239, 68, 68, 0.2)' }}>
                        <Crosshair size={24} />
                    </div>
                    <div>
                        <h2 style={{ fontSize: '24px', fontWeight: '900', letterSpacing: '0.5px' }}>Raid & Network Hub</h2>
                        <p className="caption" style={{ opacity: 0.5 }}>MASS UTILITIES & GROUP MANAGEMENT</p>
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '10px', background: 'rgba(255,255,255,0.03)', padding: '5px', borderRadius: '12px', border: '1px solid var(--border)' }}>
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveSubTab(tab.id as any)}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '10px',
                                padding: '10px 20px',
                                borderRadius: '8px',
                                border: 'none',
                                background: activeSubTab === tab.id ? 'var(--danger)' : 'transparent',
                                color: activeSubTab === tab.id ? 'white' : 'var(--text-dim)',
                                cursor: 'pointer',
                                transition: '0.3s',
                                fontWeight: 'bold',
                                fontSize: '11px'
                            }}
                        >
                            <tab.icon size={16} />
                            {tab.name}
                        </button>
                    ))}
                </div>
            </div>

            <div style={{ position: 'relative', flex: 1 }}>
                <AnimatePresence mode="wait">
                    <motion.div
                        key={activeSubTab}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.2 }}
                    >
                        {activeSubTab === 'utility' && <Modules onConfirm={onConfirm} />}
                        {activeSubTab === 'network' && <GroupSystem showToast={showToast} />}
                    </motion.div>
                </AnimatePresence>
            </div>
        </div>
    );
};
