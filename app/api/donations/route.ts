// app/api/donation/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { donationSchema } from '@/lib/validations';
import { donationService } from '@/lib/database';
import { authMiddleware } from '@/lib/middleware';
import prisma from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const authResult = await authMiddleware(request);
    if (authResult.status !== 200) {
      return authResult;
    }

    const userId = request.headers.get('x-user-id');
    if (!userId) {
      console.log('No user ID provided');
      return NextResponse.json({ error: 'User ID is required' }, { status: 401 });
    }

    const body = await request.json();
    console.log('Request body:', body);

    const validatedData = donationSchema.parse(body);
    console.log('Validated data:', validatedData);

    const donationRequest = await prisma.donationRequest.findUnique({
      where: { id: validatedData.requestId },
    });

    if (!donationRequest) {
      console.log(`Donation request with ID ${validatedData.requestId} not found`);
      return NextResponse.json(
        { error: `Donation request with ID ${validatedData.requestId} not found` },
        { status: 404 }
      );
    }

    const donation = await donationService.create({
      ...validatedData,
      type: 'MONEY',
      status: 'PENDING',
      donor: { connect: { id: userId } },
      request: { connect: { id: validatedData.requestId } },
      transactionId: `TXN_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    });

    console.log('Created donation:', donation);

    return NextResponse.json(
      { message: 'บริจาคสำเร็จ', donation },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (error: any) {
    console.error('Create donation error:', error);
    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'ข้อมูลไม่ถูกต้อง', details: error.errors },
        { status: 400 }
      );
    }
    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: 'ไม่พบ donation request หรือ donor ที่เกี่ยวข้อง' },
        { status: 404 }
      );
    }
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดในการบริจาค' },
      { status: 500 }
    );
  }
}