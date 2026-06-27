import React, { useState } from 'react';
import { Shield, Tractor, Bot } from 'lucide-react';
import { AutomationSystem } from '@/components/modules/AutomationSystem';
import { Farmer } from '@/pages/Farmer';
import { AutoResponder } from '@/pages/AutoResponder';
import { HubPageLayout, HubSubTabKeepAlive } from '@/components/layout/HubPageLayout';

interface EngineHubProps {
    showToast: (message: string, type: 'success' | 'danger') => void;
}

export const EngineHub = ({ showToast }: EngineHubProps) => {
    const [activeSubTab, setActiveSubTab] = useState<'guardian' | 'farming' | 'responder'>('guardian');

    return (
        <HubPageLayout
            title="Engine"
            titleAccent="Hub"
            description="Background systems & intelligent agents"
            tabs={[
                { id: 'guardian', label: 'GUARDIAN', icon: Shield },
                { id: 'farming', label: 'FARMING', icon: Tractor },
                { id: 'responder', label: 'AUTO-REPLY', icon: Bot },
            ]}
            activeTab={activeSubTab}
            onTabChange={(id) => setActiveSubTab(id as typeof activeSubTab)}
        >
            <HubSubTabKeepAlive active={activeSubTab === 'guardian'}>
                <div className="hub-page-inner">
                    <AutomationSystem showToast={showToast} />
                </div>
            </HubSubTabKeepAlive>
            <HubSubTabKeepAlive active={activeSubTab === 'farming'}>
                <div className="hub-page-inner">
                    <Farmer />
                </div>
            </HubSubTabKeepAlive>
            <HubSubTabKeepAlive active={activeSubTab === 'responder'}>
                <div className="hub-page-inner">
                    <AutoResponder />
                </div>
            </HubSubTabKeepAlive>
        </HubPageLayout>
    );
};
