import React, { useState } from 'react';
import { Swords, Flame, MessageSquare, Trash2, Copy } from 'lucide-react';
import { LastWordSystem } from '@/components/modules/LastWordSystem';
import { SpamSystem } from '@/components/modules/SpamSystem';
import { MassDMSystem } from '@/components/modules/MassDMSystem';
import { MassPurgeSystem } from '@/components/modules/MassPurgeSystem';
import { ServerClonerSystem } from '@/components/modules/ServerClonerSystem';
import { HubPageLayout, HubSubTabKeepAlive } from '@/components/layout/HubPageLayout';

interface RaidHubProps {
    showToast: (message: string, type?: 'success' | 'danger') => void;
    onConfirm: (data: any) => void;
}

export const RaidHub: React.FC<RaidHubProps> = ({ showToast, onConfirm }) => {
    const [activeSubTab, setActiveSubTab] = useState<'lastword' | 'spam' | 'dmall' | 'purge' | 'cloner'>('lastword');

    return (
        <HubPageLayout
            title="Raid & Combat"
            titleAccent="Hub"
            description="Combat duels, mass broadcast, purging & server cloner"
            tabs={[
                { id: 'lastword', label: 'LAST WORD (CARDIO)', icon: Swords },
                { id: 'spam', label: 'SPAM SYSTEM (PRO)', icon: Flame },
                { id: 'dmall', label: 'MASS DM (BROADCAST)', icon: MessageSquare },
                { id: 'purge', label: 'MASS PURGE & NUKER', icon: Trash2 },
                { id: 'cloner', label: 'SERVER CLONER 1:1', icon: Copy },
            ]}
            activeTab={activeSubTab}
            onTabChange={(id) => setActiveSubTab(id as typeof activeSubTab)}
        >
            <HubSubTabKeepAlive active={activeSubTab === 'lastword'}>
                <div className="hub-page-inner">
                    <LastWordSystem showToast={showToast} />
                </div>
            </HubSubTabKeepAlive>
            <HubSubTabKeepAlive active={activeSubTab === 'spam'}>
                <div className="hub-page-inner">
                    <SpamSystem showToast={showToast} />
                </div>
            </HubSubTabKeepAlive>
            <HubSubTabKeepAlive active={activeSubTab === 'dmall'}>
                <div className="hub-page-inner">
                    <MassDMSystem showToast={showToast} onConfirm={onConfirm} />
                </div>
            </HubSubTabKeepAlive>
            <HubSubTabKeepAlive active={activeSubTab === 'purge'}>
                <div className="hub-page-inner">
                    <MassPurgeSystem showToast={showToast} onConfirm={onConfirm} />
                </div>
            </HubSubTabKeepAlive>
            <HubSubTabKeepAlive active={activeSubTab === 'cloner'}>
                <div className="hub-page-inner">
                    <ServerClonerSystem showToast={showToast} />
                </div>
            </HubSubTabKeepAlive>
        </HubPageLayout>
    );
};
