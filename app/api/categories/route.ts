import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET() {
    try {
        const categories = await prisma.category.findMany({
            select: {
                id: true,
                name: true,
            },
        });
        console.log("Fetched categories:", categories);
        return NextResponse.json(categories);
    } catch (error) {
        console.error("Error fetching categories:", error);
        return NextResponse.json({ error: "ไม่สามารถดึงข้อมูลหมวดหมู่ได้" }, { status: 500 });
    }
}