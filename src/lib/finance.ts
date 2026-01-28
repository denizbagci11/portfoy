import { Transaction } from './types';

// Custom XIRR Implementation (Newton-Raphson algorithm)
// Removes dependency on external packages which may fail in browser/client environments
function calculateXirr(cashflows: { amount: number; when: Date }[], guess = 0.1): number {
    if (cashflows.length < 2) return 0;

    let hasPositive = false;
    let hasNegative = false;
    for (const c of cashflows) {
        if (c.amount > 0) hasPositive = true;
        if (c.amount < 0) hasNegative = true;
    }
    if (!hasPositive || !hasNegative) return 0;

    cashflows.sort((a, b) => a.when.getTime() - b.when.getTime());
    const startDate = cashflows[0].when;

    // Normalize dates and amounts
    const normalizedCashflows = cashflows.map(c => ({
        amount: c.amount,
        years: Math.max(0.0001, (c.when.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 365.0))
    }));

    const f = (rate: number) => {
        const r1 = 1.0 + rate;
        if (r1 <= 0) return 1e100; // Large positive for rates near/under -100%
        let val = 0;
        for (const c of normalizedCashflows) {
            val += c.amount / Math.pow(r1, c.years);
        }
        return val;
    };

    const df = (rate: number) => {
        const r1 = 1.0 + rate;
        if (r1 <= 0) return -1e100;
        let val = 0;
        for (const c of normalizedCashflows) {
            val += -c.years * c.amount / Math.pow(r1, c.years + 1.0);
        }
        return val;
    };

    let rate = guess;
    // 1. Newton-Raphson
    for (let i = 0; i < 50; i++) {
        const fv = f(rate);
        const dfv = df(rate);
        if (Math.abs(dfv) < 1e-15) break;

        const nextRate = rate - fv / dfv;
        if (Math.abs(nextRate - rate) < 1e-8) return nextRate;
        rate = nextRate;
        if (isNaN(rate) || !isFinite(rate)) break;
    }

    // 2. Bisection with Expanding Search Range
    let low = -0.999999;
    let high = 1.0;

    // Find sign change by expanding high (essential for high short-term ROI)
    let iterations = 0;
    while (f(low) * f(high) > 0 && iterations < 60) {
        high *= 3.0; // Rapidly expand
        iterations++;
    }

    // If still no sign change, maybe Profit is so high or math is broken
    if (f(low) * f(high) > 0) {
        // Fallback: If f(low) is positive and still f(high) is positive, 
        // it means the root is even further out or doesn't exist.
        return 0;
    }

    for (let i = 0; i < 100; i++) {
        rate = (low + high) / 2;
        if (f(low) * f(rate) < 0) high = rate;
        else low = rate;
        if (Math.abs(high - low) < 1e-8) return rate;
    }

    return rate;
}


// Rename to calculateAssetStats since it calculates stats for a specific set of transactions (usually filtered by asset)
// Rename to calculateAssetStats since it calculates stats for a specific set of transactions (usually filtered by asset)
export const calculateAssetStats = (transactions: Transaction[], currentPriceUSD: number, currentUsdTryRate: number) => {
    if (transactions.length === 0) {
        return {
            totalAmount: 0,
            totalValueUSD: 0,
            totalCostUSD: 0,
            averageCostUSD: 0,
            profitUSD: 0,
            profitRatio: 0,
            // TRY Metrics
            totalValueTRY: 0,
            totalCostTRY: 0,
            profitTRY: 0,
            profitRatioTRY: 0,
            xirr: 0,
            daysInPortfolio: 0,
            realizedProfitUSD: 0,
            realizedProfitTRY: 0,
        };
    }

    // Find first transaction date
    const sortedTransactions = [...transactions].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const firstDate = new Date(sortedTransactions[0].date);
    const today = new Date();
    const daysInPortfolio = Math.max(0, Math.ceil((today.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24)));

    let totalAmount = 0;
    let totalCostUSD = 0;
    let totalCostTRY = 0;
    let realizedProfitUSD = 0;
    let realizedProfitTRY = 0;
    let totalInvestedUSD = 0;
    let totalInvestedTRY = 0;

    // XIRR Cashflow Dizisi
    interface Cashflow {
        amount: number;
        when: Date;
    }

    const cashflows: Cashflow[] = [];

    sortedTransactions.forEach(t => {
        const isBuy = t.type === 'BUY';
        const amount = Number(t.amount); // Force number
        const itemTotalUSD = Number(t.totalUSD);
        const itemTotalTRY = Number(t.totalTRY);

        // Bakiye
        if (isBuy) {
            totalAmount += amount;
            totalCostUSD += itemTotalUSD;
            totalCostTRY += itemTotalTRY;
            totalInvestedUSD += itemTotalUSD;
            totalInvestedTRY += itemTotalTRY;
        } else {
            // Maliyetten düşmek için ortalama maliyet yöntemini kullan
            if (totalAmount > 0) {
                // USD Maliyet Düşümü ve Realizasyon
                const avgUnitCostUSD = totalCostUSD / totalAmount;
                const saleCostUSD = avgUnitCostUSD * amount;
                realizedProfitUSD += (itemTotalUSD - saleCostUSD);
                totalCostUSD -= saleCostUSD;

                // TRY Maliyet Düşümü ve Realizasyon
                const avgUnitCostTRY = totalCostTRY / totalAmount;
                const saleCostTRY = avgUnitCostTRY * amount;
                realizedProfitTRY += (itemTotalTRY - saleCostTRY);
                totalCostTRY -= saleCostTRY;
            }
            totalAmount -= amount;
        }

        // XIRR Cashflow (USD Based)
        const d = new Date(t.date);
        d.setHours(0, 0, 0, 0);
        cashflows.push({
            amount: isBuy ? -itemTotalUSD : itemTotalUSD,
            when: d,
        });
    });

    // Güncel Durum (Terminal Value) - Normalize to END of today to ensure at least a small gap if same day
    const currentValueUSD = totalAmount * currentPriceUSD;
    const currentValueTRY = currentValueUSD * currentUsdTryRate;

    // Pozitif hayali kapanış
    if (totalAmount > 0.0001) {
        const now = new Date();
        now.setHours(23, 59, 59, 999);
        cashflows.push({
            amount: currentValueUSD,
            when: now,
        });
    }

    // XIRR Hesapla
    const xirrValue = calculateXirr(cashflows);

    // TRY kar hesaplaması (doğru)
    const totalProfitTRY = (currentValueTRY - totalCostTRY) + realizedProfitTRY;

    // USD kar hesaplaması: TL karını güncel kura böl (basit ve tutarlı)
    const totalProfitUSD = currentUsdTryRate > 0 ? totalProfitTRY / currentUsdTryRate : 0;

    return {
        totalAmount,
        totalValueUSD: currentValueUSD,
        totalCostUSD,
        averageCostUSD: totalAmount > 0.0001 ? totalCostUSD / totalAmount : 0,
        profitUSD: totalProfitUSD,
        profitRatio: totalInvestedUSD > 0.01 ? totalProfitUSD / totalInvestedUSD : 0,
        // TRY Metrics
        totalValueTRY: currentValueTRY,
        totalCostTRY,
        profitTRY: totalProfitTRY,
        profitRatioTRY: totalInvestedTRY > 0.01 ? totalProfitTRY / totalInvestedTRY : 0,
        xirr: xirrValue,
        daysInPortfolio,
        realizedProfitUSD,
        realizedProfitTRY,
        totalInvestedUSD,
    };
};

