"use client";

import { usePortfolio } from '@/lib/store';
import { useMemo } from 'react';
import { Settings } from 'lucide-react';

export default function KaynakSecimiPage() {
    const { transactions } = usePortfolio();

    // Get all unique assets from transactions
    const assets = useMemo(() => {
        const unique = new Set(transactions.map(t => (t.asset || 'GOLD').trim().toUpperCase()));
        return Array.from(unique).sort();
    }, [transactions]);

    return (
        <div className="container py-4">
            <div className="row justify-content-center">
                <div className="col-lg-10">
                    <div className="card shadow-sm border-0 rounded-4 overflow-hidden">
                        <div className="card-header bg-dark text-white p-4 border-0">
                            <div className="d-flex align-items-center gap-3">
                                <Settings size={32} />
                                <div>
                                    <h4 className="mb-0 fw-bold">Kaynak Seçimi</h4>
                                    <p className="text-white-50 small mb-0 mt-1">
                                        Varlıklarınızın fiyat kaynaklarını yapılandırın
                                    </p>
                                </div>
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
                                                <th className="fw-bold">Varlık</th>
                                                <th className="fw-bold">Kaynak</th>
                                                <th className="fw-bold">Ticker/Kod</th>
                                                <th className="fw-bold text-end">İşlemler</th>
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
                                                        <span className="badge bg-secondary">Manuel</span>
                                                    </td>
                                                    <td>
                                                        <span className="text-muted">-</span>
                                                    </td>
                                                    <td className="text-end">
                                                        <button className="btn btn-sm btn-outline-primary">
                                                            Yapılandır
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
