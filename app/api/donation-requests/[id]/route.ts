import { NextRequest, NextResponse } from 'next/server';
import { donationRequestService } from '@/lib/database';
import { authMiddleware } from '@/lib/middleware';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // ตรวจสอบ params.id
    if (!params.id || typeof params.id !== 'string' || params.id.trim() === '') {
      console.log('Invalid ID provided:', params.id);
      return NextResponse.json(
        { error: 'ID ของคำขอไม่ถูกต้อง' },
        { status: 400 }
      );
    }

    // ดึงข้อมูล
    console.log(`Processing GET request for donation request ID: ${params.id}`);
    const donationRequest = await donationRequestService.findById(params.id);
    if (!donationRequest) {
      console.log(`Donation request not found for ID: ${params.id}`);
      return NextResponse.json(
        { error: 'ไม่พบคำขอที่ระบุ' },
        { status: 404 }
      );
    }

    // เพิ่ม view count
    await donationRequestService.incrementViewCount(params.id);

    return NextResponse.json(donationRequest);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`Get donation request error for ID ${params.id}:`, error);
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดในการดึงข้อมูลคำขอ', details: errorMessage },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // ตรวจสอบ auth
    const authResult = await authMiddleware(request);
    if (authResult.status !== 200) {
      console.log('Authentication failed:', authResult);
      return authResult;
    }

    // ตรวจสอบ params.id
    if (!params.id || typeof params.id !== 'string' || params.id.trim() === '') {
      console.log('Invalid ID provided:', params.id);
      return NextResponse.json(
        { error: 'ID ของคำขอไม่ถูกต้อง' },
        { status: 400 }
      );
    }

    const userId = request.headers.get('x-user-id');
    const userRole = request.headers.get('x-user-role');

    // ตรวจสอบ donation request
    console.log(`Processing PATCH request for donation request ID: ${params.id}`);
    const existingRequest = await donationRequestService.findById(params.id);
    if (!existingRequest) {
      console.log(`Donation request not found for ID: ${params.id}`);
      return NextResponse.json(
        { error: 'ไม่พบคำขอที่ระบุ' },
        { status: 404 }
      );
    }

    // ตรวจสอบสิทธิ์
    if (userRole !== 'ADMIN' && existingRequest.organizerId !== userId) {
      console.log(`Unauthorized access attempt by user ${userId} for request ${params.id}`);
      return NextResponse.json(
        { error: 'ไม่มีสิทธิ์แก้ไขคำขอนี้' },
        { status: 403 }
      );
    }

    // ตรวจสอบ JSON body
    let body;
    try {
      body = await request.json();
    } catch (error) {
      console.log('Invalid JSON body:', error);
      return NextResponse.json(
        { error: 'Invalid JSON body' },
        { status: 400 }
      );
    }

    // อัปเดตข้อมูล
    const updatedRequest = await donationRequestService.update(params.id, body);
    return NextResponse.json({
      message: 'อัปเดตคำขอสำเร็จ',
      request: updatedRequest,
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`Update donation request error for ID ${params.id}:`, error);
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดในการอัปเดตคำขอ', details: errorMessage },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // ตรวจสอบ auth
    const authResult = await authMiddleware(request);
    if (authResult.status !== 200) {
      console.log('Authentication failed:', authResult);
      return authResult;
    }

    // ตรวจสอบ params.id
    if (!params.id || typeof params.id !== 'string' || params.id.trim() === '') {
      console.log('Invalid ID provided:', params.id);
      return NextResponse.json(
        { error: 'ID ของคำขอไม่ถูกต้อง' },
        { status: 400 }
      );
    }

    const userId = request.headers.get('x-user-id');
    const userRole = request.headers.get('x-user-role');

    // ตรวจสอบ donation request
    console.log(`Processing DELETE request for donation request ID: ${params.id}`);
    const existingRequest = await donationRequestService.findById(params.id);
    if (!existingRequest) {
      console.log(`Donation request not found for ID: ${params.id}`);
      return NextResponse.json(
        { error: 'ไม่พบคำขอที่ระบุ' },
        { status: 404 }
      );
    }

    // ตรวจสอบสิทธิ์
    if (userRole !== 'ADMIN' && existingRequest.organizerId !== userId) {
      console.log(`Unauthorized access attempt by user ${userId} for request ${params.id}`);
      return NextResponse.json(
        { error: 'ไม่มีสิทธิ์ลบคำขอนี้' },
        { status: 403 }
      );
    }

    // ลบข้อมูล
    await donationRequestService.delete(params.id);
    return NextResponse.json({ message: 'ลบคำขอบริจาคสำเร็จ' }, { status: 200 });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`Delete donation request error for ID ${params.id}:`, error);
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดในการลบคำขอ', details: errorMessage },
      { status: 500 }
    );
  }
}