'use server'

import prisma from './lib/prisma'
import bcrypt from 'bcryptjs'
import { revalidatePath } from 'next/cache'

export async function getUsers() {
    try {
        const users = await prisma.user.findMany({
            orderBy: { createdAt: 'desc' },
            select: {
                id: true,
                username: true,
                name: true,
                role: true,
                createdAt: true
            }
        })
        return users.map((u: any) => ({
            ...u,
            status: 'active'
        }))
    } catch (err) {
        console.error("Failed to fetch users:", err)
        return []
    }
}

export async function createUserAction(username: string, role: string = 'viewer') {
    try {
        // For simplicity in this demo, let's set a default password for new users
        // that they can change later (or we could pass it here).
        // Let's use a standard pattern for now.
        const defaultPassword = 'Portfoy123!'
        const hashedPassword = await bcrypt.hash(defaultPassword, 10)

        await prisma.user.create({
            data: {
                username,
                password: hashedPassword,
                role,
                name: username.split('.')[0] // Basic name generation
            }
        })

        revalidatePath('/admin')
        return { success: true, password: defaultPassword }
    } catch (err: any) {
        console.error("Failed to create user:", err)
        if (err.code === 'P2002') {
            return { success: false, error: 'Bu kullanıcı adı zaten mevcut.' }
        }
        return { success: false, error: 'Kullanıcı oluşturulamadı.' }
    }
}

export async function deleteUserAction(id: string) {
    try {
        // Prevent deleting the main admin if possible, but we'll check by ID/Username
        const user = await prisma.user.findUnique({ where: { id } })
        if (user?.username === 'deniz.bagci') {
            return { success: false, error: 'Ana yönetici silinemez!' }
        }

        await prisma.user.delete({
            where: { id }
        })

        revalidatePath('/admin')
        return { success: true }
    } catch (err) {
        console.error("Failed to delete user:", err)
        return { success: false, error: 'Kullanıcı silinemedi.' }
    }
}
