import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET() {
    try {
        const groups = await prisma.story.groupBy({
            by: ["donationRequestId"],
            _count: { id: true },
        });

        const data = await Promise.all(
            groups.map(async (g) => {
                if (!g.donationRequestId) return null;

                const dr = await prisma.donationRequest.findUnique({
                    where: { id: g.donationRequestId },
                    include: { organizer: true },
                });

                return {
                    donationRequestId: g.donationRequestId,
                    organizer: dr?.organizer.firstName || "ไม่ทราบ",
                    avatar: dr?.organizer.avatar || "/default-avatar.png",
                    hasUnviewed: false, // สามารถปรับ logic เช็ค userInteraction ได้
                    storyCount: g._count.id,
                };
            })
        ); return NextResponse.json(data.filter(Boolean));
    } catch (err) {
        console.error("Stories group error:", err);
        return NextResponse.json(
            { error: "ไม่สามารถโหลดกลุ่มสตอรี่ได้" },
            { status: 500 }
        );
    }
}