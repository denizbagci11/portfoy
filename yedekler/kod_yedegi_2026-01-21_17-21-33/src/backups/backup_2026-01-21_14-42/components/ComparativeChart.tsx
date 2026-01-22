"use client";

import React, { useMemo } from 'react';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    ReferenceLine,
    Cell,
    LabelList
} from 'recharts';
import { calculateAssetStats } from '@/lib/finance';
import { Transaction } from '@/lib/types';

interface ComparativeChartProps {
    transactions: Transaction[];
    currentPrices: Record<string, { price: number; currency?: 'USD' | 'TRY' }>;
    usdTryRate: number;
    eurUsdRate: number;
    gbpUsdRate: number;
}

// Hardcoded Indices for External Benchmarks (SP500, BIST100)
// Updated to approximate realistic market movements if needed, but keeping static for now as we lack dynamic feeds for these.
const INDEX_BASE_JAN_2025 = {
    sp500: 6040,
    bist100_usd: 265
};

const INDEX_CURRENT_JAN_2026 = {
    sp500: 6927,
    bist100_usd: 295
};

export default function ComparativeChart({
    transactions,
    currentPrices,
    usdTryRate,
    eurUsdRate,
    gbpUsdRate
}: ComparativeChartProps) {

    const chartData = useMemo(() => {
        if (transactions.length === 0) return [];

        // --- 1. Calculate Portfolio Performance (Dashboard Logic) ---
        // We use the same logic as DashboardStats: Growth = (Period Profit) / (Value 1 Year Ago)
        // This is resilient to deposits/withdrawals impacting the "Efficiency" ratio visually.

        const targetDate = new Date();
        targetDate.setFullYear(targetDate.getFullYear() - 1);
        targetDate.setHours(23, 59, 59, 999);

        const sorted = [...transactions].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        // A. Snapshot 1 Year Ago
        const histTransactions = sorted.filter(t => new Date(t.date) <= targetDate);

        // Find historical USD Rate (fallback logic same as Dashboard)
        let lastUsdRate1Y = 33.50;
        const lastTxWithRate = [...histTransactions].reverse().find(t => t.usdRate > 0);
        if (lastTxWithRate) lastUsdRate1Y = lastTxWithRate.usdRate;

        // Calculate Value and Profit 1 Year Ago
        let val1YUSD = 0;
        let cst1YUSD = 0;
        let prof1YUSD = 0;
        let goldPrice1Y = 0; // Capture Gold Price 1 Year Ago for Benchmark

        if (histTransactions.length > 0) {
            const histAssetsNames = Array.from(new Set(histTransactions.map(t => (t.asset || 'GC=F').trim().toUpperCase())));

            histAssetsNames.forEach(asset => {
                const assetTxs = histTransactions.filter(t => (t.asset || 'GC=F').trim().toUpperCase() === asset);

                // Determine Historical Price from Transactions
                let histPriceUSD = 0;

                // Specific Currency Handling
                if (asset === 'TRY') histPriceUSD = 1 / lastUsdRate1Y;
                else if (asset === 'USD') histPriceUSD = 1;
                else if (asset === 'EUR') histPriceUSD = 1.08; // Approx hist
                else if (asset === 'GBP') histPriceUSD = 1.27; // Approx hist
                else {
                    // Find last known price in history
                    const lastTx = [...assetTxs].reverse().find(t => t.priceUSD > 0);
                    if (lastTx) histPriceUSD = lastTx.priceUSD;
                }

                // Capture Gold specifically
                if (asset === 'GC=F' && histPriceUSD > 0) {
                    goldPrice1Y = histPriceUSD;
                }

                const stats = calculateAssetStats(assetTxs, histPriceUSD, lastUsdRate1Y);

                // SPECIAL LOGIC: Match DashboardStats overrides exactly (Also for History!)
                if (asset === 'USD') {
                    stats.profitUSD = 0;
                    stats.profitRatio = 0;
                    stats.totalCostUSD = stats.totalValueUSD;
                }

                val1YUSD += stats.totalValueUSD;
                prof1YUSD += stats.profitUSD;
                cst1YUSD += stats.totalCostUSD;
            });
        }

        // B. Snapshot Today
        let valTodayUSD = 0;
        let profTodayUSD = 0;
        let totalCstTodayUSD = 0;

        const allAssetsNames = Array.from(new Set(sorted.map(t => (t.asset || 'GC=F').trim().toUpperCase())));

        allAssetsNames.forEach(asset => {
            const assetTxs = sorted.filter(t => (t.asset || 'GC=F').trim().toUpperCase() === asset);
            const priceInfo = currentPrices[asset] || { price: 0, currency: 'USD' };

            const currentPrice = asset === 'TRY'
                ? (usdTryRate > 0 ? 1 / usdTryRate : 0)
                : asset === 'USD'
                    ? 1.0
                    : asset === 'EUR'
                        ? eurUsdRate
                        : asset === 'GBP'
                            ? gbpUsdRate
                            : (priceInfo.currency === 'TRY'
                                ? (usdTryRate > 0 ? priceInfo.price / usdTryRate : 0)
                                : priceInfo.price);

            const stats = calculateAssetStats(assetTxs, currentPrice, usdTryRate);

            // SPECIAL LOGIC: Match DashboardStats overrides exactly
            if (asset === 'USD') {
                stats.profitUSD = 0;
                stats.profitRatio = 0;
                stats.totalCostUSD = stats.totalValueUSD;
            }

            valTodayUSD += stats.totalValueUSD;
            profTodayUSD += stats.profitUSD;
            totalCstTodayUSD += stats.totalCostUSD;
        });

        // C. Calculate Portfolio Growth - REQUESTED: MATCH DASHBOARD TOTAL VALUE GROWTH
        // Formula: (TotalValueToday - TotalValue1Y) / TotalValue1Y

        const portfolioGrowth = val1YUSD > 0 ? ((valTodayUSD - val1YUSD) / val1YUSD) : 0;
        const portfolioFinalValue = portfolioGrowth * 100; // Display as %

        // --- 2. Calculate Gold Benchmark (Dynamic) ---
        let goldFinal = 0;
        const goldPriceNow = currentPrices['GC=F']?.currency === 'TRY'
            ? (currentPrices['GC=F'].price / usdTryRate)
            : (currentPrices['GC=F']?.price || 0);

        if (goldPriceNow > 0 && goldPrice1Y > 0) {
            const goldGrowth = (goldPriceNow - goldPrice1Y) / goldPrice1Y;
            goldFinal = goldGrowth * 100;
        } else {
            if (goldFinal === 0) goldFinal = 70; // Fallback approx 70%
        }

        // Indices
        const sp500Final = 100 * ((INDEX_CURRENT_JAN_2026.sp500 / INDEX_BASE_JAN_2025.sp500) - 1);
        const bistFinal = 100 * ((INDEX_CURRENT_JAN_2026.bist100_usd / INDEX_BASE_JAN_2025.bist100_usd) - 1);

        return [
            {
                name: 'Portföyüm',
                value: Number(portfolioFinalValue.toFixed(1)),
                color: '#268bd2', // Solar Blue
                debug: {
                    val1Y: val1YUSD,
                    prof1Y: prof1YUSD,
                    valToday: valTodayUSD,
                    profToday: profTodayUSD,
                    growth: (portfolioGrowth * 100)
                }
            },
            { name: 'S&P 500', value: Number(sp500Final.toFixed(1)), color: '#6c71c4' }, // Solar Violet
            { name: 'BIST 100 (USD)', value: Number(bistFinal.toFixed(1)), color: '#dc322f' }, // Solar Red
            { name: 'Ons Altın', value: Number(goldFinal.toFixed(1)), color: '#b58900' }, // Solar Yellow
        ];
    }, [transactions, currentPrices, usdTryRate, eurUsdRate, gbpUsdRate]);

    return (
        <div style={{ width: '100%', height: 400 }}>
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 40, right: 30, left: 20, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#586e75" strokeOpacity={0.4} />
                    <XAxis
                        dataKey="name"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 12, fontWeight: 'bold', fill: '#839496' }}
                    />
                    <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 10, fill: '#839496' }}
                        tickFormatter={(val) => `%${val}`}
                    />
                    <Tooltip
                        cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                        formatter={(value: any) => [`%${value}`, 'Yıllık Getiri']}
                        contentStyle={{
                            backgroundColor: '#073642',
                            borderColor: '#586e75',
                            borderRadius: '12px',
                            color: '#93a1a1',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
                        }}
                        itemStyle={{ color: '#93a1a1' }}
                    />
                    <ReferenceLine y={0} stroke="#839496" strokeWidth={1} />
                    <Bar dataKey="value" radius={[4, 4, 0, 0]} barSize={60}>
                        {chartData.map((entry: any, index: number) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                        <LabelList
                            dataKey="value"
                            position="top"
                            formatter={(val: any) => `%${val}`}
                            style={{ fontSize: 13, fontWeight: 'bold', fill: '#93a1a1' }}
                        />
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
}
