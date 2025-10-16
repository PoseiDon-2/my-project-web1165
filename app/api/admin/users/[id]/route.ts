// /app/api/admin/users/[id]/route.js
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyToken, hashPassword } from '@/lib/auth';
import { z } from 'zod';
import { baseRegisterSchema } from '@/lib/validations';
import { user_status } from '@prisma/client';

const updateUserSchema = baseRegisterSchema.omit({ password: true }).extend({
    password: z.string().min(6, 'Password must be at least 6 characters').optional(),
    status: z.enum([user_status.ACTIVE, user_status.SUSPENDED, user_status.INACTIVE]).optional(),
});

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
        return NextResponse.json({ error: 'No token provided', status: 401 }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded || decoded.role !== 'ADMIN') {
        return NextResponse.json({ error: 'Unauthorized', status: 401 }, { status: 401 });
    }

    try {
        const user = await prisma.user.findUnique({
            where: { id: params.id },
            select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                role: true,
                createdAt: true,
                status: true,
                _count: { select: { donationRequests: true } },
                donations: { select: { amount: true }, where: { type: 'MONEY', status: 'COMPLETED' } },
            },
        });

        if (!user) {
            return NextResponse.json({ error: 'User not found', status: 404 }, { status: 404 });
        }

        const formatted = {
            id: user.id,
            name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email,
            email: user.email,
            role: user.role as 'DONOR' | 'ORGANIZER' | 'ADMIN',
            joinDate: user.createdAt.toISOString(),
            isVerified: user.status === 'ACTIVE',
            requestsCreated: user.role === 'ORGANIZER' ? user._count.donationRequests : undefined,
            totalDonated: user.role === 'DONOR' ? user.donations.reduce((sum, d) => sum + Number(d.amount), 0) : undefined,
        };

        return NextResponse.json({ data: formatted, status: 200 });
    } catch (error) {
        console.error('Error fetching user:', error);
        return NextResponse.json({ error: 'Failed to fetch user', status: 500 }, { status: 500 });
    }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
        return NextResponse.json({ error: 'No token provided', status: 401 }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded || decoded.role !== 'ADMIN') {
        return NextResponse.json({ error: 'Unauthorized', status: 401 }, { status: 401 });
    }

    try {
        const body = await request.json();
        const data = updateUserSchema.parse(body);

        const updateData: any = {};
        if (data.firstName) updateData.firstName = data.firstName;
        if (data.lastName) updateData.lastName = data.lastName;
        if (data.email) updateData.email = data.email;
        if (data.role) updateData.role = data.role;
        if (data.status) updateData.status = data.status;
        if (data.phone) updateData.phone = data.phone;
        if (data.password) updateData.password = await hashPassword(data.password);
        if (data.organizationId) updateData.organization = { connect: { id: data.organizationId } };
        if (data.bio) updateData.bio = data.bio;
        if (data.interests && data.interests.length > 0) {
            updateData.userInterests = {
                deleteMany: {},
                create: data.interests.map((interestId: string) => ({
                    interestId,
                })),
            };
        }

        const updated = await prisma.user.update({
            where: { id: params.id },
            data: updateData,
            select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                role: true,
                status: true,
                phone: true,
                bio: true,
                organizationId: true,
            },
        });

        await prisma.auditLog.create({
            data: {
                userId: decoded.id,
                action: 'UPDATE_USER',
                entityType: 'User',
                entityId: params.id,
                createdAt: new Date(),
            },
        });

        return NextResponse.json({ data: updated, status: 200 });
    } catch (error) {
        console.error('Error updating user:', error);
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: 'Invalid data', details: error.errors, status: 400 }, { status: 400 });
        }
        return NextResponse.json({ error: 'Failed to update user', status: 500 }, { status: 500 });
    }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
        return NextResponse.json({ error: 'No token provided', status: 401 }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded || decoded.role !== 'ADMIN') {
        return NextResponse.json({ error: 'Unauthorized', status: 401 }, { status: 401 });
    }

    try {
        await prisma.user.delete({ where: { id: params.id } });

        await prisma.auditLog.create({
            data: {
                userId: decoded.id,
                action: 'DELETE_USER',
                entityType: 'User',
                entityId: params.id,
                createdAt: new Date(),
            },
        });

        return NextResponse.json({ data: { success: true }, status: 200 });
    } catch (error) {
        console.error('Error deleting user:', error);
        return NextResponse.json({ error: 'Failed to delete user', status: 500 }, { status: 500 });
    }
}