import React, { useState } from 'react';
import { Users, Box } from 'lucide-react';
import { Modules } from '@/pages/Modules';
import { GroupSystem } from '@/components/modules/GroupSystem';
import { HubPageLayout, HubSubTabKeepAlive } from '@/components/layout/HubPageLayout';

interface RaidHubProps {
    showToast: (message: string, type: 'success' | 'danger') => void;
    onConfirm: (data: any) => void;
}

export const RaidHub = ({ showToast, onConfirm }: RaidHubProps) => {
    const [activeSubTab, setActiveSubTab] = useState<'utility' | 'network'>('utility');

    return (
        <HubPageLayout
            title="Raid"
            titleAccent="Hub"
            description="Mass utilities & group management"
            tabs={[
                { id: 'utility', label: 'UTILITIES', icon: Box },
                { id: 'network', label: 'NETWORK PRO', icon: Users },
            ]}
            activeTab={activeSubTab}
            onTabChange={(id) => setActiveSubTab(id as typeof activeSubTab)}
        >
            <HubSubTabKeepAlive active={activeSubTab === 'utility'}>
                <div className="hub-page-inner">
                    <Modules onConfirm={onConfirm} />
                </div>
            </HubSubTabKeepAlive>
            <HubSubTabKeepAlive active={activeSubTab === 'network'}>
                <div className="hub-page-inner">
                    <GroupSystem showToast={showToast} />
                </div>
            </HubSubTabKeepAlive>
        </HubPageLayout>
    );
};
