export const maxDuration = 30
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAdminSession } from '@/lib/auth'
import { resolveCourseSubject } from '@/lib/course-subject'
import { after } from 'next/server'
import { notifyStudents } from '@/lib/push-send'

// التحقق من جلسة الأدمن
async function requireAdmin() {
  const isAdmin = await getAdminSession()
  if (!isAdmin) {
    return null
  }
  return true
}

// جلب كل المطلوب (منشور وغير منشور)
export async function GET() {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'غير مصرّح' }, { status: 401 })
  }

  const assignments = await db.assignment.findMany({
    orderBy: { createdAt: 'desc' },
    include: { _count: { select: { views: true } } },
  })

  return NextResponse.json({ assignments })
}

// إنشاء مطلوب جديد
export async function POST(req: NextRequest) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'غير مصرّح' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const { title, description, type, details, subject, dueDate, published } = body

    if (typeof title !== 'string' || !title.trim() || typeof description !== 'string' || !description.trim()) {
      return NextResponse.json(
        { error: 'العنوان والوصف مطلوبان' },
        { status: 400 }
      )
    }

    let resolvedSubject: string | null
    try { resolvedSubject = await resolveCourseSubject(subject) }
    catch(e) { return NextResponse.json({error:(e as Error).message},{status:400}) }
    const assignment = await db.assignment.create({
      data: {
        title: title.trim(),
        description: description.trim(),
        type: type?.trim() || 'واجب',
        details: details?.trim() || null,
        subject: resolvedSubject,
        dueDate: dueDate ? new Date(dueDate) : null,
        published: published !== undefined ? Boolean(published) : true,
      },
    })

    if (assignment.published) after(() => notifyStudents({title:`${assignment.type} جديد: ${assignment.title}`,body:assignment.description.slice(0,160),subject:resolvedSubject,url:'/'}))
    return NextResponse.json({ success: true, assignment })
  } catch (e) {
    console.error('admin assignment POST error', e)
    return NextResponse.json({ error: 'تعذّر نشر المطلوب. تأكد من أعمدة جدول assignments واتصال DATABASE_URL؛ راجع Vercel Logs للتفاصيل.' }, { status: 503 })
  }
}
