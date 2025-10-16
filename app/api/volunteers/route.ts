import { NextRequest, NextResponse } from 'next/server'
import { volunteerApplicationSchema } from '@/lib/validations'
import { volunteerService } from '@/lib/database'
import { authMiddleware } from '@/lib/middleware'

export async function POST(request: NextRequest) {
  try {
    // ตรวจสอบการเข้าสู่ระบบ
    const authResult = await authMiddleware(request)
    if (authResult.status !== 200) return authResult

    const userId = request.headers.get('x-user-id')
    if (!userId) {
      return NextResponse.json({ error: 'ไม่พบข้อมูลผู้ใช้' }, { status: 401 })
    }

    // ตรวจสอบ body ด้วย Zod
    const body = await request.json()
    const validatedData = volunteerApplicationSchema.parse(body)

    if (!validatedData.requestId) {
      return NextResponse.json({ error: 'ต้องระบุ requestId' }, { status: 400 })
    }

    // สร้างใบสมัครอาสาสมัคร
    const application = await volunteerService.create({
      ...validatedData,
      status: 'APPLIED',
      volunteer: { connect: { id: userId } }, // เชื่อมผู้สมัคร
      request: { connect: { id: validatedData.requestId } }, // เชื่อมคำขอ
    })

    return NextResponse.json({
      message: 'สมัครเป็นอาสาสมัครสำเร็จ',
      application
    })

  } catch (error: any) {
    console.error('Create volunteer application error:', error)

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
      { error: 'เกิดข้อผิดพลาดในการสมัครเป็นอาสาสมัคร' },
      { status: 500 }
    )
  }
}
