
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const oldName = 'AKBNK';
    const newName = 'AKBNK.IS';
    console.log(`Renaming asset from ${oldName} to ${newName}...`);

    try {
        // 1. Update Transactions
        // First custom check if we need to do anything
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
        // This table has unique constraint [asset, userId].
        // If we just update, we might clash if user already has settings for AKBNK.IS

        // Iterate over users who have AKBNK settings
        const settings = await prisma.assetSettings.findMany({ where: { asset: oldName } });

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

        // 3. Update AssetDataSource (similar logic)
        const sources = await prisma.assetDataSource.findMany({ where: { asset: oldName } });
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

        console.log('Done!');

    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
