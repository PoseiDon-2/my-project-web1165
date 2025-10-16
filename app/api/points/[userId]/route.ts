import { PrismaClient } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

const prisma = new PrismaClient();

export async function GET(req: NextRequest, { params }: { params: { userId: string } }) {
    const { userId } = params;
    const token = req.headers.get("Authorization")?.replace("Bearer ", "");

    if (!userId) {
        return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }

    if (!token) {
        return NextResponse.json({ error: "Authentication token required" }, { status: 401 });
    }

    try {
        // ตรวจสอบ token (ถ้าต้องการ เช่น ด้วย JWT หรือ API อื่น)
        // const decoded = verifyToken(token); // เพิ่ม logic การตรวจสอบ token ถ้าจำเป็น

        const transactions = await prisma.pointstransaction.findMany({
            where: { userId },
            orderBy: { date: "desc" },
        });

        return NextResponse.json(transactions);
    } catch (error) {
        console.error("Error fetching transactions:", error);
        return NextResponse.json({ error: "Failed to fetch transactions" }, { status: 500 });
    } finally {
        await prisma.$disconnect();
    }
}