"use client";

import { usePortfolio } from '@/lib/store';
import { calculateAssetStats } from '@/lib/finance';
import { useMemo } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import ComparativeChart from '@/components/ComparativeChart';

export default function AnalizPage() {
    const { transactions, assetSettings, userPreferences } = usePortfolio();

    // Global Rates (from Preferences)
    const usdTryRate = parseFloat(userPreferences.usdTryRate || '33.50');
    const eurUsdRate = parseFloat(userPreferences.eurUsdRate || '1.08');
    const gbpUsdRate = parseFloat(userPreferences.gbpUsdRate || '1.27');

    // Derived prices from assetSettings
    const prices = useMemo(() => {
        const p: Record<string, { price: number; currency?: 'USD' | 'TRY' }> = {
            'GOLD': { price: 75.5, currency: 'USD' },
            'USD': { price: 1.0, currency: 'USD' },
            'EUR': { price: 1.10, currency: 'USD' },
            'BTC': { price: 65000, currency: 'USD' },
            'XPT': { price: 31.0, currency: 'USD' },
        };

        Object.entries(assetSettings).forEach(([asset, settings]) => {
            if (settings.manualPrice) {
                p[asset] = {
                    price: settings.manualPrice,
                    currency: (settings.priceCurrency as 'USD' | 'TRY') || 'USD'
                };
            }
        });
        return p;
    }, [assetSettings]);

    const distributionData = useMemo(() => {
        const assets = Array.from(new Set(transactions.map(t => (t.asset || 'GOLD').trim().toUpperCase())));

        let usdTotalVal = 0;
        let tryTotalVal = 0;

        assets.forEach(asset => {
            const normalizedAsset = asset.trim().toUpperCase();
            const assetTransactions = transactions.filter(t => (t.asset || 'GOLD').trim().toUpperCase() === normalizedAsset);
            const priceInfo = prices[normalizedAsset] || { price: 0, currency: 'USD' };

            const currentPrice = normalizedAsset === 'TRY'
                ? (usdTryRate > 0 ? 1 / usdTryRate : 0)
                : normalizedAsset === 'USD'
                    ? 1.0
                    : normalizedAsset === 'EUR'
                        ? eurUsdRate
                        : normalizedAsset === 'GBP'
                            ? gbpUsdRate
                            : (priceInfo.currency === 'TRY'
                                ? (usdTryRate > 0 ? priceInfo.price / usdTryRate : 0)
                                : priceInfo.price);

            const stats = calculateAssetStats(assetTransactions, currentPrice, usdTryRate);
            const driver = assetSettings[normalizedAsset]?.driver || 'TRY';

            if (driver === 'USD') {
                usdTotalVal += stats.totalValueTRY;
            } else {
                tryTotalVal += stats.totalValueTRY;
            }
        });

        const total = usdTotalVal + tryTotalVal;
        if (total === 0) return [];

        return [
            { name: 'Döviz Türevi', value: usdTotalVal, percent: ((usdTotalVal / total) * 100).toFixed(1) },
            { name: 'TL Türevi', value: tryTotalVal, percent: ((tryTotalVal / total) * 100).toFixed(1) }
        ];
    }, [transactions, prices, usdTryRate, eurUsdRate, gbpUsdRate, assetSettings]);

    const COLORS = ['#0d6efd', '#198754'];

    return (
        <div className="py-4">
            <div className="row justify-content-center">
                <div className="col-md-10">
                    <div className="card shadow-sm border-0 rounded-4 overflow-hidden mb-5">
                        <div className="card-header bg-dark text-white p-4 border-0">
                            <h4 className="mb-0 fw-bold">Varlık Dağılımı</h4>
                            <p className="text-white-50 small mb-0 mt-1">Döviz ve TL Türevi Varlıkların Oranı</p>
                        </div>
                        <div className="card-body p-4 p-md-5">
                            <div style={{ height: '400px', width: '100%' }}>
                                {distributionData.length > 0 ? (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={distributionData}
                                                cx="50%"
                                                cy="50%"
                                                labelLine={false}
                                                label={({ name, percent }) => `${name}: %${percent}`}
                                                outerRadius={140}
                                                fill="#8884d8"
                                                dataKey="value"
                                                stroke="none"
                                            >
                                                {distributionData.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                ))}
                                            </Pie>
                                            <Tooltip
                                                formatter={(value: any) => [`₺${(value || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`, 'Toplam Değer']}
                                                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                            />
                                            <Legend verticalAlign="bottom" height={36} />
                                        </PieChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div className="h-100 d-flex align-items-center justify-content-center text-muted">
                                        Henüz veri bulunmuyor.
                                    </div>
                                )}
                            </div>

                            <div className="row mt-5 g-4">
                                {distributionData.map((item, index) => (
                                    <div key={item.name} className="col-6 col-md-4 mx-auto text-center">
                                        <div className="p-3 rounded-4 bg-white shadow-sm border">
                                            <div className="small text-muted mb-1">{item.name}</div>
                                            <div className="h3 fw-bold mb-0" style={{ color: COLORS[index] }}>%{item.percent}</div>
                                            <div className="small text-muted mt-1">₺{item.value.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="card shadow-sm border-0 rounded-4 overflow-hidden mb-5">
                            <div className="card-header bg-dark text-white p-4 border-0">
                                <h4 className="mb-0 fw-bold">Yıllık Getiri Karşılaştırması (%)</h4>
                                <p className="text-white-50 small mb-0 mt-1">Portföyünüzün ve Piyasa Endekslerinin Son 1 Yıllık Yüzdesel Büyümesi</p>
                            </div>
                            <div className="card-body p-4 p-md-5">
                                <ComparativeChart
                                    transactions={transactions}
                                    currentPrices={prices}
                                    usdTryRate={usdTryRate}
                                    eurUsdRate={eurUsdRate}
                                    gbpUsdRate={gbpUsdRate}
                                />
                                <div className="mt-4 p-3 bg-light rounded-3 border">
                                    <small className="text-muted d-block">
                                        <strong>Not:</strong> Bu grafik, tam 1 sene önce yapılan 100$\'lık bir yatırımın (veya portföyünüzün o zamanki değerine oranla büyümesinin) bugün ulaştığı tutarı gösterir.
                                        Endeks verileri (SP500, BIST100 USD, Altın USD) son 12 aylık piyasa performansını yansıtır.
                                    </small>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
