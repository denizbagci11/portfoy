import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    console.log('🔍 Checking AssetDataSource records...')

    const sources = await (prisma as any).assetDataSource.findMany({
        include: {
            user: {
                select: {
                    username: true
                }
            }
        }
    })

    console.log(`\n📊 Found ${sources.length} records:\n`)

    sources.forEach((source: any) => {
        console.log(`- Asset: ${source.asset}`)
        console.log(`  Source: ${source.source}`)
        console.log(`  Ticker: ${source.ticker || '(empty)'}`)
        console.log(`  User: ${source.user.username}`)
        console.log(`  Created: ${source.createdAt}`)
        console.log('')
    })

    if (sources.length === 0) {
        console.log('⚠️  No records found. Save operation may have failed.')
    }
}

main()
    .catch((e) => {
        console.error('❌ Error:', e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
