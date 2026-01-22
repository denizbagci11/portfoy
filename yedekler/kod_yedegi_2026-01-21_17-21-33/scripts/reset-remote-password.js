
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function resetPassword() {
    const username = 'deniz.bagci';
    const newPassword = '123456'; // Temporary simple password

    console.log(`🔄 Resetting password for user: ${username} on REMOTE DB...`);

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    try {
        const user = await prisma.user.update({
            where: { username: username },
            data: {
                password: hashedPassword
            }
        });
        console.log(`✅ Password updated successfully for ${user.username}`);
        console.log(`🔑 New Password: ${newPassword}`);
    } catch (error) {
        console.error("❌ Error updating password:", error);
        // If user doesn't exist, create it
        if (error.code === 'P2025') {
            console.log("⚠️ User not found. Creating user...");
            await prisma.user.create({
                data: {
                    username,
                    password: hashedPassword,
                    role: 'admin',
                    name: 'Dbank Admin'
                }
            });
            console.log(`✅ User created with password: ${newPassword}`);
        }
    } finally {
        await prisma.$disconnect();
    }
}

resetPassword();
