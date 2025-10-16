// /app/api/upload-image/route.ts
import { v2 as cloudinary } from "cloudinary";
import { NextRequest, NextResponse } from "next/server";
import { writeFile } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";

// Route Segment Config
export const dynamic = "force-dynamic"; // ทำให้ Route เป็น dynamic เพื่อจัดการ file uploads

// ตั้งค่า Cloudinary และตรวจสอบ environment variables
const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
const apiKey = process.env.CLOUDINARY_API_KEY;
const apiSecret = process.env.CLOUDINARY_API_SECRET;

if (!cloudName || !apiKey || !apiSecret) {
    console.error("Cloudinary configuration is missing environment variables");
    throw new Error("Cloudinary configuration is incomplete");
}

cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
});

export async function POST(request: NextRequest) {
    try {
        // Parse multipart form data
        const formData = await request.formData();
        const file = formData.get("file") as File | null;

        if (!file) {
            console.error("No file uploaded in request");
            return NextResponse.json({ error: "กรุณาอัปโหลดไฟล์" }, { status: 400 });
        }

        // ตรวจสอบประเภทไฟล์
        const allowedTypes = ["image/jpeg", "image/png"];
        if (!file.type || !allowedTypes.includes(file.type)) {
            console.error(`Invalid file type: ${file.type}`);
            return NextResponse.json(
                { error: "รองรับเฉพาะไฟล์ JPG และ PNG เท่านั้น" },
                { status: 400 }
            );
        }

        // บันทึกไฟล์ชั่วคราว
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        const tempPath = join(tmpdir(), `upload-${Date.now()}-${file.name}`);
        await writeFile(tempPath, buffer);

        // อัปโหลดไฟล์ไปยัง Cloudinary
        console.log(`Uploading file: ${file.name} to Cloudinary`);
        const result = await cloudinary.uploader.upload(tempPath, {
            folder: "donations",
            resource_type: "image",
            quality: "auto",
            fetch_format: "auto",
        });

        // ส่ง URL ของรูปภาพกลับไป
        console.log(`Upload successful, URL: ${result.secure_url}`);
        return NextResponse.json({ url: result.secure_url }, { status: 200 });
    } catch (error: unknown) {
        console.error("Error uploading to Cloudinary:", error);
        const errorMessage =
            error instanceof Error ? error.message : "ไม่สามารถอัปโหลดรูปภาพได้";
        return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
}