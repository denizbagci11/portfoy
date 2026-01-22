const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
    const hashedPassword = await bcrypt.hash('Deniz123!', 10);

    const user = await prisma.user.upsert({
        where: { username: 'deniz.bagci' },
        update: {},
        create: {
            username: 'deniz.bagci',
            password: hashedPassword,
            name: 'Deniz',
            role: 'admin',
        },
    });

    console.log({ user });
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
