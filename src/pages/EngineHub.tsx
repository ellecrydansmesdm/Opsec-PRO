import React, { useState } from 'react';
import { Shield, Tractor, Bot, Zap, Activity } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { AutomationSystem } from '@/components/modules/AutomationSystem';
import { Farmer } from '@/pages/Farmer';
import { AutoResponder } from '@/pages/AutoResponder';

interface EngineHubProps {
    showToast: (message: string, type: 'success' | 'danger') => void;
}

export const EngineHub = ({ showToast }: EngineHubProps) => {
    const [activeSubTab, setActiveSubTab] = useState<'guardian' | 'farming' | 'responder'>('guardian');

    const tabs = [
        { id: 'guardian', name: 'GUARDIAN', icon: Shield, desc: 'Snipers & Auto-Report' },
        { id: 'farming', name: 'FARMING', icon: Tractor, desc: 'Vocal & Message Farmer' },
        { id: 'responder', name: 'AUTO-REPLY', icon: Bot, desc: 'Smart Auto-Responder' },
    ];

    return (
        <div className="animate-fade-in" style={{ padding: '30px', display: 'flex', flexDirection: 'column', gap: '30px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                    <div style={{ padding: '15px', background: 'var(--accent-glow)', borderRadius: '14px', color: 'var(--accent)', boxShadow: '0 0 20px var(--accent-glow)' }}>
                        <Zap size={24} />
                    </div>
                    <div>
                        <h2 style={{ fontSize: '24px', fontWeight: '900', letterSpacing: '0.5px' }}>Automation Engine</h2>
                        <p className="caption" style={{ opacity: 0.5 }}>BACKGROUND SYSTEMS & INTELLIGENT AGENTS</p>
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
                                background: activeSubTab === tab.id ? 'var(--accent)' : 'transparent',
                                color: activeSubTab === tab.id ? 'black' : 'white',
                                cursor: 'pointer',
                                transition: '0.3s',
                                fontWeight: 'bold',
                                fontSize: '12px'
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
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.2 }}
                    >
                        {activeSubTab === 'guardian' && <AutomationSystem showToast={showToast} />}
                        {activeSubTab === 'farming' && <Farmer />}
                        {activeSubTab === 'responder' && <AutoResponder />}
                    </motion.div>
                </AnimatePresence>
            </div>
        </div>
    );
};
