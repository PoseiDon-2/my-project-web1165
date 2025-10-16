// app/api/otp/verify/route.ts
import { NextResponse } from "next/server";

// ใช้ otpStore เดียวกับ send endpoint
declare global {
    var otpStore: Map<string, { otp: string; expiresAt: number }> | undefined;
}

if (!global.otpStore) {
    global.otpStore = new Map<string, { otp: string; expiresAt: number }>();
}

const otpStore = global.otpStore;

export async function POST(request: Request) {
    try {
        const { email, otp } = await request.json();

        // Validate input
        if (!email || !otp || otp.length !== 6) {
            return NextResponse.json({ message: "กรุณาระบุอีเมลและ OTP 6 หลัก" }, { status: 400 });
        }

        // ตรวจสอบ OTP
        const storedData = otpStore.get(email);
        if (!storedData) {
            return NextResponse.json({ message: "ไม่พบ OTP สำหรับอีเมลนี้" }, { status: 400 });
        }

        // ตรวจสอบว่า OTP หมดอายุหรือไม่
        if (Date.now() > storedData.expiresAt) {
            otpStore.delete(email);
            return NextResponse.json({ message: "OTP หมดอายุแล้ว กรุณาขอ OTP ใหม่" }, { status: 400 });
        }

        // ตรวจสอบว่า OTP ตรงกัน
        if (storedData.otp !== otp) {
            return NextResponse.json({ message: "OTP ไม่ถูกต้อง" }, { status: 400 });
        }

        // ลบ OTP หลัง verify สำเร็จ
        otpStore.delete(email);

        return NextResponse.json({
            success: true,
            message: "ยืนยัน OTP สำเร็จ",
            redirect: process.env.NEXT_PUBLIC_SITE_URL || "https://donation-swipe.cpkku.com",
        });
    } catch (error: any) {
        console.error("Verify OTP error:", error);
        return NextResponse.json({ message: `เกิดข้อผิดพลาดในการยืนยัน OTP: ${error.message}` }, { status: 500 });
    }
}