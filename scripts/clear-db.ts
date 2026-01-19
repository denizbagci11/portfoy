import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    console.log("🧨 Cleaning up database...")

    const deleteTransactions = await prisma.transaction.deleteMany({})
    const deleteSettings = await prisma.assetSettings.deleteMany({})

    console.log(`✅ Deleted ${deleteTransactions.count} transactions.`)
    console.log(`✅ Deleted ${deleteSettings.count} asset settings.`)
    console.log("✨ Database is now completely empty.")
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect()
    })
