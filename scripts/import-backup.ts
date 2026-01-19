import { PrismaClient } from '@prisma/client'
import * as fs from 'fs'
import * as path from 'path'

const prisma = new PrismaClient()

async function main() {
    const backupPath = process.argv[2]

    if (!backupPath) {
        console.error('❌ Please provide backup file path as argument')
        process.exit(1)
    }

    console.log(`📂 Reading backup from: ${backupPath}`)

    const data = JSON.parse(fs.readFileSync(backupPath, 'utf-8'))

    console.log(`📊 Found ${data.transactions?.length || 0} transactions`)
    console.log(`⚙️  Found ${Object.keys(data.assetSettings || {}).length} asset settings`)
    console.log(`🔧 Found ${Object.keys(data.userPreferences || {}).length} user preferences`)

    // Get admin user ID
    const adminUser = await prisma.user.findUnique({
        where: { username: 'deniz.bagci' }
    })

    if (!adminUser) {
        console.error('❌ Admin user not found!')
        process.exit(1)
    }

    console.log(`👤 Using admin user: ${adminUser.username} (${adminUser.id})`)

    // Import transactions
    if (data.transactions && data.transactions.length > 0) {
        for (const tx of data.transactions) {
            await prisma.transaction.create({
                data: {
                    type: tx.type,
                    asset: tx.asset,
                    date: new Date(tx.date),
                    amount: tx.amount,
                    priceTRY: tx.priceTRY,
                    usdRate: tx.usdRate,
                    userId: adminUser.id
                }
            })
        }
        console.log(`✅ Imported ${data.transactions.length} transactions`)
    }

    // Import asset settings
    if (data.assetSettings) {
        for (const [asset, settings] of Object.entries(data.assetSettings)) {
            await prisma.assetSettings.create({
                data: {
                    asset,
                    driver: (settings as any).driver || 'USD',
                    manualPrice: (settings as any).manualPrice || null,
                    priceCurrency: (settings as any).priceCurrency || null,
                    userId: adminUser.id
                }
            })
        }
        console.log(`✅ Imported ${Object.keys(data.assetSettings).length} asset settings`)
    }

    // Import user preferences
    if (data.userPreferences) {
        for (const [key, value] of Object.entries(data.userPreferences)) {
            await (prisma as any).userPreference.create({
                data: {
                    key,
                    value: String(value),
                    userId: adminUser.id
                }
            })
        }
        console.log(`✅ Imported ${Object.keys(data.userPreferences).length} user preferences`)
    }

    console.log('🎉 Backup restored successfully!')
}

main()
    .catch((e) => {
        console.error('❌ Import failed:', e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
