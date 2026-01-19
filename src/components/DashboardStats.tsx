"use client";

import { usePortfolio } from '@/lib/store';
import { calculateAssetStats } from '@/lib/finance';
import { useMemo, useState, useEffect } from 'react';
import { ArrowUpRight, ArrowDownRight, TrendingUp, DollarSign, Filter, User as UserIcon } from 'lucide-react';
import PortfolioChart from './PortfolioChart';
import { useSession } from 'next-auth/react';
import { getUsers } from '@/userActions';

export default function DashboardStats() {
    const { transactions, assetDrivers, updateDriver } = usePortfolio();
    const { data: session } = useSession();

    // Admin Specific
    const [usersList, setUsersList] = useState<any[]>([]);
    const [selectedUserId, setSelectedUserId] = useState<string>('all');
    const isAdmin = (session?.user as any)?.role === 'admin';

    useEffect(() => {
        if (isAdmin) {
            getUsers().then(setUsersList);
        }
    }, [isAdmin]);

    // Global Rates
    const [usdTryRate, setUsdTryRate] = useState(33.50);
    const [eurUsdRate, setEurUsdRate] = useState(1.08);
    const [gbpUsdRate, setGbpUsdRate] = useState(1.27);
    const [rateDate, setRateDate] = useState<string>('');

    useEffect(() => {
        const fetchRates = async () => {
            try {
                const resTry = await fetch('https://api.frankfurter.app/latest?from=USD&to=TRY');
                const dataTry = await resTry.json();
                if (dataTry && dataTry.rates && dataTry.rates.TRY) {
                    setUsdTryRate(dataTry.rates.TRY);
                    if (!rateDate) setRateDate(dataTry.date);
                }

                const resEur = await fetch('https://api.frankfurter.app/latest?from=EUR&to=USD');
                const dataEur = await resEur.json();
                if (dataEur && dataEur.rates && dataEur.rates.USD) {
                    setEurUsdRate(dataEur.rates.USD);
                }

                const resGbp = await fetch('https://api.frankfurter.app/latest?from=GBP&to=USD');
                const dataGbp = await resGbp.json();
                if (dataGbp && dataGbp.rates && dataGbp.rates.USD) {
                    setGbpUsdRate(dataGbp.rates.USD);
                }
            } catch (error) {
                console.error('Failed to fetch rates:', error);
            }
        };
        fetchRates();
    }, [rateDate]);

    // Filter transactions based on selected user (for Admin)
    const filteredTransactions = useMemo(() => {
        if (!isAdmin || selectedUserId === 'all') return transactions;
        return transactions.filter(t => t.userId === selectedUserId);
    }, [transactions, isAdmin, selectedUserId]);

    // 1. Identify all unique assets
    const assets = useMemo(() => {
        const unique = new Set(filteredTransactions.map(t => (t.asset || 'GOLD').trim().toUpperCase()));
        return Array.from(unique);
    }, [filteredTransactions]);

    // 2. Manage prices
    interface PriceData {
        price: number;
        currency?: 'USD' | 'TRY';
        lastUpdated?: string;
    }

    const [prices, setPrices] = useState<Record<string, PriceData>>({
        'GOLD': { price: 75.5, currency: 'USD' },
        'USD': { price: 1.0, currency: 'USD' },
        'EUR': { price: 1.10, currency: 'USD' },
        'BTC': { price: 65000, currency: 'USD' },
        'XPT': { price: 31.0, currency: 'USD' },
    });

    useEffect(() => {
        const storedPrices = localStorage.getItem('portfolio_prices');
        if (storedPrices) {
            try {
                setPrices(prev => ({ ...prev, ...JSON.parse(storedPrices) }));
            } catch (e) { }
        }
    }, []);

    const handlePriceChange = (asset: string, val: string, currency: 'USD' | 'TRY') => {
        const newPrice = Number(parseFloat(val) || 0);
        const now = new Date();
        const timestamp = `${now.toLocaleDateString('tr-TR')} ${now.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}`;
        setPrices(prev => {
            const updated = { ...prev, [asset]: { price: newPrice, currency, lastUpdated: timestamp } };
            localStorage.setItem('portfolio_prices', JSON.stringify(updated));
            return updated;
        });
    };

    // 3. Calculate stats
    const assetStats = useMemo(() => {
        return assets.map(asset => {
            const normalizedAsset = asset.trim().toUpperCase();
            const assetTransactions = filteredTransactions.filter(t => (t.asset || 'GOLD').trim().toUpperCase() === normalizedAsset);
            const priceInfo = prices[normalizedAsset] || { price: 0, currency: 'USD' };

            const currentPrice = normalizedAsset === 'TRY' ? (usdTryRate > 0 ? 1 / usdTryRate : 0)
                : normalizedAsset === 'USD' ? 1.0
                    : normalizedAsset === 'EUR' ? eurUsdRate
                        : normalizedAsset === 'GBP' ? gbpUsdRate
                            : (priceInfo.currency === 'TRY' ? (usdTryRate > 0 ? priceInfo.price / usdTryRate : 0) : priceInfo.price);

            const stats = calculateAssetStats(assetTransactions, currentPrice, usdTryRate);
            if (normalizedAsset === 'TRY') {
                stats.profitTRY = 0;
                stats.profitRatioTRY = 0;
                stats.totalCostTRY = stats.totalValueTRY;
            }
            if (normalizedAsset === 'USD') {
                stats.profitUSD = 0;
                stats.profitRatio = 0;
                stats.xirr = 0;
                stats.totalCostUSD = stats.totalValueUSD;
                stats.averageCostUSD = 1.0;
            }

            return {
                asset: normalizedAsset,
                rawAsset: asset,
                ...stats,
                formattedProfitUSD: stats.profitUSD.toLocaleString(undefined, { maximumFractionDigits: 0 }),
                formattedProfitTRY: stats.profitTRY.toLocaleString(undefined, { maximumFractionDigits: 0 }),
                formattedGrowthUSD: (stats.profitRatio * 100).toFixed(1),
                formattedGrowthTRY: (stats.profitRatioTRY * 100).toFixed(1),
            };
        });
    }, [filteredTransactions, assets, prices, usdTryRate, eurUsdRate, gbpUsdRate]);

    const totalPortfolioValueUSD = assetStats.reduce((sum, item) => sum + (item.totalValueUSD || 0), 0);
    const totalPortfolioCostUSD = assetStats.reduce((sum, item) => sum + (item.totalCostUSD || 0), 0);
    const allTimeProfitUSD = assetStats.reduce((sum, item) => sum + (item.profitUSD || 0), 0);
    const allTimeProfitRatioUSD = totalPortfolioCostUSD > 0 ? (allTimeProfitUSD / totalPortfolioCostUSD) * 100 : 0;

    const totalPortfolioValueTRY = assetStats.reduce((sum, item) => sum + (item.totalValueTRY || 0), 0);
    const totalPortfolioCostTRY = assetStats.reduce((sum, item) => sum + (item.totalCostTRY || 0), 0);
    const allTimeProfitTRY = assetStats.reduce((sum, item) => sum + (item.profitTRY || 0), 0);
    const allTimeProfitRatioTRY = totalPortfolioCostTRY > 0 ? (allTimeProfitTRY / totalPortfolioCostTRY) * 100 : 0;

    const oneYearAgoStats = useMemo(() => {
        const targetDate = new Date();
        targetDate.setFullYear(targetDate.getFullYear() - 1);
        const histTransactions = filteredTransactions.filter(t => new Date(t.date) <= targetDate);
        if (histTransactions.length === 0) return { valueUSD: 0, valueTRY: 0, date: targetDate };

        const histAssetsNames = Array.from(new Set(histTransactions.map(t => (t.asset || 'GOLD').trim().toUpperCase())));
        let totalValUSD = 0;
        let totalValTRY = 0;

        histAssetsNames.forEach(asset => {
            const assetTxs = histTransactions.filter(t => (t.asset || 'GOLD').trim().toUpperCase() === asset);
            let histPriceUSD = 0;
            const lastTx = [...assetTxs].reverse().find(t => t.priceUSD > 0);
            if (lastTx) histPriceUSD = lastTx.priceUSD;
            if (asset === 'TRY') histPriceUSD = 1 / (lastTx?.usdRate || 33.50);
            else if (asset === 'USD') histPriceUSD = 1;

            const stats = calculateAssetStats(assetTxs, histPriceUSD, lastTx?.usdRate || 33.50);
            totalValUSD += stats.totalValueUSD;
            totalValTRY += stats.totalValueTRY;
        });

        return { valueUSD: totalValUSD, valueTRY: totalValTRY, date: targetDate };
    }, [filteredTransactions]);

    const periodProfitUSD = totalPortfolioValueUSD - oneYearAgoStats.valueUSD;
    const periodGrowthUSD = oneYearAgoStats.valueUSD > 0 ? (periodProfitUSD / oneYearAgoStats.valueUSD) * 100 : 0;
    const periodProfitTRY = totalPortfolioValueTRY - oneYearAgoStats.valueTRY;
    const periodGrowthTRY = oneYearAgoStats.valueTRY > 0 ? (periodProfitTRY / oneYearAgoStats.valueTRY) * 100 : 0;

    return (
        <div>
            {/* Portfolio History Chart */}
            <PortfolioChart
                transactions={filteredTransactions}
                currentPrices={prices}
                currentUsdRate={usdTryRate}
                eurUsdRate={eurUsdRate}
                gbpUsdRate={gbpUsdRate}
            />

            <div className="d-flex flex-wrap justify-content-between align-items-center mb-4 gap-3">
                {/* Admin User Filter */}
                {isAdmin && (
                    <div className="d-flex align-items-center gap-2 bg-dark text-white p-2 rounded shadow-sm border border-secondary">
                        <UserIcon size={18} className="text-primary" />
                        <span className="small fw-bold text-uppercase opacity-75">Portföy Seçimi:</span>
                        <select
                            className="form-select form-select-sm bg-dark text-white border-0 fw-bold"
                            style={{ minWidth: '150px', cursor: 'pointer' }}
                            value={selectedUserId}
                            onChange={(e) => setSelectedUserId(e.target.value)}
                        >
                            <option value="all">Tüm Yatırımcılar</option>
                            {usersList.map(u => (
                                <option key={u.id} value={u.id}>{u.username} ({u.role})</option>
                            ))}
                        </select>
                    </div>
                )}

                <div className="d-flex flex-column align-items-end ms-auto">
                    <div className="input-group input-group-sm" style={{ maxWidth: '180px' }}>
                        <span className="input-group-text bg-dark text-white border-0">USD/TRY</span>
                        <input
                            type="number"
                            className="form-control bg-light border-0 fw-bold text-end"
                            value={usdTryRate}
                            onChange={(e) => setUsdTryRate(parseFloat(e.target.value))}
                        />
                    </div>
                    {rateDate && <div className="text-muted small mt-1" style={{ fontSize: '0.65rem' }}>{rateDate}</div>}
                </div>
            </div>

            {/* Grand Total Card */}
            <div className="card bg-primary text-white mb-5 shadow-lg border-0 overflow-hidden position-relative">
                <div className="card-body p-4 p-md-5 relative z-10">
                    <div className="row g-4">
                        <div className="col-md-6 border-end border-white-50">
                            <h6 className="text-white-50 text-uppercase ls-1 mb-2">Toplam (USD)</h6>
                            <div className="display-4 fw-bold mb-0 d-flex align-items-baseline">
                                ${totalPortfolioValueUSD.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                            </div>
                            <div className={`mt-2 fs-5 d-flex flex-wrap align-items-center gap-2 ${allTimeProfitUSD >= 0 ? 'text-success' : 'text-danger'}`}>
                                <span className="badge bg-white text-dark rounded-pill">
                                    {allTimeProfitUSD >= 0 ? '+' : ''}{allTimeProfitRatioUSD.toFixed(1)}%
                                </span>
                                <small className="opacity-75 text-white border-start border-white-50 ps-2">
                                    Net: ${allTimeProfitUSD.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                </small>
                            </div>
                            {oneYearAgoStats.valueUSD > 0 && (
                                <div className="mt-3 pt-2 border-top border-white-10">
                                    <div className="d-flex align-items-center gap-2">
                                        <span className={`badge ${periodProfitUSD >= 0 ? 'bg-success' : 'bg-danger'} bg-opacity-75`}>
                                            {periodProfitUSD >= 0 ? '▲' : '▼'} {periodGrowthUSD.toFixed(1)}%
                                        </span>
                                        <span className="text-white fw-medium">${periodProfitUSD.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                                        <span className="text-white-50 small">(Son 1 Yıl)</span>
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="col-md-6 ps-md-5">
                            <h6 className="text-white-50 text-uppercase ls-1 mb-2">Toplam (TRY)</h6>
                            <div className="display-4 fw-bold mb-0 d-flex align-items-baseline">
                                ₺{totalPortfolioValueTRY.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                            </div>
                            <div className={`mt-2 fs-5 d-flex flex-wrap align-items-center gap-2 ${allTimeProfitTRY >= 0 ? 'text-success' : 'text-danger'}`}>
                                <span className="badge bg-white text-dark rounded-pill">
                                    {allTimeProfitTRY >= 0 ? '+' : ''}{allTimeProfitRatioTRY.toFixed(1)}%
                                </span>
                                <small className="opacity-75 text-white border-start border-white-50 ps-2">
                                    Net: ₺{allTimeProfitTRY.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                </small>
                            </div>
                            {oneYearAgoStats.valueTRY > 0 && (
                                <div className="mt-3 pt-2 border-top border-white-10">
                                    <div className="d-flex align-items-center gap-2">
                                        <span className={`badge ${periodProfitTRY >= 0 ? 'bg-success' : 'bg-danger'} bg-opacity-75`}>
                                            {periodProfitTRY >= 0 ? '▲' : '▼'} {periodGrowthTRY.toFixed(1)}%
                                        </span>
                                        <span className="text-white fw-medium">₺{periodProfitTRY.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                                        <span className="text-white-50 small">(Son 1 Yıl)</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
                <TrendingUp className="position-absolute bottom-0 end-0 text-white opacity-10" size={300} style={{ transform: 'translate(20%, 20%)' }} />
            </div>

            {/* Assets Grid */}
            <div className="row g-4 mb-5">
                {assetStats.map((stat) => (
                    <div key={stat.asset} className="col-12 col-md-6 col-lg-4">
                        <div className="card h-100 shadow-sm border-0 hover-lift transition-all">
                            <div className="card-header bg-dark text-white border-0 py-3 d-flex justify-content-between align-items-center">
                                <div className="d-flex align-items-center gap-2">
                                    <div className="avatar bg-primary text-white rounded-circle d-flex align-items-center justify-content-center fw-bold" style={{ width: 32, height: 32 }}>
                                        {stat.asset.substring(0, 1)}
                                    </div>
                                    <h6 className="mb-0 fw-bold">{stat.asset}</h6>
                                </div>
                                <div className="text-end">
                                    <div className="small text-white-50" style={{ fontSize: '0.7rem' }}>Bakiye</div>
                                    <div className="fw-bold">{stat.totalAmount.toLocaleString(undefined, { maximumFractionDigits: 4 })}</div>
                                </div>
                            </div>
                            <div className="card-body p-3">
                                <div className="row g-2 mb-3">
                                    <div className="col-6">
                                        <div className="p-2 bg-light rounded shadow-sm">
                                            <div className="small text-muted mb-1" style={{ fontSize: '0.7rem' }}>Değer (USD)</div>
                                            <div className="fw-bold text-dark">${stat.totalValueUSD.toLocaleString(undefined, { maximumFractionDigits: 2 })}</div>
                                        </div>
                                    </div>
                                    <div className="col-6">
                                        <div className="p-2 bg-light rounded shadow-sm">
                                            <div className="small text-muted mb-1" style={{ fontSize: '0.7rem' }}>Değer (TL)</div>
                                            <div className="fw-bold text-dark">₺{stat.totalValueTRY.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
                                        </div>
                                    </div>
                                </div>
                                {!['TRY', 'USD', 'EUR', 'GBP'].includes(stat.asset) && (
                                    <>
                                        <div className="row g-2 mb-3">
                                            <div className={`col-6 p-2 rounded border-start border-4 ${stat.profitUSD >= 0 ? 'bg-success-subtle border-success' : 'bg-danger-subtle border-danger'}`}>
                                                <div className="small text-muted mb-1" style={{ fontSize: '0.7rem' }}>Kar (USD)</div>
                                                <div className={`fw-bold ${stat.profitUSD >= 0 ? 'text-success' : 'text-danger'}`}>
                                                    ${stat.profitUSD.toLocaleString()}
                                                    <span className="ms-1 small" style={{ fontSize: '0.65rem' }}>({stat.formattedGrowthUSD}%)</span>
                                                </div>
                                            </div>
                                            <div className={`col-6 p-2 rounded border-start border-4 ${stat.profitTRY >= 0 ? 'bg-success-subtle border-success' : 'bg-danger-subtle border-danger'}`}>
                                                <div className="small text-muted mb-1" style={{ fontSize: '0.7rem' }}>Kar (TL)</div>
                                                <div className={`fw-bold ${stat.profitTRY >= 0 ? 'text-success' : 'text-danger'}`}>
                                                    ₺{stat.profitTRY.toLocaleString()}
                                                    <span className="ms-1 small" style={{ fontSize: '0.65rem' }}>({stat.formattedGrowthTRY}%)</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="d-flex justify-content-between align-items-center mb-3">
                                            <div className="small text-muted">Ort. Maliyet: <span className="fw-bold text-dark">${stat.averageCostUSD.toFixed(2)}</span></div>
                                            <div className={`badge ${stat.xirr >= 0 ? 'bg-success' : 'bg-danger'}`}>XIRR: {(stat.xirr * 100).toFixed(1)}%</div>
                                        </div>
                                        <div className="mt-2 border-top pt-2">
                                            <div className="row g-1">
                                                <div className="col-6">
                                                    <input type="number"
                                                        className="form-control form-control-sm"
                                                        placeholder="USD Price"
                                                        onChange={(e) => handlePriceChange(stat.asset, e.target.value, 'USD')}
                                                        value={prices[stat.asset]?.currency === 'USD' ? prices[stat.asset]?.price : ''}
                                                    />
                                                </div>
                                                <div className="col-6">
                                                    <input type="number"
                                                        className="form-control form-control-sm"
                                                        placeholder="TRY Price"
                                                        onChange={(e) => handlePriceChange(stat.asset, e.target.value, 'TRY')}
                                                        value={prices[stat.asset]?.currency === 'TRY' ? prices[stat.asset]?.price : ''}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
                {assetStats.length === 0 && <div className="col-12 text-center py-5 text-muted">Varlık bulunamadı.</div>}
            </div>
        </div>
    );
}
