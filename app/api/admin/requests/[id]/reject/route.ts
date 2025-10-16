import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) {
        return NextResponse.json({ error: 'No token provided', status: 401 }, { status: 401 })
    }

    const decoded = verifyToken(token)
    if (!decoded || decoded.role !== 'ADMIN') {
        return NextResponse.json({ error: 'Unauthorized', status: 401 }, { status: 401 })
    }

    try {
        const updated = await prisma.donationRequest.update({
            where: { id: params.id },
            data: { status: 'REJECTED' },
            select: { id: true, title: true, status: true },
        })

        await prisma.auditLog.create({
            data: {
                userId: decoded.id,
                action: 'REJECT_REQUEST',
                entityType: 'DonationRequest',
                entityId: params.id,
                createdAt: new Date(),
            },
        })

        return NextResponse.json({ data: updated, status: 200 })
    } catch (error) {
        console.error('Error rejecting request:', error)
        return NextResponse.json({ error: 'Failed to reject request', status: 500 }, { status: 500 })
    }
}