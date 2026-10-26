import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getStudentSession } from '@/lib/auth'

// جلب الأكواد المنشورة للطالب
export async function GET() {
  try {
    const student = await getStudentSession()

    const assignments = await db.assignment.findMany({
      where: { published: true },
      orderBy: { createdAt: 'desc' },
    })

    // لو الطالب مسجّل، نضيف معلومات المشاهدة
    let viewedIds: string[] = []
    if (student) {
      const views = await db.view.findMany({
        where: { studentId: student.id },
        select: { assignmentId: true },
      })
      viewedIds = views.map((v) => v.assignmentId)
    }

    return NextResponse.json({
      assignments,
      viewedIds,
      student: student ? { id: student.id, name: student.name, phone: student.phone } : null,
    })
  } catch (e) {
    console.error('assignments GET error', e)
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
  }
}
