import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function GET() {
    try {
        const count = await prisma.transaction.count()
        const first = await prisma.transaction.findFirst()
        const settingsCount = await prisma.assetSettings.count()

        return NextResponse.json({
            success: true,
            transactionCount: count,
            hasFirstTransaction: !!first,
            settingsCount: settingsCount,
            envSet: !!process.env.DATABASE_URL
        })
    } catch (err: any) {
        return NextResponse.json({
            success: false,
            error: err.message,
            stack: err.stack,
            envSet: !!process.env.DATABASE_URL
        }, { status: 500 })
    }
}
