"use client";

import { usePortfolio } from '@/lib/store';
import { calculateAssetStats } from '@/lib/finance';
import { useMemo, useState, useEffect } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import ComparativeChart from '@/components/ComparativeChart';
import { getMonthlyHistory } from '@/actions';

export default function AnalizPage() {
    const { transactions, assetSettings, userPreferences } = usePortfolio();

    // Global Rates (from Preferences)
    const usdTryRate = parseFloat(userPreferences.usdTryRate || '33.50');
    const eurUsdRate = parseFloat(userPreferences.eurUsdRate || '1.08');
    const gbpUsdRate = parseFloat(userPreferences.gbpUsdRate || '1.27');

    // Fetch Historical Value (1 Year Ago) AND Earliest Record (For CAGR)
    const [historicalValueUSD, setHistoricalValueUSD] = useState<number>(0);
    const [fullHistory, setFullHistory] = useState<any[]>([]);
    const [earliestRecord, setEarliestRecord] = useState<any>(null);

    useEffect(() => {
        const fetchHistory = async () => {
            try {
                const history = await getMonthlyHistory();
                setFullHistory(history);

                if (history && history.length > 0) {
                    // 1. Sort history by date ASC to find Earliest
                    const sorted = [...history].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
                    setEarliestRecord(sorted[0]);

                    // 2. Find approx 1 year ago record for the Comparative Chart
                    const now = new Date();
                    const targetDate = new Date(now.getTime() - (365 * 24 * 60 * 60 * 1000));

                    let closestRecord = null;
                    let minDiff = Infinity;

                    history.forEach(h => {
                        const hDate = new Date(h.date);
                        const diff = Math.abs(hDate.getTime() - targetDate.getTime());
                        if (diff < minDiff) {
                            minDiff = diff;
                            closestRecord = h;
                        }
                    });

                    // Valid "1 Year Ago" check (approx > 10 months)
                    if (closestRecord) {
                        const recDate = new Date(closestRecord.date);
                        const daysOld = (now.getTime() - recDate.getTime()) / (1000 * 60 * 60 * 24);
                        if (daysOld > 300) {
                            setHistoricalValueUSD(closestRecord.totalValueUSD);
                        }
                    }
                }
            } catch (err) {
                console.error("Failed to fetch monthly history:", err);
            }
        };
        fetchHistory();
    }, []);

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

    // Data for Currency vs TRY Distribution Chart
    const distributionData = useMemo(() => {
        const assets = Array.from(new Set(transactions.map(t => (t.asset || 'GOLD').trim().toUpperCase())));

        let usdTotalVal = 0;
        let tryTotalVal = 0;

        assets.forEach(asset => {
            const normalizedAsset = asset.trim().toUpperCase();
            const assetTransactions = transactions.filter(t => (t.asset || 'GOLD').trim().toUpperCase() === normalizedAsset);
            const priceInfo = prices[normalizedAsset] || { price: 0, currency: 'USD' };

            // Determine price
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
                                    historicalValueUSD={historicalValueUSD}
                                />
                                <div className="mt-4 p-3 bg-light rounded-3 border">
                                    <small className="text-muted d-block">
                                        <strong>Not:</strong> Bu grafik, tam 1 sene önce yapılan 100$\'lık bir yatırımın (veya portföyünüzün o zamanki değerine oranla büyümesinin) bugün ulaştığı tutarı gösterir.
                                        Endeks verileri (SP500, BIST100 USD, Altın USD) son 12 aylık piyasa performansını yansıtır.
                                    </small>
                                </div>
                            </div>
                        </div>

                        {/* --- NEW: Asset Class Distribution --- */}
                        <div className="card shadow-sm border-0 rounded-4 overflow-hidden mb-5">
                            <div className="card-header bg-dark text-white p-4 border-0">
                                <h4 className="mb-0 fw-bold">Varlık Sınıfı Dağılımı</h4>
                                <p className="text-white-50 small mb-0 mt-1">Portföyünüzün Yatırım Araçlarına Göre Dağılımı</p>
                            </div>
                            <div className="card-body p-4 p-md-5">
                                <AssetClassChart
                                    transactions={transactions}
                                    prices={prices}
                                    usdTryRate={usdTryRate}
                                    eurUsdRate={eurUsdRate}
                                    gbpUsdRate={gbpUsdRate}
                                />
                            </div>
                        </div>

                        {/* --- NEW: Winners & Losers --- */}
                        <div className="row g-4 mb-5">
                            <div className="col-md-6">
                                <div className="card shadow-sm border-0 rounded-4 overflow-hidden h-100">
                                    <div className="card-header bg-success text-white p-4 border-0">
                                        <div className="d-flex align-items-center gap-2">
                                            <span className="h4 mb-0 fw-bold">🚀 En Çok Kazandıranlar</span>
                                        </div>
                                        <p className="text-white-50 small mb-0 mt-1">Portföyünüzün Yıldız Oyuncuları</p>
                                    </div>
                                    <div className="card-body p-0">
                                        <WinnersLosersList
                                            transactions={transactions}
                                            prices={prices}
                                            usdTryRate={usdTryRate}
                                            eurUsdRate={eurUsdRate}
                                            gbpUsdRate={gbpUsdRate}
                                            type="winners"
                                        />
                                    </div>
                                </div>
                            </div>
                            <div className="col-md-6">
                                <div className="card shadow-sm border-0 rounded-4 overflow-hidden h-100">
                                    <div className="card-header bg-danger text-white p-4 border-0">
                                        <div className="d-flex align-items-center gap-2">
                                            <span className="h4 mb-0 fw-bold">🔻 En Çok Kaybettirenler</span>
                                        </div>
                                        <p className="text-white-50 small mb-0 mt-1">İyileştirme Gerektiren Varlıklar</p>
                                    </div>
                                    <div className="card-body p-0">
                                        <WinnersLosersList
                                            transactions={transactions}
                                            prices={prices}
                                            usdTryRate={usdTryRate}
                                            eurUsdRate={eurUsdRate}
                                            gbpUsdRate={gbpUsdRate}
                                            type="losers"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* --- NEW: Monthly Heatmap --- */}
                        <div className="card shadow-sm border-0 rounded-4 overflow-hidden mb-5">
                            <div className="card-header bg-dark text-white p-4 border-0">
                                <h4 className="mb-0 fw-bold">Aylık Performans Haritası</h4>
                                <p className="text-white-50 small mb-0 mt-1">Aylara Göre Portföy Büyüme Oranları (%)</p>
                            </div>
                            <div className="card-body p-4 p-md-5">
                                <MonthlyHeatmap history={fullHistory} />
                            </div>
                        </div>

                        {/* --- NEW: Future Projection (USD CAGR) --- */}
                        <div className="card shadow-sm border-0 rounded-4 overflow-hidden mb-5">
                            <div className="card-header bg-success text-white p-4 border-0">
                                <div className="d-flex align-items-center gap-2">
                                    <span className="h4 mb-0 fw-bold">🚀 Gelecek Projeksiyonu</span>
                                </div>
                                <p className="text-white-50 small mb-0 mt-1">Mevcut Büyüme Hızınla (CAGR) Gelecekteki Servet Tahmini</p>
                            </div>
                            <div className="card-body p-4 p-md-5">
                                <FutureProjection
                                    transactions={transactions}
                                    prices={prices}
                                    usdTryRate={usdTryRate}
                                    earliestRecord={earliestRecord}
                                />
                            </div>
                        </div>

                    </div>
                </div>
            </div>
        </div>
    );
}

// Sub-component for Asset Class Chart
function AssetClassChart({ transactions, prices, usdTryRate, eurUsdRate, gbpUsdRate }: any) {

    // Categorization Logic
    const data = useMemo(() => {
        const assets = Array.from(new Set(transactions.map((t: any) => (t.asset || 'GOLD').trim().toUpperCase())));

        const classes: Record<string, number> = {
            'EMTIA': 0,
            'HISSE': 0,
            'FON': 0,
            'DOVIZ': 0,
            'DIGER': 0
        };

        // Track assets per class for display
        const classAssets: Record<string, string[]> = {
            'EMTIA': [],
            'HISSE': [],
            'FON': [],
            'DOVIZ': [],
            'DIGER': []
        };

        const metals = ['GOLD', 'GC=F', 'SI=F', 'PL=F', 'XPT', 'XAG', 'XAU', 'GLD'];
        const currencies = ['USD', 'EUR', 'GBP', 'TRY', 'CHF', 'JPY'];

        assets.forEach(asset => {
            const normalizedAsset: string = (asset as string).trim().toUpperCase();
            const assetTransactions = transactions.filter((t: any) => (t.asset || 'GOLD').trim().toUpperCase() === normalizedAsset);
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
            const valueTRY = stats.totalValueTRY;

            if (valueTRY < 1) return; // Skip empty assets

            let category = 'DIGER';

            // Categorize
            if (metals.includes(normalizedAsset)) {
                category = 'EMTIA';
            } else if (normalizedAsset.endsWith('.IS')) {
                category = 'HISSE';
            } else if (currencies.includes(normalizedAsset)) {
                category = 'DOVIZ';
            } else if (
                (normalizedAsset.length === 3 && /^[A-Z0-9]+$/.test(normalizedAsset)) ||
                ['AK2', 'T1', 'T2'].includes(normalizedAsset)
            ) {
                category = 'FON';
            }

            classes[category] += valueTRY;
            classAssets[category].push(normalizedAsset.replace('.IS', ''));
        });

        const total = Object.values(classes).reduce((a, b) => a + b, 0);
        if (total === 0) return [];

        const chartData = [
            { name: 'Yatırım Fonları', value: classes['FON'], code: 'FON', color: '#ffc107' },
            { name: 'BIST Hisseleri', value: classes['HISSE'], code: 'HISSE', color: '#0dcaf0' },
            { name: 'Değerli Madenler', value: classes['EMTIA'], code: 'EMTIA', color: '#ffcd39' },
            { name: 'Döviz / Nakit', value: classes['DOVIZ'], code: 'DOVIZ', color: '#198754' },
            { name: 'Diğer', value: classes['DIGER'], code: 'DIGER', color: '#6c757d' }
        ].filter(d => d.value > 0).sort((a, b) => b.value - a.value);

        return chartData.map(d => ({
            ...d,
            percent: ((d.value / total) * 100).toFixed(1),
            assetList: classAssets[d.code].slice(0, 5).join(', ') + (classAssets[d.code].length > 5 ? '...' : '')
        }));

    }, [transactions, prices, usdTryRate, eurUsdRate, gbpUsdRate]);

    if (data.length === 0) return <div className="text-center text-muted p-5">Veri bulunamadı.</div>;

    return (
        <div className="row align-items-center">
            <div className="col-lg-6 mb-4 mb-lg-0">
                <div style={{ height: '350px', width: '100%' }}>
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={data}
                                cx="50%"
                                cy="50%"
                                innerRadius={80}
                                outerRadius={120}
                                paddingAngle={5}
                                dataKey="value"
                            >
                                {data.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                                ))}
                            </Pie>
                            <Tooltip
                                formatter={(value: any) => [`₺${(value || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`, 'Değer']}
                                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                            />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </div>
            <div className="col-lg-6">
                <div className="d-flex flex-column gap-3">
                    {data.map((item) => (
                        <div key={item.name} className="d-flex align-items-center justify-content-between p-3 bg-light rounded-3 border-start border-4" style={{ borderColor: item.color }}>
                            <div className="d-flex align-items-center gap-3">
                                <div className="rounded-circle" style={{ width: 12, height: 12, backgroundColor: item.color }}></div>
                                <div>
                                    <div className="fw-semibold text-dark">{item.name}</div>
                                    <div className="small text-muted" style={{ fontSize: '0.75rem' }}>{item.assetList}</div>
                                </div>
                            </div>
                            <div className="text-end">
                                <div className="fw-bold text-dark">%{item.percent}</div>
                                <div className="small text-muted">₺{item.value.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

// Sub-component for Winners/Losers List
function WinnersLosersList({ transactions, prices, usdTryRate, eurUsdRate, gbpUsdRate, type }: any) {
    const data = useMemo(() => {
        const assets = Array.from(new Set(transactions.map((t: any) => (t.asset || 'GOLD').trim().toUpperCase())));

        const statsList = assets.map(asset => {
            const normalizedAsset = (asset as string).trim().toUpperCase();
            const assetTransactions = transactions.filter((t: any) => (t.asset || 'GOLD').trim().toUpperCase() === normalizedAsset);
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

            if (stats.totalAmount < 0.0001 && stats.realizedProfitUSD === 0) return null;

            return {
                name: normalizedAsset.replace('.IS', ''),
                profitRatio: stats.profitRatio * 100,
                profitVal: stats.profitTRY,
                isProfit: stats.profitRatio >= 0
            };
        }).filter(Boolean) as { name: string, profitRatio: number, profitVal: number, isProfit: boolean }[];

        if (type === 'winners') {
            return statsList.sort((a, b) => b.profitRatio - a.profitRatio).slice(0, 5);
        } else {
            return statsList.sort((a, b) => a.profitRatio - b.profitRatio).slice(0, 5);
        }

    }, [transactions, prices, usdTryRate, eurUsdRate, gbpUsdRate, type]);

    if (data.length === 0) return <div className="p-4 text-center text-muted">Veri yok.</div>;

    return (
        <div className="list-group list-group-flush">
            {data.map((item, index) => (
                <div key={item.name} className="list-group-item p-3 d-flex align-items-center justify-content-between">
                    <div className="d-flex align-items-center gap-3">
                        <span className={`fw-bold text-secondary`} style={{ width: '20px' }}>#{index + 1}</span>
                        <span className="fw-semibold">{item.name}</span>
                    </div>
                    <div className="text-end">
                        <div className={`fw-bold ${item.profitRatio >= 0 ? 'text-success' : 'text-danger'}`}>
                            %{item.profitRatio.toFixed(2)}
                        </div>
                        <div className="small text-muted">
                            {item.profitVal >= 0 ? '+' : ''}₺{item.profitVal.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}

// Sub-component for Monthly Heatmap
function MonthlyHeatmap({ history }: { history: any[] }) {

    // Process Data into Year -> Month matrix
    const matrix = useMemo(() => {
        if (!history || history.length === 0) return [];

        const sorted = [...history].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        const years: Record<number, Record<number, number>> = {};
        const yearlyTotals: Record<number, number> = {};

        // Group by Year
        sorted.forEach((record, index) => {
            const d = new Date(record.date);
            const year = d.getFullYear();
            const month = d.getMonth();

            if (!years[year]) years[year] = {};

            // Calculate Growth vs Previous Month
            let growth = 0;
            if (index > 0) {
                const prev = sorted[index - 1];
                if (prev.totalValueUSD > 0) {
                    growth = ((record.totalValueUSD - prev.totalValueUSD) / prev.totalValueUSD) * 100;
                }
            }

            years[year][month] = growth;
        });

        // Calculate YTD
        Object.keys(years).forEach(yStr => {
            const year = parseInt(yStr);
            const yearRecords = sorted.filter(r => new Date(r.date).getFullYear() === year);
            const prevYearLastRecord = sorted.filter(r => new Date(r.date).getFullYear() === year - 1).pop();

            if (yearRecords.length > 0) {
                const lastRec = yearRecords[yearRecords.length - 1];
                const startVal = prevYearLastRecord ? prevYearLastRecord.totalValueUSD : yearRecords[0].totalValueUSD;

                if (startVal > 0) {
                    yearlyTotals[year] = ((lastRec.totalValueUSD - startVal) / startVal) * 100;
                } else {
                    yearlyTotals[year] = 0;
                }
            }
        });

        return Object.keys(years).map(y => parseInt(y)).sort((a, b) => b - a).map(year => ({
            year,
            months: years[year],
            total: yearlyTotals[year] || 0
        }));
    }, [history]);

    const monthNames = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];

    const getColor = (val: number) => {
        if (!val) return '#f8f9fa';
        if (val > 0) {
            const intensity = Math.min(1, val / 10);
            return `rgba(25, 135, 84, ${0.1 + (intensity * 0.9)})`;
        } else {
            const intensity = Math.min(1, Math.abs(val) / 10);
            return `rgba(220, 53, 69, ${0.1 + (intensity * 0.9)})`;
        }
    };

    if (matrix.length === 0) return <div className="text-center text-muted p-5">Geçmiş veri bulunamadı.</div>;

    return (
        <div className="table-responsive">
            <table className="table table-borderless text-center align-middle mb-0">
                <thead>
                    <tr>
                        <th className="text-start text-secondary fw-bold" style={{ width: '80px' }}>Yıl</th>
                        {monthNames.map(m => (
                            <th key={m} className="text-secondary small fw-bold">{m}</th>
                        ))}
                        <th className="text-secondary fw-bold" style={{ width: '80px' }}>Yıllık</th>
                    </tr>
                </thead>
                <tbody>
                    {matrix.map(row => (
                        <tr key={row.year}>
                            <td className="text-start fw-bold">{row.year}</td>
                            {monthNames.map((_, i) => {
                                const val = row.months[i];
                                const hasVal = val !== undefined;
                                return (
                                    <td key={i} className="p-1">
                                        <div
                                            className="rounded-2 d-flex align-items-center justify-content-center small"
                                            style={{
                                                height: '40px',
                                                backgroundColor: hasVal ? getColor(val) : '#f8f9fa',
                                                color: hasVal ? (Math.abs(val) > 5 ? '#fff' : '#000') : '#dee2e6',
                                                fontSize: '0.85rem'
                                            }}
                                            title={hasVal ? `%${val.toFixed(2)}` : ''}
                                        >
                                            {hasVal ? (
                                                <span className="fw-semibold">
                                                    {val > 0 ? '+' : ''}{val.toFixed(0)}%
                                                </span>
                                            ) : '-'}
                                        </div>
                                    </td>
                                );
                            })}
                            <td className="fw-bold">
                                <span className={row.total >= 0 ? 'text-success' : 'text-danger'}>
                                    %{row.total.toFixed(0)}
                                </span>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

// Sub-component for Future Projection
function FutureProjection({ transactions, prices, usdTryRate, earliestRecord }: any) {
    // 1. Calculate Current Total Value in USD using RELIABLE calculateAssetStats
    const currentTotalValueUSD = useMemo(() => {
        let totalUSD = 0;
        const assets = Array.from(new Set(transactions.map((t: any) => (t.asset || 'GOLD').trim().toUpperCase())));

        assets.forEach(asset => {
            const normalizedAsset: string = (asset as string).trim().toUpperCase();
            const assetTransactions = transactions.filter((t: any) => (t.asset || 'GOLD').trim().toUpperCase() === normalizedAsset);
            const priceInfo = prices[normalizedAsset] || { price: 0, currency: 'USD' };

            // Determine Current Price
            const currentPrice = normalizedAsset === 'TRY'
                ? (usdTryRate > 0 ? 1 / usdTryRate : 0)
                : normalizedAsset === 'USD'
                    ? 1.0
                    : normalizedAsset === 'EUR'
                        ? 1.08 // Approximation if missing
                        : normalizedAsset === 'GBP'
                            ? 1.27
                            : (priceInfo.currency === 'TRY'
                                ? (usdTryRate > 0 ? priceInfo.price / usdTryRate : 0)
                                : priceInfo.price);

            // Use the shared library function which is PROVEN to work
            const stats = calculateAssetStats(assetTransactions, currentPrice, usdTryRate);

            // currentValueUSD is returned by the helper as totalValueUSD
            // Note: calculateAssetStats returns totalValueUSD based on current holdings
            totalUSD += stats.totalValueUSD;
        });

        return totalUSD;
    }, [transactions, prices, usdTryRate]);

    // 2. Calculate CAGR (Compound Annual Growth Rate) based on EARLIEST Record
    const { cagr, durationMonths, startDateStr } = useMemo(() => {
        if (!earliestRecord || !earliestRecord.totalValueUSD || earliestRecord.totalValueUSD === 0) {
            return { cagr: 0, durationMonths: 0, startDateStr: '-' };
        }

        const startVal = earliestRecord.totalValueUSD;
        const startDate = new Date(earliestRecord.date);
        const now = new Date();

        // Calculate 'n' in years
        const diffTime = Math.abs(now.getTime() - startDate.getTime());
        const diffDays = diffTime / (1000 * 60 * 60 * 24);
        const n = diffDays / 365.25;

        if (n < 0.1) return { cagr: 0, durationMonths: n * 12, startDateStr: startDate.toLocaleDateString() };

        const ratio = currentTotalValueUSD / startVal;

        // Handle negative growth or zero
        if (ratio <= 0) return { cagr: 0, durationMonths: n * 12, startDateStr: startDate.toLocaleDateString() };

        const cagrVal = Math.pow(ratio, 1 / n) - 1;

        return { cagr: cagrVal, durationMonths: n * 12, startDateStr: startDate.toLocaleDateString('tr-TR', { year: 'numeric', month: 'long', day: 'numeric' }) };

    }, [currentTotalValueUSD, earliestRecord]);

    // Projections
    const displayRate = cagr;
    const val1Year = currentTotalValueUSD * Math.pow(1 + displayRate, 1);
    const val3Year = currentTotalValueUSD * Math.pow(1 + displayRate, 3);
    const val5Year = currentTotalValueUSD * Math.pow(1 + displayRate, 5);

    if (!earliestRecord) {
        return (
            <div className="alert alert-warning text-center">
                Geçmiş veri bulunamadı.
            </div>
        );
    }

    if (durationMonths < 1) {
        return (
            <div className="alert alert-info text-center">
                Yıllık projeksiyon (CAGR) hesaplamak için en az 1 aylık geçmiş veri gereklidir.
            </div>
        );
    }

    return (
        <div>
            <div className="alert alert-light border mb-4">
                <div className="d-flex align-items-center gap-3">
                    <div className="bg-success bg-opacity-10 p-2 rounded-circle">
                        <i className="bi bi-graph-up-arrow text-success fs-4"></i>
                    </div>
                    <div>
                        <div className="text-muted small">Referans Başlangıç Tarihi: <span className="fw-semibold text-dark">{startDateStr}</span></div>
                        <div className="mb-0">
                            Portföyünüz Dolar bazında yıllık ortalama <strong>%{(displayRate * 100).toFixed(2)}</strong> hızla büyüyor (CAGR).
                            Bu tempo ile muhtemel gelecek senaryosu:
                        </div>
                    </div>
                </div>
            </div>

            <div className="row g-4 text-center">
                <div className="col-md-4">
                    <div className="p-4 rounded-4 bg-light border border-secondary border-opacity-10 h-100 position-relative overflow-hidden">
                        <div className="text-muted mb-2 small text-uppercase fw-bold">1 Yıl Sonra</div>
                        <div className="h3 fw-bold text-success mb-3">${val1Year.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
                        <div className="badge bg-success bg-opacity-10 text-success rounded-pill px-3 py-2 fw-normal">
                            {Math.pow(1 + displayRate, 1).toFixed(2)}x Kat
                        </div>
                    </div>
                </div>
                <div className="col-md-4">
                    <div className="p-4 rounded-4 bg-white border border-success shadow-lg h-100 position-relative overflow-hidden">
                        <div className="position-absolute top-0 start-0 w-100 bg-success text-white py-1 small fw-bold" style={{ fontSize: '0.7rem', letterSpacing: '1px' }}>ORTA VADE</div>
                        <div className="text-muted mb-2 mt-3 small text-uppercase fw-bold">3 Yıl Sonra</div>
                        <div className="display-6 fw-bold text-dark mb-3">${val3Year.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
                        <div className="badge bg-success text-white rounded-pill px-3 py-2 fw-normal">
                            {Math.pow(1 + displayRate, 3).toFixed(2)}x Kat
                        </div>
                    </div>
                </div>
                <div className="col-md-4">
                    <div className="p-4 rounded-4 bg-light border border-secondary border-opacity-10 h-100 position-relative overflow-hidden">
                        <div className="text-muted mb-2 small text-uppercase fw-bold">5 Yıl Sonra</div>
                        <div className="h3 fw-bold text-success mb-3">${val5Year.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
                        <div className="badge bg-success bg-opacity-10 text-success rounded-pill px-3 py-2 fw-normal">
                            {Math.pow(1 + displayRate, 5).toFixed(2)}x Kat
                        </div>
                    </div>
                </div>
            </div>
            <div className="mt-4 text-center border-top pt-3">
                <div className="d-flex justify-content-center gap-4 text-muted small">
                    <span><i className="bi bi-calendar-check me-1"></i> Başlangıç Verisi: <strong>${earliestRecord.totalValueUSD.toLocaleString()}</strong></span>
                    <span><i className="bi bi-clock-history me-1"></i> Geçen Süre: <strong>{(durationMonths / 12).toFixed(1)} Yıl</strong></span>
                </div>
            </div>
        </div>
    );
}
