import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getStudentSession, validateUniversityId } from '@/lib/auth'

// الطالب القديم يكمّل الرقم الجامعي بنفسه؛ لا يمكن تعديل رقم مسجل دون المشرف.
export async function POST(req: NextRequest) {
  try {
    const student = await getStudentSession()
    if (!student) return NextResponse.json({ error: 'سجّل الدخول أولاً' }, { status: 401 })
    if (student.universityId) {
      return NextResponse.json({ error: 'الرقم الجامعي محفوظ مسبقاً. تواصل مع المشرف لتصحيحه.' }, { status: 409 })
    }
    const body = await req.json()
    const universityId = validateUniversityId(body.universityId)
    if (!universityId.valid) {
      return NextResponse.json({ error: 'أدخل رقماً جامعياً صحيحاً من 6 إلى 15 رقماً' }, { status: 400 })
    }
    const existing = await db.student.findUnique({
      where: { universityId: universityId.normalized }, select: { id: true },
    })
    if (existing) {
      return NextResponse.json({ error: 'هذا الرقم الجامعي مسجل بحساب آخر. تواصل مع المشرف.' }, { status: 409 })
    }
    // updateMany مع شرط null لمنع تبديل الرقم عند تكرار الطلب.
    const updated = await db.student.updateMany({
      where: { id: student.id, universityId: null },
      data: { universityId: universityId.normalized },
    })
    if (updated.count !== 1) {
      return NextResponse.json({ error: 'سبق حفظ الرقم الجامعي، حدّث الصفحة.' }, { status: 409 })
    }
    return NextResponse.json({ success: true, student: {
      id: student.id, name: student.name, phone: student.phone,
      universityId: universityId.normalized,
    } }, { headers: { 'Cache-Control': 'private, no-store' } })
  } catch (e) {
    if (e && typeof e === 'object' && 'code' in e && e.code === 'P2002') {
      return NextResponse.json({ error: 'هذا الرقم الجامعي مستخدم في حساب آخر' }, { status: 409 })
    }
    console.error('university id update failed', e)
    return NextResponse.json({ error: 'حصل خطأ، حاول مرة أخرى' }, { status: 500 })
  }
}
