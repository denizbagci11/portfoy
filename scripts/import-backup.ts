import { PrismaClient } from '@prisma/client'
import fs from 'fs'
import path from 'path'

const prisma = new PrismaClient()

async function main() {
    console.log("📂 Reading backup file...")
    const backupPath = 'C:\\Users\\Deniz\\Downloads\\portfoy_yedek_2026-01-19.json'

    if (!fs.existsSync(backupPath)) {
        console.error("❌ Backup file not found at:", backupPath)
        return
    }

    const fileContent = fs.readFileSync(backupPath, 'utf-8')
    const data = JSON.parse(fileContent)
    const transactions = data.transactions
    const assetDrivers = data.assetDrivers || {}

    console.log(`🚀 Found ${transactions.length} transactions.`)
    console.log(`⚙️  Found settings for ${Object.keys(assetDrivers).length} assets.`)

    // Import Transactions
    console.log("\n📥 Importing transactions...")
    let txSuccess = 0
    for (const t of transactions) {
        try {
            await prisma.transaction.upsert({
                where: { id: t.id },
                update: {
                    type: t.type,
                    asset: t.asset,
                    date: new Date(t.date),
                    amount: t.amount,
                    priceTRY: t.priceTRY,
                    usdRate: t.usdRate,
                },
                create: {
                    id: t.id,
                    type: t.type,
                    asset: t.asset,
                    date: new Date(t.date),
                    amount: t.amount,
                    priceTRY: t.priceTRY,
                    usdRate: t.usdRate,
                }
            })
            txSuccess++
        } catch (err) {
            console.error(`❌ Error importing transaction ${t.id}:`, err)
        }
    }

    // Import Asset Settings
    console.log("\n🛠️  Importing asset settings...")
    let settingsSuccess = 0
    for (const [asset, driver] of Object.entries(assetDrivers)) {
        try {
            await prisma.assetSettings.upsert({
                where: { asset },
                update: { driver: driver as string },
                create: { asset, driver: driver as string }
            })
            settingsSuccess++
        } catch (err) {
            console.error(`❌ Error importing setting for ${asset}:`, err)
        }
    }

    console.log(`\n✅ Clean Import Finished!`)
    console.log(`Transactions: ${txSuccess} / ${transactions.length}`)
    console.log(`Asset Settings: ${settingsSuccess} / ${Object.keys(assetDrivers).length}`)
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect()
    })
