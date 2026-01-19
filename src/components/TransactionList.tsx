"use client";

import { useState, useMemo } from 'react';
import { usePortfolio } from '@/lib/store';
import { Trash2, Edit2, ArrowUpDown, ChevronUp, ChevronDown, Search, Filter } from 'lucide-react';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { useRouter } from 'next/navigation';
import { Transaction } from '@/lib/types';

type SortField = 'date' | 'asset' | 'type' | 'amount' | 'priceUSD';
type SortDirection = 'asc' | 'desc';

export default function TransactionList() {
    const { transactions, removeTransaction } = usePortfolio();
    const router = useRouter();

    // States for sorting and filtering
    const [sortField, setSortField] = useState<SortField>('date');
    const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
    const [filterAsset, setFilterAsset] = useState('');
    const [filterType, setFilterType] = useState<'ALL' | 'BUY' | 'SELL'>('ALL');

    // Get unique assets for filter dropdown
    const uniqueAssets = useMemo(() => {
        const assets = new Set(transactions.map(t => t.asset.toUpperCase()));
        return Array.from(assets).sort();
    }, [transactions]);

    const filteredAndSortedTransactions = useMemo(() => {
        let result = [...transactions];

        // 1. Filter
        if (filterAsset) {
            result = result.filter(t => t.asset.toUpperCase().includes(filterAsset.toUpperCase()));
        }
        if (filterType !== 'ALL') {
            result = result.filter(t => t.type === filterType);
        }

        // 2. Sort
        result.sort((a, b) => {
            let valA: any = a[sortField as keyof Transaction];
            let valB: any = b[sortField as keyof Transaction];

            if (sortField === 'date') {
                valA = new Date(a.date).getTime();
                valB = new Date(b.date).getTime();
            }

            if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
            if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
            return 0;
        });

        return result;
    }, [transactions, sortField, sortDirection, filterAsset, filterType]);

    const handleSort = (field: SortField) => {
        if (sortField === field) {
            setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortDirection('desc');
        }
    };

    const SortIcon = ({ field }: { field: SortField }) => {
        if (sortField !== field) return <ArrowUpDown size={14} className="ms-1 opacity-25" />;
        return sortDirection === 'asc' ? <ChevronUp size={14} className="ms-1 text-primary" /> : <ChevronDown size={14} className="ms-1 text-primary" />;
    };

    return (
        <div className="card shadow-sm border-0">
            <div className="card-header bg-white border-bottom border-light p-3">
                <div className="d-flex flex-wrap justify-content-between align-items-center gap-3">
                    <h5 className="mb-0 fw-bold text-dark">İşlem Geçmişi</h5>

                    <div className="d-flex gap-2">
                        {/* Asset Search */}
                        <div className="input-group input-group-sm" style={{ maxWidth: '180px' }}>
                            <span className="input-group-text bg-white border-end-0">
                                <Search size={14} className="text-muted" />
                            </span>
                            <input
                                type="text"
                                className="form-control border-start-0"
                                placeholder="Varlık ara..."
                                value={filterAsset}
                                onChange={(e) => setFilterAsset(e.target.value)}
                            />
                        </div>

                        {/* Type Filter */}
                        <div className="input-group input-group-sm" style={{ maxWidth: '130px' }}>
                            <span className="input-group-text bg-white border-end-0">
                                <Filter size={14} className="text-muted" />
                            </span>
                            <select
                                className="form-select border-start-0"
                                value={filterType}
                                onChange={(e) => setFilterType(e.target.value as any)}
                            >
                                <option value="ALL">Hepsi</option>
                                <option value="BUY">Alım</option>
                                <option value="SELL">Satım</option>
                            </select>
                        </div>

                        <span className="badge bg-light text-dark border d-flex align-items-center px-3">
                            {filteredAndSortedTransactions.length} İŞLEM
                        </span>
                    </div>
                </div>
            </div>

            <div className="table-responsive">
                <table className="table table-hover align-middle mb-0">
                    <thead className="table-light text-uppercase small text-muted">
                        <tr>
                            <th className="ps-4 cursor-pointer" onClick={() => handleSort('date')} style={{ cursor: 'pointer' }}>
                                Tarih <SortIcon field="date" />
                            </th>
                            <th className="cursor-pointer" onClick={() => handleSort('asset')} style={{ cursor: 'pointer' }}>
                                Varlık <SortIcon field="asset" />
                            </th>
                            <th className="cursor-pointer" onClick={() => handleSort('type')} style={{ cursor: 'pointer' }}>
                                İşlem <SortIcon field="type" />
                            </th>
                            <th className="cursor-pointer" onClick={() => handleSort('amount')} style={{ cursor: 'pointer' }}>
                                Miktar <SortIcon field="amount" />
                            </th>
                            <th>Fiyat (TL)</th>
                            <th>Kur</th>
                            <th className="cursor-pointer" onClick={() => handleSort('priceUSD')} style={{ cursor: 'pointer' }}>
                                Dolar Mal. <SortIcon field="priceUSD" />
                            </th>
                            <th className="text-end pe-4">Aksiyon</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredAndSortedTransactions.map(t => (
                            <tr key={t.id}>
                                <td className="ps-4 text-muted fw-medium">
                                    {format(new Date(t.date), 'd MMM yyyy', { locale: tr })}
                                </td>
                                <td>
                                    <span className="badge bg-primary text-white">{t.asset || 'GOLD'}</span>
                                </td>
                                <td>
                                    {t.type === 'BUY' ? (
                                        <span className="badge bg-success bg-opacity-10 text-success border border-success border-opacity-25 px-2">ALIM</span>
                                    ) : (
                                        <span className="badge bg-danger bg-opacity-10 text-danger border border-danger border-opacity-25 px-2">SATIM</span>
                                    )}
                                </td>
                                <td className="font-monospace fw-bold">{(t.amount || 0).toLocaleString()}</td>
                                <td className="font-monospace text-muted">₺{(t.priceTRY || 0).toLocaleString()}</td>
                                <td className="font-monospace text-muted small">${(t.usdRate || 0).toFixed(2)}</td>
                                <td className="font-monospace fw-bold">${(t.priceUSD || 0).toFixed(2)}</td>
                                <td className="text-end pe-4">
                                    <div className="d-flex justify-content-end gap-2">
                                        <button
                                            onClick={() => router.push(`/add?edit=${t.id}`)}
                                            className="btn btn-link link-primary p-0"
                                            title="Düzenle"
                                        >
                                            <Edit2 size={18} />
                                        </button>
                                        <button
                                            onClick={() => {
                                                if (window.confirm("Bu işlemi silmek istediğinize emin misiniz?")) {
                                                    removeTransaction(t.id);
                                                }
                                            }}
                                            className="btn btn-link link-danger p-0"
                                            title="Sil"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {filteredAndSortedTransactions.length === 0 && (
                            <tr>
                                <td colSpan={8} className="text-center py-5 text-muted">
                                    {transactions.length === 0 ? "Kayıtlı işlem bulunamadı." : "Filtreye uygun işlem bulunamadı."}
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
