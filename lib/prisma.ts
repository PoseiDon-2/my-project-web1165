// lib/prisma.ts
import { PrismaClient } from '@prisma/client';

// ตัวแปร prisma สำหรับเก็บ instance
let prisma: PrismaClient;

// ตรวจสอบว่า globalThis.prisma มีอยู่แล้วหรือไม่
if (!globalThis.prisma) {
  globalThis.prisma = new PrismaClient();
}
prisma = globalThis.prisma;

// ใน production สร้าง instance ใหม่เพื่อป้องกันปัญหาใน serverless
if (process.env.NODE_ENV === 'production') {
  prisma = new PrismaClient();
}

export default prisma;