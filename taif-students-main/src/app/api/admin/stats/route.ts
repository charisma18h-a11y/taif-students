import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAdminSession } from '@/lib/auth'

// إحصائيات للأدمن
export async function GET() {
  if (!(await getAdminSession())) {
    return NextResponse.json({ error: 'غير مصرّح' }, { status: 401 })
  }

  const [studentCount, assignmentCount, publishedCount, totalViews] = await Promise.all([
    db.student.count(),
    db.assignment.count(),
    db.assignment.count({ where: { published: true } }),
    db.view.count(),
  ])

  // أكثر الأكواد مشاهدة
  const topAssignments = await db.assignment.findMany({
    orderBy: { views: { _count: 'desc' } },
    take: 5,
    include: { _count: { select: { views: true } } },
  })

  return NextResponse.json({
    studentCount,
    assignmentCount,
    publishedCount,
    totalViews,
    topAssignments: topAssignments.map((a) => ({
      id: a.id,
      title: a.title,
      views: a._count.views,
    })),
  })
}
