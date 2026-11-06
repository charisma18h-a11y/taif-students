import { NextResponse } from 'next/server'
import { getAdminSession, getStudentSession } from '@/lib/auth'

export const dynamic = 'force-dynamic'

// Compatibility for clients that still have the old dashboard cached.
// No legacy notices/timetable/push tables are queried or modified.
export async function GET() {
  const admin = await getAdminSession()
  const student = admin ? null : await getStudentSession()
  if (!admin && !student) return NextResponse.json({error: 'يجب تسجيل الدخول'}, {status: 401})
  return NextResponse.json({
    notices: [], timetable: [], completedIds: [], readNoticeIds: [], enrollments: []
  }, {headers: {'Cache-Control': 'no-store'}})
}

export async function POST() {
  return NextResponse.json({
    error: 'تم إيقاف نظام الإعلانات والجدول والإشعارات القديم. استخدم قسم «المطلوب» لنشر واجب أو اختبار لجميع الطلاب.'
  }, {status: 410})
}
