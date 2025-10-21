import { NextRequest, NextResponse } from 'next/server';
import { loginSchema } from '@/lib/validations';
import prisma from '@/lib/prisma';
import { verifyPassword, generateToken } from '@/lib/auth';

const allowedOrigin = process.env.NEXT_PUBLIC_API_URL || '*';

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders() });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = loginSchema.parse(body);

    const user = await prisma.user.findUnique({
      where: { email: validatedData.email },
    });

    if (!user) {
      return NextResponse.json(
        { message: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง' },
        { status: 401, headers: corsHeaders() }
      );
    }

    if (user.status !== 'ACTIVE') {
      return NextResponse.json(
        { error: 'บัญชีของคุณถูกระงับ กรุณาติดต่อผู้ดูแลระบบ' },
        { status: 401, headers: corsHeaders() }
      );
    }

    const isValidPassword = await verifyPassword(validatedData.password, user.password);
    if (!isValidPassword) {
      return NextResponse.json(
        { error: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง' },
        { status: 401, headers: corsHeaders() }
      );
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { updatedAt: new Date() },
    });

    const token = generateToken({
      id: user.id,
      email: user.email,
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      role: user.role,
      organizationId: user.organizationId || undefined,
    });

    const { password, ...userWithoutPassword } = user;

    return NextResponse.json(
      {
        message: 'เข้าสู่ระบบสำเร็จ',
        user: userWithoutPassword,
        token,
      },
      { headers: corsHeaders() }
    );
  } catch (error: any) {
    console.error('Login error:', error);
    const status = error.name === 'ZodError' ? 400 : 500;
    const message = error.name === 'ZodError'
      ? { error: 'ข้อมูลไม่ถูกต้อง', details: error.errors }
      : { error: 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ' };
    return NextResponse.json(message, { status, headers: corsHeaders() });
  }
}
