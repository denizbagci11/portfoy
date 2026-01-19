import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    console.log('🔍 Checking if AssetDataSource table exists...')

    try {
        // Try to query the table
        const count = await (prisma as any).assetDataSource.count()
        console.log(`✅ AssetDataSource table exists! Record count: ${count}`)
        
        // Try to create a test record
        console.log('\n📝 Testing insert...')
        const testRecord = await (prisma as any).assetDataSource.create({
            data: {
                asset: 'TEST',
                source: 'MANUAL',
                ticker: 'TEST123',
                userId: 'test-user-id'
            }
        })
        console.log('✅ Insert successful:', testRecord)
        
        // Delete test record
        await (prisma as any).assetDataSource.delete({
            where: { id: testRecord.id }
        })
        console.log('✅ Delete successful')
        
    } catch (error: any) {
        console.error('❌ Error:', error.message)
        console.error('Full error:', error)
    }
}

main()
    .finally(async () => {
        await prisma.$disconnect()
    })
