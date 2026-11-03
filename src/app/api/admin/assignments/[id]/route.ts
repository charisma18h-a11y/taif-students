export const maxDuration = 30
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAdminSession } from '@/lib/auth'
import { resolveCourseSubject } from '@/lib/course-subject'
import { after } from 'next/server'
import { notifyStudents } from '@/lib/push-send'

async function requireAdmin() {
  return await getAdminSession()
}

// تعديل كود
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'غير مصرّح' }, { status: 401 })
  }

  try {
    const { id } = await params
    const body = await req.json()
    const { title, description, type, details, subject, dueDate, published } = body

    let resolvedSubject: string | null | undefined
    if (subject !== undefined) {
      try { resolvedSubject = await resolveCourseSubject(subject) }
      catch(e) { return NextResponse.json({error:(e as Error).message},{status:400}) }
    }
    const data: Record<string, unknown> = {}
    if (title !== undefined) data.title = title.trim()
    if (description !== undefined) data.description = description.trim()
    if (type !== undefined) data.type = type.trim()
    if (details !== undefined) data.details = details?.trim() || null
    if (subject !== undefined) data.subject = resolvedSubject
    if (dueDate !== undefined) data.dueDate = dueDate ? new Date(dueDate) : null
    if (published !== undefined) data.published = Boolean(published)

    const before = await db.assignment.findUnique({where:{id}})
    const updated = await db.assignment.update({
      where: { id },
      data,
    })

    if (updated.published && before && !before.published) after(() => notifyStudents({title:`${updated.type} جديد: ${updated.title}`,body:updated.description.slice(0,160),subject:updated.subject,url:'/'}))
    return NextResponse.json({ success: true, assignment: updated })
  } catch (e) {
    console.error('admin assignment PUT error', e)
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
  }
}

// حذف كود
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'غير مصرّح' }, { status: 401 })
  }

  try {
    const { id } = await params
    await db.assignment.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('admin assignment DELETE error', e)
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
  }
}
