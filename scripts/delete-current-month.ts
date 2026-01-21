import prisma from '../src/lib/prisma';

async function deleteCurrentMonth() {
    try {
        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth(); // 0-11

        // Delete all records for current month (January 2026)
        const startOfMonth = new Date(currentYear, currentMonth, 1);
        const endOfMonth = new Date(currentYear, currentMonth + 1, 0);

        console.log(`Deleting records between ${startOfMonth.toISOString()} and ${endOfMonth.toISOString()}`);

        const result = await prisma.monthlyHistory.deleteMany({
            where: {
                date: {
                    gte: startOfMonth,
                    lte: endOfMonth
                }
            }
        });

        console.log(`✅ Deleted ${result.count} record(s) for current month`);
        await prisma.$disconnect();
    } catch (error) {
        console.error('❌ Error:', error);
        await prisma.$disconnect();
        process.exit(1);
    }
}

deleteCurrentMonth();
