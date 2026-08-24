import React, { useState } from 'react';
import { Shield, Bot, Terminal, Zap, Tractor, Volume2 } from 'lucide-react';
import { AutomationSystem } from '@/components/modules/AutomationSystem';
import { AutoResponder } from '@/pages/AutoResponder';
import { InChatSystem } from '@/components/modules/InChatSystem';
import { MacroSystem } from '@/components/modules/MacroSystem';
import { Farmer } from '@/pages/Farmer';
import { VoiceStreamerSystem } from '@/components/modules/VoiceStreamerSystem';
import { HubPageLayout, HubSubTabKeepAlive } from '@/components/layout/HubPageLayout';

interface EngineHubProps {
    showToast: (message: string, type: 'success' | 'danger') => void;
}

export const EngineHub: React.FC<EngineHubProps> = ({ showToast }) => {
    const [activeSubTab, setActiveSubTab] = useState<'guardian' | 'responder' | 'commands' | 'macros' | 'farming' | 'voice'>('guardian');

    return (
        <HubPageLayout
            title="Engine"
            titleAccent="Hub"
            description="Background intelligent agents, auto-responder & voice streaming"
            tabs={[
                { id: 'guardian', label: 'GUARDIAN & SENTINEL', icon: Shield },
                { id: 'responder', label: 'AUTO-RESPONDER', icon: Bot },
                { id: 'commands', label: 'IN-CHAT DISPATCHER', icon: Terminal },
                { id: 'macros', label: 'MACROS & SCENARIOS', icon: Zap },
                { id: 'farming', label: 'AUTO-FARMING', icon: Tractor },
                { id: 'voice', label: 'VOICE STREAMER', icon: Volume2 },
            ]}
            activeTab={activeSubTab}
            onTabChange={(id) => setActiveSubTab(id as typeof activeSubTab)}
        >
            <HubSubTabKeepAlive active={activeSubTab === 'guardian'}>
                <div className="hub-page-inner">
                    <AutomationSystem showToast={showToast} />
                </div>
            </HubSubTabKeepAlive>
            <HubSubTabKeepAlive active={activeSubTab === 'responder'}>
                <div className="hub-page-inner">
                    <AutoResponder />
                </div>
            </HubSubTabKeepAlive>
            <HubSubTabKeepAlive active={activeSubTab === 'commands'}>
                <div className="hub-page-inner">
                    <InChatSystem showToast={showToast} />
                </div>
            </HubSubTabKeepAlive>
            <HubSubTabKeepAlive active={activeSubTab === 'macros'}>
                <div className="hub-page-inner">
                    <MacroSystem showToast={showToast} />
                </div>
            </HubSubTabKeepAlive>
            <HubSubTabKeepAlive active={activeSubTab === 'farming'}>
                <div className="hub-page-inner">
                    <Farmer />
                </div>
            </HubSubTabKeepAlive>
            <HubSubTabKeepAlive active={activeSubTab === 'voice'}>
                <div className="hub-page-inner">
                    <VoiceStreamerSystem showToast={showToast} />
                </div>
            </HubSubTabKeepAlive>
        </HubPageLayout>
    );
};
