"use client";

import { usePortfolio } from '@/lib/store';
import { calculateAssetStats } from '@/lib/finance';
import { useMemo, useState, useEffect } from 'react';
import { ArrowUpRight, ArrowDownRight, TrendingUp, DollarSign, Filter, User as UserIcon } from 'lucide-react';
import PortfolioChart from './PortfolioChart';
import { useSession } from 'next-auth/react';
import { getUsers } from '@/userActions';
import { getAssetSettings, getUserPreferencesAction, getMonthlyHistory } from '@/actions';

export default function DashboardStats() {
    const {
        transactions,
        assetSettings,
        updateDriver,
        updateAssetPrice,
        userPreferences,
        saveUserPreference
    } = usePortfolio();
    const { data: session } = useSession();

    // Admin Specific
    const [usersList, setUsersList] = useState<any[]>([]);
    const [selectedUserId, setSelectedUserId] = useState<string>('all');
    const isAdmin = (session?.user as any)?.role === 'admin';

    // Local view state (defaults to store values, but updates when Admin selects a user)
    const [viewSettings, setViewSettings] = useState(assetSettings);
    const [viewPreferences, setViewPreferences] = useState(userPreferences);

    useEffect(() => {
        if (isAdmin) {
            getUsers().then(setUsersList);
        }
    }, [isAdmin]);

    // Fetch target user settings when Admin changes selection
    // Fetch target user settings when Admin changes selection OR when local settings change
    useEffect(() => {
        const fetchViewSettings = async () => {
            if (!isAdmin || selectedUserId === 'all') {
                // Reset to my own settings (Sync with store)
                setViewSettings(assetSettings);
                setViewPreferences(userPreferences);
                return;
            }

            // Admin viewing another user
            try {
                const [targetSettings, targetPrefs] = await Promise.all([
                    getAssetSettings(selectedUserId),
                    getUserPreferencesAction(selectedUserId)
                ]);
                setViewSettings(targetSettings);
                setViewPreferences(targetPrefs);
            } catch (e) {
                console.error("Failed to fetch target user settings", e);
            }
        };
        fetchViewSettings();
    }, [selectedUserId, isAdmin, assetSettings, userPreferences]);

    // Global Rates
    const [usdTryRate, setUsdTryRate] = useState(33.50);
    const [eurUsdRate, setEurUsdRate] = useState(1.08);
    const [gbpUsdRate, setGbpUsdRate] = useState(1.27);
    const [rateDate, setRateDate] = useState<string>('');

    // Load initial rates from preferences
    useEffect(() => {
        if (viewPreferences.usdTryRate) setUsdTryRate(parseFloat(viewPreferences.usdTryRate));
        if (viewPreferences.eurUsdRate) setEurUsdRate(parseFloat(viewPreferences.eurUsdRate));
        if (viewPreferences.gbpUsdRate) setGbpUsdRate(parseFloat(viewPreferences.gbpUsdRate));
    }, [viewPreferences]);

    useEffect(() => {
        const fetchRates = async () => {
            try {
                // Dynamically import the server action
                const { fetchYahooPriceAction } = await import('@/actions');

                // 1. USD/TRY (Symbol: TRY=X)
                const resTry = await fetchYahooPriceAction('TRY=X');
                if (resTry.success && resTry.price) {
                    const newRate = resTry.price;
                    setUsdTryRate(newRate);

                    // Persist if significantly different
                    if (Math.abs(newRate - parseFloat(userPreferences.usdTryRate || '0')) > 0.01) {
                        saveUserPreference('usdTryRate', newRate.toString());
                    }

                    // Update timestamp
                    const nowStr = new Date().toLocaleString('tr-TR', {
                        year: 'numeric', month: '2-digit', day: '2-digit',
                        hour: '2-digit', minute: '2-digit', second: '2-digit'
                    });
                    setRateDate(nowStr);
                }

                // 2. EUR/USD (Symbol: EURUSD=X)
                const resEur = await fetchYahooPriceAction('EURUSD=X');
                if (resEur.success && resEur.price) {
                    const newRate = resEur.price;
                    setEurUsdRate(newRate);
                    if (Math.abs(newRate - parseFloat(userPreferences.eurUsdRate || '0')) > 0.001) {
                        saveUserPreference('eurUsdRate', newRate.toString());
                    }
                }

                // 3. GBP/USD (Symbol: GBPUSD=X)
                const resGbp = await fetchYahooPriceAction('GBPUSD=X');
                if (resGbp.success && resGbp.price) {
                    const newRate = resGbp.price;
                    setGbpUsdRate(newRate);
                    if (Math.abs(newRate - parseFloat(userPreferences.gbpUsdRate || '0')) > 0.001) {
                        saveUserPreference('gbpUsdRate', newRate.toString());
                    }
                }

            } catch (error) {
                console.error("Failed to fetch currency rates:", error);
            }
        };

        const timer = setTimeout(fetchRates, 1000); // Small delay on mount
        return () => clearTimeout(timer);
    }, [userPreferences.usdTryRate, userPreferences.eurUsdRate, userPreferences.gbpUsdRate]);
    // Update Status State
    const [updateStatus, setUpdateStatus] = useState<Record<string, { time: string, status: 'success' | 'error' | null, msg: string }>>({});
    const [hasRun, setHasRun] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [loadingMessage, setLoadingMessage] = useState('Portföy verileri bekleniyor...');
    const [loadingProgress, setLoadingProgress] = useState(0);

    // Fetch TEFAS price dynamically
    const handleFetchTefasPrice = async (asset: string, isAuto = false) => {
        try {
            const { fetchTefasPriceAction, updateAssetDataSource } = await import('@/actions');

            if (!isAuto) {
                await updateAssetDataSource(asset, 'TEFAS', asset);
                setViewSettings(prev => ({
                    ...prev,
                    [asset]: { ...(prev[asset] || {}), dataSource: 'TEFAS' }
                }));
            }

            const result = await fetchTefasPriceAction(asset);

            if (result.success && result.price) {
                await updateAssetPrice(asset, result.price, 'TRY');
                setViewSettings(prev => ({
                    ...prev,
                    [asset]: {
                        ...(prev[asset] || { driver: 'USD' }),
                        manualPrice: result.price,
                        priceCurrency: 'TRY',
                        dataSource: 'TEFAS',
                        lastFetchedAt: new Date()
                    }
                }));
                setUpdateStatus(prev => ({
                    ...prev,
                    [asset]: { time: new Date().toLocaleTimeString(), status: 'success', msg: 'Güncellendi' }
                }));
                return true;
            } else {
                if (!isAuto) alert(`${asset} için TEFAS fiyatı çekilemedi: ` + (result.error || 'Fiyat bulunamadı'));
                setUpdateStatus(prev => ({
                    ...prev,
                    [asset]: { time: new Date().toLocaleTimeString(), status: 'error', msg: 'Hata' }
                }));
                return false;
            }
        } catch (error) {
            console.error('TEFAS fetch error:', error);
            if (!isAuto) alert('Bir hata oluştu: ' + error);
            return false;
        }
    };

    const handleManualSelect = async (asset: string) => {
        const { updateAssetDataSource } = await import('@/actions');
        await updateAssetDataSource(asset, 'MANUAL', asset);

        setViewSettings(prev => ({
            ...prev,
            [asset]: { ...(prev[asset] || {}), dataSource: 'MANUAL' }
        }));

        setUpdateStatus(prev => ({
            ...prev,
            [asset]: { time: new Date().toLocaleTimeString(), status: 'success', msg: 'Manuel Mod' }
        }));
    };

    const handleYahooSelect = async (asset: string, isAuto = false) => {
        try {
            const { fetchYahooPriceAction, updateAssetDataSource } = await import('@/actions');

            if (!isAuto) {
                await updateAssetDataSource(asset, 'YAHOO', asset);
                setViewSettings(prev => ({
                    ...prev,
                    [asset]: { ...(prev[asset] || {}), dataSource: 'YAHOO' }
                }));
            }

            const result = await fetchYahooPriceAction(asset);

            if (result.success && result.price) {
                // Server-side already handles ounce-to-gram conversion for precious metals
                // Just determine the currency based on asset type
                let currency = 'USD';

                // Commodities (precious metals) are priced in USD
                if (!asset.endsWith('=F') && !['GC=F', 'PL=F', 'SI=F', 'PA=F', 'PF=F'].includes(asset)) {
                    // Non-commodity assets default to TRY unless they're stocks
                    currency = asset.includes('.IS') ? 'TRY' : 'USD';
                }

                await updateAssetPrice(asset, result.price, currency);

                setViewSettings(prev => ({
                    ...prev,
                    [asset]: {
                        ...(prev[asset] || { driver: 'USD' }),
                        manualPrice: result.price,
                        priceCurrency: currency,
                        dataSource: 'YAHOO'
                    }
                }));

                setUpdateStatus(prev => ({
                    ...prev,
                    [asset]: { time: new Date().toLocaleTimeString(), status: 'success', msg: 'Güncellendi' }
                }));
                return true;
            } else {
                if (!isAuto) alert(`${asset} için Yahoo fiyatı çekilemedi: ` + (result.error || 'Fiyat bulunamadı'));
                setUpdateStatus(prev => ({
                    ...prev,
                    [asset]: { time: new Date().toLocaleTimeString(), status: 'error', msg: 'Hata' }
                }));
                return false;
            }
        } catch (error) {
            console.error('Yahoo fetch error:', error);
            if (!isAuto) alert('Bir hata oluştu: ' + error);
            return false;
        }
    };

    const handleRateChange = (key: string, value: string) => {
        const val = parseFloat(value);
        if (key === 'usdTryRate') setUsdTryRate(val);
        // Persist
        saveUserPreference(key, value);
    };

    // Filter transactions based on selected user (for Admin)
    const filteredTransactions = useMemo(() => {
        if (!isAdmin || selectedUserId === 'all') return transactions;
        return transactions.filter(t => t.userId === selectedUserId);
    }, [transactions, isAdmin, selectedUserId]);

    // 1. Identify all unique assets
    const assets = useMemo(() => {
        const unique = new Set(filteredTransactions.map(t => (t.asset || 'GC=F').trim().toUpperCase()));
        return Array.from(unique);
    }, [filteredTransactions]);

    // 3. Calculate stats
    const assetStats = useMemo(() => {
        return assets.map(asset => {
            const normalizedAsset = asset.trim().toUpperCase();
            const assetTransactions = filteredTransactions.filter(t => (t.asset || 'GC=F').trim().toUpperCase() === normalizedAsset);

            // Get settings for this asset (driver, manualPrice)
            const settings = viewSettings[normalizedAsset] || { driver: 'USD' };
            const priceInfo = {
                price: settings.manualPrice || 0,
                currency: settings.priceCurrency || 'USD'
            };

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
    }, [filteredTransactions, assets, viewSettings, usdTryRate, eurUsdRate, gbpUsdRate]);

    // Single-pass Auto Update
    useEffect(() => {
        if (hasRun) return;
        if (assetStats.length === 0) {
            const t = setTimeout(() => setIsLoading(false), 10000);
            return () => clearTimeout(t);
        }

        const runAutoUpdate = async () => {
            setHasRun(true);

            const { updateAssetDataSource } = await import('@/actions');
            const total = assetStats.length;
            let count = 0;

            for (const stat of assetStats) {
                count++;
                const percent = Math.round((count / total) * 100);
                setLoadingProgress(percent);

                if (['USD', 'EUR', 'GBP', 'TRY', 'USDT'].includes(stat.asset)) {
                    continue;
                }

                // Use global store settings if viewing own profile (prevents sync delays)
                const currentSettings = (isAdmin && selectedUserId !== 'all') ? viewSettings : assetSettings;
                let settings = currentSettings[stat.asset] as any || {};
                let source = settings?.dataSource;

                // --- Smart Fetch Logic ---
                // Helper function to check if we should fetch TEFAS data
                const shouldFetchTefas = () => {
                    const now = new Date();
                    const currentHour = now.getHours();

                    // Only fetch after 9 AM
                    if (currentHour < 9) {
                        return false;
                    }

                    // Check if we already fetched today
                    const lastFetched = settings?.lastFetchedAt;
                    if (!lastFetched) {
                        return true; // Never fetched before
                    }

                    const lastFetchedDate = new Date(lastFetched);
                    const today = new Date();

                    // Check if last fetch was today
                    const isSameDay = lastFetchedDate.getDate() === today.getDate() &&
                        lastFetchedDate.getMonth() === today.getMonth() &&
                        lastFetchedDate.getFullYear() === today.getFullYear();

                    return !isSameDay; // Fetch if not fetched today
                };

                let delay = 300; // Default delay for fetch operations

                if (!source) {
                    setLoadingMessage(`${stat.asset} kaynağı aranıyor...`);
                    // Discovery
                    let success = false;
                    if (stat.asset.length === 3 && /^[A-Z]+$/.test(stat.asset)) {
                        if (shouldFetchTefas()) {
                            success = await handleFetchTefasPrice(stat.asset, true);
                            if (success) {
                                source = 'TEFAS';
                                await updateAssetDataSource(stat.asset, 'TEFAS', stat.asset);
                            } else {
                                success = await handleYahooSelect(stat.asset, true);
                                if (success) {
                                    source = 'YAHOO';
                                    await updateAssetDataSource(stat.asset, 'YAHOO', stat.asset);
                                }
                            }
                        } else {
                            // Skip TEFAS fetch, use cached price
                            // Don't show loading message for cache
                            // setLoadingMessage(`${stat.asset} (Önbellekten)...`);
                            const lastFetchTime = settings?.lastFetchedAt
                                ? new Date(settings.lastFetchedAt).toLocaleTimeString()
                                : new Date().toLocaleTimeString();

                            setUpdateStatus(prev => ({
                                ...prev,
                                [stat.asset]: {
                                    time: lastFetchTime,
                                    status: 'success',
                                    msg: 'Önbellek'
                                }
                            }));
                            delay = 10; // Almost instant for cache
                        }
                    } else {
                        success = await handleYahooSelect(stat.asset, true);
                        if (success) {
                            source = 'YAHOO';
                            await updateAssetDataSource(stat.asset, 'YAHOO', stat.asset);
                        }
                    }
                } else if (source === 'TEFAS') {
                    if (shouldFetchTefas()) {
                        setLoadingMessage(`TEFAS: ${stat.asset}...`);
                        await handleFetchTefasPrice(stat.asset, true);
                    } else {
                        // Skip fetch, use cached price
                        // Don't show loading message for cache to speed up UI perception
                        const lastFetchTime = settings?.lastFetchedAt
                            ? new Date(settings.lastFetchedAt).toLocaleTimeString()
                            : new Date().toLocaleTimeString();

                        setUpdateStatus(prev => ({
                            ...prev,
                            [stat.asset]: {
                                time: lastFetchTime,
                                status: 'success',
                                msg: 'Önbellek'
                            }
                        }));
                        delay = 10; // Almost instant
                    }
                } else if (source === 'YAHOO') {
                    // Always fetch Yahoo prices (real-time data)
                    setLoadingMessage(`Yahoo: ${stat.asset}...`);
                    await handleYahooSelect(stat.asset, true);
                } else if (source === 'MANUAL') {
                    setLoadingMessage(`${stat.asset} (Manuel)...`);
                    setUpdateStatus(prev => ({
                        ...prev,
                        [stat.asset]: { time: new Date().toLocaleTimeString(), status: 'success', msg: 'Manuel' }
                    }));
                }

                await new Promise(r => setTimeout(r, delay));
            }

            setLoadingProgress(100);
            setLoadingMessage('İşlem Tamamlandı');
            await new Promise(r => setTimeout(r, 1500));
            setIsLoading(false);
        };

        const timer = setTimeout(runAutoUpdate, 500);
        return () => clearTimeout(timer);
    }, [assetStats.length, hasRun]);

    const totalPortfolioValueUSD = assetStats.reduce((sum, item) => sum + (item.totalValueUSD || 0), 0);
    const totalPortfolioCostUSD = assetStats.reduce((sum, item) => sum + (item.totalCostUSD || 0), 0);
    const allTimeProfitUSD = assetStats.reduce((sum, item) => sum + (item.profitUSD || 0), 0);
    const allTimeProfitRatioUSD = totalPortfolioCostUSD > 0 ? (allTimeProfitUSD / totalPortfolioCostUSD) * 100 : 0;

    const totalPortfolioValueTRY = assetStats.reduce((sum, item) => sum + (item.totalValueTRY || 0), 0);
    const totalPortfolioCostTRY = assetStats.reduce((sum, item) => sum + (item.totalCostTRY || 0), 0);
    const allTimeProfitTRY = assetStats.reduce((sum, item) => sum + (item.profitTRY || 0), 0);
    const allTimeProfitRatioTRY = totalPortfolioCostTRY > 0 ? (allTimeProfitTRY / totalPortfolioCostTRY) * 100 : 0;

    // Load year-ago stats from monthly history
    const [oneYearAgoStats, setOneYearAgoStats] = useState<{ valueUSD: number, valueTRY: number, date: Date }>({
        valueUSD: 0,
        valueTRY: 0,
        date: new Date(new Date().getFullYear() - 1, new Date().getMonth(), 1)
    });

    useEffect(() => {
        const loadYearAgoStats = async () => {
            const now = new Date();
            const oneYearAgo = new Date(now.getFullYear() - 1, now.getMonth(), 1);

            try {
                const history = await getMonthlyHistory();

                // Find record for the same month last year
                const record = history.find(h => {
                    const hDate = new Date(h.date);
                    return hDate.getFullYear() === oneYearAgo.getFullYear() &&
                        hDate.getMonth() === oneYearAgo.getMonth();
                });

                if (record) {
                    setOneYearAgoStats({
                        valueUSD: record.totalValueUSD,
                        valueTRY: record.totalValueTRY,
                        date: new Date(record.date)
                    });
                } else {
                    // Fallback: calculate from transactions
                    const histTransactions = filteredTransactions.filter(t => new Date(t.date) <= oneYearAgo);
                    if (histTransactions.length === 0) {
                        setOneYearAgoStats({ valueUSD: 0, valueTRY: 0, date: oneYearAgo });
                        return;
                    }

                    const histAssetsNames = Array.from(new Set(histTransactions.map(t => (t.asset || 'GC=F').trim().toUpperCase())));
                    let totalValUSD = 0;
                    let totalValTRY = 0;

                    histAssetsNames.forEach(asset => {
                        const assetTxs = histTransactions.filter(t => (t.asset || 'GC=F').trim().toUpperCase() === asset);
                        let histPriceUSD = 0;
                        const lastTx = [...assetTxs].reverse().find(t => t.priceUSD > 0);
                        if (lastTx) histPriceUSD = lastTx.priceUSD;
                        if (asset === 'TRY') histPriceUSD = 1 / (lastTx?.usdRate || 33.50);
                        else if (asset === 'USD') histPriceUSD = 1;

                        const stats = calculateAssetStats(assetTxs, histPriceUSD, lastTx?.usdRate || 33.50);
                        totalValUSD += stats.totalValueUSD;
                        totalValTRY += stats.totalValueTRY;
                    });

                    setOneYearAgoStats({ valueUSD: totalValUSD, valueTRY: totalValTRY, date: oneYearAgo });
                }
            } catch (e) {
                console.error('Error loading year-ago stats:', e);
            }
        };

        loadYearAgoStats();
    }, [filteredTransactions.length]);

    const periodProfitUSD = totalPortfolioValueUSD - oneYearAgoStats.valueUSD;
    const periodGrowthUSD = oneYearAgoStats.valueUSD > 0 ? (periodProfitUSD / oneYearAgoStats.valueUSD) * 100 : 0;
    const periodProfitTRY = totalPortfolioValueTRY - oneYearAgoStats.valueTRY;
    const periodGrowthTRY = oneYearAgoStats.valueTRY > 0 ? (periodProfitTRY / oneYearAgoStats.valueTRY) * 100 : 0;

    // Use currentPrices logic for chart (derived from viewSettings)
    const currentPrices = useMemo(() => {
        const prices: any = {};
        assets.forEach(asset => {
            const settings = viewSettings[asset];
            if (settings?.manualPrice) {
                prices[asset] = {
                    price: settings.manualPrice,
                    currency: settings.priceCurrency || 'USD'
                };
            }
        });
        return prices;
    }, [assets, viewSettings]);

    const handleUpdateDriver = (asset: string, driver: 'USD' | 'TRY') => {
        if (isAdmin && selectedUserId !== 'all') return;
        updateDriver(asset, driver);
    };

    const handleUpdateAssetPrice = (asset: string, price: number, currency: string) => {
        if (isAdmin && selectedUserId !== 'all') return;
        updateAssetPrice(asset, price, currency);
    };

    if (isLoading) {
        return (
            <div className="position-fixed top-0 start-0 w-100 h-100 d-flex flex-column justify-content-center align-items-center bg-white"
                style={{ zIndex: 9999, opacity: 1 }}>
                <div className="mb-4">
                    <div className="spinner-border text-primary" role="status" style={{ width: '3rem', height: '3rem' }}>
                        <span className="visually-hidden">Yükleniyor...</span>
                    </div>
                </div>
                <h2 className="display-6 fw-bold text-dark mb-3">{loadingProgress}%</h2>
                <div className="progress w-50 mb-3" style={{ height: '8px' }}>
                    <div
                        className="progress-bar bg-primary progress-bar-striped progress-bar-animated dropdown-transition"
                        role="progressbar"
                        style={{ width: `${loadingProgress}%`, transition: 'width 0.5s ease' }}
                    ></div>
                </div>
                <div className="text-secondary fw-medium text-uppercase ls-1">
                    {loadingMessage}
                </div>
            </div>
        );
    }

    return (
        <div className="position-relative">
            {/* Portfolio History Chart */}
            <PortfolioChart
                transactions={filteredTransactions}
                currentPrices={currentPrices}
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
                            step="0.01"
                            onChange={(e) => handleRateChange('usdTryRate', e.target.value)}
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
                            <div className="display-4 fw-bold mb-3 d-flex align-items-baseline">
                                ${totalPortfolioValueUSD.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                            </div>
                            {oneYearAgoStats.valueUSD > 0 && (
                                <div className="mt-2">
                                    <div className="text-white-50 small mb-2">
                                        Geçen yıl aynı aya göre: {new Date(oneYearAgoStats.date).toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' })}
                                    </div>
                                    <div className="d-flex align-items-center gap-3">
                                        <span className={`badge ${periodProfitUSD >= 0 ? 'bg-success' : 'bg-danger'} fs-6 px-3 py-2`}>
                                            {periodProfitUSD >= 0 ? '+' : ''}{periodGrowthUSD.toFixed(1)}%
                                        </span>
                                        <span className="text-white fw-bold fs-5">
                                            {periodProfitUSD >= 0 ? '+' : ''}${periodProfitUSD.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                        </span>
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="col-md-6 ps-md-5">
                            <h6 className="text-white-50 text-uppercase ls-1 mb-2">Toplam (TRY)</h6>
                            <div className="display-4 fw-bold mb-3 d-flex align-items-baseline">
                                ₺{totalPortfolioValueTRY.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                            </div>
                            {oneYearAgoStats.valueTRY > 0 && (
                                <div className="mt-2">
                                    <div className="text-white-50 small mb-2">
                                        Geçen yıl aynı aya göre: {new Date(oneYearAgoStats.date).toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' })}
                                    </div>
                                    <div className="d-flex align-items-center gap-3">
                                        <span className={`badge ${periodProfitTRY >= 0 ? 'bg-success' : 'bg-danger'} fs-6 px-3 py-2`}>
                                            {periodProfitTRY >= 0 ? '+' : ''}{periodGrowthTRY.toFixed(1)}%
                                        </span>
                                        <span className="text-white fw-bold fs-5">
                                            {periodProfitTRY >= 0 ? '+' : ''}₺{periodProfitTRY.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                        </span>
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
                                    <div className="d-flex flex-column">
                                        <h6 className="mb-0 fw-bold">{stat.asset}</h6>
                                        <span
                                            className={`badge mt-1 ${viewSettings[stat.asset]?.driver === 'USD' ? 'bg-info text-dark' : 'bg-warning text-dark'}`}
                                            style={{ fontSize: '0.6rem', cursor: 'pointer', width: 'fit-content' }}
                                            onClick={() => handleUpdateDriver(stat.asset, viewSettings[stat.asset]?.driver === 'USD' ? 'TRY' : 'USD')}
                                        >
                                            {viewSettings[stat.asset]?.driver === 'USD' ? 'USD Bazlı' : 'TL Bazlı'}
                                        </span>
                                    </div>
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

                                        {/* Data Source Selection */}
                                        <div className="mb-3">
                                            <div className="d-flex justify-content-between align-items-center mb-2">
                                                <div className="small text-muted" style={{ fontSize: '0.7rem' }}>Fiyat Kaynağı</div>
                                                {updateStatus[stat.asset] && (
                                                    <span className={`badge ${updateStatus[stat.asset].status === 'success' ? 'bg-success text-white' : 'bg-danger text-white'} rounded-pill fw-normal ms-auto`} style={{ fontSize: '0.75rem' }}>
                                                        {updateStatus[stat.asset].status === 'success' ? '✓' : '✗'} {updateStatus[stat.asset].time}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="btn-group btn-group-sm w-100 shadow-sm" role="group">
                                                <button
                                                    type="button"
                                                    className={`btn ${(viewSettings[stat.asset] as any)?.dataSource === 'MANUAL' ? 'btn-secondary text-white' : 'btn-outline-secondary'}`}
                                                    onClick={() => handleManualSelect(stat.asset)}
                                                >
                                                    Manuel
                                                </button>
                                                <button
                                                    type="button"
                                                    className={`btn ${(viewSettings[stat.asset] as any)?.dataSource === 'TEFAS' ? 'btn-info text-white' : 'btn-outline-info'}`}
                                                    onClick={() => handleFetchTefasPrice(stat.asset)}
                                                >
                                                    TEFAS
                                                </button>
                                                <button
                                                    type="button"
                                                    className={`btn ${(viewSettings[stat.asset] as any)?.dataSource === 'YAHOO' ? 'btn-success text-white' : 'btn-outline-success'}`}
                                                    onClick={() => handleYahooSelect(stat.asset)}
                                                >
                                                    Yahoo
                                                </button>
                                            </div>
                                        </div>

                                        <div className="mt-2 border-top pt-2">
                                            <div className="row g-1">
                                                <div className="col-6">
                                                    <input type="number"
                                                        className="form-control form-control-sm"
                                                        placeholder="USD Price"
                                                        onChange={(e) => handleUpdateAssetPrice(stat.asset, parseFloat(e.target.value), 'USD')}
                                                        value={viewSettings[stat.asset]?.priceCurrency === 'USD' ? (viewSettings[stat.asset]?.manualPrice || '') : ''}
                                                    />
                                                </div>
                                                <div className="col-6">
                                                    <input type="number"
                                                        className="form-control form-control-sm"
                                                        placeholder="TRY Price"
                                                        onChange={(e) => handleUpdateAssetPrice(stat.asset, parseFloat(e.target.value), 'TRY')}
                                                        value={viewSettings[stat.asset]?.priceCurrency === 'TRY' ? (viewSettings[stat.asset]?.manualPrice || '') : ''}
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
