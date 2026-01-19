'use server'

import prisma from './lib/prisma'
import { Transaction } from './lib/types'
import { revalidatePath } from 'next/cache'

export async function getTransactions(): Promise<Transaction[]> {
    try {
        const data = await prisma.transaction.findMany({
            orderBy: { date: 'desc' }
        })
        return data.map(t => ({
            id: t.id,
            type: t.type as any,
            asset: t.asset,
            date: t.date.toISOString().split('T')[0],
            amount: t.amount,
            amountGram: t.amount,
            priceTRY: t.priceTRY,
            usdRate: t.usdRate,
            totalTRY: t.amount * t.priceTRY,
            totalUSD: (t.amount * t.priceTRY) / t.usdRate,
            priceUSD: t.priceTRY / t.usdRate
        }))
    } catch (err) {
        console.error("Failed to fetch transactions:", err)
        return []
    }
}

export async function addTransactionAction(data: Transaction) {
    try {
        const transaction = await prisma.transaction.create({
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
        return { success: true, id: transaction.id }
    } catch (err) {
        console.error("Failed to add transaction:", err)
        return { success: false }
    }
}

export async function updateTransactionAction(data: Transaction) {
    try {
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
        const settings = await prisma.assetSettings.findMany()
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
        await prisma.assetSettings.upsert({
            where: { asset },
            update: { driver },
            create: { asset, driver }
        })
        revalidatePath('/')
        return { success: true }
    } catch (err) {
        return { success: false }
    }
}
