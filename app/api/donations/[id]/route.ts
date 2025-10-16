// app/api/donation/[id]/route.ts
import { NextResponse } from 'next/server';
import prisma from "@/lib/prisma";

export async function GET(request: Request, { params }: { params: { id: string } }) {
    try {
        const donation = await prisma.donationRequest.findUnique({
            where: { id: params.id },
            include: {
                category: { select: { name: true } },
                organizer: { select: { firstName: true, lastName: true, avatar: true, phone: true, documentsVerified: true, organization: true } },
                organization: { select: { name: true, type: true } },
                donations: {
                    select: { id: true, amount: true, itemDetails: true, type: true, createdAt: true, donor: { select: { firstName: true, lastName: true } } },
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
            return NextResponse.json({ error: 'Donation not found' }, { status: 404 });
        }

        return NextResponse.json(donation);
    } catch (error) {
        console.error('Error fetching donation:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}