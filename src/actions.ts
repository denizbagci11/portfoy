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

export async function getAssetSettings(targetUserId?: string) {
    try {
        const session = await auth()
        if (!session?.user?.id) return {}

        // Determine effective User ID
        let queryUserId = session.user.id;
        const isAdmin = (session.user as any).role === 'admin';

        if (targetUserId && targetUserId !== 'all') {
            if (isAdmin || targetUserId === session.user.id) {
                queryUserId = targetUserId;
            } else {
                return {} // Unauthorized access attempt
            }
        }

        const settings = await prisma.assetSettings.findMany({
            where: { userId: queryUserId } as any
        })

        // Return full settings keyed by asset
        return settings.reduce((acc, curr: any) => ({
            ...acc,
            [curr.asset]: {
                driver: curr.driver,
                manualPrice: curr.manualPrice,
                priceCurrency: curr.priceCurrency
            }
        }), {})
    } catch (err) {
        return {}
    }
}

export async function updateAssetDriverAction(asset: string, driver: string) {
    try {
        const session = await auth()
        if (!session?.user?.id) return { success: false }

        // Always update for the logged-in user (Admin doesn't edit other's settings yet, or arguably shouldn't via this UI)
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

export async function updateAssetPriceAction(asset: string, price: number, currency: string) {
    try {
        console.log('[updateAssetPriceAction] Called:', { asset, price, currency });
        const session = await auth()
        if (!session?.user?.id) {
            console.error('[updateAssetPriceAction] No session');
            return { success: false, error: 'Oturum yok' }
        }

        console.log('[updateAssetPriceAction] Upserting to DB...');
        await (prisma.assetSettings as any).upsert({
            where: {
                asset_userId: {
                    asset,
                    userId: session.user.id
                }
            },
            update: { manualPrice: price, priceCurrency: currency },
            create: { asset, driver: 'USD', manualPrice: price, priceCurrency: currency, userId: session.user.id }
        })
        console.log('[updateAssetPriceAction] Success');
        revalidatePath('/')
        return { success: true }
    } catch (err: any) {
        console.error("Asset price update error:", err)
        return { success: false, error: err.message || String(err) }
    }
}

export async function getUserPreferencesAction(targetUserId?: string) {
    try {
        const session = await auth()
        if (!session?.user?.id) return {}

        let queryUserId = session.user.id;
        const isAdmin = (session.user as any).role === 'admin';

        if (targetUserId && targetUserId !== 'all') {
            if (isAdmin || targetUserId === session.user.id) {
                queryUserId = targetUserId;
            } else {
                return {}
            }
        }

        const prefs = await (prisma as any).userPreference.findMany({
            where: { userId: queryUserId }
        })

        return prefs.reduce((acc: any, curr: any) => ({
            ...acc,
            [curr.key]: curr.value
        }), {})
    } catch (err) {
        return {}
    }
}

export async function saveUserPreferenceAction(key: string, value: string) {
    try {
        const session = await auth()
        if (!session?.user?.id) return { success: false }

        await (prisma as any).userPreference.upsert({
            where: {
                key_userId: {
                    key,
                    userId: session.user.id
                }
            },
            update: { value },
            create: { key, value, userId: session.user.id }
        })
        return { success: true }
    } catch (err) {
        console.error("Preference save error:", err)
        return { success: false }
    }
}

// ============================================
// Asset Data Source Actions
// ============================================

export async function getAssetDataSources() {
    try {
        const session = await auth()
        if (!session?.user?.id) return {}

        const sources = await (prisma as any).assetDataSource.findMany({
            where: { userId: session.user.id }
        })

        return sources.reduce((acc: any, curr: any) => ({
            ...acc,
            [curr.asset]: {
                source: curr.source,
                ticker: curr.ticker
            }
        }), {})
    } catch (err) {
        console.error("Error fetching asset data sources:", err)
        return {}
    }
}


export async function updateAssetDataSource(asset: string, source: string, ticker: string) {
    try {
        console.log('[updateAssetDataSource] Called with:', { asset, source, ticker });

        const session = await auth()
        console.log('[updateAssetDataSource] Session:', session?.user?.id ? 'exists' : 'missing');

        if (!session?.user?.id) {
            console.error('[updateAssetDataSource] No session or user ID');
            return { success: false, error: 'No session' }
        }

        console.log('[updateAssetDataSource] Upserting to database...');
        await (prisma as any).assetDataSource.upsert({
            where: {
                asset_userId: {
                    asset,
                    userId: session.user.id
                }
            },
            update: { source, ticker },
            create: { asset, source, ticker, userId: session.user.id }
        })

        console.log('[updateAssetDataSource] Success!');
        revalidatePath('/')
        return { success: true }
    } catch (err) {
        console.error("[updateAssetDataSource] Error:", err)
        return { success: false, error: String(err) }
    }
}

// Fetch TEFAS price (server-side to avoid CORS)
export async function fetchTefasPriceAction(fundCode: string) {
    try {
        const { fetchTefasPrice } = await import('./lib/priceApis')
        const price = await fetchTefasPrice(fundCode)

        if (price !== null) {
            return { success: true, price }
        }
        return { success: false, error: 'Price not found' }
    } catch (err) {
        console.error("[fetchTefasPriceAction] Error:", err)
        return { success: false, error: String(err) }
    }
}

// Fetch Yahoo Finance price (server-side)
export async function fetchYahooPriceAction(ticker: string) {
    try {
        const { fetchYahooFinancePrice } = await import('./lib/priceApis')
        const price = await fetchYahooFinancePrice(ticker)

        if (price !== null) {
            return { success: true, price }
        }
        return { success: false, error: 'Price not found' }
    } catch (err) {
        console.error("[fetchYahooPriceAction] Error:", err)
        return { success: false, error: String(err) }
    }
}

export async function fetchAndUpdatePrices() {
    try {
        const session = await auth()
        if (!session?.user?.id) return { success: false, updated: 0 }

        // Get all data sources for this user
        const sources = await (prisma as any).assetDataSource.findMany({
            where: {
                userId: session.user.id,
                source: { in: ['YAHOO', 'TEFAS'] }
            }
        })

        let updated = 0

        for (const sourceConfig of sources) {
            if (!sourceConfig.ticker) continue

            try {
                const { fetchPriceFromSource } = await import('./lib/priceApis')
                const result = await fetchPriceFromSource(sourceConfig.source, sourceConfig.ticker)

                if (result) {
                    // Update the asset price in AssetSettings
                    await (prisma as any).assetSettings.upsert({
                        where: {
                            asset_userId: {
                                asset: sourceConfig.asset,
                                userId: session.user.id
                            }
                        },
                        update: {
                            manualPrice: result.price,
                            priceCurrency: result.currency
                        },
                        create: {
                            asset: sourceConfig.asset,
                            driver: 'USD',
                            manualPrice: result.price,
                            priceCurrency: result.currency,
                            userId: session.user.id
                        }
                    })
                    updated++
                }
            } catch (error) {
                console.error(`Error fetching price for ${sourceConfig.asset}:`, error)
            }
        }

        revalidatePath('/')
        return { success: true, updated }
    } catch (err) {
        console.error("Error in fetchAndUpdatePrices:", err)
        return { success: false, updated: 0 }
    }
}
