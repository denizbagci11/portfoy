import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
    console.log('🌱 Seeding database with sample data...')

    // Create investor user: onur.cete
    const investorPassword = await bcrypt.hash('password123', 10)
    const investor = await prisma.user.upsert({
        where: { username: 'onur.cete' },
        update: {},
        create: {
            username: 'onur.cete',
            password: investorPassword,
            name: 'Onur Cete',
            role: 'investor'
        }
    })
    console.log('✅ Investor user created: onur.cete')

    // Add sample transactions for onur.cete
    const sampleTransactions = [
        {
            type: 'BUY',
            asset: 'GOLD',
            date: new Date('2024-01-15'),
            amount: 10,
            priceTRY: 25000,
            usdRate: 30.5,
            userId: investor.id
        },
        {
            type: 'BUY',
            asset: 'BAKIRR',
            date: new Date('2024-02-20'),
            amount: 50,
            priceTRY: 150,
            usdRate: 31.2,
            userId: investor.id
        },
        {
            type: 'BUY',
            asset: 'USD',
            date: new Date('2024-03-10'),
            amount: 1000,
            priceTRY: 32.0,
            usdRate: 32.0,
            userId: investor.id
        },
        {
            type: 'BUY',
            asset: 'EUR',
            date: new Date('2024-04-05'),
            amount: 500,
            priceTRY: 35.0,
            usdRate: 32.5,
            userId: investor.id
        }
    ]

    for (const tx of sampleTransactions) {
        await prisma.transaction.create({ data: tx })
    }
    console.log(`✅ Created ${sampleTransactions.length} sample transactions for onur.cete`)

    console.log('🎉 Seeding completed!')
}

main()
    .catch((e) => {
        console.error('❌ Seeding failed:', e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
