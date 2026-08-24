import React, { useState } from 'react';
import { Target, Link, Trash2, ShieldCheck, Activity, Users, Wrench } from 'lucide-react';
import { PomeloSniper } from '@/components/modules/PomeloSniper';
import { VanitySniper } from '@/components/modules/VanitySniper';
import { AccountSanitizerSystem } from '@/components/modules/AccountSanitizerSystem';
import { ProfileBadgesSystem } from '@/components/modules/ProfileBadgesSystem';
import { SpotifySyncSystem } from '@/components/modules/SpotifySyncSystem';
import { GroupSystem } from '@/components/modules/GroupSystem';
import { HubPageLayout, HubSubTabKeepAlive } from '@/components/layout/HubPageLayout';

interface ToolsHubProps {
    showToast: (message: string, type?: 'success' | 'danger') => void;
    onConfirm: (data: any) => void;
}

export const ToolsHub: React.FC<ToolsHubProps> = ({ showToast, onConfirm }) => {
    const [activeSubTab, setActiveSubTab] = useState<'pomelo' | 'vanity' | 'sanitizer' | 'badges' | 'spotify' | 'groups'>('pomelo');

    return (
        <HubPageLayout
            title="Tools"
            titleAccent="Hub"
            description="Identity, vanity claimer, account cleaner & profile utilities"
            tabs={[
                { id: 'pomelo', label: 'POMELO SNIPER', icon: Target },
                { id: 'vanity', label: 'VANITY URL CLAIMER', icon: Link },
                { id: 'sanitizer', label: 'ACCOUNT SANITIZER', icon: Trash2 },
                { id: 'badges', label: 'BADGES & HYPESQUAD', icon: ShieldCheck },
                { id: 'spotify', label: 'SPOTIFY SYNC', icon: Activity },
                { id: 'groups', label: 'GROUPS & NETWORK', icon: Users },
            ]}
            activeTab={activeSubTab}
            onTabChange={(id) => setActiveSubTab(id as typeof activeSubTab)}
        >
            <HubSubTabKeepAlive active={activeSubTab === 'pomelo'}>
                <div className="hub-page-inner">
                    <PomeloSniper showToast={showToast} />
                </div>
            </HubSubTabKeepAlive>
            <HubSubTabKeepAlive active={activeSubTab === 'vanity'}>
                <div className="hub-page-inner">
                    <VanitySniper showToast={showToast} />
                </div>
            </HubSubTabKeepAlive>
            <HubSubTabKeepAlive active={activeSubTab === 'sanitizer'}>
                <div className="hub-page-inner">
                    <AccountSanitizerSystem showToast={showToast} onConfirm={onConfirm} />
                </div>
            </HubSubTabKeepAlive>
            <HubSubTabKeepAlive active={activeSubTab === 'badges'}>
                <div className="hub-page-inner">
                    <ProfileBadgesSystem showToast={showToast} />
                </div>
            </HubSubTabKeepAlive>
            <HubSubTabKeepAlive active={activeSubTab === 'spotify'}>
                <div className="hub-page-inner">
                    <SpotifySyncSystem showToast={showToast} />
                </div>
            </HubSubTabKeepAlive>
            <HubSubTabKeepAlive active={activeSubTab === 'groups'}>
                <div className="hub-page-inner">
                    <GroupSystem showToast={showToast} />
                </div>
            </HubSubTabKeepAlive>
        </HubPageLayout>
    );
};
