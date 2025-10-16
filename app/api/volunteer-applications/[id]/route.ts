import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { VolunteerStatus } from '@prisma/client';
import jwt from 'jsonwebtoken';

// บอก Next.js ว่า route นี้เป็น dynamic
export const dynamic = 'force-dynamic';

export async function PATCH(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const authHeader = request.headers.get('Authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return NextResponse.json({ error: 'กรุณาเข้าสู่ระบบ' }, { status: 401 });
        }

        const token = authHeader.split(' ')[1];
        const decoded: any = jwt.verify(token, process.env.JWT_SECRET || '');
        const userId = decoded.userId;

        const { id } = params;
        const { status } = await request.json();

        // ตรวจสอบค่า status
        if (!Object.values(VolunteerStatus).includes(status as VolunteerStatus)) {
            return NextResponse.json({ error: 'สถานะไม่ถูกต้อง' }, { status: 400 });
        }

        const application = await prisma.volunteerApplication.findUnique({
            where: { id },
            include: { request: true },
        });

        if (!application || application.request.organizerId !== userId) {
            return NextResponse.json({ error: 'ไม่พบใบสมัครหรือไม่มีสิทธิ์' }, { status: 404 });
        }

        // อัปเดต status แบบ type-safe
        const updatedApplication = await prisma.volunteerApplication.update({
            where: { id },
            data: { status },
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

        return NextResponse.json({
            id: updatedApplication.id,
            name: `${updatedApplication.volunteer.firstName ?? ''} ${updatedApplication.volunteer.lastName ?? ''}`.trim(),
            email: updatedApplication.volunteer.email,
            phone: updatedApplication.volunteer.phone || '',
            message: updatedApplication.message,
            skills: updatedApplication.skills ? JSON.parse(updatedApplication.skills as string) : [],
            experience: updatedApplication.experience || '',
            availability: updatedApplication.availability || '',
            status: updatedApplication.status.toLowerCase(),
            hoursCommitted: updatedApplication.hoursCommitted || 0,
            startDate: updatedApplication.startDate?.toISOString() || '',
            endDate: updatedApplication.endDate?.toISOString() || '',
            approvedAt: updatedApplication.approvedAt?.toISOString() || '',
            completedAt: updatedApplication.completedAt?.toISOString() || '',
            requestId: updatedApplication.requestId,
        });
    } catch (error) {
        console.error('Error updating volunteer application:', error);
        return NextResponse.json(
            { error: 'เกิดข้อผิดพลาดในการอัปเดตสถานะใบสมัคร' },
            { status: 500 }
        );
    }
}