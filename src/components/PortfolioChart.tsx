"use client";

import React, { useEffect, useState } from 'react';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Cell,
    LabelList
} from 'recharts';
import { Transaction } from '@/lib/types';
import { getMonthlyHistory } from '@/actions';
import { calculateAssetStats } from '@/lib/finance';

interface PriceData {
    price: number;
    currency?: 'USD' | 'TRY';
}

interface PortfolioChartProps {
    transactions: Transaction[];
    currentPrices: Record<string, PriceData>;
    currentUsdRate: number;
    eurUsdRate?: number;
    gbpUsdRate?: number;
}

export default function PortfolioChart({
    transactions,
    currentPrices,
    currentUsdRate,
    eurUsdRate = 1.08,
    gbpUsdRate = 1.27
}: PortfolioChartProps) {
    const [currency, setCurrency] = useState<'USD' | 'TRY'>('USD');
    const [history, setHistory] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [hasCheckedSnapshot, setHasCheckedSnapshot] = useState(false);
    const [timeRange, setTimeRange] = useState<'6m' | '1y' | '2y' | 'all'>('all');

    const calculateCurrentValue = () => {
        // Group transactions by asset
        const assetGroups: Record<string, Transaction[]> = {};

        transactions.forEach(t => {
            const asset = (t.asset || 'GC=F').trim().toUpperCase();
            if (!assetGroups[asset]) {
                assetGroups[asset] = [];
            }
            assetGroups[asset].push(t);
        });

        const effectiveUsdRate = Number(currentUsdRate > 0 ? currentUsdRate : 30.0);
        let totalUSD = 0;

        // Calculate stats for each asset using the same logic as DashboardStats
        Object.keys(assetGroups).forEach(asset => {
            const assetTransactions = assetGroups[asset];

            // Determine current price in USD for this asset
            let currentPriceUSD = 0;

            if (asset === 'TRY') {
                currentPriceUSD = effectiveUsdRate > 0 ? 1 / effectiveUsdRate : 0;
            } else if (asset === 'USD') {
                currentPriceUSD = 1;
            } else if (asset === 'EUR') {
                currentPriceUSD = Number(eurUsdRate);
            } else if (asset === 'GBP') {
                currentPriceUSD = Number(gbpUsdRate);
            } else {
                const priceData = currentPrices[asset];
                if (priceData && Number(priceData.price) > 0) {
                    if (priceData.currency === 'TRY') {
                        currentPriceUSD = effectiveUsdRate > 0 ? Number(priceData.price) / effectiveUsdRate : 0;
                    } else {
                        currentPriceUSD = Number(priceData.price);
                    }
                }
            }

            // Use calculateAssetStats to get the proper value including realized profits
            const stats = calculateAssetStats(assetTransactions, currentPriceUSD, effectiveUsdRate);

            // Add the total value (current holdings value + realized profit already included in stats)
            totalUSD += stats.totalValueUSD;
        });

        return {
            usd: totalUSD,
            try: totalUSD * effectiveUsdRate
        };
    };

    useEffect(() => {
        console.log('[PortfolioChart] Fetching monthly history...');
        setLoading(true);
        getMonthlyHistory()
            .then(data => {
                console.log('[PortfolioChart] Monthly history loaded:', data.length, 'records');
                setHistory(data);
                setLoading(false);
            })
            .catch(err => {
                console.error('[PortfolioChart] Error loading history:', err);
                setHistory([]);
                setLoading(false);
            });
    }, []);

    useEffect(() => {
        if (!hasCheckedSnapshot && history.length > 0 && !loading) {
            setHasCheckedSnapshot(true);

            const now = new Date();
            const lastHistory = history[history.length - 1];

            if (!lastHistory) return;

            const previousMonthDate = new Date(now.getFullYear(), now.getMonth(), 0);
            const lastHistoryDate = new Date(lastHistory.date);

            const lastHistoryYM = `${lastHistoryDate.getFullYear()}-${String(lastHistoryDate.getMonth() + 1).padStart(2, '0')}`;
            const previousMonthYM = `${previousMonthDate.getFullYear()}-${String(previousMonthDate.getMonth() + 1).padStart(2, '0')}`;

            if (previousMonthYM > lastHistoryYM) {
                console.log(`[AutoSnapshot] Missing history for ${previousMonthYM}. Creating snapshot...`);

                const currentValue = calculateCurrentValue();

                import('@/actions').then(({ saveMonthlyHistory }) => {
                    saveMonthlyHistory(
                        previousMonthDate.toISOString().split('T')[0],
                        currentValue.try,
                        currentValue.usd
                    ).then(() => {
                        console.log('[AutoSnapshot] Snapshot saved successfully');
                        getMonthlyHistory().then(data => {
                            setHistory(data);
                        });
                    });
                });
            } else {
                console.log('[AutoSnapshot] No missing months detected');
            }
        }
    }, [history, loading, hasCheckedSnapshot, transactions, currentPrices, currentUsdRate, eurUsdRate, gbpUsdRate]);

    const isUsd = currency === 'USD';

    if (loading) {
        return (
            <div className="card shadow-sm border-0 mt-4">
                <div className="card-body p-4 text-center">
                    <p className="mb-0">Veriler yükleniyor...</p>
                </div>
            </div>
        );
    }

    if (history.length === 0) {
        return (
            <div className="card shadow-sm border-0 mt-4">
                <div className="card-body p-4">
                    <h5 className="card-title">⚠️ Grafik Verisi Yok</h5>
                    <p className="text-danger mb-0">Aylık geçmiş verisi bulunamadı. Lütfen giriş yaptığınızdan emin olun.</p>
                </div>
            </div>
        );
    }

    const formatCurrency = (val: number) => {
        return isUsd
            ? `$${val.toLocaleString(undefined, { maximumFractionDigits: 0 })}`
            : `₺${val.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
    };

    const filteredHistory = () => {
        if (timeRange === 'all') return history;

        const now = new Date();
        let cutoffDate = new Date();

        switch (timeRange) {
            case '6m':
                cutoffDate.setMonth(now.getMonth() - 6);
                break;
            case '1y':
                cutoffDate.setFullYear(now.getFullYear() - 1);
                break;
            case '2y':
                cutoffDate.setFullYear(now.getFullYear() - 2);
                break;
        }

        return history.filter(h => new Date(h.date) >= cutoffDate);
    };

    // Add current month's live value to the chart
    // Use database snapshot if it exists for month-end, otherwise use live calculation
    const displayHistory = (() => {
        const filtered = filteredHistory();

        // DEDUPLICATION STEP: Ensure only one record per month
        const uniqueMap = new Map();
        filtered.forEach(h => {
            const d = new Date(h.date);
            const key = `${d.getFullYear()}-${d.getMonth()}`; // Year-Month key
            // If duplicate, keep the one that is later in the month (likely the month-end snapshot)
            if (!uniqueMap.has(key) || new Date(uniqueMap.get(key).date).getTime() < d.getTime()) {
                uniqueMap.set(key, h);
            }
        });
        const prevHistory = Array.from(uniqueMap.values()).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        const currentValue = calculateCurrentValue();
        const now = new Date();

        console.log('[PortfolioChart] Current date:', now.toISOString());
        console.log('[PortfolioChart] Current year:', now.getFullYear(), 'Current month:', now.getMonth());

        // Check if there's an end-of-month snapshot for the current month
        const currentMonthEndSnapshot = prevHistory.find(h => {
            const hDate = new Date(h.date);
            const isCurrentMonth = hDate.getFullYear() === now.getFullYear() &&
                hDate.getMonth() === now.getMonth();
            const isMonthEnd = hDate.getDate() >= 28; // Consider day 28-31 as month-end

            return isCurrentMonth && isMonthEnd;
        });

        if (currentMonthEndSnapshot) {
            // Use the existing month-end snapshot
            console.log('[PortfolioChart] Using existing month-end snapshot:', currentMonthEndSnapshot.date);
            return prevHistory;
        } else {
            // No month-end snapshot exists, remove any mid-month records and add live calculation
            const withoutCurrentMonth = prevHistory.filter(h => {
                const hDate = new Date(h.date);
                const isCurrentMonth = hDate.getFullYear() === now.getFullYear() &&
                    hDate.getMonth() === now.getMonth();

                if (isCurrentMonth) {
                    console.log('[PortfolioChart] Removing mid-month record:', h.date);
                }

                return !isCurrentMonth;
            });

            // Use last day of current month for proper date formatting
            const currentMonthDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
            const result = [...withoutCurrentMonth, {
                date: currentMonthDate.toISOString().split('T')[0],
                totalValueUSD: currentValue.usd,
                totalValueTRY: currentValue.try,
                userId: prevHistory[0]?.userId || '',
                id: 'current-month-live'
            }];

            console.log('[PortfolioChart] Using live calculation for current month');
            console.log('[PortfolioChart] Final display history:', result.map(r => r.date));

            return result;
        }
    })();

    const renderCustomLabel = (props: any) => {
        const { x, y, width, value, index } = props;

        const numVal = Number(value);
        const valueStr = isUsd
            ? `$${(numVal / 1000).toFixed(0)}k`
            : `₺${(numVal / 1000).toFixed(0)}k`;

        let growthStr = '';
        let growthColor = isUsd ? '#60a5fa' : '#34d399';

        if (index > 0) {
            const prevVal = isUsd
                ? displayHistory[index - 1].totalValueUSD
                : displayHistory[index - 1].totalValueTRY;
            const growth = ((numVal - prevVal) / prevVal) * 100;
            growthStr = growth >= 0
                ? `+${growth.toFixed(1)}%`
                : `${growth.toFixed(1)}%`;
            growthColor = growth >= 0 ? '#198754' : '#e63946';
        }

        return (
            <g>
                <text
                    x={x + width / 2}
                    y={y - 20}
                    fill="#198754"
                    textAnchor="middle"
                    fontSize="10"
                    fontWeight="bold"
                >
                    {valueStr}
                </text>
                {growthStr && (
                    <text
                        x={x + width / 2}
                        y={y - 8}
                        fill={growthColor}
                        textAnchor="middle"
                        fontSize="9"
                        fontWeight="600"
                    >
                        {growthStr}
                    </text>
                )}
            </g>
        );
    };

    return (
        <div className="card shadow-sm border-0 mt-4">
            <div className="card-header bg-dark text-white border-0 py-2">
                <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center gap-2">
                    <div>
                        <h6 className="mb-0 fw-bold">📊 Aylık Portföy Geçmişi</h6>
                        <p className="text-white-50 small mb-0" style={{ fontSize: '0.75rem' }}>
                            Toplam {history.length} kayıt · Gösterilen: {displayHistory.length}
                        </p>
                    </div>

                    <div className="d-flex flex-column flex-sm-row gap-2">
                        <div className="btn-group btn-group-sm" role="group">
                            <button
                                type="button"
                                onClick={() => setTimeRange('6m')}
                                className={`btn btn-sm ${timeRange === '6m' ? 'btn-light' : 'btn-outline-light'}`}
                            >
                                6 Ay
                            </button>
                            <button
                                type="button"
                                onClick={() => setTimeRange('1y')}
                                className={`btn btn-sm ${timeRange === '1y' ? 'btn-light' : 'btn-outline-light'}`}
                            >
                                1 Yıl
                            </button>
                            <button
                                type="button"
                                onClick={() => setTimeRange('2y')}
                                className={`btn btn-sm ${timeRange === '2y' ? 'btn-light' : 'btn-outline-light'}`}
                            >
                                2 Yıl
                            </button>
                            <button
                                type="button"
                                onClick={() => setTimeRange('all')}
                                className={`btn btn-sm ${timeRange === 'all' ? 'btn-light' : 'btn-outline-light'}`}
                            >
                                Tümü
                            </button>
                        </div>

                        <div className="btn-group btn-group-sm" role="group">
                            <button
                                type="button"
                                onClick={() => setCurrency('USD')}
                                className={`btn btn-sm ${isUsd ? 'btn-success' : 'btn-outline-light'}`}
                            >
                                USD
                            </button>
                            <button
                                type="button"
                                onClick={() => setCurrency('TRY')}
                                className={`btn btn-sm ${!isUsd ? 'btn-success' : 'btn-outline-light'}`}
                            >
                                TRY
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="card-body p-4">
                <div style={{ width: '100%', height: '450px' }}>
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                            data={displayHistory}
                            margin={{ top: 50, right: 30, left: 10, bottom: 60 }}
                        >
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#dee2e6" opacity={0.6} />
                            <XAxis
                                dataKey="date"
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: '#6c757d', fontSize: 12 }}
                                angle={-45}
                                textAnchor="end"
                                height={80}
                                tickFormatter={(val) => {
                                    try {
                                        // Parse YYYY-MM-DD format correctly without timezone issues
                                        const [year, month, day] = val.split('-').map(Number);
                                        const d = new Date(year, month - 1, day); // month is 0-indexed
                                        return d.toLocaleDateString('tr-TR', { month: 'short', year: '2-digit' });
                                    } catch (e) {
                                        return val;
                                    }
                                }}
                            />
                            <YAxis hide />
                            <Tooltip
                                cursor={{ fill: 'rgba(0, 0, 0, 0.05)' }}
                                content={({ active, payload }) => {
                                    if (active && payload && payload.length) {
                                        const data = payload[0].payload;
                                        const val = isUsd ? data.totalValueUSD : data.totalValueTRY;
                                        let dateStr = data.date;
                                        try {
                                            // Parse YYYY-MM-DD format correctly without timezone issues
                                            const [year, month, day] = data.date.split('-').map(Number);
                                            const d = new Date(year, month - 1, day);
                                            dateStr = d.toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' });
                                        } catch (e) { }

                                        return (
                                            <div className="card shadow border-0">
                                                <div className="card-body p-3">
                                                    <p className="text-muted small mb-1">
                                                        📅 {dateStr}
                                                    </p>
                                                    <p className="h4 mb-0 fw-bold text-success">
                                                        {formatCurrency(val)}
                                                    </p>
                                                </div>
                                            </div>
                                        );
                                    }
                                    return null;
                                }}
                            />
                            <Bar
                                dataKey={isUsd ? 'totalValueUSD' : 'totalValueTRY'}
                                radius={[8, 8, 0, 0]}
                            >
                                <LabelList content={renderCustomLabel} />
                                {displayHistory.map((entry, index) => {
                                    let fillColor = '#198754';

                                    if (index > 0) {
                                        const currentVal = isUsd ? entry.totalValueUSD : entry.totalValueTRY;
                                        const prevVal = isUsd
                                            ? displayHistory[index - 1].totalValueUSD
                                            : displayHistory[index - 1].totalValueTRY;
                                        const growth = ((currentVal - prevVal) / prevVal) * 100;

                                        if (growth < 0) {
                                            fillColor = '#e63946';
                                        }
                                    }

                                    return (
                                        <Cell
                                            key={`cell-${index}`}
                                            fill={fillColor}
                                        />
                                    );
                                })}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div >
    );
}
