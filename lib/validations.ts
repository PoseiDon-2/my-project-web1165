import { z } from 'zod';
import { organization_type, user_role } from "@prisma/client";

export const loginSchema = z.object({
  email: z.string().email('อีเมลไม่ถูกต้อง'),
  password: z.string().min(1, 'กรุณากรอกรหัสผ่าน'),
});

export const donationSchema = z.object({
  requestId: z.string().min(1, 'กรุณาเลือกคำขอ'),
  amount: z.number().positive('จำนวนเงินต้องมากกว่า 0'),
  message: z.string().optional(),
  anonymous: z.boolean().default(false),
  paymentMethod: z.string().min(1, 'กรุณาเลือกวิธีการชำระเงิน'),
});

export const volunteerApplicationSchema = z.object({
  requestId: z.string().min(1, 'กรุณาเลือกคำขอ'),
  message: z.string().min(10, 'ข้อความต้องมีอย่างน้อย 10 ตัวอักษร'),
  skills: z.string().optional(),
  experience: z.string().optional(),
  availability: z.string().optional(),
  hoursCommitted: z.number().positive().optional(),
});

export const storySchema = z.object({
  title: z.string().min(1, 'กรุณากรอกหัวข้อ'),
  content: z.string().min(50, 'เนื้อหาต้องมีอย่างน้อย 50 ตัวอักษร'),
  requestId: z.string().optional(),
  images: z.array(z.string()).default([]),
});

export const donationRequestSchema = z.object({
  title: z.string().min(1, "ต้องระบุหัวข้อ"),
  description: z.string().min(1, "ต้องระบุรายละเอียด"),
  category: z.string().min(1, "ต้องระบุหมวดหมู่"),
  location: z.string().nullable().optional(), // เปลี่ยนจาก address เป็น location
  urgency: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional().default("LOW"),
  acceptsMoney: z.boolean().optional().default(false),
  acceptsItems: z.boolean().optional().default(false),
  acceptsVolunteer: z.boolean().optional().default(false),
  targetAmount: z.number().min(0).optional().default(0),
  itemsNeeded: z.array(z.string()).optional().nullable(),
  volunteersNeeded: z.number().int().min(0).optional().default(0),
  volunteerSkills: z.array(z.string()).optional().default([]),
  volunteerDuration: z.string().nullable().optional(),
  images: z.array(z.string().url()).optional().default([]),
  documents: z
    .object({
      detailedAddress: z.string().nullable().optional(),
      contactPhone: z.string().nullable().optional(),
      bankAccount: z
        .object({
          bank: z.string().optional(),
          accountNumber: z.string().optional(),
          accountName: z.string().optional(),
        })
        .optional(),
      organizationDetails: z
        .object({
          organizationType: z.enum(Object.values(organization_type) as [string, ...string[]]).optional(),
          registrationNumber: z.string().optional(),
          taxId: z.string().nullable().optional(),
        })
        .optional(),
    })
    .optional(),
  status: z.enum(["PENDING", "APPROVED", "COMPLETED", "REJECTED", "DRAFT"]).optional().default("PENDING"),
});

export type DonationRequestInput = z.infer<typeof donationRequestSchema>;

export const donationRequestUpdateSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  categoryId: z.string().optional(),
  targetAmount: z.number().optional(),
  location: z.string().optional(),
  urgency: z.enum(["LOW", "MEDIUM", "HIGH"]).optional(),
  acceptsMoney: z.boolean().optional(),
  acceptsItems: z.boolean().optional(),
  acceptsVolunteer: z.boolean().optional(),
  itemsNeeded: z.array(z.string()).optional(),
  volunteersNeeded: z.number().optional(),
  volunteerSkills: z.array(z.string()).optional(),
  volunteerDuration: z.string().optional(),
  images: z.array(z.string()).optional(),
  documents: z.record(z.string(), z.any()).optional(),
  status: z.enum(["PENDING", "COMPLETED", "CANCELLED", "DRAFT", "APPROVED", "REJECTED"]).optional(),
  expiresAt: z.string().datetime().optional(),
});

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
      idCard: z.any().optional(),
      organizationCert: z.any().optional(),
    })
    .optional(),
});

export const registerSchema = baseRegisterSchema.refine(
  (data) =>
    data.role !== 'ORGANIZER' ||
    (data.organizationId && data.organizationId !== 'other') ||
    (data.newOrganizationName && data.organizationType),
  {
    message: 'กรุณาระบุข้อมูลองค์กรให้ครบถ้วน (ต้องมี newOrganizationName และ organizationType) สำหรับผู้จัดงาน',
    path: ['organizationId', 'organizationType'],
  }
);