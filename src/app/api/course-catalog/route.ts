import { NextResponse } from 'next/server'
import { getAdminSession, getStudentSession } from '@/lib/auth'
import { getCatalog } from '@/lib/course-store'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

// Single catalog for all course selectors: do not return any student details.
export async function GET() {
  try {
    const admin = await getAdminSession()
    const student = admin ? null : await getStudentSession()
    if (!admin && !student) return NextResponse.json({ error: 'يجب تسجيل الدخول' }, { status: 401 })
    const catalog = (await getCatalog()).filter(c => c.active)
    const sections = admin ? await db.$queryRaw<{course_id: bigint; section: string}[]>`
      SELECT DISTINCT course_id, section FROM public.portal_course_enrollments ORDER BY section
    ` : []
    return NextResponse.json({ courses: catalog.map(c => ({
      id: c.id.toString(), title: c.title,
      sections: admin ? sections.filter(s => s.course_id === c.id).map(s => s.section) : []
    })) }, { headers: { 'Cache-Control': 'private, no-store' } })
  } catch (e) {
    console.error('course catalog fetch error', e)
    return NextResponse.json({ error: 'تعذر تحميل المواد المسجلة' }, { status: 503 })
  }
}
