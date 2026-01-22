'use server'

import prisma from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

export async function deleteCurrentMonthHistory() {
    try {
        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth();

        const startOfMonth = new Date(currentYear, currentMonth, 1);
        const endOfMonth = new Date(currentYear, currentMonth + 1, 0);

        const result = await prisma.monthlyHistory.deleteMany({
            where: {
                date: {
                    gte: startOfMonth,
                    lte: endOfMonth
                }
            }
        });

        console.log(`✅ Deleted ${result.count} record(s) for current month`);
        revalidatePath('/');
        return { success: true, count: result.count };
    } catch (error) {
        console.error('❌ Error:', error);
        return { success: false, error: String(error) };
    }
}
