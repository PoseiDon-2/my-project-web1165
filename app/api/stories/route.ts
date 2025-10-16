import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ฟังก์ชันช่วย parse JSON อย่างปลอดภัย
const safeParse = (value: string | null | undefined, defaultValue: any) => {
    if (!value) return defaultValue;
    try {
        return JSON.parse(value);
    } catch (error) {
        console.warn('JSON parse error:', error);
        return defaultValue;
    }
};

// กำหนด interface สำหรับ Story และ StoryGroup
interface Story {
    id: string;
    donationRequestId: string;
    title: string;
    type: string;
    content: string;
    image: string;
    timestamp: string;
    author: string;
    isViewed: boolean;
    duration: number;
}

interface StoryGroup {
    donationRequestId: string;
    donationTitle: string;
    organizer: string;
    avatar: string;
    stories: Story[];
    hasUnviewed: boolean;
}

export async function GET(request: NextRequest) {
    try {
        // ดึง stories ที่มี status เป็น PUBLISHED
        const stories = await prisma.story.findMany({
            where: { status: 'PUBLISHED' },
            include: {
                donationRequest: {
                    include: {
                        organizer: { select: { firstName: true, lastName: true, avatar: true } },
                        organization: { select: { name: true } },
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
        });

        // จัดกลุ่ม stories ตาม donationRequestId
        const storyGroups = stories.reduce(
            (acc: Record<string, StoryGroup>, story) => {
                const donationRequest = story.donationRequest;
                if (!donationRequest) return acc;

                const groupId = donationRequest.id;
                if (!acc[groupId]) {
                    acc[groupId] = {
                        donationRequestId: groupId,
                        donationTitle: donationRequest.title,
                        organizer: donationRequest.organization?.name || `${donationRequest.organizer.firstName} ${donationRequest.organizer.lastName || ''}`.trim(),
                        avatar: donationRequest.organizer.avatar || '/placeholder.svg?height=60&width=60',
                        hasUnviewed: false,
                        stories: [],
                    };
                }

                acc[groupId].stories.push({
                    id: story.id,
                    donationRequestId: groupId,
                    title: story.title,
                    type: story.status.toLowerCase(),
                    content: story.content,
                    image: safeParse(story.images, [])[0] || '/placeholder.svg?height=600&width=400',
                    timestamp: story.createdAt.toISOString(),
                    author: `${donationRequest.organizer.firstName} ${donationRequest.organizer.lastName || ''}`.trim() || 'ไม่ระบุ',
                    isViewed: false,
                    duration: 5,
                });

                // อัปเดต hasUnviewed ถ้ามี story ที่ยังไม่ viewed
                acc[groupId].hasUnviewed = acc[groupId].stories.some((s: Story) => !s.isViewed);

                return acc;
            },
            {} as Record<string, StoryGroup>
        );

        // แปลง object เป็น array และเรียงตาม donationRequestId
        const groupedStories = Object.values(storyGroups).sort((a, b) =>
            a.donationRequestId.localeCompare(b.donationRequestId)
        );

        return NextResponse.json(groupedStories);
    } catch (error) {
        console.error('Error fetching stories:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    } finally {
        await prisma.$disconnect();
    }
}