import { PrismaClient } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

const prisma = new PrismaClient();

export async function GET(req: NextRequest, { params }: { params: { userId: string } }) {
    const { userId } = params;
    const token = req.headers.get("Authorization")?.replace("Bearer ", "");

    if (!userId) {
        return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }

    // ถ้าต้องการ authentication
    if (!token) {
        return NextResponse.json({ error: "Authentication token required" }, { status: 401 });
    }

    try {
        const rewards = await prisma.reward.findMany({
            where: { userId },
            orderBy: { createdAt: "desc" },
        });
        return NextResponse.json(rewards);
    } catch (error) {
        console.error("Error fetching rewards:", error);
        return NextResponse.json({ error: "Failed to fetch rewards" }, { status: 500 });
    }
}