import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { userinteraction_interactionType } from "@prisma/client";

// Interface สำหรับ request body
interface InteractionRequest {
    userId: string;
    entityType: string;
    entityId: string;
    interactionType: userinteraction_interactionType;
    interactionValue?: number;
    duration?: number;
}

// กำหนดน้ำหนักสำหรับ interactionType
const INTERACTION_WEIGHTS: Record<userinteraction_interactionType, number> = {
    FAVORITE: 5.0,
    SHARE: 3.0,
    VIEW: 1.0,
    SKIP: -0.2,
};

export async function POST(req: Request) {
    try {
        // Parse และ validate request body
        const body = await req.json();
        const { userId, entityType, entityId, interactionType, interactionValue, duration } =
            body as InteractionRequest;

        // ตรวจสอบ required fields
        if (!userId || !entityType || !entityId || !interactionType) {
            return NextResponse.json(
                { error: "กรุณาระบุ userId, entityType, entityId, และ interactionType" },
                { status: 400 }
            );
        }

        // ตรวจสอบว่า interactionType ถูกต้อง
        if (!Object.values(userinteraction_interactionType).includes(interactionType)) {
            return NextResponse.json(
                { error: `interactionType ต้องเป็นหนึ่งใน ${Object.values(userinteraction_interactionType).join(", ")}` },
                { status: 400 }
            );
        }

        // ตรวจสอบว่า userId มีอยู่ในฐานข้อมูล
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) {
            return NextResponse.json({ error: "ไม่พบผู้ใช้" }, { status: 404 });
        }

        // ตรวจสอบว่า entityId ถูกต้องตาม entityType
        if (entityType === "DonationRequest") {
            const donationRequest = await prisma.donationRequest.findUnique({
                where: { id: entityId, status: "APPROVED" },
            });
            if (!donationRequest) {
                return NextResponse.json(
                    { error: "ไม่พบ DonationRequest หรือสถานะไม่ใช่ APPROVED" },
                    { status: 404 }
                );
            }
        } else {
            return NextResponse.json(
                { error: `entityType ต้องเป็น DonationRequest` },
                { status: 400 }
            );
        }

        // ตรวจสอบ interaction ที่มีอยู่เพื่อป้องกันการบันทึกซ้ำ
        const existingInteraction = await prisma.userinteraction.findFirst({
            where: { userId, entityType, entityId, interactionType },
        });

        if (existingInteraction) {
            return NextResponse.json(
                { error: "การโต้ตอบนี้มีอยู่แล้ว" },
                { status: 409 }
            );
        }

        // คำนวณ weight จาก interactionType
        const weight = INTERACTION_WEIGHTS[interactionType];

        // บันทึก interaction
        const interaction = await prisma.userinteraction.create({
            data: {
                userId,
                entityType,
                entityId,
                interactionType,
                interactionValue: interactionValue ?? 1,
                weight,
                duration,
            },
        });

        // อัปเดต recommendationScore ใน DonationRequest
        if (entityType === "DonationRequest") {
            await prisma.donationRequest.update({
                where: { id: entityId },
                data: {
                    recommendationScore: {
                        increment: weight, // เพิ่ม recommendationScore ตาม weight
                    },
                },
            });
        }

        return NextResponse.json(interaction);
    } catch (err) {
        console.error("Interaction error:", err);
        if (err instanceof Error && err.message.includes("Unique constraint")) {
            return NextResponse.json(
                { error: "การโต้ตอบนี้มีอยู่แล้วในระบบ" },
                { status: 409 }
            );
        }
        return NextResponse.json(
            { error: "ไม่สามารถบันทึกการโต้ตอบได้", details: err instanceof Error ? err.message : "Unknown error" },
            { status: 500 }
        );
    }
}