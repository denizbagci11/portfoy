"use client";

import { usePortfolio } from '@/lib/store';
import { useMemo, useState } from 'react';
import { Settings, Save, TestTube } from 'lucide-react';

interface AssetSourceConfig {
    source: 'MANUAL' | 'TEFAS' | 'YAHOO';
    ticker: string;
}

export default function KaynakSecimiPage() {
    const { transactions } = usePortfolio();

    // Get all unique assets from transactions (excluding fiat currencies)
    const assets = useMemo(() => {
        const unique = new Set(transactions.map(t => (t.asset || 'GOLD').trim().toUpperCase()));
        return Array.from(unique)
            .filter(asset => !['USD', 'TRY', 'EUR', 'GBP'].includes(asset))
            .sort();
    }, [transactions]);

    // State for each asset's configuration
    const [configs, setConfigs] = useState<Record<string, AssetSourceConfig>>(() => {
        const initial: Record<string, AssetSourceConfig> = {};
        assets.forEach(asset => {
            initial[asset] = { source: 'MANUAL', ticker: '' };
        });
        return initial;
    });

    const [saving, setSaving] = useState(false);

    const handleSourceChange = (asset: string, source: 'MANUAL' | 'TEFAS' | 'YAHOO') => {
        setConfigs(prev => ({
            ...prev,
            [asset]: { ...prev[asset], source }
        }));
    };

    const handleTickerChange = (asset: string, ticker: string) => {
        setConfigs(prev => ({
            ...prev,
            [asset]: { ...prev[asset], ticker }
        }));
    };

    const handleTest = async (asset: string) => {
        const config = configs[asset];
        if (!config.ticker && config.source !== 'MANUAL') {
            alert('Lütfen ticker/kod giriniz');
            return;
        }
        alert(`Test özelliği yakında eklenecek!\nVarlık: ${asset}\nKaynak: ${config.source}\nTicker: ${config.ticker}`);
    };

    const handleSave = async () => {
        setSaving(true);
        // TODO: Implement save to database
        setTimeout(() => {
            setSaving(false);
            alert('Ayarlar kaydedildi! (Veritabanı entegrasyonu yakında eklenecek)');
        }, 500);
    };

    return (
        <div className="container py-4">
            <div className="row justify-content-center">
                <div className="col-lg-10">
                    <div className="card shadow-sm border-0 rounded-4 overflow-hidden">
                        <div className="card-header bg-dark text-white p-4 border-0">
                            <div className="d-flex align-items-center justify-content-between">
                                <div className="d-flex align-items-center gap-3">
                                    <Settings size={32} />
                                    <div>
                                        <h4 className="mb-0 fw-bold">Kaynak Seçimi</h4>
                                        <p className="text-white-50 small mb-0 mt-1">
                                            Varlıklarınızın fiyat kaynaklarını yapılandırın
                                        </p>
                                    </div>
                                </div>
                                <button
                                    className="btn btn-primary d-flex align-items-center gap-2"
                                    onClick={handleSave}
                                    disabled={saving}
                                >
                                    <Save size={18} />
                                    {saving ? 'Kaydediliyor...' : 'Kaydet'}
                                </button>
                            </div>
                        </div>
                        <div className="card-body p-4">
                            {assets.length === 0 ? (
                                <div className="text-center py-5 text-muted">
                                    <p>Henüz portföyünüzde varlık bulunmuyor.</p>
                                    <p className="small">İşlem ekleyerek başlayın.</p>
                                </div>
                            ) : (
                                <div className="table-responsive">
                                    <table className="table table-hover align-middle">
                                        <thead className="table-light">
                                            <tr>
                                                <th className="fw-bold" style={{ width: '20%' }}>Varlık</th>
                                                <th className="fw-bold" style={{ width: '30%' }}>Kaynak</th>
                                                <th className="fw-bold" style={{ width: '30%' }}>Ticker/Kod</th>
                                                <th className="fw-bold text-end" style={{ width: '20%' }}>İşlem</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {assets.map(asset => (
                                                <tr key={asset}>
                                                    <td>
                                                        <div className="d-flex align-items-center gap-2">
                                                            <div className="avatar bg-primary text-white rounded-circle d-flex align-items-center justify-content-center fw-bold"
                                                                style={{ width: 32, height: 32, fontSize: '0.9rem' }}>
                                                                {asset.substring(0, 1)}
                                                            </div>
                                                            <span className="fw-semibold">{asset}</span>
                                                        </div>
                                                    </td>
                                                    <td>
                                                        <div className="btn-group btn-group-sm w-100" role="group">
                                                            <input
                                                                type="radio"
                                                                className="btn-check"
                                                                name={`source-${asset}`}
                                                                id={`manual-${asset}`}
                                                                checked={configs[asset]?.source === 'MANUAL'}
                                                                onChange={() => handleSourceChange(asset, 'MANUAL')}
                                                            />
                                                            <label className="btn btn-outline-secondary" htmlFor={`manual-${asset}`}>
                                                                Manuel
                                                            </label>

                                                            <input
                                                                type="radio"
                                                                className="btn-check"
                                                                name={`source-${asset}`}
                                                                id={`tefas-${asset}`}
                                                                checked={configs[asset]?.source === 'TEFAS'}
                                                                onChange={() => handleSourceChange(asset, 'TEFAS')}
                                                            />
                                                            <label className="btn btn-outline-info" htmlFor={`tefas-${asset}`}>
                                                                TEFAS
                                                            </label>

                                                            <input
                                                                type="radio"
                                                                className="btn-check"
                                                                name={`source-${asset}`}
                                                                id={`yahoo-${asset}`}
                                                                checked={configs[asset]?.source === 'YAHOO'}
                                                                onChange={() => handleSourceChange(asset, 'YAHOO')}
                                                            />
                                                            <label className="btn btn-outline-success" htmlFor={`yahoo-${asset}`}>
                                                                Yahoo
                                                            </label>
                                                        </div>
                                                    </td>
                                                    <td>
                                                        <input
                                                            type="text"
                                                            className="form-control form-control-sm"
                                                            placeholder={configs[asset]?.source === 'TEFAS' ? 'Örn: AAK' : configs[asset]?.source === 'YAHOO' ? 'Örn: GC=F' : '-'}
                                                            value={configs[asset]?.ticker || ''}
                                                            onChange={(e) => handleTickerChange(asset, e.target.value)}
                                                            disabled={configs[asset]?.source === 'MANUAL'}
                                                        />
                                                    </td>
                                                    <td className="text-end">
                                                        <button
                                                            className="btn btn-sm btn-outline-primary d-flex align-items-center gap-1 ms-auto"
                                                            onClick={() => handleTest(asset)}
                                                            disabled={configs[asset]?.source === 'MANUAL'}
                                                        >
                                                            <TestTube size={14} />
                                                            Test
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}

                            {assets.length > 0 && (
                                <div className="mt-4 p-3 bg-light rounded border">
                                    <h6 className="fw-bold mb-2">Bilgi:</h6>
                                    <ul className="small text-muted mb-0">
                                        <li><strong>Manuel:</strong> Fiyatları Dashboard'dan elle girersiniz</li>
                                        <li><strong>TEFAS:</strong> Türkiye fon fiyatları (Örn: AAK, AFK)</li>
                                        <li><strong>Yahoo Finance:</strong> Hisse senetleri ve emtialar (Örn: AAPL, GC=F)</li>
                                    </ul>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
