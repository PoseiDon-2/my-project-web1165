// app/api/donation-requests/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { donationRequestService } from '@/lib/database'
import { authMiddleware } from '@/lib/middleware'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const donationRequest = await donationRequestService.findById(params.id)
    
    if (!donationRequest) {
      return NextResponse.json(
        { error: 'ไม่พบคำขอที่ระบุ' },
        { status: 404 }
      )
    }

    await donationRequestService.incrementViewCount(params.id)
    return NextResponse.json(donationRequest)
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error(`Get donation request error for ID ${params.id}:`, error)
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดในการดึงข้อมูลคำขอ', details: errorMessage },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = await authMiddleware(request)
    if (authResult.status !== 200) {
      return authResult
    }

    const userId = request.headers.get('x-user-id')
    const userRole = request.headers.get('x-user-role')

    const existingRequest = await donationRequestService.findById(params.id)
    if (!existingRequest) {
      return NextResponse.json(
        { error: 'ไม่พบคำขอที่ระบุ' },
        { status: 404 }
      )
    }

    if (userRole !== 'ADMIN' && existingRequest.organizerId !== userId) {
      return NextResponse.json(
        { error: 'ไม่มีสิทธิ์แก้ไขคำขอนี้' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const updatedRequest = await donationRequestService.update(params.id, body)
    return NextResponse.json({
      message: 'อัปเดตคำขอสำเร็จ',
      request: updatedRequest
    })
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error(`Update donation request error for ID ${params.id}:`, error)
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดในการอัปเดตคำขอ', details: errorMessage },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = await authMiddleware(request)
    if (authResult.status !== 200) {
      return authResult
    }

    const userId = request.headers.get('x-user-id')
    const userRole = request.headers.get('x-user-role')

    const existingRequest = await donationRequestService.findById(params.id)
    if (!existingRequest) {
      return NextResponse.json(
        { error: 'ไม่พบคำขอที่ระบุ' },
        { status: 404 }
      )
    }

    if (userRole !== 'ADMIN' && existingRequest.organizerId !== userId) {
      return NextResponse.json(
        { error: 'ไม่มีสิทธิ์ลบคำขอนี้' },
        { status: 403 }
      )
    }

    await donationRequestService.delete(params.id)
    return NextResponse.json({ message: 'ลบคำขอบริจาคสำเร็จ' }, { status: 200 })
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error(`Delete donation request error for ID ${params.id}:`, error)
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดในการลบคำขอ', details: errorMessage },
      { status: 500 }
    )
  }
}