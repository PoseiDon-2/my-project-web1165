// app/api/donation/[id]/route.ts
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request: Request, { params }: { params: { id: string } }) {
    try {
        console.log('Fetching donation request with ID:', params.id);

        const donation = await prisma.donationRequest.findUnique({
            where: { id: params.id },
            include: {
                category: { select: { name: true } },
                organizer: {
                    select: {
                        firstName: true,
                        lastName: true,
                        avatar: true,
                        phone: true,
                        documentsVerified: true,
                        organization: { select: { name: true, type: true } } // organization เป็น optional
                    }
                },
                organization: { select: { name: true, type: true } }, // organization เป็น optional
                donations: {
                    select: {
                        id: true,
                        amount: true,
                        itemDetails: true,
                        type: true,
                        createdAt: true,
                        donor: { select: { firstName: true, lastName: true } }
                    },
                    where: { status: 'COMPLETED' },
                },
                stories: {
                    select: { id: true, title: true, content: true, images: true, views: true, createdAt: true, status: true },
                    where: { status: 'PUBLISHED' },
                    orderBy: { createdAt: 'desc' },
                },
                volunteerApplications: {
                    select: { id: true, message: true, status: true, createdAt: true, volunteer: { select: { firstName: true, lastName: true } } },
                    where: { status: 'APPROVED' },
                },
            },
        });

        if (!donation) {
            console.log(`Donation request with ID ${params.id} not found`);
            return NextResponse.json(
                { error: `Donation request with ID ${params.id} not found` },
                { status: 404 }
            );
        }

        console.log('Found donation request:', donation);
        return NextResponse.json(donation, { headers: { 'Cache-Control': 'no-store' } });
    } catch (error) {
        console.error('Error fetching donation:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}