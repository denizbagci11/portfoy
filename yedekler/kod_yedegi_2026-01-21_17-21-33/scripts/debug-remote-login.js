
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function checkRemoteUser() {
    const targetUsername = 'deniz.bagci';
    const testPassword = '123456';

    console.log(`🕵️‍♂️ Checking user '${targetUsername}' on REMOTE DB...`);

    // 1. Fetch ALL users to see exactly what's inside
    const allUsers = await prisma.user.findMany();
    console.log(`📋 Found ${allUsers.length} total users in DB.`);

    allUsers.forEach(u => {
        console.log(` - UserID: ${u.id}, Username: '${u.username}', Role: ${u.role}`);
    });

    // 2. Try to find specific user
    const user = await prisma.user.findUnique({
        where: { username: targetUsername }
    });

    if (!user) {
        console.error(`❌ User '${targetUsername}' NOT FOUND!`);
        return;
    }

    console.log(`✅ User '${targetUsername}' FOUND.`);
    console.log(`   ID: ${user.id}`);
    console.log(`   Hash: ${user.password.substring(0, 15)}...`);

    // 3. Verify Password Manually
    const isValid = await bcrypt.compare(testPassword, user.password);

    if (isValid) {
        console.log(`✅ SUCCESS: Password '${testPassword}' MATCHES the hash in DB.`);
        console.log("👉 You should be able to login.");
    } else {
        console.error(`❌ FAIL: Password '${testPassword}' DOES NOT match the hash!`);
        console.log("👉 Resetting password again to be sure...");

        // Force Reset Again
        const newHash = await bcrypt.hash(testPassword, 10);
        await prisma.user.update({
            where: { id: user.id },
            data: { password: newHash }
        });
        console.log("✅ Password forcibly reset to '123456'. Try logging in now.");
    }
}

checkRemoteUser()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
