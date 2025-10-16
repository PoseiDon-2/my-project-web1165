import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'

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
        const logs = await prisma.auditLog.findMany({
            take: 10,
            orderBy: { createdAt: 'desc' },
            select: {
                id: true,
                action: true,
                entityType: true,
                entityId: true,
                createdAt: true,
                user: { select: { email: true, firstName: true, lastName: true } },
            },
        })

        const formatted = logs.map(log => ({
            id: log.id,
            message: `${log.user.firstName || log.user.email} ${getActionText(log.action)} ${getEntityText(log.entityType)} (${log.entityId
                })`,
            timestamp: log.createdAt.toISOString(),
        }))

        return NextResponse.json({ data: formatted, status: 200 })
    } catch (error) {
        console.error('Error fetching audit logs:', error)
        return NextResponse.json({ error: 'Failed to fetch audit logs', status: 500 }, { status: 500 })
    }
}

function getActionText(action: string): string {
    const actions: { [key: string]: string } = {
        LOGIN: 'เข้าสู่ระบบ',
        REGISTER: 'สมัครสมาชิก',
        APPROVE_REQUEST: 'อนุมัติคำขอ',
        REJECT_REQUEST: 'ปฏิเสธคำขอ',
        DELETE_USER: 'ลบผู้ใช้',
        UPDATE_USER: 'แก้ไขผู้ใช้',
        UPDATE_SETTINGS: 'อัปเดตการตั้งค่า',
    }
    return actions[action] || action
}

function getEntityText(entityType: string): string {
    const entities: { [key: string]: string } = {
        User: 'ผู้ใช้',
        DonationRequest: 'คำขอบริจาค',
        SystemSettings: 'การตั้งค่าระบบ',
        VolunteerApplication: 'ใบสมัครอาสา',
    }
    return entities[entityType] || entityType
}