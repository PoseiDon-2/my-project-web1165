import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import { z } from 'zod'

// Zod schema สำหรับ SystemSettings
const settingsSchema = z.array(
    z.object({
        key: z.string().min(1, 'Key is required'),
        value: z.string().min(1, 'Value is required'),
    })
)

// Type สำหรับ SystemSettingsCreateInput
interface SystemSettingsCreateInput {
    key: string
    value: string
}

export async function GET(request: NextRequest) {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) {
        return NextResponse.json({ error: 'No token provided', status: 401 }, { status: 401 })
    }

    const decoded = verifyToken(token)
    if (!decoded || decoded.role !== 'ADMIN') {
        return NextResponse.json({ error: 'Unauthorized', status: 401 }, { status: 401 })
    }

    try {
        const settings = await prisma.systemSettings.findMany({
            select: {
                key: true,
                value: true,
                updatedAt: true,
            },
        })
        return NextResponse.json({ data: settings, status: 200 })
    } catch (error) {
        console.error('Error fetching settings:', error)
        return NextResponse.json({ error: 'Failed to fetch settings', status: 500 }, { status: 500 })
    }
}

export async function PUT(request: NextRequest) {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) {
        return NextResponse.json({ error: 'No token provided', status: 401 }, { status: 401 })
    }

    const decoded = verifyToken(token)
    if (!decoded || decoded.role !== 'ADMIN') {
        return NextResponse.json({ error: 'Unauthorized', status: 401 }, { status: 401 })
    }

    try {
        const body = await request.json()
        const settings = settingsSchema.parse(body)

        // ใช้ transaction เพื่อ upsert settings หลายรายการ
        const results = await prisma.$transaction(
            settings.map(setting =>
                prisma.systemSettings.upsert({
                    where: { key: setting.key },
                    update: {
                        value: setting.value,
                        updatedAt: new Date(),
                    },
                    create: {
                        key: setting.key,
                        value: setting.value,
                    },
                    select: {
                        key: true,
                        value: true,
                        updatedAt: true,
                    },
                })
            )
        )

        // บันทึก audit log
        await prisma.auditLog.create({
            data: {
                userId: decoded.id,
                action: 'UPDATE_SETTINGS',
                entityType: 'SystemSettings',
                entityId: settings.map(s => s.key).join(','),
                createdAt: new Date(),
            },
        })

        return NextResponse.json({ data: results, status: 200 })
    } catch (error) {
        console.error('Error updating settings:', error)
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: 'Invalid data', details: error.errors, status: 400 }, { status: 400 })
        }
        return NextResponse.json({ error: 'Failed to update settings', status: 500 }, { status: 500 })
    }
}