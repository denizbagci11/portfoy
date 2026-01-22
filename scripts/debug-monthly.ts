import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    console.log("🔍 Inspecting MonthlyHistory data...")

    const history = await prisma.monthlyHistory.findMany({
        orderBy: { date: 'asc' },
        include: { user: true }
    })

    console.log(`Total records: ${history.length}`);

    // Group by YYYY-MM
    const groupByMonth: Record<string, typeof history> = {};
    history.forEach(h => {
        const d = new Date(h.date);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        if (!groupByMonth[key]) groupByMonth[key] = [];
        groupByMonth[key].push(h);
    });

    Object.keys(groupByMonth).forEach(key => {
        if (groupByMonth[key].length > 1) {
            console.log(`⚠️ DUPLICATE FOUND for ${key}:`);
            groupByMonth[key].forEach(h => {
                console.log(` - ID: ${h.id} | Date: ${h.date.toISOString()} | TRY: ${h.totalValueTRY}`);
            });
        }
    });

    // Also explicitly list anything in 2026
    const records2026 = history.filter(h => new Date(h.date).getFullYear() === 2026);
    console.log(`Records in 2026: ${records2026.length}`);
    records2026.forEach(h => {
        console.log(` - ID: ${h.id} | Date: ${h.date.toISOString()} | Month: ${new Date(h.date).getMonth() + 1}`);
    });
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect()
    })
