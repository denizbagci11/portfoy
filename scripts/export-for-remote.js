const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function exportForRemote() {
    try {
        console.log('📦 Exporting data for remote deployment...');

        // Fetch all data
        const [users, transactions, monthlyHistory, assetSettings, assetDataSources, userPreferences] = await Promise.all([
            prisma.user.findMany(),
            prisma.transaction.findMany(),
            prisma.monthlyHistory.findMany(),
            prisma.assetSettings.findMany(),
            prisma.assetDataSource.findMany(),
            prisma.userPreference.findMany()
        ]);

        const exportData = {
            users,
            transactions,
            monthlyHistory,
            assetSettings,
            assetDataSources,
            userPreferences
        };

        const filename = 'remote-import-data.json';
        const filepath = path.join(__dirname, '..', filename);

        fs.writeFileSync(filepath, JSON.stringify(exportData, null, 2));

        console.log('✅ Export completed!');
        console.log(`📁 File: ${filename}`);
        console.log(`📊 Counts:`, {
            users: users.length,
            transactions: transactions.length,
            monthlyHistory: monthlyHistory.length,
            assetSettings: assetSettings.length,
            assetDataSources: assetDataSources.length,
            userPreferences: userPreferences.length
        });

    } catch (error) {
        console.error('❌ Export failed:', error);
        throw error;
    } finally {
        await prisma.$disconnect();
    }
}

exportForRemote();
