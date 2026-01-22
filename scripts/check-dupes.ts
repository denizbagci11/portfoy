import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    console.log("🔍 Checking for Duplicate Transactions...")

    const transactions = await prisma.transaction.findMany({
        orderBy: { date: 'desc' }
    })

    console.log(`Total transactions: ${transactions.length}`)

    // Create a signature for each transaction to find duplicates
    // Signature: type|asset|date|amount
    const seen = new Set()
    const duplicates = []

    for (const t of transactions) {
        const dateStr = t.date.toISOString().split('T')[0]
        const key = `${t.type}|${t.asset}|${dateStr}|${t.amount}`

        if (seen.has(key)) {
            duplicates.push(t)
        } else {
            seen.add(key)
        }
    }

    console.log(`Found ${duplicates.length} POTENTIAL duplicates.`);

    if (duplicates.length > 0) {
        console.log("Sample duplicates:");
        duplicates.slice(0, 5).forEach(d => {
            console.log(` - ID: ${d.id} | ${d.type} ${d.asset} | ${d.amount} | ${d.date.toISOString()}`)
        })
    }
}

main()
    .catch(e => console.error(e))
    .finally(() => prisma.$disconnect())
