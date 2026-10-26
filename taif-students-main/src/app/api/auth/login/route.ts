import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { setStudentSession, validateSaudiPhone, verifyPassword } from '@/lib/auth'

// دخول طالب موجود برقم الجوال + الباسورد
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const phoneInput = (body.phone || '').toString().trim()
    const password = (body.password || '').toString()

    const { valid, normalized } = validateSaudiPhone(phoneInput)
    if (!valid) {
      return NextResponse.json({ error: 'رقم الجوال غير صحيح' }, { status: 400 })
    }

    const student = await db.student.findUnique({
      where: { phone: normalized },
    })

    if (!student) {
      return NextResponse.json(
        {
          error: 'هذا الرقم غير مسجّل. استخدم خيار "إنشاء حساب"',
          shouldRegister: true,
        },
        { status: 404 }
      )
    }

    // التحقق من الباسورد
    if (!verifyPassword(password, student.password)) {
      return NextResponse.json(
        { error: 'كلمة المرور غير صحيحة' },
        { status: 401 }
      )
    }

    // تحديث آخر دخول
    await db.student.update({
      where: { id: student.id },
      data: { lastLogin: new Date() },
    })

    await setStudentSession(student.id)

    return NextResponse.json({
      success: true,
      student: { id: student.id, name: student.name, phone: student.phone },
    })
  } catch (e) {
    console.error('login error', e)
    return NextResponse.json({ error: 'حدث خطأ، حاول مرة ثانية' }, { status: 500 })
  }
}
