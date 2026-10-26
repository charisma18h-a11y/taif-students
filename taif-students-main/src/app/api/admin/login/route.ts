import { NextRequest, NextResponse } from 'next/server'
import { ADMIN_PASSWORD, setAdminSession } from '@/lib/auth'

// دخول الأدمن بالباسورد
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const password = (body.password || '').toString()

    if (!ADMIN_PASSWORD || ADMIN_PASSWORD.startsWith("REPLACE_") || password !== ADMIN_PASSWORD) {
      return NextResponse.json({ error: 'كلمة المرور غير صحيحة' }, { status: 401 })
    }

    await setAdminSession()
    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('admin login error', e)
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
  }
}
