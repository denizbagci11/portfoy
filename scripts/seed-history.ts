
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const historyData = [
    { month: 0, year: 2025, try: 1652566, usd: 46544 }, // January (Month index 0 in JS Date)
    { month: 1, year: 2025, try: 1796000, usd: 49607 }, // February
    // March missing in user input
    { month: 3, year: 2025, try: 2211655, usd: 58011 }, // April
    { month: 4, year: 2025, try: 2211655, usd: 57046 }, // May
    { month: 5, year: 2025, try: 2242974, usd: 56836 }, // June
    { month: 6, year: 2025, try: 2606525, usd: 64831 }, // July
    { month: 7, year: 2025, try: 2683610, usd: 65741 }, // August
    { month: 8, year: 2025, try: 2892074, usd: 70028 }, // September
    { month: 9, year: 2025, try: 2984976, usd: 71347 }, // October
    { month: 10, year: 2025, try: 3154707, usd: 74626 }, // November
    { month: 11, year: 2025, try: 3350200, usd: 77965 }, // December
];

async function main() {
    const user = await prisma.user.findFirst();

    if (!user) {
        console.error('No user found to seed history for.');
        return;
    }

    console.log(`Seeding history for user: ${user.username} (${user.id})`);

    for (const data of historyData) {
        // Set date to the last day of the month
        // Note: in JS, new Date(year, month + 1, 0) gives the last day of the month
        const date = new Date(Date.UTC(data.year, data.month + 1, 0)); // Use UTC to avoid timezone shifts ending up in prev month

        // Check if exists
        const existing = await prisma.monthlyHistory.findFirst({
            where: {
                userId: user.id,
                date: date
            }
        });

        if (existing) {
            console.log(`Update existing for ${date.toISOString()}`);
            await prisma.monthlyHistory.update({
                where: { id: existing.id },
                data: {
                    totalValueTRY: data.try,
                    totalValueUSD: data.usd
                }
            });
        } else {
            console.log(`Creating for ${date.toISOString()}`);
            await prisma.monthlyHistory.create({
                data: {
                    date: date,
                    totalValueTRY: data.try,
                    totalValueUSD: data.usd,
                    userId: user.id
                }
            });
        }
    }
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
