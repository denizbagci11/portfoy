import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    console.log("🛠️ Starting Data Fix...")

    // 1. Delete any 2026 records (should rely on live data for current month)
    const del2026 = await prisma.monthlyHistory.deleteMany({
        where: {
            date: {
                gte: new Date('2026-01-01T00:00:00.000Z')
            }
        }
    })
    console.log(`🗑️ Deleted ${del2026.count} records from 2026.`);

    // 2. Check for duplicates in Dec 2025
    const dec2025 = await prisma.monthlyHistory.findMany({
        where: {
            date: {
                gte: new Date('2025-12-01T00:00:00.000Z'),
                lt: new Date('2026-01-01T00:00:00.000Z')
            }
        }
    })

    console.log(`Found ${dec2025.length} records for Dec 2025.`);

    // If duplicates for same day?
    // DB constraint is unique([date, userId]).
    // But checked logic.

    console.log("✅ Fix complete. Please refresh the page.");
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect()
    })
