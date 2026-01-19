import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
    const username = 'deniz.bagci'
    const password = '7WC?d7e]9s9q'

    console.log(`🔐 Seeding admin user: ${username}...`)

    const hashedPassword = await bcrypt.hash(password, 10)

    await prisma.user.upsert({
        where: { username },
        update: {
            password: hashedPassword,
            role: 'admin',
            name: 'Dbank Admin'
        },
        create: {
            username,
            password: hashedPassword,
            role: 'admin',
            name: 'Dbank Admin'
        }
    })

    console.log("✅ Admin user created/updated successfully!")
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect()
    })
