import React from 'react';

interface StatusEditorProps {
    statusText: string;
    setStatusText: (v: string) => void;
    bioText: string;
    setBioText: (v: string) => void;
    isFr: boolean;
}

export const StatusEditor: React.FC<StatusEditorProps> = ({
    statusText,
    setStatusText,
    bioText,
    setBioText,
    isFr
}) => {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
                <label style={{ fontSize: '12px', fontWeight: '800', opacity: 0.7, marginBottom: '6px', display: 'block' }}>
                    {isFr ? 'TEXTE DE STATUT PERSONNALISÉ' : 'CUSTOM STATUS TEXT'}
                </label>
                <input
                    type="text"
                    className="input-primary"
                    placeholder={isFr ? 'Mon statut Opsec...' : 'My Opsec status...'}
                    value={statusText}
                    onChange={(e) => setStatusText(e.target.value)}
                    style={{ width: '100%' }}
                />
            </div>

            <div>
                <label style={{ fontSize: '12px', fontWeight: '800', opacity: 0.7, marginBottom: '6px', display: 'block' }}>
                    {isFr ? 'BIOGRAPHIE DU PROFIL' : 'PROFILE BIO'}
                </label>
                <textarea
                    className="input-primary"
                    rows={4}
                    placeholder={isFr ? 'Écrivez votre biographie ici...' : 'Write your bio here...'}
                    value={bioText}
                    onChange={(e) => setBioText(e.target.value)}
                    style={{ width: '100%', resize: 'vertical' }}
                />
            </div>
        </div>
    );
};
