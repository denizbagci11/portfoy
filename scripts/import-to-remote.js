const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function importToRemote() {
    try {
        console.log('🚀 Starting remote import...');
        console.log('⚠️  This will CLEAR all existing data and import fresh data!');

        // Read the export file
        const filepath = path.join(__dirname, '..', 'remote-import-data.json');

        if (!fs.existsSync(filepath)) {
            throw new Error('remote-import-data.json not found! Run export-for-remote.js first.');
        }

        const data = JSON.parse(fs.readFileSync(filepath, 'utf8'));

        console.log('📊 Data to import:', {
            users: data.users.length,
            transactions: data.transactions.length,
            monthlyHistory: data.monthlyHistory.length,
            assetSettings: data.assetSettings.length,
            assetDataSources: data.assetDataSources.length,
            userPreferences: data.userPreferences.length
        });

        // Clear existing data (in correct order due to foreign keys)
        console.log('🗑️  Clearing existing data...');
        await prisma.transaction.deleteMany({});
        await prisma.monthlyHistory.deleteMany({});
        await prisma.assetSettings.deleteMany({});
        await prisma.assetDataSource.deleteMany({});
        await prisma.userPreference.deleteMany({});
        await prisma.user.deleteMany({});

        console.log('✅ Existing data cleared');

        // Import new data (in correct order)
        console.log('📥 Importing users...');
        for (const user of data.users) {
            await prisma.user.create({ data: user });
        }

        console.log('📥 Importing transactions...');
        for (const transaction of data.transactions) {
            await prisma.transaction.create({
                data: {
                    ...transaction,
                    date: new Date(transaction.date)
                }
            });
        }

        console.log('📥 Importing monthly history...');
        for (const history of data.monthlyHistory) {
            await prisma.monthlyHistory.create({
                data: {
                    ...history,
                    date: new Date(history.date)
                }
            });
        }

        console.log('📥 Importing asset settings...');
        for (const setting of data.assetSettings) {
            await prisma.assetSettings.create({
                data: {
                    ...setting,
                    lastFetchedAt: setting.lastFetchedAt ? new Date(setting.lastFetchedAt) : null
                }
            });
        }

        console.log('📥 Importing asset data sources...');
        for (const source of data.assetDataSources) {
            await prisma.assetDataSource.create({
                data: {
                    ...source,
                    createdAt: new Date(source.createdAt),
                    updatedAt: new Date(source.updatedAt)
                }
            });
        }

        console.log('📥 Importing user preferences...');
        for (const pref of data.userPreferences) {
            await prisma.userPreference.create({ data: pref });
        }

        console.log('✅ Import completed successfully!');
        console.log('🎉 Remote database is now synced with local data!');

    } catch (error) {
        console.error('❌ Import failed:', error);
        throw error;
    } finally {
        await prisma.$disconnect();
    }
}

importToRemote();
