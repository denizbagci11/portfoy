import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    console.log('🗑️  Clearing all data except admin user...')

    // Delete all transactions
    const deletedTransactions = await prisma.transaction.deleteMany({})
    console.log(`✅ Deleted ${deletedTransactions.count} transactions`)

    // Delete all asset settings
    const deletedSettings = await prisma.assetSettings.deleteMany({})
    console.log(`✅ Deleted ${deletedSettings.count} asset settings`)

    // Delete all user preferences
    const deletedPrefs = await (prisma as any).userPreference.deleteMany({})
    console.log(`✅ Deleted ${deletedPrefs.count} user preferences`)

    // Delete all asset data sources
    const deletedSources = await (prisma as any).assetDataSource.deleteMany({})
    console.log(`✅ Deleted ${deletedSources.count} asset data sources`)

    // Delete all users except admin (deniz.bagci)
    const deletedUsers = await prisma.user.deleteMany({
        where: {
            username: { not: 'deniz.bagci' }
        }
    })
    console.log(`✅ Deleted ${deletedUsers.count} non-admin users`)

    console.log('🎉 Database cleared! Ready for new data.')
}

main()
    .catch((e) => {
        console.error('❌ Clear failed:', e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
