import { PrismaClient } from '@prisma/client'
import fs from 'fs'
import path from 'path'

const prisma = new PrismaClient()

async function main() {
    console.log("📦 Starting Full System Backup...")

    // 1. Create 'yedekler' directory if it doesn't exist
    const backupDir = path.join(process.cwd(), 'yedekler')
    if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true })
        console.log(`Created directory: ${backupDir}`)
    }

    // 2. Fetch all data
    const users = await prisma.user.findMany()
    const transactions = await prisma.transaction.findMany()
    const assetSettings = await prisma.assetSettings.findMany()
    const userPreferences = await prisma.userPreference.findMany()
    const assetDataSources = await prisma.assetDataSource.findMany()
    const monthlyHistory = await prisma.monthlyHistory.findMany()

    // 3. Construct backup object
    const backupData = {
        meta: {
            timestamp: new Date().toISOString(),
            version: 'Full Backup v1',
            counts: {
                users: users.length,
                transactions: transactions.length,
                assetSettings: assetSettings.length,
                userPreferences: userPreferences.length,
                assetDataSources: assetDataSources.length,
                monthlyHistory: monthlyHistory.length
            }
        },
        data: {
            users,
            transactions,
            assetSettings,
            userPreferences,
            assetDataSources,
            monthlyHistory
        }
    }

    // 4. Write to file
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const filename = `tam-yedek-${timestamp}.json`
    const filePath = path.join(backupDir, filename)

    fs.writeFileSync(filePath, JSON.stringify(backupData, null, 2))

    console.log(`✅ Backup successfully saved to:`)
    console.log(`   ${filePath}`)
    console.log(`📊 Stats:`)
    console.log(`   - Transactions: ${transactions.length}`)
    console.log(`   - History Records: ${monthlyHistory.length}`)
}

main()
    .catch(e => console.error(e))
    .finally(() => prisma.$disconnect())
