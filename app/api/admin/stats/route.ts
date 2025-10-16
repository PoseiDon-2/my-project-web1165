import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';

// บอก Next.js ว่า route นี้เป็น dynamic
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    try {
        // 1️⃣ ดึง token จาก header
        const authHeader = request.headers.get('authorization');
        if (!authHeader?.startsWith('Bearer ')) {
            return NextResponse.json({ error: 'No token provided' }, { status: 401 });
        }

        const token = authHeader.replace('Bearer ', '').trim();
        if (!token || token === 'undefined') {
            return NextResponse.json({ error: 'Token invalid' }, { status: 401 });
        }

        // 2️⃣ verify token
        let decoded: { id: string; email: string; role: string } | null = null;
        try {
            decoded = verifyToken(token);
        } catch (err: any) {
            return NextResponse.json({ error: 'Invalid or malformed token' }, { status: 401 });
        }

        if (!decoded) {
            return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
        }

        // 3️⃣ ตรวจสอบ role ADMIN
        if (decoded.role !== 'ADMIN') {
            return NextResponse.json({ error: 'Unauthorized: Admin role required' }, { status: 403 });
        }

        // 4️⃣ ดึงสถิติจากฐานข้อมูล
        const [
            totalDonors,
            totalOrganizers,
            totalRequests,
            pendingRequests,
            activeRequests,
            totalRaisedAgg,
        ] = await Promise.all([
            prisma.user.count({ where: { role: 'DONOR' } }),
            prisma.user.count({ where: { role: 'ORGANIZER' } }),
            prisma.donationRequest.count(),
            prisma.donationRequest.count({ where: { status: 'PENDING' } }),
            prisma.donationRequest.count({ where: { status: 'APPROVED' } }),
            prisma.donation.aggregate({
                _sum: { amount: true },
                where: { status: 'COMPLETED', type: 'MONEY' },
            }),
        ]);

        const totalRaised = Number(totalRaisedAgg._sum?.amount ?? 0);
        const totalUsers = totalDonors + totalOrganizers; // รวมผู้ใช้ทั้งหมดยกเว้น admin

        // 5️⃣ ส่ง response
        return NextResponse.json({
            totalUsers,
            totalDonors,
            totalOrganizers,
            totalRequests,
            pendingRequests,
            activeRequests,
            totalRaised,
        }, { status: 200 });
    } catch (err: any) {
        console.error('Error fetching admin stats', { error: err.message });
        return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
    }
}