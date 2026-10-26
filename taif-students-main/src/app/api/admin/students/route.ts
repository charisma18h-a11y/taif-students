import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAdminSession } from '@/lib/auth'

// جلب كل الطلاب المسجلين
export async function GET() {
  if (!(await getAdminSession())) {
    return NextResponse.json({ error: 'غير مصرّح' }, { status: 401 })
  }

  const students = await db.student.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      _count: { select: { views: true } },
    },
  })

  return NextResponse.json({ students })
}
