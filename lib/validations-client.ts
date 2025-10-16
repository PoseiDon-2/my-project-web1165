"use client"
import { z } from 'zod';
import { organization_type, user_role } from "@prisma/client";

export const baseRegisterSchema = z.object({
    email: z.string().email('กรุณาระบุอีเมลที่ถูกต้อง'),
    password: z.string().min(8, 'รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร'),
    firstName: z.string().min(1, 'กรุณาระบุชื่อ'),
    lastName: z.string().min(1, 'กรุณาระบุนามสกุล'),
    phone: z
        .string()
        .min(10, 'กรุณาระบุหมายเลขโทรศัพท์ที่ถูกต้อง')
        .regex(/^\d{10}$/, 'หมายเลขโทรศัพท์ต้องมี 10 หลัก'),
    role: z.nativeEnum(user_role, { errorMap: () => ({ message: 'กรุณาระบุบทบาท' }) }),
    organizationId: z.string().optional(),
    newOrganizationName: z.string().optional(),
    organizationType: z.nativeEnum(organization_type, {
        errorMap: () => ({ message: 'กรุณาระบุประเภทองค์กรที่ถูกต้อง' }),
    }).optional(),
    registrationNumber: z.string().optional(),
    templeId: z.string().optional(),
    interests: z.array(z.string()).optional(),
    bio: z.string().optional(),
    documents: z
        .object({
            idCard: z.instanceof(File).nullable().optional(),
            organizationCert: z.instanceof(File).nullable().optional(),
        })
        .optional(),
});