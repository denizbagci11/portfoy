const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixJanuaryRecord() {
    try {
        console.log('=== Fixing January 2026 Record ===\n');

        // Delete the incorrect record
        const deleted = await prisma.monthlyHistory.deleteMany({
            where: {
                date: {
                    gte: new Date('2026-01-01'),
                    lt: new Date('2026-02-01')
                }
            }
        });

        console.log(`Deleted ${deleted.count} incorrect record(s) for January 2026`);
        console.log('\nThe chart will now use live calculation for January 2026.');
        console.log('Live value: $84,154 / ₺3,641,598');

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

fixJanuaryRecord();
