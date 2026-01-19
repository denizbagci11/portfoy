import { PrismaClient } from '@prisma/client'
import { initialTransactions } from '../src/lib/seedData'

const prisma = new PrismaClient()

async function main() {
    console.log('🚀 Migration starting...')

    // Clear existing to avoid duplicates if re-run
    // const count = await prisma.transaction.count()
    // if (count > 0) {
    //   console.log('Deleting existing transactions...')
    //   await prisma.transaction.deleteMany()
    // }

    console.log(`Found ${initialTransactions.length} transactions in seedData.ts`)

    const user = await prisma.user.findUnique({ where: { username: 'deniz.bagci' } });
    if (!user) {
        console.error('❌ User deniz.bagci not found. Run seed first.')
        return
    }

    for (const t of initialTransactions) {
        await prisma.transaction.create({
            data: {
                type: t.type,
                asset: t.asset || 'GOLD',
                date: new Date(t.date),
                amount: Number(t.amountGram || t.amount),
                priceTRY: Number(t.priceTRY),
                usdRate: Number(t.usdRate),
                userId: user.id
            }
        })
    }

    console.log('✅ Migration finished with success!')
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
