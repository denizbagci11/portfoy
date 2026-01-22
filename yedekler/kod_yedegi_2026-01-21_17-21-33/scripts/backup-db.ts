import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

async function main() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupDir = path.join(__dirname, '..', 'backups');

    if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir);
    }

    console.log('Fetching data from database...');
    const users = await prisma.user.findMany();
    const transactions = await prisma.transaction.findMany();
    const assetSettings = await prisma.assetSettings.findMany();
    const userPreferences = await prisma.userPreference.findMany();
    const assetDataSources = await prisma.assetDataSource.findMany();

    const data = {
        meta: {
            timestamp: new Date().toISOString(),
            version: 'Backup v1'
        },
        users,
        transactions,
        assetSettings,
        userPreferences,
        assetDataSources
    };

    const filename = `backup-full-${timestamp}.json`;
    const dataPath = path.join(backupDir, filename);

    fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));
    console.log(`✅ Database backup saved locally: backups/${filename}`);
}

main()
    .catch(e => {
        console.error('Backup failed:', e);
        process.exit(1);
    })
    .finally(async () => await prisma.$disconnect());
