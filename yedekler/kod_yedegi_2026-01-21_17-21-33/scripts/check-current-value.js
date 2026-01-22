const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkCurrentValue() {
    try {
        // Get all transactions
        const transactions = await prisma.transaction.findMany({
            orderBy: { date: 'asc' }
        });

        console.log('=== Transaction Summary ===');
        console.log(`Total transactions: ${transactions.length}\n`);

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

        console.log('=== Current Holdings ===');
        Object.entries(holdings).forEach(([asset, amount]) => {
            if (amount > 0) {
                console.log(`${asset}: ${amount.toLocaleString(undefined, { maximumFractionDigits: 4 })}`);
            }
        });

        // Get latest monthly history record
        const latestHistory = await prisma.monthlyHistory.findFirst({
            orderBy: { date: 'desc' }
        });

        if (latestHistory) {
            console.log('\n=== Latest Monthly History Record ===');
            console.log(`Date: ${latestHistory.date.toISOString().split('T')[0]}`);
            console.log(`USD: $${latestHistory.totalValueUSD.toLocaleString()}`);
            console.log(`TRY: ₺${latestHistory.totalValueTRY.toLocaleString()}`);
        }

        // Get asset settings to see current prices
        const assetSettings = await prisma.assetSettings.findMany();

        console.log('\n=== Current Asset Prices ===');
        assetSettings.forEach(setting => {
            if (setting.manualPrice) {
                console.log(`${setting.asset}: ${setting.manualPrice} ${setting.priceCurrency || 'USD'}`);
            }
        });

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

checkCurrentValue();
