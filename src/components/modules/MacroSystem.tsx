import React, { useState, useEffect } from 'react';
import { Play, Square, Plus, Trash2, Zap, Shield, Sparkles, Clock, CheckCircle, Terminal, RotateCcw } from 'lucide-react';
import { useSettingsStore } from '@/store/useSettingsStore';

interface MacroSystemProps {
    showToast?: (message: string, type: 'success' | 'danger') => void;
}

export const MacroSystem: React.FC<MacroSystemProps> = ({ showToast }) => {
    const { settings } = useSettingsStore();
    const isFr = settings.language === 'fr';

    const [macros, setMacros] = useState<any[]>([]);
    const [executingId, setExecutingId] = useState<string | null>(null);
    const [showCreateModal, setShowCreateModal] = useState(false);

    // Create form state
    const [macroName, setMacroName] = useState('');
    const [macroDesc, setMacroDesc] = useState('');
    const [statusAction, setStatusAction] = useState('invisible');
    const [customStatusText, setCustomStatusText] = useState('');
    const [fakeActivityTitle, setFakeActivityTitle] = useState('');
    const [leaveGroupsChecked, setLeaveGroupsChecked] = useState(false);

    const refreshMacros = async () => {
        if (window.electronAPI?.macroList) {
            const res = await window.electronAPI.macroList();
            if (res?.data) {
                setMacros(res.data);
            }
        }
    };

    useEffect(() => {
        refreshMacros();
    }, []);

    const handleExecute = async (macroId: string) => {
        setExecutingId(macroId);
        showToast?.(isFr ? 'Scénario en cours d\'exécution...' : 'Executing scenario...', 'success');
        try {
            const res = await window.electronAPI?.macroExecute(macroId);
            if (res?.success) {
                showToast?.(isFr ? 'Scénario terminé avec succès !' : 'Scenario executed successfully!', 'success');
            } else {
                showToast?.(res?.error || (isFr ? 'Échec de l\'exécution' : 'Execution failed'), 'danger');
            }
        } catch (e: any) {
            showToast?.(e.message, 'danger');
        } finally {
            setExecutingId(null);
        }
    };

    const handleRollback = async () => {
        try {
            const res = await window.electronAPI?.macroRestoreSnapshot();
            if (res?.success) {
                showToast?.(isFr ? 'Profil initial restauré avec succès !' : 'Original profile restored!', 'success');
            } else {
                showToast?.(res?.error || (isFr ? 'Aucun snapshot disponible' : 'No snapshot available'), 'danger');
            }
        } catch (e: any) {
            showToast?.(e.message, 'danger');
        }
    };

    const handleCancel = async () => {
        await window.electronAPI?.macroCancel();
        setExecutingId(null);
        showToast?.(isFr ? 'Exécution interrompue' : 'Execution cancelled', 'success');
    };

    const handleDelete = async (macroId: string) => {
        await window.electronAPI?.macroDelete(macroId);
        showToast?.(isFr ? 'Scénario supprimé' : 'Scenario deleted', 'success');
        await refreshMacros();
    };

    const handleCreateMacro = async () => {
        if (!macroName.trim()) {
            showToast?.(isFr ? 'Donnez un nom au scénario' : 'Provide a scenario name', 'danger');
            return;
        }

        const steps: any[] = [];
        if (statusAction) {
            steps.push({
                id: String(Date.now() + 1),
                type: 'status',
                params: { status: statusAction, customText: customStatusText },
                label: `Statut ${statusAction}`
            });
        }
        if (fakeActivityTitle.trim()) {
            steps.push({
                id: String(Date.now() + 2),
                type: 'fake_activity',
                params: { type: 'play', title: fakeActivityTitle.trim() },
                label: `Activité: ${fakeActivityTitle}`
            });
        }
        if (leaveGroupsChecked) {
            steps.push({
                id: String(Date.now() + 3),
                type: 'leave_groups',
                params: {},
                label: 'Quitter les groupes'
            });
        }

        const newMacro = {
            id: `macro_${Date.now()}`,
            name: macroName.trim(),
            description: macroDesc.trim() || (isFr ? 'Scénario personnalisé' : 'Custom user scenario'),
            steps
        };

        await window.electronAPI?.macroSave(newMacro);
        showToast?.(isFr ? 'Scénario créé avec succès !' : 'Scenario created successfully!', 'success');
        setShowCreateModal(false);
        setMacroName('');
        setMacroDesc('');
        setCustomStatusText('');
        setFakeActivityTitle('');
        setLeaveGroupsChecked(false);
        await refreshMacros();
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Header Banner */}
            <div className="card" style={{
                padding: '24px',
                borderRadius: '16px',
                background: 'linear-gradient(135deg, rgba(255, 215, 0, 0.05) 0%, rgba(255, 100, 0, 0.05) 100%)',
                border: '1px solid rgba(255, 215, 0, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '16px'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{
                        width: '48px',
                        height: '48px',
                        borderRadius: '12px',
                        background: 'rgba(255, 215, 0, 0.15)',
                        border: '1px solid #ffd700',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}>
                        <Zap size={24} color="#ffd700" />
                    </div>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                            <span style={{ fontSize: '10px', fontWeight: '900', color: '#ffd700', letterSpacing: '1px' }}>
                                AUTOMATION MACRO ENGINE
                            </span>
                        </div>
                        <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '800' }}>
                            {isFr ? 'Scénarios & Macros d\'Automatisation' : 'Macro & Scenario Automation'}
                        </h3>
                        <p style={{ margin: '4px 0 0 0', fontSize: '12px', opacity: 0.6 }}>
                            {isFr 
                                ? 'Enchaînez des séries d\'actions automatisées en 1 clic (Statut, Activité, Purge, Salons).' 
                                : 'Execute customized sequences of actions in 1 click (Status, Rich Presence, Clean trace).'}
                        </p>
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '10px' }}>
                    {executingId && (
                        <button
                            onClick={handleCancel}
                            className="btn-danger"
                            style={{
                                height: '40px',
                                padding: '0 18px',
                                borderRadius: '10px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                fontSize: '12px',
                                fontWeight: 'bold'
                            }}
                        >
                            <Square size={14} />
                            {isFr ? 'Interrompre' : 'Cancel'}
                        </button>
                    )}

                    <button
                        onClick={handleRollback}
                        className="btn-secondary"
                        style={{
                            height: '40px',
                            padding: '0 16px',
                            borderRadius: '10px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            fontSize: '12px',
                            fontWeight: 'bold',
                            background: 'rgba(255, 255, 255, 0.05)',
                            border: '1px solid rgba(255, 255, 255, 0.1)'
                        }}
                    >
                        <RotateCcw size={15} color="#00ffcc" />
                        {isFr ? 'Restaurer Profil' : 'Restore Profile'}
                    </button>

                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="btn-primary"
                        style={{
                            height: '40px',
                            padding: '0 18px',
                            borderRadius: '10px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            fontSize: '12px',
                            fontWeight: 'bold'
                        }}
                    >
                        <Plus size={16} />
                        {isFr ? 'Créer un Scénario' : 'Create Scenario'}
                    </button>
                </div>
            </div>

            {/* Macros List Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
                {macros.map((m) => {
                    const isRunningThis = executingId === m.id;
                    return (
                        <div key={m.id} className="card" style={{
                            padding: '20px',
                            borderRadius: '14px',
                            border: `1px solid ${isRunningThis ? 'var(--accent)' : 'rgba(255, 255, 255, 0.08)'}`,
                            background: isRunningThis ? 'rgba(0, 210, 255, 0.06)' : 'rgba(255, 255, 255, 0.02)',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'space-between',
                            gap: '14px'
                        }}>
                            <div>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                                    <h4 style={{ margin: 0, fontSize: '15px', fontWeight: '800' }}>
                                        {m.name}
                                    </h4>
                                    {m.isPreset ? (
                                        <span style={{ fontSize: '9px', fontWeight: 'bold', padding: '2px 6px', borderRadius: '4px', background: 'rgba(0, 210, 255, 0.15)', color: 'var(--accent)' }}>
                                            PRESET
                                        </span>
                                    ) : (
                                        <button
                                            onClick={() => handleDelete(m.id)}
                                            style={{ background: 'transparent', border: 'none', color: '#ff0050', cursor: 'pointer', opacity: 0.7 }}
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    )}
                                </div>
                                <p style={{ margin: 0, fontSize: '12px', opacity: 0.65, lineHeight: '1.4' }}>
                                    {m.description}
                                </p>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid rgba(255, 255, 255, 0.05)', paddingTop: '12px' }}>
                                <span style={{ fontSize: '11px', opacity: 0.5 }}>
                                    {m.steps?.length || 0} {isFr ? 'actions' : 'steps'}
                                </span>
                                <button
                                    onClick={() => handleExecute(m.id)}
                                    disabled={!!executingId}
                                    className="btn-primary"
                                    style={{
                                        height: '34px',
                                        padding: '0 16px',
                                        borderRadius: '8px',
                                        fontSize: '11px',
                                        fontWeight: 'bold',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '6px'
                                    }}
                                >
                                    <Play size={12} />
                                    {isRunningThis ? (isFr ? 'Exécution...' : 'Running...') : (isFr ? 'Lancer' : 'Run')}
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Create Scenario Modal */}
            {showCreateModal && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'rgba(0,0,0,0.7)',
                    backdropFilter: 'blur(8px)',
                    zIndex: 9999,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '20px'
                }}>
                    <div style={{
                        width: '100%',
                        maxWidth: '480px',
                        background: '#090a0f',
                        border: '1px solid rgba(0, 210, 255, 0.3)',
                        borderRadius: '16px',
                        padding: '24px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '16px'
                    }}>
                        <h3 style={{ margin: 0, fontSize: '17px', fontWeight: '800' }}>
                            {isFr ? 'Nouveau Scénario d\'Automatisation' : 'New Automation Scenario'}
                        </h3>

                        <input
                            type="text"
                            placeholder={isFr ? 'Nom du scénario (ex: Mode Discret)...' : 'Scenario name...'}
                            value={macroName}
                            onChange={(e) => setMacroName(e.target.value)}
                            style={{ height: '40px', background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '0 12px', color: '#fff', fontSize: '12px' }}
                        />

                        <input
                            type="text"
                            placeholder={isFr ? 'Description courte...' : 'Short description...'}
                            value={macroDesc}
                            onChange={(e) => setMacroDesc(e.target.value)}
                            style={{ height: '40px', background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '0 12px', color: '#fff', fontSize: '12px' }}
                        />

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <label style={{ fontSize: '11px', fontWeight: 'bold', opacity: 0.7 }}>
                                {isFr ? 'Statut Discord à appliquer :' : 'Discord status to set :'}
                            </label>
                            <select
                                value={statusAction}
                                onChange={(e) => setStatusAction(e.target.value)}
                                style={{ height: '38px', background: '#11131a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff', padding: '0 10px', fontSize: '12px' }}
                            >
                                <option value="online">Online (En ligne)</option>
                                <option value="idle">Idle (Inactif)</option>
                                <option value="dnd">DND (Ne pas déranger)</option>
                                <option value="invisible">Invisible</option>
                            </select>
                        </div>

                        <input
                            type="text"
                            placeholder={isFr ? 'Texte de statut personnalisé...' : 'Custom status text...'}
                            value={customStatusText}
                            onChange={(e) => setCustomStatusText(e.target.value)}
                            style={{ height: '40px', background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '0 12px', color: '#fff', fontSize: '12px' }}
                        />

                        <input
                            type="text"
                            placeholder={isFr ? 'Activité / Jeu Fake (ex: Counter-Strike 2)...' : 'Fake game activity...'}
                            value={fakeActivityTitle}
                            onChange={(e) => setFakeActivityTitle(e.target.value)}
                            style={{ height: '40px', background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '0 12px', color: '#fff', fontSize: '12px' }}
                        />

                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <input
                                type="checkbox"
                                checked={leaveGroupsChecked}
                                onChange={(e) => setLeaveGroupsChecked(e.target.checked)}
                                style={{ accentColor: 'var(--accent)', cursor: 'pointer' }}
                            />
                            <span style={{ fontSize: '12px' }}>
                                {isFr ? 'Quitter automatiquement tous les groupes de discussion' : 'Leave all group DMs automatically'}
                            </span>
                        </div>

                        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '10px' }}>
                            <button
                                onClick={() => setShowCreateModal(false)}
                                className="btn-secondary"
                                style={{ height: '38px', padding: '0 16px', borderRadius: '8px', fontSize: '12px' }}
                            >
                                {isFr ? 'Annuler' : 'Cancel'}
                            </button>
                            <button
                                onClick={handleCreateMacro}
                                className="btn-primary"
                                style={{ height: '38px', padding: '0 20px', borderRadius: '8px', fontSize: '12px', fontWeight: 'bold' }}
                            >
                                {isFr ? 'Enregistrer' : 'Save'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
