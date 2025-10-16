import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { authenticateUser } from '@/lib/middleware';

// บอก Next.js ว่า route นี้เป็น dynamic
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    try {
        const user = await authenticateUser(request);
        if (!user) {
            return NextResponse.json(
                { error: 'ไม่พบข้อมูลผู้ใช้หรือ token ไม่ถูกต้อง' },
                { status: 401 }
            );
        }

        if (!['ORGANIZER', 'ADMIN'].includes(user.role)) {
            return NextResponse.json({ error: 'ไม่มีสิทธิ์เข้าถึง' }, { status: 403 });
        }

        const applications = await prisma.volunteerApplication.findMany({
            where: {
                request: {
                    organizerId: user.id, // ใช้ user.id จาก authenticateUser
                },
            },
            select: {
                id: true,
                message: true,
                skills: true,
                experience: true,
                availability: true,
                status: true,
                hoursCommitted: true,
                startDate: true,
                endDate: true,
                createdAt: true,
                updatedAt: true,
                approvedAt: true,
                completedAt: true,
                requestId: true,
                volunteer: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                        phone: true,
                    },
                },
            },
        });

        const formattedApplications = applications.map((app) => ({
            id: app.id,
            name: `${app.volunteer.firstName || ''} ${app.volunteer.lastName || ''}`.trim(),
            email: app.volunteer.email,
            phone: app.volunteer.phone || '',
            message: app.message || '',
            skills: app.skills ? (Array.isArray(app.skills) ? app.skills : []) : [],
            experience: app.experience || '',
            availability: app.availability || '',
            status: app.status.toLowerCase() as 'applied' | 'approved' | 'rejected' | 'completed',
            hoursCommitted: app.hoursCommitted || 0,
            startDate: app.startDate?.toISOString() || '',
            endDate: app.endDate?.toISOString() || '',
            appliedDate: app.createdAt.toISOString(),
            requestId: app.requestId,
        }));

        return NextResponse.json(formattedApplications);
    } catch (error: any) {
        console.error('Error fetching volunteer applications:', error);
        return NextResponse.json(
            { error: error.message || 'เกิดข้อผิดพลาดในการดึงข้อมูลผู้สมัครอาสาสมัคร' },
            { status: 500 }
        );
    }
}