import { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient } from "@prisma/client";
import { verifyToken } from "@/lib/auth";
import { Reward } from "@/types/rewards";

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "GET") {
        return res.status(405).json({ message: "อนุญาตเฉพาะ method GET เท่านั้น" });
    }

    try {
        // ดึง token จาก header Authorization
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json({ message: "ไม่ได้รับอนุญาต กรุณาให้ token" });
        }
        const token = authHeader.replace("Bearer ", "");
        const user = await verifyToken(token);
        if (!user) {
            return res.status(401).json({ message: "ไม่ได้รับอนุญาต กรุณาเข้าสู่ระบบ" });
        }

        const rewards: Reward[] = await prisma.reward.findMany({
            where: {
                userId: user.id,
                isActive: true,
            },
            select: {
                id: true,
                userId: true,
                rewardId: true,
                isActive: true,
                createdAt: true,
            },
        });

        return res.status(200).json({ rewards });
    } catch (error) {
        console.error("เกิดข้อผิดพลาดในการดึงรางวัล:", error);
        return res.status(500).json({ message: "เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์" });
    } finally {
        await prisma.$disconnect();
    }
}