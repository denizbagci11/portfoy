import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    console.log("🛠️ Fixing Duplicate Transactions...")

    const transactions = await prisma.transaction.findMany({
        orderBy: { createdAt: 'asc' } // Keep the older ones usually
    })

    console.log(`Total transactions before fix: ${transactions.length}`)

    const seen = new Set()
    const toDeleteIds: string[] = []

    for (const t of transactions) {
        // Distinct key
        const dateStr = t.date.toISOString().split('T')[0]
        const key = `${t.type}|${t.asset}|${dateStr}|${t.amount}|${t.priceTRY}`

        if (seen.has(key)) {
            // Already seen this combo, mark for deletion
            toDeleteIds.push(t.id)
        } else {
            seen.add(key)
        }
    }

    console.log(`Identified ${toDeleteIds.length} duplicate transactions to delete.`);

    if (toDeleteIds.length > 0) {
        const result = await prisma.transaction.deleteMany({
            where: {
                id: {
                    in: toDeleteIds
                }
            }
        })
        console.log(`✅ Deleted ${result.count} transactions.`);
    } else {
        console.log("No duplicates found to delete.");
    }
}

main()
    .catch(e => console.error(e))
    .finally(() => prisma.$disconnect())
