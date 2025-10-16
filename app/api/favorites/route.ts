import { NextRequest, NextResponse } from 'next/server'
import { favoriteService } from '@/lib/database'
import { authMiddleware } from '@/lib/middleware'

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const authResult = await authMiddleware(request)
    if (authResult.status !== 200) {
      return authResult
    }

    const userId = request.headers.get('x-user-id')
    const { requestId } = await request.json()

    if (!requestId) {
      return NextResponse.json(
        { error: 'กรุณาระบุ ID ของคำขอ' },
        { status: 400 }
      )
    }

    const result = await favoriteService.toggle(userId!, requestId)

    return NextResponse.json({
      message: result.action === 'added' ? 'เพิ่มในรายการโปรดแล้ว' : 'ลบออกจากรายการโปรดแล้ว',
      action: result.action
    })

  } catch (error) {
    console.error('Toggle favorite error:', error)
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดในการจัดการรายการโปรด' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const authResult = await authMiddleware(request)
    if (authResult.status !== 200) {
      return authResult
    }

    const userId = request.headers.get('x-user-id')
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')

    const result = await favoriteService.getByUser(userId!, page, limit)

    return NextResponse.json(result)

  } catch (error) {
    console.error('Get favorites error:', error)
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดในการดึงรายการโปรด' },
      { status: 500 }
    )
  }
}
