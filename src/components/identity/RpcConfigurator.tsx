import React from 'react';

interface RpcConfiguratorProps {
    rpcAppId: string;
    setRpcAppId: (v: string) => void;
    rpcDetails: string;
    setRpcDetails: (v: string) => void;
    rpcState: string;
    setRpcState: (v: string) => void;
    rpcLargeImage: string;
    setRpcLargeImage: (v: string) => void;
    rpcSmallImage: string;
    setRpcSmallImage: (v: string) => void;
    rpcBtn1Label: string;
    setRpcBtn1Label: (v: string) => void;
    rpcBtn1Url: string;
    setRpcBtn1Url: (v: string) => void;
    rpcBtn2Label: string;
    setRpcBtn2Label: (v: string) => void;
    rpcBtn2Url: string;
    setRpcBtn2Url: (v: string) => void;
    isFr: boolean;
}

export const RpcConfigurator: React.FC<RpcConfiguratorProps> = ({
    rpcAppId, setRpcAppId,
    rpcDetails, setRpcDetails,
    rpcState, setRpcState,
    rpcLargeImage, setRpcLargeImage,
    rpcSmallImage, setRpcSmallImage,
    rpcBtn1Label, setRpcBtn1Label,
    rpcBtn1Url, setRpcBtn1Url,
    rpcBtn2Label, setRpcBtn2Label,
    rpcBtn2Url, setRpcBtn2Url,
    isFr
}) => {
    return (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
                <label style={{ fontSize: '11px', fontWeight: '800', opacity: 0.6, marginBottom: '4px', display: 'block' }}>
                    APPLICATION ID
                </label>
                <input
                    type="text"
                    className="input-primary"
                    placeholder="1234567890..."
                    value={rpcAppId}
                    onChange={(e) => setRpcAppId(e.target.value)}
                    style={{ width: '100%' }}
                />
            </div>

            <div>
                <label style={{ fontSize: '11px', fontWeight: '800', opacity: 0.6, marginBottom: '4px', display: 'block' }}>
                    DETAILS
                </label>
                <input
                    type="text"
                    className="input-primary"
                    placeholder={isFr ? 'Playing Opsec PRO' : 'Playing Opsec PRO'}
                    value={rpcDetails}
                    onChange={(e) => setRpcDetails(e.target.value)}
                    style={{ width: '100%' }}
                />
            </div>

            <div>
                <label style={{ fontSize: '11px', fontWeight: '800', opacity: 0.6, marginBottom: '4px', display: 'block' }}>
                    STATE
                </label>
                <input
                    type="text"
                    className="input-primary"
                    placeholder={isFr ? 'In competitive match' : 'In competitive match'}
                    value={rpcState}
                    onChange={(e) => setRpcState(e.target.value)}
                    style={{ width: '100%' }}
                />
            </div>

            <div>
                <label style={{ fontSize: '11px', fontWeight: '800', opacity: 0.6, marginBottom: '4px', display: 'block' }}>
                    LARGE IMAGE KEY / URL
                </label>
                <input
                    type="text"
                    className="input-primary"
                    placeholder="large_image_key"
                    value={rpcLargeImage}
                    onChange={(e) => setRpcLargeImage(e.target.value)}
                    style={{ width: '100%' }}
                />
            </div>

            <div>
                <label style={{ fontSize: '11px', fontWeight: '800', opacity: 0.6, marginBottom: '4px', display: 'block' }}>
                    SMALL IMAGE KEY / URL
                </label>
                <input
                    type="text"
                    className="input-primary"
                    placeholder="small_image_key"
                    value={rpcSmallImage}
                    onChange={(e) => setRpcSmallImage(e.target.value)}
                    style={{ width: '100%' }}
                />
            </div>

            <div>
                <label style={{ fontSize: '11px', fontWeight: '800', opacity: 0.6, marginBottom: '4px', display: 'block' }}>
                    BUTTON 1 LABEL & URL
                </label>
                <div style={{ display: 'flex', gap: '8px' }}>
                    <input
                        type="text"
                        className="input-primary"
                        placeholder="Website"
                        value={rpcBtn1Label}
                        onChange={(e) => setRpcBtn1Label(e.target.value)}
                        style={{ width: '50%' }}
                    />
                    <input
                        type="text"
                        className="input-primary"
                        placeholder="https://..."
                        value={rpcBtn1Url}
                        onChange={(e) => setRpcBtn1Url(e.target.value)}
                        style={{ width: '50%' }}
                    />
                </div>
            </div>
        </div>
    );
};
