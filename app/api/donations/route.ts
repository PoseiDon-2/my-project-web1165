import { NextRequest, NextResponse } from 'next/server'
import { donationSchema } from '@/lib/validations'
import { donationService } from '@/lib/database'
import { authMiddleware } from '@/lib/middleware'

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const authResult = await authMiddleware(request)
    if (authResult.status !== 200) {
      return authResult
    }

    const userId = request.headers.get('x-user-id')
    const body = await request.json()
    const validatedData = donationSchema.parse(body)

    const donation = await donationService.create({
      ...validatedData,
      type: 'MONEY',
      status: 'PENDING',
      donor: {
        connect: {
          id: userId!
        }
      },
      request: {
        connect: {
          id: validatedData.requestId  // หรือ id ของคำขอรับบริจาคที่ถูกต้อง
        }
      },
      transactionId: `TXN_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    })




    return NextResponse.json({
      message: 'บริจาคสำเร็จ',
      donation
    })

  } catch (error: any) {
    console.error('Create donation error:', error)

    if (error.name === 'ZodError') {
      return NextResponse.json(
        {
          error: 'ข้อมูลไม่ถูกต้อง',
          details: error.errors
        },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดในการบริจาค' },
      { status: 500 }
    )
  }
}
