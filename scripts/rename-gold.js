
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const RENAME_MAP = [
    { from: 'GOLD', to: 'GC=F' }
];

async function main() {
    for (const item of RENAME_MAP) {
        const oldName = item.from;
        const newName = item.to;
        console.log(`--- Processing: ${oldName} -> ${newName} ---`);

        try {
            // 1. Update Transactions
            const txCount = await prisma.transaction.count({ where: { asset: oldName } });
            console.log(`Found ${txCount} transactions for ${oldName}`);

            if (txCount > 0) {
                await prisma.transaction.updateMany({
                    where: { asset: oldName },
                    data: { asset: newName }
                });
                console.log('Updated transactions.');
            }

            // 2. Update AssetSettings
            const settings = await prisma.assetSettings.findMany({ where: { asset: oldName } });
            console.log(`Found ${settings.length} settings for ${oldName}`);

            for (const setting of settings) {
                const existingNew = await prisma.assetSettings.findUnique({
                    where: { asset_userId: { asset: newName, userId: setting.userId } }
                });

                if (existingNew) {
                    console.log(`User ${setting.userId} already has settings for ${newName}. Deleting old settings for ${oldName}.`);
                    await prisma.assetSettings.delete({
                        where: { asset_userId: { asset: oldName, userId: setting.userId } }
                    });
                } else {
                    console.log(`Renaming settings for user ${setting.userId}`);
                    await prisma.assetSettings.update({
                        where: { asset_userId: { asset: oldName, userId: setting.userId } },
                        data: { asset: newName }
                    });
                }
            }

            // 3. Update AssetDataSource
            const sources = await prisma.assetDataSource.findMany({ where: { asset: oldName } });
            console.log(`Found ${sources.length} sources for ${oldName}`);

            for (const source of sources) {
                const existingNew = await prisma.assetDataSource.findUnique({
                    where: { asset_userId: { asset: newName, userId: source.userId } }
                });

                if (existingNew) {
                    console.log(`User ${source.userId} already has data source for ${newName}. Deleting old source.`);
                    await prisma.assetDataSource.delete({
                        where: { asset_userId: { asset: oldName, userId: source.userId } }
                    });
                } else {
                    console.log(`Renaming data source for user ${source.userId}`);
                    await prisma.assetDataSource.update({
                        where: { asset_userId: { asset: oldName, userId: source.userId } },
                        data: { asset: newName }
                    });
                }
            }

        } catch (e) {
            console.error(`Error processing ${oldName}:`, e);
        }
    }

    console.log('All done!');
    await prisma.$disconnect();
}

main();
