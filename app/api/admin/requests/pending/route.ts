import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { DonationRequestStatus } from '@prisma/client';

// บอก Next.js ว่า route นี้เป็น dynamic
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    try {
        // 1️⃣ ดึง token
        const authHeader = request.headers.get('authorization');
        if (!authHeader?.startsWith('Bearer ')) {
            return NextResponse.json({ error: 'No token provided' }, { status: 401 });
        }

        const token = authHeader.replace('Bearer ', '').trim();
        const decoded = verifyToken(token);
        if (!decoded || decoded.role !== 'ADMIN') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        // 2️⃣ ดึงคำขอที่รออนุมัติจาก DB
        const requests = await prisma.donationRequest.findMany({
            where: { status: DonationRequestStatus.PENDING },
            select: {
                id: true,
                title: true,
                category: { select: { name: true } },
                targetAmount: true,
                createdAt: true,
                organizer: { select: { firstName: true, lastName: true, email: true } },
            },
            orderBy: { createdAt: 'desc' },
        });

        // 3️⃣ แปลงข้อมูลให้ง่ายต่อ frontend
        const formatted = requests.map((req) => ({
            id: req.id,
            title: req.title,
            organizer: `${req.organizer.firstName || ''} ${req.organizer.lastName || ''}`.trim() || req.organizer.email,
            category: req.category.name,
            goalAmount: Number(req.targetAmount),
            submittedDate: req.createdAt.toISOString(),
            status: 'PENDING' as const,
        }));

        // 4️⃣ ส่ง response
        return NextResponse.json({ data: formatted, status: 200 });
    } catch (error) {
        console.error('Error fetching pending requests:', error);
        return NextResponse.json({ error: 'Failed to fetch pending requests', status: 500 }, { status: 500 });
    }
}