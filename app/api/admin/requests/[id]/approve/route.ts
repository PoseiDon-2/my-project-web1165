import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import { z } from 'zod'

const approveSchema = z.object({
    approvedBy: z.string().min(1, 'ApprovedBy is required'),
})

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
        const body = await request.json()
        const { approvedBy } = approveSchema.parse(body)

        const updated = await prisma.donationRequest.update({
            where: { id: params.id },
            data: {
                status: 'APPROVED',
                approvedBy,
                approvedAt: new Date(),
            },
            select: { id: true, title: true, status: true },
        })

        await prisma.auditLog.create({
            data: {
                userId: decoded.id,
                action: 'APPROVE_REQUEST',
                entityType: 'DonationRequest',
                entityId: params.id,
                createdAt: new Date(),
            },
        })

        return NextResponse.json({ data: updated, status: 200 })
    } catch (error) {
        console.error('Error approving request:', error)
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: 'Invalid data', details: error.errors, status: 400 }, { status: 400 })
        }
        return NextResponse.json({ error: 'Failed to approve request', status: 500 }, { status: 500 })
    }
}