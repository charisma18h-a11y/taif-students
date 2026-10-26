import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { setStudentSession, validateSaudiPhone, hashPassword, validatePassword } from '@/lib/auth'

// تسجيل طالب جديد (اسم + جوال + باسورد)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const name = (body.name || '').toString().trim()
    const phoneInput = (body.phone || '').toString().trim()
    const password = (body.password || '').toString()

    if (!name || name.length < 2) {
      return NextResponse.json(
        { error: 'الرجاء إدخال الاسم كامل (حرفين على الأقل)' },
        { status: 400 }
      )
    }

    const { valid, normalized } = validateSaudiPhone(phoneInput)
    if (!valid) {
      return NextResponse.json(
        {
          error:
            'رقم الجوال غير صحيح. مثال صحيح: 05XXXXXXXX (10 أرقام تبدأ بـ 05)',
        },
        { status: 400 }
      )
    }

    // التحقق من قوة الباسورد
    const passCheck = validatePassword(password)
    if (!passCheck.valid) {
      return NextResponse.json({ error: passCheck.error }, { status: 400 })
    }

    // التحقق من عدم تكرار الحساب
    const existing = await db.student.findUnique({
      where: { phone: normalized },
    })

    if (existing) {
      return NextResponse.json(
        {
          error: 'هذا الرقم مسجّل مسبقاً. استخدم خيار "دخول" بدل "تسجيل جديد"',
          shouldLogin: true,
        },
        { status: 409 }
      )
    }

    // إنشاء الطالب الجديد مع تشفير الباسورد
    const student = await db.student.create({
      data: {
        name,
        phone: normalized,
        password: hashPassword(password),
      },
    })

    await setStudentSession(student.id)

    return NextResponse.json({
      success: true,
      student: { id: student.id, name: student.name, phone: student.phone },
    })
  } catch (e) {
    console.error('register error', e)
    return NextResponse.json({ error: 'حدث خطأ، حاول مرة ثانية' }, { status: 500 })
  }
}
