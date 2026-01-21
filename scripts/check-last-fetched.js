const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkLastFetched() {
    try {
        console.log('=== Checking Asset Settings for lastFetchedAt ===');

        const settings = await prisma.assetSettings.findMany();

        if (settings.length === 0) {
            console.log('No asset settings found.');
            return;
        }

        settings.forEach(setting => {
            console.log(`Asset: ${setting.asset}`);
            console.log(`  Driver: ${setting.driver}`);
            console.log(`  Price: ${setting.manualPrice} ${setting.priceCurrency}`);
            console.log(`  Last Fetched: ${setting.lastFetchedAt ? setting.lastFetchedAt.toLocaleString() : 'NULL'}`);
            console.log('---');
        });

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

checkLastFetched();
