import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    console.log("🔍 Deep Inspection of MonthlyHistory timestamps...")

    const history = await prisma.monthlyHistory.findMany({
        orderBy: { date: 'asc' }
    })

    console.log(`Total records: ${history.length}`)
    history.forEach(h => {
        const d = new Date(h.date)
        console.log(`ID: ${h.id} | ISO: ${h.date.toISOString()} | Local: ${d.toString()} | Value: ${h.totalValueUSD}`)
    })
}

main()
    .catch(e => console.error(e))
    .finally(() => prisma.$disconnect())
