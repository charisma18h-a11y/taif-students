import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getStudentSession } from '@/lib/auth'
import {getEnrollments} from '@/lib/course-store'

// تسجيل مشاهدة الطالب لكود معين (للإحصائيات)
export async function POST(req: NextRequest) {
  try {
    const student = await getStudentSession()
    if (!student) {
      return NextResponse.json({ error: 'غير مصرّح' }, { status: 401 })
    }

    if (!student.universityId) {
      return NextResponse.json({ error: 'أكمل الرقم الجامعي في ملفك أولاً' }, { status: 403 })
    }

    const body = await req.json()
    const assignmentId = body.assignmentId
    if (!assignmentId) {
      return NextResponse.json({ error: 'missing assignmentId' }, { status: 400 })
    }

    const target = await db.assignment.findUnique({where:{id:assignmentId}})
    const enrolled = await getEnrollments(student.id)
    if (!target?.published || !enrolled.length || (target.subject?.trim() && !enrolled.some(e=>e.title.trim()===target.subject?.trim()))) return NextResponse.json({error:'المطلوب غير متاح لك'},{status:403})

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
