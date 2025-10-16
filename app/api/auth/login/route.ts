// /app/api/auth/login/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { loginSchema } from '@/lib/validations';
import prisma from '@/lib/prisma';
import { verifyPassword, generateToken } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = loginSchema.parse(body);

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email: validatedData.email },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง' },
        { status: 401 }
      );
    }

    // Check if user is active
    if (user.status !== 'ACTIVE') {
      return NextResponse.json(
        { error: 'บัญชีของคุณถูกระงับ กรุณาติดต่อผู้ดูแลระบบ' },
        { status: 401 }
      );
    }

    // Verify password
    const isValidPassword = await verifyPassword(validatedData.password, user.password);
    if (!isValidPassword) {
      return NextResponse.json(
        { error: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง' },
        { status: 401 }
      );
    }

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { updatedAt: new Date() },
    });

    // Generate token
    const token = generateToken({
      id: user.id, // ใช้ id ตาม AuthUser
      email: user.email,
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      role: user.role,
      organizationId: user.organizationId || undefined,
    });

    // Remove password from response
    const { password, ...userWithoutPassword } = user;

    return NextResponse.json({
      message: 'เข้าสู่ระบบสำเร็จ',
      user: userWithoutPassword,
      token,
    });
  } catch (error: any) {
    console.error('Login error:', error);
    if (error.name === 'ZodError') {
      return NextResponse.json(
        {
          error: 'ข้อมูลไม่ถูกต้อง',
          details: error.errors,
        },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ' },
      { status: 500 }
    );
  }
}