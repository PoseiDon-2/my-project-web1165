// app/api/register/route.ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { registerSchema } from "@/lib/validations";
import { userService, organizationService } from "@/lib/database";
import { hashPassword, generateToken } from "@/lib/auth";
import { uploadFileToCloudinary } from "@/lib/storage";
import { organization_type, Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// ใช้ otpStore เดียวกับ send และ verify
declare global {
  var otpStore: Map<string, { otp: string; expiresAt: number }> | undefined;
}

if (!global.otpStore) {
  global.otpStore = new Map<string, { otp: string; expiresAt: number }>();
}

const otpStore = global.otpStore;

// Rate limiting
const ratelimit = process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
  ? new Ratelimit({
    redis: Redis.fromEnv(),
    limiter: Ratelimit.slidingWindow(5, "1 h"),
    prefix: "register",
  })
  : null;

const typeMap: { [key: string]: organization_type } = {
  ngo: organization_type.NGO,
  charity: organization_type.CHARITY,
  foundation: organization_type.FOUNDATION,
  government: organization_type.GOVERNMENT,
  temple: organization_type.TEMPLE,
  other: organization_type.OTHER,
};

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const body = Object.fromEntries(formData);

    // Validate form data
    const validatedData = await registerSchema.parseAsync({
      ...body,
      interests: body.interests ? JSON.parse(body.interests as string) : undefined,
      documents: {
        idCard: formData.get("idCard") as File | null,
        organizationCert: formData.get("organizationCert") as File | null,
      },
    });

    // Rate limiting
    if (ratelimit) {
      const { success, reset } = await ratelimit.limit(validatedData.email);
      if (!success) {
        const resetTime = new Date(reset).toLocaleString();
        return NextResponse.json(
          { error: `เกินจำนวนครั้งที่สมัครได้ กรุณาลองใหม่หลัง ${resetTime}` },
          { status: 429 }
        );
      }
    }

    // ตรวจสอบ OTP
    const otpData = otpStore.get(validatedData.email);
    if (!otpData || Date.now() > otpData.expiresAt) {
      otpStore.delete(validatedData.email); // ลบ OTP ที่หมดอายุ
      return NextResponse.json({ error: "อีเมลนี้ยังไม่ได้ยืนยันหรือ OTP หมดอายุ" }, { status: 400 });
    }

    // Check if user exists
    const existingUser = await userService.findByEmail(validatedData.email);
    if (existingUser) {
      return NextResponse.json({ error: "อีเมลนี้ถูกใช้งานแล้ว" }, { status: 400 });
    }

    // จัดการ organization
    let organizationId = validatedData.organizationId;
    if (validatedData.role === "ORGANIZER") {
      if (validatedData.organizationId && validatedData.organizationId !== "other") {
        const org = await organizationService.findById(validatedData.organizationId);
        if (!org) {
          return NextResponse.json({ error: "ไม่พบองค์กรที่เลือก" }, { status: 400 });
        }
        organizationId = org.id;
        await organizationService.update(org.id, {
          registrationNumber: validatedData.registrationNumber || null,
          templeId: validatedData.templeId || null,
        });
      } else if (validatedData.newOrganizationName) {
        if (!validatedData.organizationType) {
          return NextResponse.json({ error: "ต้องระบุประเภทองค์กรเมื่อสร้างองค์กรใหม่" }, { status: 400 });
        }
        const orgType = typeMap[validatedData.organizationType.toLowerCase()];
        if (!orgType || !Object.values(organization_type).includes(orgType)) {
          return NextResponse.json({ error: `ประเภทองค์กรไม่ถูกต้อง: ${validatedData.organizationType}` }, { status: 400 });
        }
        const newOrg = await organizationService.create({
          name: validatedData.newOrganizationName,
          type: orgType,
          registrationNumber: validatedData.registrationNumber || null,
          templeId: validatedData.templeId || null,
          phone: null,
          address: null,
          website: null,
        });
        organizationId = newOrg.id;
      } else {
        return NextResponse.json({ error: "กรุณาระบุข้อมูลองค์กรให้ครบถ้วน" }, { status: 400 });
      }
    }

    // จัดการ file uploads
    let idCardUrl: string | undefined;
    let organizationCertUrl: string | undefined;
    const maxSize = 5 * 1024 * 1024; // 5MB
    const allowedTypes = ["image/jpeg", "image/png", "application/pdf"];

    if (validatedData.documents?.idCard) {
      if (validatedData.documents.idCard.size > maxSize) {
        return NextResponse.json({ error: "ไฟล์บัตรประจำตัวใหญ่เกิน 5MB" }, { status: 400 });
      }
      if (!allowedTypes.includes(validatedData.documents.idCard.type)) {
        return NextResponse.json({ error: "ประเภทไฟล์บัตรประจำตัวไม่ถูกต้อง (ต้องเป็น JPEG, PNG, หรือ PDF)" }, { status: 400 });
      }
      idCardUrl = await uploadFileToCloudinary(
        validatedData.documents.idCard,
        `idCard-${validatedData.email}-${Date.now()}`
      );
      if (!idCardUrl) {
        throw new Error("Failed to upload idCard to Cloudinary");
      }
    }

    if (validatedData.documents?.organizationCert) {
      if (validatedData.documents.organizationCert.size > maxSize) {
        return NextResponse.json({ error: "ไฟล์เอกสารองค์กรใหญ่เกิน 5MB" }, { status: 400 });
      }
      if (!allowedTypes.includes(validatedData.documents.organizationCert.type)) {
        return NextResponse.json({ error: "ประเภทไฟล์เอกสารองค์กรไม่ถูกต้อง (ต้องเป็น JPEG, PNG, หรือ PDF)" }, { status: 400 });
      }
      organizationCertUrl = await uploadFileToCloudinary(
        validatedData.documents.organizationCert,
        `orgCert-${validatedData.email}-${Date.now()}`
      );
      if (!organizationCertUrl) {
        throw new Error("Failed to upload organizationCert to Cloudinary");
      }
    }

    // Hash password
    const hashedPassword = await hashPassword(validatedData.password);

    // Create user
    const userCreateData: Prisma.userCreateInput = {
      id: crypto.randomUUID(),
      updatedAt: new Date(),
      email: validatedData.email,
      password: hashedPassword,
      firstName: validatedData.firstName,
      lastName: validatedData.lastName,
      phone: validatedData.phone,
      bio: validatedData.bio ?? null,
      role: validatedData.role,
      idCardUrl: idCardUrl ?? null,
      organizationCertUrl: organizationCertUrl ?? null,
      isEmailVerified: true,
      documentsVerified: validatedData.role === "ORGANIZER" ? false : true,
      ...(organizationId && {
        organization: { connect: { id: organizationId } },
      }),
    };

    const user = await userService.create(userCreateData);

    // สร้าง UserInterest
    if (validatedData.interests && validatedData.interests.length > 0) {
      await prisma.userinterest.createMany({
        data: validatedData.interests.map((interestId) => ({
          userId: user.id,
          interestId,
        })),
        skipDuplicates: true,
      });
    }

    // Generate token
    const token = generateToken({
      id: user.id,
      email: user.email,
      firstName: user.firstName || "",
      lastName: user.lastName || "",
      role: user.role,
      organizationId: user.organizationId, // ใช้ organizationId จาก UserResponse
    });

    // ลบ OTP
    otpStore.delete(validatedData.email);

    // ไม่ต้อง destructuring password
    return NextResponse.json({
      message: "สมัครสมาชิกสำเร็จ",
      user, // ส่ง user โดยตรง
      token,
    });
  } catch (error: any) {
    console.error("Registration error:", error);
    if (error.name === "ZodError") {
      return NextResponse.json(
        { error: "ข้อมูลไม่ถูกต้อง", details: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: `เกิดข้อผิดพลาดในการสมัครสมาชิก: ${error.message}` },
      { status: 500 }
    );
  }
}