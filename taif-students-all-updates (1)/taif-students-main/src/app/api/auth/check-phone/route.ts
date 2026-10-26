import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { validateSaudiPhone } from '@/lib/auth'

// فحص سريع هل الرقم مسجّل مسبقاً؟
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const phoneInput = (body.phone || '').toString().trim()

    const { valid, normalized } = validateSaudiPhone(phoneInput)
    if (!valid) {
      return NextResponse.json({ valid: false, error: 'رقم الجوال غير صحيح' })
    }

    const existing = await db.student.findUnique({
      where: { phone: normalized },
      select: { id: true },
    })

    return NextResponse.json({
      valid: true,
      exists: !!existing,
    })
  } catch (e) {
    console.error('check-phone error', e)
    return NextResponse.json({ valid: false, error: 'حدث خطأ' }, { status: 500 })
  }
}
