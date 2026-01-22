const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function createSafeBackup() {
    try {
        console.log('🔒 Creating safe backup before remote deploy...');

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
        const backupDir = path.join(__dirname, '..', 'backups');

        // Create backups directory if it doesn't exist
        if (!fs.existsSync(backupDir)) {
            fs.mkdirSync(backupDir, { recursive: true });
        }

        // Fetch all data
        const [users, transactions, monthlyHistory, assetSettings, assetDataSources, userPreferences] = await Promise.all([
            prisma.user.findMany(),
            prisma.transaction.findMany(),
            prisma.monthlyHistory.findMany(),
            prisma.assetSettings.findMany(),
            prisma.assetDataSource.findMany(),
            prisma.userPreference.findMany()
        ]);

        const backup = {
            timestamp,
            users,
            transactions,
            monthlyHistory,
            assetSettings,
            assetDataSources,
            userPreferences,
            counts: {
                users: users.length,
                transactions: transactions.length,
                monthlyHistory: monthlyHistory.length,
                assetSettings: assetSettings.length,
                assetDataSources: assetDataSources.length,
                userPreferences: userPreferences.length
            }
        };

        const filename = `local-backup-${timestamp}.json`;
        const filepath = path.join(backupDir, filename);

        fs.writeFileSync(filepath, JSON.stringify(backup, null, 2));

        console.log('✅ Backup created successfully!');
        console.log(`📁 File: ${filename}`);
        console.log(`📊 Data counts:`, backup.counts);

        return filepath;
    } catch (error) {
        console.error('❌ Backup failed:', error);
        throw error;
    } finally {
        await prisma.$disconnect();
    }
}

createSafeBackup();
