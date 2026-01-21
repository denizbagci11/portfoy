const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function calculateLiveValue() {
    try {
        // Get all transactions
        const transactions = await prisma.transaction.findMany({
            orderBy: { date: 'asc' }
        });

        // Get asset settings for current prices
        const assetSettings = await prisma.assetSettings.findMany();

        // Get user preferences for exchange rates
        const preferences = await prisma.userPreference.findMany();

        const usdTryRate = parseFloat(preferences.find(p => p.key === 'usdTryRate')?.value || '33.50');
        const eurUsdRate = parseFloat(preferences.find(p => p.key === 'eurUsdRate')?.value || '1.08');
        const gbpUsdRate = parseFloat(preferences.find(p => p.key === 'gbpUsdRate')?.value || '1.27');

        console.log('=== Exchange Rates ===');
        console.log(`USD/TRY: ${usdTryRate}`);
        console.log(`EUR/USD: ${eurUsdRate}`);
        console.log(`GBP/USD: ${gbpUsdRate}`);

        // Calculate current holdings
        const holdings = {};
        transactions.forEach(t => {
            const asset = (t.asset || 'GOLD').trim().toUpperCase();
            const amount = Number(t.amount || 0);

            if (t.type === 'BUY') {
                holdings[asset] = (holdings[asset] || 0) + amount;
            } else {
                holdings[asset] = Math.max(0, (holdings[asset] || 0) - amount);
            }
        });

        // Calculate total value
        let totalUSD = 0;
        const assetValues = [];

        Object.entries(holdings).forEach(([asset, amount]) => {
            if (amount <= 0) return;

            let priceUSD = 0;
            const setting = assetSettings.find(s => s.asset === asset);

            if (asset === 'TRY') {
                priceUSD = usdTryRate > 0 ? 1 / usdTryRate : 0;
            } else if (asset === 'USD') {
                priceUSD = 1;
            } else if (asset === 'EUR') {
                priceUSD = eurUsdRate;
            } else if (asset === 'GBP') {
                priceUSD = gbpUsdRate;
            } else if (setting && setting.manualPrice) {
                if (setting.priceCurrency === 'TRY') {
                    priceUSD = usdTryRate > 0 ? setting.manualPrice / usdTryRate : 0;
                } else {
                    priceUSD = setting.manualPrice;
                }
            }

            const valueUSD = amount * priceUSD;
            totalUSD += valueUSD;

            assetValues.push({
                asset,
                amount,
                priceUSD,
                valueUSD,
                valueTRY: valueUSD * usdTryRate
            });
        });

        console.log('\n=== Live Portfolio Value Calculation ===');
        assetValues
            .sort((a, b) => b.valueUSD - a.valueUSD)
            .forEach(av => {
                console.log(`${av.asset}:`);
                console.log(`  Amount: ${av.amount.toLocaleString(undefined, { maximumFractionDigits: 4 })}`);
                console.log(`  Price: $${av.priceUSD.toFixed(2)}`);
                console.log(`  Value: $${av.valueUSD.toLocaleString(undefined, { maximumFractionDigits: 0 })} / ₺${av.valueTRY.toLocaleString(undefined, { maximumFractionDigits: 0 })}`);
            });

        const totalTRY = totalUSD * usdTryRate;

        console.log('\n=== LIVE TOTAL ===');
        console.log(`USD: $${totalUSD.toLocaleString(undefined, { maximumFractionDigits: 2 })}`);
        console.log(`TRY: ₺${totalTRY.toLocaleString(undefined, { maximumFractionDigits: 2 })}`);

        // Compare with database record
        const latestHistory = await prisma.monthlyHistory.findFirst({
            orderBy: { date: 'desc' }
        });

        if (latestHistory) {
            console.log('\n=== DATABASE RECORD (2026-01-31) ===');
            console.log(`USD: $${latestHistory.totalValueUSD.toLocaleString()}`);
            console.log(`TRY: ₺${latestHistory.totalValueTRY.toLocaleString()}`);

            console.log('\n=== DIFFERENCE ===');
            const diffUSD = totalUSD - latestHistory.totalValueUSD;
            const diffTRY = totalTRY - latestHistory.totalValueTRY;
            console.log(`USD: ${diffUSD >= 0 ? '+' : ''}$${diffUSD.toLocaleString(undefined, { maximumFractionDigits: 2 })}`);
            console.log(`TRY: ${diffTRY >= 0 ? '+' : ''}₺${diffTRY.toLocaleString(undefined, { maximumFractionDigits: 2 })}`);
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

calculateLiveValue();
