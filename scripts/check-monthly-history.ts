import prisma from '../src/lib/prisma';

async function checkMonthlyHistory() {
    try {
        console.log('Fetching monthly history...\n');

        const history = await prisma.monthlyHistory.findMany({
            orderBy: { date: 'desc' },
            take: 5
        });

        console.log('Last 5 monthly history records:');
        console.log('================================\n');

        history.forEach(record => {
            console.log(`Date: ${record.date.toISOString().split('T')[0]}`);
            console.log(`USD: $${record.totalValueUSD.toLocaleString()}`);
            console.log(`TRY: ₺${record.totalValueTRY.toLocaleString()}`);
            console.log(`User: ${record.userId}`);
            console.log('---');
        });

        await prisma.$disconnect();
    } catch (error) {
        console.error('Error:', error);
        await prisma.$disconnect();
        process.exit(1);
    }
}

checkMonthlyHistory();
