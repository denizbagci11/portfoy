import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const user = await prisma.user.findFirst();

    if (!user) {
        console.error('No user found');
        return;
    }

    console.log(`Adding current month snapshot for user: ${user.username}`);

    // Get all transactions
    const transactions = await prisma.transaction.findMany({
        where: { userId: user.id },
        orderBy: { date: 'asc' }
    });

    // Get asset settings for current prices
    const assetSettings = await prisma.assetSettings.findMany({
        where: { userId: user.id }
    });

    const userPrefs = await prisma.userPreference.findMany({
        where: { userId: user.id }
    });

    // Extract rates
    const usdTryRate = parseFloat(userPrefs.find(p => p.key === 'usdTryRate')?.value || '35.50');
    const eurUsdRate = parseFloat(userPrefs.find(p => p.key === 'eurUsdRate')?.value || '1.08');
    const gbpUsdRate = parseFloat(userPrefs.find(p => p.key === 'gbpUsdRate')?.value || '1.27');

    console.log(`Current USD/TRY Rate: ${usdTryRate}`);

    // Calculate holdings
    const holdings: Record<string, number> = {};

    transactions.forEach(t => {
        const asset = t.asset.trim().toUpperCase();
        const amount = Number(t.amount);

        if (t.type === 'BUY') {
            holdings[asset] = (holdings[asset] || 0) + amount;
        } else {
            holdings[asset] = Math.max(0, (holdings[asset] || 0) - amount);
        }
    });

    console.log('\nCurrent Holdings:');
    Object.entries(holdings).forEach(([asset, amount]) => {
        if (amount > 0) {
            console.log(`  ${asset}: ${amount}`);
        }
    });

    // Calculate total value
    let totalValueUSD = 0;

    Object.entries(holdings).forEach(([asset, amount]) => {
        if (amount <= 0) return;

        let priceUSD = 0;
        const settings = assetSettings.find(s => s.asset === asset);

        if (asset === 'TRY') {
            priceUSD = 1 / usdTryRate;
        } else if (asset === 'USD') {
            priceUSD = 1;
        } else if (asset === 'EUR') {
            priceUSD = eurUsdRate;
        } else if (asset === 'GBP') {
            priceUSD = gbpUsdRate;
        } else if (settings?.manualPrice) {
            if (settings.priceCurrency === 'TRY') {
                priceUSD = settings.manualPrice / usdTryRate;
            } else {
                priceUSD = settings.manualPrice;
            }
        }

        const valueUSD = amount * priceUSD;
        totalValueUSD += valueUSD;

        if (valueUSD > 0) {
            console.log(`  ${asset}: $${valueUSD.toFixed(2)} (${amount} × $${priceUSD.toFixed(2)})`);
        }
    });

    const totalValueTRY = totalValueUSD * usdTryRate;

    console.log(`\n📊 Total Portfolio Value:`);
    console.log(`   USD: $${totalValueUSD.toLocaleString(undefined, { maximumFractionDigits: 0 })}`);
    console.log(`   TRY: ₺${totalValueTRY.toLocaleString(undefined, { maximumFractionDigits: 0 })}`);

    // Save to database for January 2026
    const jan2026Date = new Date('2026-01-31T00:00:00.000Z');

    const existing = await prisma.monthlyHistory.findFirst({
        where: {
            userId: user.id,
            date: jan2026Date
        }
    });

    if (existing) {
        console.log(`\n✅ Updating existing January 2026 record...`);
        await prisma.monthlyHistory.update({
            where: { id: existing.id },
            data: {
                totalValueUSD: totalValueUSD,
                totalValueTRY: totalValueTRY
            }
        });
    } else {
        console.log(`\n✅ Creating new January 2026 record...`);
        await prisma.monthlyHistory.create({
            data: {
                date: jan2026Date,
                totalValueUSD: totalValueUSD,
                totalValueTRY: totalValueTRY,
                userId: user.id
            }
        });
    }

    console.log(`✅ Done!`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
