import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getStudentSession } from '@/lib/auth'

// تسجيل مشاهدة الطالب لكود معين (للإحصائيات)
export async function POST(req: NextRequest) {
  try {
    const student = await getStudentSession()
    if (!student) {
      return NextResponse.json({ error: 'غير مصرّح' }, { status: 401 })
    }

    const body = await req.json()
    const assignmentId = body.assignmentId
    if (!assignmentId) {
      return NextResponse.json({ error: 'missing assignmentId' }, { status: 400 })
    }

    // استخدم upsert بسبب unique constraint على (studentId, assignmentId)
    await db.view.upsert({
      where: {
        studentId_assignmentId: {
          studentId: student.id,
          assignmentId,
        },
      },
      update: { viewedAt: new Date() },
      create: {
        studentId: student.id,
        assignmentId,
      },
    })

    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('view POST error', e)
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
  }
}
