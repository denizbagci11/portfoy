const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();
const BACKUP_PATH = 'C:\\Users\\Deniz\\Downloads\\portfoy_yedek_2026-01-19.json';
const TARGET_USERNAME = 'deniz.bagci';

async function main() {
    console.log(`Starting import for user: ${TARGET_USERNAME}`);

    // 1. Find User
    const user = await prisma.user.findUnique({
        where: { username: TARGET_USERNAME }
    });

    if (!user) {
        console.error(`User ${TARGET_USERNAME} not found!`);
        return;
    }

    console.log(`Target User ID: ${user.id}`);

    // 2. Read Backup
    const fileContent = fs.readFileSync(BACKUP_PATH, 'utf-8');
    const data = JSON.parse(fileContent);

    if (!data.transactions || !Array.isArray(data.transactions)) {
        console.error('Invalid backup format: transactions array missing.');
        return;
    }

    console.log(`Found ${data.transactions.length} transactions and ${Object.keys(data.assetDrivers || {}).length} asset drivers.`);

    // 3. Import Transactions
    console.log('Importing transactions...');
    let txCount = 0;
    for (const tx of data.transactions) {
        try {
            await prisma.transaction.create({
                data: {
                    type: tx.type,
                    asset: tx.asset,
                    date: new Date(tx.date),
                    amount: Number(tx.amount),
                    priceTRY: Number(tx.priceTRY),
                    usdRate: Number(tx.usdRate),
                    userId: user.id
                }
            });
            txCount++;
        } catch (err) {
            console.error(`Failed to import transaction ${tx.id}:`, err.message);
        }
    }
    console.log(`Successfully imported ${txCount} transactions.`);

    // 4. Import Asset Drivers
    if (data.assetDrivers) {
        console.log('Importing asset drivers...');
        let driverCount = 0;
        for (const [asset, driver] of Object.entries(data.assetDrivers)) {
            try {
                await prisma.assetSettings.upsert({
                    where: {
                        asset_userId: {
                            asset,
                            userId: user.id
                        }
                    },
                    update: { driver },
                    create: {
                        asset,
                        driver,
                        userId: user.id
                    }
                });
                driverCount++;
            } catch (err) {
                console.error(`Failed to import driver for ${asset}:`, err.message);
            }
        }
        console.log(`Successfully imported ${driverCount} asset drivers.`);
    }

    console.log('Import completed.');
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
