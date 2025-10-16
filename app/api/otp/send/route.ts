// app/api/otp/send/route.ts
import { NextResponse } from "next/server";
import nodemailer from "nodemailer";
import validator from "validator";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// ใช้ otpStore เดียวกับ verify endpoint
declare global {
    var otpStore: Map<string, { otp: string; expiresAt: number }> | undefined;
}

if (!global.otpStore) {
    global.otpStore = new Map<string, { otp: string; expiresAt: number }>();
}

const otpStore = global.otpStore;

// Function เพื่อ generate OTP 6 หลัก
function generateOTP(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

// Rate limiting (ถ้ามี Upstash Redis)
const ratelimit = process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? new Ratelimit({
        redis: Redis.fromEnv(),
        limiter: Ratelimit.slidingWindow(3, "1 h"),
        prefix: "otp:send",
    })
    : null;

export async function POST(request: Request) {
    try {
        const { email } = await request.json();

        // Validate email
        if (!email || !validator.isEmail(email)) {
            return NextResponse.json({ message: "กรุณาระบุอีเมลที่ถูกต้อง" }, { status: 400 });
        }

        // Rate limiting
        if (ratelimit) {
            const { success, reset } = await ratelimit.limit(email);
            if (!success) {
                const resetTime = new Date(reset).toLocaleString();
                return NextResponse.json(
                    { message: `เกินจำนวนครั้งที่ขอ OTP ได้ กรุณาลองใหม่หลัง ${resetTime}` },
                    { status: 429 }
                );
            }
        }

        // ลบ OTP เก่าถ้ามี
        if (otpStore.has(email)) {
            otpStore.delete(email);
        }

        // Generate OTP
        const otp = generateOTP();
        const expiresAt = Date.now() + 10 * 60 * 1000; // หมดอายุใน 10 นาที

        // เก็บ OTP ใน memory
        otpStore.set(email, { otp, expiresAt });

        // แสดง OTP ใน console log (สำหรับ development เท่านั้น)
        console.log(`OTP สำหรับ ${email}: ${otp} (หมดอายุใน ${new Date(expiresAt).toLocaleString()})`);

        // สร้าง transporter
        const transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST || "mail-donation-swipe.cpkku.com",
            port: parseInt(process.env.SMTP_PORT || "587"),
            secure: false,
            auth: {
                user: process.env.SMTP_USER || "web1165@mail-donation-swipe.cpkku.com",
                pass: process.env.SMTP_PASS || "M7ueAO)=Z9}WbdKq",
            },
        });

        // ตรวจสอบการเชื่อมต่อ SMTP
        await transporter.verify().catch((err) => {
            throw new Error(`SMTP connection failed: ${err.message}`);
        });

        // ส่งเมล
        await transporter.sendMail({
            from: `"Donation Swipe" <${process.env.SMTP_USER || "web1165@mail-donation-swipe.cpkku.com"}>`,
            to: email,
            subject: "รหัส OTP สำหรับ Donation Swipe",
            text: `รหัส OTP ของคุณคือ: ${otp}\nรหัสนี้จะหมดอายุใน 10 นาที\n\nหากคุณไม่ได้ร้องขอ OTP นี้ กรุณาเพิกเฉยต่ออีเมลนี้`,
            html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
          <img src="https://res.cloudinary.com/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || "dkhahzgfn"}/image/upload/v1/donation-swipe-logo.png" alt="Donation Swipe Logo" style="max-width: 150px; margin-bottom: 20px;">
          <h2 style="color: #1f2937;">รหัส OTP สำหรับ Donation Swipe</h2>
          <p style="color: #4b5563;">รหัส OTP ของคุณคือ: <strong style="font-size: 24px; color: #2563eb;">${otp}</strong></p>
          <p style="color: #4b5563;">รหัสนี้จะหมดอายุใน 10 นาที</p>
          <p style="color: #4b5563;">หากคุณไม่ได้ร้องขอ OTP นี้ กรุณาเพิกเฉยต่ออีเมลนี้</p>
          <p style="color: #4b5563; margin-top: 20px;">ขอบคุณ,<br>ทีม Donation Swipe</p>
          <a href="${process.env.NEXT_PUBLIC_SITE_URL || "https://donation-swipe.cpkku.com"}" style="color: #2563eb; text-decoration: none;">${process.env.APP_NAME || "Donation Swipe"}</a>
        </div>
      `,
        });

        console.log(`OTP ส่งไปยัง ${email} สำเร็จ`);
        return NextResponse.json({ success: true, message: "OTP ส่งสำเร็จ" });
    } catch (error: any) {
        console.error("Send OTP error:", error);
        return NextResponse.json({ message: `เกิดข้อผิดพลาดในการส่ง OTP: ${error.message}` }, { status: 500 });
    }
}