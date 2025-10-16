import { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient } from "@prisma/client";
import formidable from "formidable";
import { uploadImage } from "@/lib/upload";
import { verifyToken } from "@/lib/auth"; // เปลี่ยนจาก getUserFromToken เป็น verifyToken

const prisma = new PrismaClient();

export const config = {
    api: {
        bodyParser: false,
    },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "PUT") {
        return res.status(405).json({ message: "อนุญาตเฉพาะ method PUT เท่านั้น" });
    }

    try {
        // ดึง token จาก header Authorization
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json({ message: "ไม่ได้รับอนุญาต กรุณาให้ token" });
        }
        const token = authHeader.replace("Bearer ", "");
        const user = await verifyToken(token); // เปลี่ยนจาก getUserFromToken เป็น verifyToken
        if (!user || !user.id) {
            return res.status(401).json({ message: "ไม่ได้รับอนุญาต กรุณาเข้าสู่ระบบ" });
        }

        const form = formidable({ multiples: false });
        const { fields, files } = await new Promise<{ fields: formidable.Fields; files: formidable.Files }>((resolve, reject) => {
            form.parse(req, (err, fields, files) => {
                if (err) reject(err);
                resolve({ fields, files });
            });
        });

        // การจัดการ fields จาก formidable (อาจมาเป็น array)
        const firstName = Array.isArray(fields.firstName) ? fields.firstName[0] : fields.firstName;
        const lastName = Array.isArray(fields.lastName) ? fields.lastName[0] : fields.lastName;
        const phone = Array.isArray(fields.phone) ? fields.phone[0] : fields.phone;
        const bio = Array.isArray(fields.bio) ? fields.bio[0] : fields.bio;
        const customization = Array.isArray(fields.customization) ? fields.customization[0] : fields.customization;

        // Validation
        if (!firstName || !lastName) {
            return res.status(400).json({ message: "ชื่อและนามสกุลต้องไม่ว่างเปล่า" });
        }
        if (phone && !/^\d{10}$/.test(phone)) {
            return res.status(400).json({ message: "เบอร์โทรศัพท์ต้องเป็นตัวเลข 10 หลัก" });
        }
        if (bio && bio.length > 500) {
            return res.status(400).json({ message: "ไบโอต้องไม่เกิน 500 ตัวอักษร" });
        }

        // Handle file upload
        let avatarUrl: string | null = null;
        if (files.avatarFile) {
            const file = Array.isArray(files.avatarFile) ? files.avatarFile[0] : files.avatarFile;
            if (!file.mimetype || !["image/jpeg", "image/png", "image/gif"].includes(file.mimetype)) {
                return res.status(400).json({ message: "ไฟล์ต้องเป็น JPEG, PNG หรือ GIF" });
            }
            if (file.size > 5 * 1024 * 1024) {
                return res.status(400).json({ message: "ไฟล์ต้องไม่เกิน 5MB" });
            }
            avatarUrl = await uploadImage(file);
        }

        // Parse customization if provided
        let parsedCustomization: any = undefined;
        if (customization) {
            try {
                parsedCustomization = JSON.parse(customization);
                // ตรวจสอบความถูกต้องของ customization
                if (!parsedCustomization.theme || !["default", "gold", "platinum", "diamond"].includes(parsedCustomization.theme)) {
                    return res.status(400).json({ message: "ธีมของ customization ไม่ถูกต้อง" });
                }
                // แปลงเป็น string สำหรับบันทึกในฐานข้อมูล
                parsedCustomization = JSON.stringify(parsedCustomization);
            } catch (error) {
                return res.status(400).json({ message: "ข้อมูล customization ไม่ถูกต้อง" });
            }
        }

        const updatedUser = await prisma.user.update({
            where: { id: user.id },
            data: {
                firstName: firstName || undefined,
                lastName: lastName || undefined,
                phone: phone || null,
                bio: bio || null,
                avatar: avatarUrl || undefined,
                customization: parsedCustomization || undefined,
            },
            select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                phone: true,
                bio: true,
                avatar: true,
                customization: true,
                role: true,
                status: true,
                createdAt: true,
                updatedAt: true,
            },
        });

        return res.status(200).json({ user: updatedUser });
    } catch (error) {
        console.error("เกิดข้อผิดพลาดในการอัปเดตโปรไฟล์:", error);
        return res.status(500).json({ message: "เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์" });
    } finally {
        await prisma.$disconnect();
    }
}