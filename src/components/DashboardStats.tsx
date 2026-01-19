"use client";

import { usePortfolio } from '@/lib/store';
import { calculateAssetStats } from '@/lib/finance';
import { useMemo, useState, useEffect } from 'react';
import { ArrowUpRight, ArrowDownRight, TrendingUp, DollarSign } from 'lucide-react';
import PortfolioChart from './PortfolioChart';

export default function DashboardStats() {
    const { transactions, assetDrivers, updateDriver } = usePortfolio();

    // Global Rates
    const [usdTryRate, setUsdTryRate] = useState(33.50);
    const [eurUsdRate, setEurUsdRate] = useState(1.08);
    const [gbpUsdRate, setGbpUsdRate] = useState(1.27);
    const [rateDate, setRateDate] = useState<string>('');

    useEffect(() => {
        const fetchRates = async () => {
            try {
                // Fetch USD/TRY
                const resTry = await fetch('https://api.frankfurter.app/latest?from=USD&to=TRY');
                const dataTry = await resTry.json();
                if (dataTry && dataTry.rates && dataTry.rates.TRY) {
                    setUsdTryRate(dataTry.rates.TRY);
                    if (!rateDate) setRateDate(dataTry.date);
                }

                // Fetch EUR/USD
                const resEur = await fetch('https://api.frankfurter.app/latest?from=EUR&to=USD');
                const dataEur = await resEur.json();
                if (dataEur && dataEur.rates && dataEur.rates.USD) {
                    const rate = dataEur.rates.USD;
                    setEurUsdRate(rate);
                    setPrices(prev => ({
                        ...prev,
                        'EUR': { price: rate, lastUpdated: 'Auto' }
                    }));
                }

                // Fetch GBP/USD
                const resGbp = await fetch('https://api.frankfurter.app/latest?from=GBP&to=USD');
                const dataGbp = await resGbp.json();
                if (dataGbp && dataGbp.rates && dataGbp.rates.USD) {
                    const rate = dataGbp.rates.USD;
                    setGbpUsdRate(rate);
                    setPrices(prev => ({
                        ...prev,
                        'GBP': { price: rate, lastUpdated: 'Auto' }
                    }));
                }
            } catch (error) {
                console.error('Failed to fetch rates:', error);
            }
        };

        fetchRates();
    }, []);

    // 1. Identify all unique assets
    const assets = useMemo(() => {
        const unique = new Set(transactions.map(t => (t.asset || 'GOLD').trim().toUpperCase()));
        return Array.from(unique);
    }, [transactions]);

    // 2. Manage prices for each asset
    // Define the structure for price data
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

    // Load prices from LocalStorage on mount
    useEffect(() => {
        const storedPrices = localStorage.getItem('portfolio_prices');
        if (storedPrices) {
            try {
                const parsed = JSON.parse(storedPrices);
                setPrices(prev => ({ ...prev, ...parsed }));
            } catch (e) {
                console.error("Failed to parse stored prices", e);
            }
        }
    }, []);

    const handlePriceChange = (asset: string, val: string, currency: 'USD' | 'TRY') => {
        const newPrice = Number(parseFloat(val) || 0);
        const now = new Date();
        const timestamp = `${now.toLocaleDateString('tr-TR')} ${now.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}`;

        setPrices(prev => {
            const updated = {
                ...prev,
                [asset]: { price: newPrice, currency, lastUpdated: timestamp }
            };
            localStorage.setItem('portfolio_prices', JSON.stringify(updated));
            return updated;
        });
    };


    // 3. Calculate stats
    const assetStats = useMemo(() => {
        return assets.map(asset => {
            const normalizedAsset = asset.trim().toUpperCase();
            const assetTransactions = transactions.filter(t => (t.asset || 'GOLD').trim().toUpperCase() === normalizedAsset);

            // For TRY, the "USD Price" is dynamically calculated from the rate (1 TL = 1/Rate USD)
            // For USD, it's always 1.0
            // For EUR, it's the live EUR/USD rate
            // For others, use the manual price or default to 0
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

            // SPECIAL LOGIC: TRY is base currency, so Profit TRY is always 0
            if (normalizedAsset === 'TRY') {
                stats.profitTRY = 0;
                stats.profitRatioTRY = 0;
                stats.totalCostTRY = stats.totalValueTRY;
            }

            // SPECIAL LOGIC: USD/EUR/GBP are tracked against TRY cost
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
    }, [transactions, assets, prices, usdTryRate, eurUsdRate, gbpUsdRate]);

    // 4. Totals and Comparative Stats
    const totalPortfolioValueUSD = assetStats.reduce((sum, item) => sum + (item.totalValueUSD || 0), 0);
    // Use TotalCost instead of TotalInvested for ROI Ratio. This correctly accounts for "Cash Drag" (USD assets having Cost=Value)
    // and provides a standard "Return on Current Capital" metric rather than "Return on Historical Volume".
    const totalPortfolioCostUSD = assetStats.reduce((sum, item) => sum + (item.totalCostUSD || 0), 0);
    const allTimeProfitUSD = assetStats.reduce((sum, item) => sum + (item.profitUSD || 0), 0);
    // Formula: Profit / Cost
    const allTimeProfitRatioUSD = totalPortfolioCostUSD > 0 ? (allTimeProfitUSD / totalPortfolioCostUSD) * 100 : 0;

    const totalPortfolioValueTRY = assetStats.reduce((sum, item) => sum + (item.totalValueTRY || 0), 0);
    const totalPortfolioCostTRY = assetStats.reduce((sum, item) => sum + (item.totalCostTRY || 0), 0);
    const allTimeProfitTRY = assetStats.reduce((sum, item) => sum + (item.profitTRY || 0), 0);
    const allTimeProfitRatioTRY = totalPortfolioCostTRY > 0 ? (allTimeProfitTRY / totalPortfolioCostTRY) * 100 : 0;


    // 5. Historical Snapshot (1 Year Ago)
    const oneYearAgoStats = useMemo(() => {
        const targetDate = new Date();
        targetDate.setFullYear(targetDate.getFullYear() - 1);
        targetDate.setHours(23, 59, 59, 999);

        const histTransactions = transactions.filter(t => new Date(t.date) <= targetDate);
        if (histTransactions.length === 0) return { profitUSD: 0, valueUSD: 0, profitTRY: 0, valueTRY: 0, date: targetDate };

        const sorted = [...histTransactions].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        let lastUsdRate = sorted[0]?.usdRate || 33.50;
        const lastTxWithRate = [...sorted].reverse().find(t => t.usdRate > 0);
        if (lastTxWithRate) lastUsdRate = lastTxWithRate.usdRate;

        const histAssetsNames = Array.from(new Set(sorted.map(t => (t.asset || 'GOLD').trim().toUpperCase())));

        let totalValUSD = 0;
        let totalPrfUSD = 0;
        let totalValTRY = 0;
        let totalPrfTRY = 0;

        histAssetsNames.forEach(asset => {
            const assetTxs = sorted.filter(t => (t.asset || 'GOLD').trim().toUpperCase() === asset);
            let histPriceUSD = 0;
            const lastTxWithPrice = [...assetTxs].reverse().find(t => t.priceUSD > 0);
            if (lastTxWithPrice) histPriceUSD = lastTxWithPrice.priceUSD;

            if (asset === 'TRY') histPriceUSD = 1 / lastUsdRate;
            else if (asset === 'USD') histPriceUSD = 1;
            else if (asset === 'EUR') histPriceUSD = 1.08;
            else if (asset === 'GBP') histPriceUSD = 1.27;

            const stats = calculateAssetStats(assetTxs, histPriceUSD, lastUsdRate);
            totalValUSD += stats.totalValueUSD;
            totalPrfUSD += stats.profitUSD;
            totalValTRY += stats.totalValueTRY;
            totalPrfTRY += stats.profitTRY;
        });

        return {
            profitUSD: totalPrfUSD,
            valueUSD: totalValUSD,
            profitTRY: totalPrfTRY,
            valueTRY: totalValTRY,
            date: targetDate
        };
    }, [transactions]);

    // Period performance - SIMPLE TOTAL GROWTH (User Request)
    // Formula: ((Total Value Today - Total Value 1 Year Ago) / Total Value 1 Year Ago)
    const periodProfitUSD = totalPortfolioValueUSD - oneYearAgoStats.valueUSD;
    const periodGrowthUSD = oneYearAgoStats.valueUSD > 0 ? (periodProfitUSD / oneYearAgoStats.valueUSD) * 100 : 0;

    const periodProfitTRY = totalPortfolioValueTRY - oneYearAgoStats.valueTRY;
    const periodGrowthTRY = oneYearAgoStats.valueTRY > 0 ? (periodProfitTRY / oneYearAgoStats.valueTRY) * 100 : 0;

    const formattedHistDate = oneYearAgoStats.date.toLocaleDateString('tr-TR');


    return (
        <div>
            {/* Portfolio History Chart */}
            <PortfolioChart
                transactions={transactions}
                currentPrices={prices}
                currentUsdRate={usdTryRate}
                eurUsdRate={eurUsdRate}
                gbpUsdRate={gbpUsdRate}
            />

            {/* Currency Settings */}
            <div className="d-flex justify-content-end mb-4">
                <div className="input-group input-group-sm" style={{ maxWidth: '200px' }}>
                    <span className="input-group-text bg-dark text-white border-0">USD/TRY</span>
                    <input
                        type="number"
                        className="form-control bg-light border-0 fw-bold text-end"
                        value={usdTryRate}
                        onChange={(e) => setUsdTryRate(parseFloat(e.target.value))}
                    />
                </div>
                {rateDate && (
                    <div className="text-muted small text-end mt-1" style={{ fontSize: '0.75rem' }}>
                        {rateDate}
                    </div>
                )}
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
                                <span className="text-white-50 small" style={{ fontSize: '0.65rem' }}>(saf yatırım kaynaklı)</span>
                                <small className="opacity-75 text-white border-start border-white-50 ps-2">
                                    Net: ${allTimeProfitUSD.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                </small>
                            </div>

                            {/* Last 1 Year Section */}
                            {oneYearAgoStats.valueUSD > 0 && (
                                <div className="mt-3 pt-2 border-top border-white-10">
                                    <div className="d-flex align-items-center gap-2">
                                        <span className={`badge ${periodProfitUSD >= 0 ? 'bg-success' : 'bg-danger'} bg-opacity-75 text-white`}>
                                            <span className="me-1">{periodProfitUSD >= 0 ? '▲' : '▼'}</span>
                                            {periodGrowthUSD.toFixed(1)}%
                                        </span>
                                        <span className="text-white fw-medium">
                                            {periodProfitUSD >= 0 ? '+' : ''}${periodProfitUSD.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                        </span>
                                        <span className="text-white-50 small ms-1" style={{ fontSize: '0.7rem' }}>(Son 1 Yıl)</span>
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
                                <span className="text-white-50 small" style={{ fontSize: '0.65rem' }}>(saf yatırım kaynaklı)</span>
                                <small className="opacity-75 text-white border-start border-white-50 ps-2">
                                    Net: ₺{allTimeProfitTRY.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                </small>
                            </div>

                            {/* Last 1 Year Section (TRY) */}
                            {oneYearAgoStats.valueTRY > 0 && (
                                <div className="mt-3 pt-2 border-top border-white-10">
                                    <div className="d-flex align-items-center gap-2">
                                        <span className={`badge ${periodProfitTRY >= 0 ? 'bg-success' : 'bg-danger'} bg-opacity-75 text-white`}>
                                            <span className="me-1">{periodProfitTRY >= 0 ? '▲' : '▼'}</span>
                                            {periodGrowthTRY.toFixed(1)}%
                                        </span>
                                        <span className="text-white fw-medium">
                                            {periodProfitTRY >= 0 ? '+' : ''}₺{periodProfitTRY.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                        </span>
                                        <span className="text-white-50 small ms-1" style={{ fontSize: '0.7rem' }}>(Son 1 Yıl)</span>
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
                            {/* ... existing card content ... */}
                            {/* Shortened for brevity in tool call diff, assuming content is largely static aside from the debug addition below */}
                            <div className="card-header bg-dark text-white border-0 py-3 d-flex justify-content-between align-items-center">
                                <div className="d-flex align-items-center gap-2">
                                    <div className="avatar bg-primary text-white rounded-circle d-flex align-items-center justify-content-center fw-bold" style={{ width: 32, height: 32, fontSize: '0.9rem' }}>
                                        {stat.asset === 'TRY' ? '₺' :
                                            stat.asset === 'USD' ? '$' :
                                                stat.asset === 'EUR' ? '€' :
                                                    stat.asset === 'GBP' ? '£' :
                                                        stat.asset === 'GOLD' ? '🪙' :
                                                            stat.asset === 'BTC' ? '₿' :
                                                                stat.asset === 'XPT' ? '💍' :
                                                                    stat.asset.substring(0, 3)}
                                    </div>
                                    <div>
                                        <h6 className="mb-0 fw-bold">{stat.asset}</h6>
                                        {!(stat.asset === 'TRY' || stat.asset === 'USD' || stat.asset === 'EUR' || stat.asset === 'GBP') && (
                                            <span className="text-white-50" style={{ fontSize: '0.65rem' }}>
                                                {stat.daysInPortfolio} Gün
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <div className="text-end">
                                    <div className="small text-white-50" style={{ fontSize: '0.7rem' }}>Bakiye</div>
                                    <div className="fw-bold">{stat.totalAmount.toLocaleString(undefined, { maximumFractionDigits: 4 })}</div>
                                </div>
                            </div>

                            <div className="card-body p-3">
                                {/* Value Section */}
                                <div className="row g-2 mb-3">
                                    <div className="col-6">
                                        <div className="p-2 bg-light rounded shadow-sm border border-light">
                                            <div className="small text-muted mb-1" style={{ fontSize: '0.7rem' }}>Değer (USD)</div>
                                            <div className="fw-bold text-dark text-truncate" title={stat.totalValueUSD.toLocaleString()}>
                                                ${stat.totalValueUSD.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="col-6">
                                        <div className="p-2 bg-light rounded shadow-sm border border-light">
                                            <div className="small text-muted mb-1" style={{ fontSize: '0.7rem' }}>Değer (TL)</div>
                                            <div className="fw-bold text-dark text-truncate" title={stat.totalValueTRY.toLocaleString()}>
                                                ₺{stat.totalValueTRY.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Profit/Loss & XIRR Section */}
                                {!['TRY', 'USD', 'EUR', 'GBP'].includes(stat.asset.trim().toUpperCase()) ? (
                                    <>
                                        <div className="row g-2 mb-3">
                                            <div className="col-6">
                                                <div className={`p-2 rounded border-start border-4 ${stat.profitUSD >= 0 ? 'bg-success-subtle border-success' : 'bg-danger-subtle border-danger'}`}>
                                                    <div className="small text-muted mb-1" style={{ fontSize: '0.7rem' }}>Kar (USD)</div>
                                                    <div className={`fw-bold text-truncate ${stat.profitUSD >= 0 ? 'text-success' : 'text-danger'}`} title={stat.profitUSD.toLocaleString()}>
                                                        ${stat.profitUSD.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                                        <span className="ms-1 small" style={{ fontSize: '0.65rem' }}>({stat.profitRatio >= 0 ? '+' : ''}{(stat.profitRatio * 100).toFixed(1)}%)</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="col-6">
                                                <div className={`p-2 rounded border-start border-4 ${stat.profitTRY >= 0 ? 'bg-success-subtle border-success' : 'bg-danger-subtle border-danger'}`}>
                                                    <div className="small text-muted mb-1" style={{ fontSize: '0.7rem' }}>Kar (TL)</div>
                                                    <div className={`fw-bold text-truncate ${stat.profitTRY >= 0 ? 'text-success' : 'text-danger'}`} title={stat.profitTRY.toLocaleString()}>
                                                        ₺{stat.profitTRY.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                                        <span className="ms-1 small" style={{ fontSize: '0.65rem' }}>({stat.profitRatioTRY >= 0 ? '+' : ''}{(stat.profitRatioTRY * 100).toFixed(1)}%)</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="d-flex justify-content-between align-items-center mb-3 px-1">
                                            <div>
                                                <span className="small text-muted" style={{ fontSize: '0.75rem' }}>Ort. Maliyet: </span>
                                                <span className="small fw-bold">${stat.averageCostUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}</span>
                                            </div>
                                            <div className={`badge ${stat.xirr >= 0 ? 'bg-success' : 'bg-danger'}`}>
                                                XIRR: {stat.xirr >= 0 ? '+' : ''}{(stat.xirr * 100).toFixed(1)}%
                                            </div>
                                        </div>
                                    </>
                                ) : (
                                    <div className="text-center py-2 text-muted small border-top border-bottom border-light mb-3">
                                        Temel varlık birimi olduğu için kar hesaplanmaz.
                                    </div>
                                )}

                                {/* Price Input Section */}
                                {!(stat.asset === 'TRY' || stat.asset === 'USD' || stat.asset === 'EUR' || stat.asset === 'GBP') && (
                                    <div className="mt-auto border-top pt-2">
                                        <div className="row g-1">
                                            <div className="col-6">
                                                <div className="input-group input-group-sm">
                                                    <span className="input-group-text bg-light border-end-0 px-2" style={{ fontSize: '0.7rem' }}>$</span>
                                                    <input
                                                        type="number"
                                                        className={`form-control border-start-0 px-1 ${prices[stat.asset]?.currency === 'USD' ? 'fw-bold bg-white text-primary' : 'text-muted bg-light'}`}
                                                        style={{ fontSize: '0.75rem', height: '28px' }}
                                                        value={prices[stat.asset]?.currency === 'USD' ? prices[stat.asset]?.price : (usdTryRate > 0 ? (prices[stat.asset]?.price / usdTryRate).toFixed(4) : '')}
                                                        onChange={(e) => handlePriceChange(stat.asset, e.target.value, 'USD')}
                                                        placeholder="USD"
                                                        step="0.0001"
                                                    />
                                                </div>
                                            </div>
                                            <div className="col-6">
                                                <div className="input-group input-group-sm">
                                                    <span className="input-group-text bg-light border-end-0 px-2" style={{ fontSize: '0.7rem' }}>₺</span>
                                                    <input
                                                        type="number"
                                                        className={`form-control border-start-0 px-1 ${prices[stat.asset]?.currency === 'TRY' ? 'fw-bold bg-white text-primary' : 'text-muted bg-light'}`}
                                                        style={{ fontSize: '0.75rem', height: '28px' }}
                                                        value={prices[stat.asset]?.currency === 'TRY' ? prices[stat.asset]?.price : (usdTryRate > 0 ? (prices[stat.asset]?.price * usdTryRate).toFixed(3) : '')}
                                                        onChange={(e) => handlePriceChange(stat.asset, e.target.value, 'TRY')}
                                                        placeholder="TRY"
                                                        step="0.001"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                        {prices[stat.asset]?.lastUpdated && (
                                            <div className="text-end mt-1">
                                                <small className="text-muted" style={{ fontSize: '0.6rem', opacity: 0.7 }}>
                                                    {prices[stat.asset].lastUpdated}
                                                </small>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Asset Type Toggle (Driver) */}
                                <div className="mt-3">
                                    <div className="btn-group btn-group-sm w-100" style={{ height: '28px' }}>
                                        <button
                                            type="button"
                                            className={`btn py-0 px-1 border-secondary ${assetDrivers[stat.asset] === 'USD' ? 'btn-secondary text-white' : 'btn-outline-secondary text-muted'}`}
                                            onClick={() => updateDriver(stat.asset, 'USD')}
                                            style={{ fontSize: '0.65rem' }}
                                        >
                                            Dolar Türevi
                                        </button>
                                        <button
                                            type="button"
                                            className={`btn py-0 px-1 border-secondary ${(!assetDrivers[stat.asset] || assetDrivers[stat.asset] === 'TRY') ? 'btn-secondary text-white' : 'btn-outline-secondary text-muted'}`}
                                            onClick={() => updateDriver(stat.asset, 'TRY')}
                                            style={{ fontSize: '0.65rem' }}
                                        >
                                            TL Türevi
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}

                {assetStats.length === 0 && (
                    <div className="col-12 text-center py-5">
                        <div className="text-muted fs-4">Henüz varlığınız yok.</div>
                    </div>
                )}
            </div>
        </div>
    );
}
