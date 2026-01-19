'use server'

import prisma from './lib/prisma'
import { Transaction } from './lib/types'
import { revalidatePath } from 'next/cache'
import { auth } from './auth'

export async function getTransactions(): Promise<Transaction[]> {
    try {
        const session = await auth()
        if (!session?.user) {
            console.log("[getTransactions] No session found");
            return []
        }

        let userId = session.user.id;
        let userRole = (session.user as any).role;

        // Fallback: If ID or role is missing (stale session), try to find by name OR username
        if (!userId || !userRole) {
            console.log(`[getTransactions] Missing ID/Role for session user:`, session.user);
            const dbUser = await prisma.user.findFirst({
                where: {
                    OR: [
                        { username: session.user.name || '' },
                        { name: session.user.name || '' },
                        { username: (session.user as any).username || '' }
                    ]
                }
            });
            if (dbUser) {
                userId = dbUser.id;
                userRole = dbUser.role;
                console.log(`[getTransactions] Recovered user from DB: ${dbUser.username} (ID: ${userId})`);
            }
        }

        const normalizedRole = userRole?.toLowerCase();
        console.log(`[getTransactions] Final Context: User=${session.user.name}, Role=${normalizedRole}, ID=${userId}`);

        // Robust check: admin role should see everything
        const where: any = (normalizedRole === 'admin') ? {} : { userId: userId || 'none' };
        console.log(`[getTransactions] Query Filter:`, JSON.stringify(where));

        const data = await prisma.transaction.findMany({
            where,
            orderBy: { date: 'desc' }
        })

        console.log(`[getTransactions] Found ${data.length} transactions for role ${userRole}`);

        return data.map((t: any) => ({
            id: t.id,
            type: t.type as any,
            asset: t.asset,
            date: t.date instanceof Date ? t.date.toISOString().split('T')[0] : t.date,
            amount: t.amount,
            amountGram: t.amount,
            priceTRY: t.priceTRY,
            usdRate: t.usdRate,
            totalTRY: t.amount * t.priceTRY,
            totalUSD: (t.amount * t.priceTRY) / t.usdRate,
            priceUSD: t.priceTRY / t.usdRate,
            userId: t.userId
        }))
    } catch (err) {
        console.error("[getTransactions] Error:", err)
        return []
    }
}

export async function addTransactionAction(data: Transaction) {
    try {
        const session = await auth()
        if (!session?.user?.id) return { success: false, error: 'Oturum açılmamış.' }

        const transaction = await (prisma.transaction as any).create({
            data: {
                type: data.type,
                asset: data.asset,
                date: new Date(data.date),
                amount: Number(data.amount),
                priceTRY: Number(data.priceTRY),
                usdRate: Number(data.usdRate),
                userId: session.user.id
            }
        })
        revalidatePath('/')
        return { success: true, id: transaction.id }
    } catch (err) {
        console.error("Failed to add transaction:", err)
        return { success: false }
    }
}

export async function updateTransactionAction(data: Transaction) {
    try {
        const session = await auth()
        if (!session?.user?.id) return { success: false }

        // Security: Ensure user owns it or is admin
        const existing: any = await prisma.transaction.findUnique({ where: { id: data.id } })
        if (!existing || (existing.userId !== session.user.id && (session.user as any).role !== 'admin')) {
            return { success: false, error: 'Yetkisiz işlem.' }
        }

        await prisma.transaction.update({
            where: { id: data.id },
            data: {
                type: data.type,
                asset: data.asset,
                date: new Date(data.date),
                amount: Number(data.amount),
                priceTRY: Number(data.priceTRY),
                usdRate: Number(data.usdRate),
            }
        })
        revalidatePath('/')
        return { success: true }
    } catch (err) {
        console.error("Failed to update transaction:", err)
        return { success: false }
    }
}

export async function removeTransactionAction(id: string) {
    try {
        const session = await auth()
        if (!session?.user?.id) return { success: false }

        const existing: any = await prisma.transaction.findUnique({ where: { id } })
        if (!existing || (existing.userId !== session.user.id && (session.user as any).role !== 'admin')) {
            return { success: false, error: 'Yetkisiz işlem.' }
        }

        await prisma.transaction.delete({
            where: { id }
        })
        revalidatePath('/')
        return { success: true }
    } catch (err) {
        console.error("Failed to delete transaction:", err)
        return { success: false }
    }
}

export async function getAssetSettings() {
    try {
        const session = await auth()
        if (!session?.user?.id) return {}

        const settings = await prisma.assetSettings.findMany({
            where: { userId: session.user.id } as any
        })
        return settings.reduce((acc, curr) => ({
            ...acc,
            [curr.asset]: curr.driver
        }), {})
    } catch (err) {
        return {}
    }
}

export async function updateAssetDriverAction(asset: string, driver: string) {
    try {
        const session = await auth()
        if (!session?.user?.id) return { success: false }

        await (prisma.assetSettings as any).upsert({
            where: {
                asset_userId: {
                    asset,
                    userId: session.user.id
                }
            },
            update: { driver },
            create: { asset, driver, userId: session.user.id }
        })
        revalidatePath('/')
        return { success: true }
    } catch (err) {
        console.error("Asset driver update error:", err)
        return { success: false }
    }
}
