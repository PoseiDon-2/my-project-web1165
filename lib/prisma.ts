// @/lib/prisma.ts
import { PrismaClient } from '@prisma/client';

// ประกาศ type สำหรับ globalThis.prisma
declare global {
  var prisma: PrismaClient | undefined;
}

// สร้างหรือ reuse PrismaClient instance
const prisma = globalThis.prisma ?? new PrismaClient();

// เก็บ instance ใน globalThis สำหรับ development เพื่อป้องกันปัญหา hot-reload
if (process.env.NODE_ENV !== 'production') {
  globalThis.prisma = prisma;
}

export default prisma;