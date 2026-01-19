"use client";

import React, { useMemo, useState } from 'react';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
} from 'recharts';
import { Transaction } from '@/lib/types';

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
    const [range, setRange] = useState<string>('2Y');

    const chartData = useMemo(() => {
        if (transactions.length === 0) return [];

        // 1. Sort Transactions Chronologically
        const sortedTransactions = [...transactions]
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        // 2. Determine Date Range
        const now = new Date();
        const firstTransactionDate = new Date(sortedTransactions[0].date);
        const maxTransactionDate = new Date(Math.max(...sortedTransactions.map(t => new Date(t.date).getTime())));
        const endDate = maxTransactionDate > now ? maxTransactionDate : now;

        // Determine start date based on range selection
        let rangeStartDate = new Date(now);
        if (range === '1W') rangeStartDate.setDate(now.getDate() - 7);
        else if (range === '1M') rangeStartDate.setMonth(now.getMonth() - 1);
        else if (range === '6M') rangeStartDate.setMonth(now.getMonth() - 6);
        else if (range === '1Y') rangeStartDate.setFullYear(now.getFullYear() - 1);
        else if (range === '2Y') rangeStartDate.setFullYear(now.getFullYear() - 2);
        else if (range === '3Y') rangeStartDate.setFullYear(now.getFullYear() - 3);
        else if (range === '5Y') rangeStartDate.setFullYear(now.getFullYear() - 5);

        const startMonth = new Date(rangeStartDate.getFullYear(), rangeStartDate.getMonth(), 1);
        const endMonth = new Date(now.getFullYear(), now.getMonth(), 1);

        // 3. Initialize State
        const holdings: Record<string, number> = {}; // asset -> amount
        const lastPrices: Record<string, number> = {}; // asset -> priceUSD
        let lastUsdRate = sortedTransactions[0].usdRate || currentUsdRate || 30.0;
        let transactionIndex = 0;

        const chartDataPoints = [];

        // 4. Iterate Month by Month
        let currentMonth = new Date(firstTransactionDate.getFullYear(), firstTransactionDate.getMonth(), 1);

        while (currentMonth <= endMonth) {
            const nextMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1);
            const isCurrentMonth = currentMonth.getTime() === endMonth.getTime();

            // Process transactions in THIS month (or ALL REMAINING if it's the current/last month in chart)
            while (
                transactionIndex < sortedTransactions.length &&
                (isCurrentMonth || new Date(sortedTransactions[transactionIndex].date) < nextMonth)
            ) {
                const t = sortedTransactions[transactionIndex];
                const assetKey = (t.asset || 'GOLD').trim().toUpperCase();
                const tAmount = Number(t.amount || 0);
                const tPriceUSD = Number(t.priceUSD || 0);
                const tUsdRate = Number(t.usdRate || 0);

                // Update Holdings
                const currentAmount = holdings[assetKey] || 0;
                if (t.type === 'BUY') {
                    holdings[assetKey] = currentAmount + tAmount;
                } else {
                    holdings[assetKey] = Math.max(0, currentAmount - tAmount);
                }

                // Update Price (always store in USD for internal valuation)
                if (tPriceUSD > 0) lastPrices[assetKey] = tPriceUSD;
                if (tUsdRate > 0) lastUsdRate = tUsdRate;

                transactionIndex++;
            }

            // Valuation
            if (currentMonth >= startMonth) {
                let totalValueUSD = 0;

                // Sync with Dashboard for current month
                if (isCurrentMonth) {
                    const effectiveUsdRate = Number(currentUsdRate && currentUsdRate > 0 ? currentUsdRate : lastUsdRate);

                    Object.keys(holdings).forEach(asset => {
                        const amount = Number(holdings[asset] || 0);
                        if (amount <= 0) return;

                        let priceUSD = 0;
                        const normalizedAsset = asset.toUpperCase();

                        if (normalizedAsset === 'TRY') {
                            priceUSD = effectiveUsdRate > 0 ? 1 / effectiveUsdRate : 0;
                        } else if (normalizedAsset === 'USD') {
                            priceUSD = 1;
                        } else if (normalizedAsset === 'EUR') {
                            priceUSD = Number(eurUsdRate || 1.08);
                        } else if (normalizedAsset === 'GBP') {
                            priceUSD = Number(gbpUsdRate || 1.27);
                        } else {
                            const priceData = currentPrices[normalizedAsset];
                            if (priceData && Number(priceData.price) > 0) {
                                if (priceData.currency === 'TRY') {
                                    priceUSD = effectiveUsdRate > 0 ? Number(priceData.price) / effectiveUsdRate : 0;
                                } else {
                                    priceUSD = Number(priceData.price);
                                }
                            } else {
                                priceUSD = Number(lastPrices[normalizedAsset] || 0);
                            }
                        }
                        totalValueUSD += amount * priceUSD;
                    });
                    lastUsdRate = effectiveUsdRate;
                } else {
                    // Historical Valuation
                    Object.keys(holdings).forEach(asset => {
                        const amount = Number(holdings[asset] || 0);
                        if (amount <= 0) return;

                        let priceUSD = 0;
                        const normalizedAsset = asset.toUpperCase();
                        if (normalizedAsset === 'TRY') {
                            priceUSD = lastUsdRate > 0 ? 1 / lastUsdRate : 0;
                        } else if (normalizedAsset === 'USD') {
                            priceUSD = 1;
                        } else {
                            priceUSD = Number(lastPrices[normalizedAsset] || 0);
                        }
                        totalValueUSD += amount * priceUSD;
                    });
                }

                const totalValueTRY = totalValueUSD * lastUsdRate;
                chartDataPoints.push({
                    date: `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}`,
                    valueUSD: totalValueUSD,
                    valueTRY: totalValueTRY,
                    totalValueDisplay: currency === 'USD' ? totalValueUSD : totalValueTRY
                });
            }

            currentMonth = nextMonth;
        }

        return chartDataPoints;

    }, [transactions, currentPrices, currentUsdRate, eurUsdRate, gbpUsdRate, range, currency]);

    if (chartData.length === 0) return null;

    const activeColor = currency === 'USD' ? '#0d6efd' : '#198754';

    return (
        <div className="card shadow-lg border-0 mb-5 overflow-hidden bg-dark text-white">
            <div className="card-header bg-dark border-bottom border-secondary py-3">
                <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3">
                    <h5 className="mb-0 fw-bold">Portföy Değeri Değişimi</h5>

                    <div className="d-flex align-items-center gap-2 overflow-auto pb-1 pb-md-0">
                        {/* Time Range Selector */}
                        <div className="btn-group btn-group-sm">
                            {['1W', '1M', '6M', '1Y', '2Y', '3Y', '5Y'].map((r) => (
                                <button
                                    key={r}
                                    type="button"
                                    className={`btn btn-sm ${range === r ? 'btn-light' : 'btn-outline-secondary border-secondary text-secondary'}`}
                                    onClick={() => setRange(r)}
                                    style={{ fontSize: '0.7rem' }}
                                >
                                    {r}
                                </button>
                            ))}
                        </div>

                        {/* Currency Toggle */}
                        <div className="btn-group btn-group-sm ms-md-2">
                            <button
                                className={`btn ${currency === 'USD' ? 'btn-primary' : 'btn-outline-primary border-primary text-primary'}`}
                                onClick={() => setCurrency('USD')}
                                style={{ width: '45px', fontSize: '0.7rem' }}
                            >
                                USD
                            </button>
                            <button
                                className={`btn ${currency === 'TRY' ? 'btn-success' : 'btn-outline-success border-success text-success'}`}
                                onClick={() => setCurrency('TRY')}
                                style={{ width: '45px', fontSize: '0.7rem' }}
                            >
                                TRY
                            </button>
                        </div>
                    </div>
                </div>
            </div>
            <div className="card-body p-0 pt-4" style={{ height: '350px' }}>
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                        data={chartData}
                        margin={{ top: 10, right: 10, left: 10, bottom: 0 }}
                    >
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#444" opacity={0.5} />
                        <XAxis
                            dataKey="date"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fontSize: 11, fill: '#aaa' }}
                            tickFormatter={(val) => {
                                const [y, m] = val.split('-');
                                return `${m}/${y.substring(2)}`;
                            }}
                            minTickGap={30}
                        />
                        <YAxis
                            hide
                            domain={['auto', 'auto']}
                        />
                        <Tooltip
                            contentStyle={{
                                backgroundColor: '#212529',
                                border: '1px solid #444',
                                borderRadius: '8px',
                                boxShadow: '0 4px 12px rgba(0,0,0,0.5)'
                            }}
                            itemStyle={{ color: '#fff', fontWeight: 'bold' }}
                            labelStyle={{ color: '#aaa', marginBottom: '4px' }}
                            formatter={(value: any) => {
                                const val = Number(value) || 0;
                                return [
                                    currency === 'USD'
                                        ? `$${val.toLocaleString(undefined, { maximumFractionDigits: 0 })}`
                                        : `₺${val.toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
                                    "Toplam Değer"
                                ];
                            }}
                            labelFormatter={(label) => {
                                const [y, m] = label.split('-');
                                const months = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
                                return `${months[parseInt(m) - 1]} ${y}`;
                            }}
                        />
                        <Bar
                            dataKey={currency === 'USD' ? "valueUSD" : "valueTRY"}
                            fill={activeColor}
                            radius={[4, 4, 0, 0]}
                            name="Toplam Değer"
                        />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
