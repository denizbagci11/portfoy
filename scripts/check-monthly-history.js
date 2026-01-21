const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkMonthlyHistory() {
    try {
        const history = await prisma.monthlyHistory.findMany({
            orderBy: { date: 'asc' }
        });

        console.log('=== Monthly History Records ===');
        console.log(`Total records: ${history.length}\n`);

        history.forEach(record => {
            console.log(`Date: ${record.date.toISOString().split('T')[0]}`);
            console.log(`  USD: $${record.totalValueUSD.toLocaleString()}`);
            console.log(`  TRY: ₺${record.totalValueTRY.toLocaleString()}`);
            console.log(`  User ID: ${record.userId}`);
            console.log('---');
        });

        if (history.length === 0) {
            console.log('No monthly history records found in database.');
        }
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

checkMonthlyHistory();
