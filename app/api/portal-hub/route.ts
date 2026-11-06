import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { after } from 'next/server'
import { notifyStudents } from '@/lib/push-send'
import { resolveCourseSubject } from '@/lib/course-subject'
import { getAdminSession, getStudentSession } from '@/lib/auth'
import { getEnrollments } from '@/lib/course-store'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

type Notice = { id: bigint; title: string; body: string; subject: string | null; pinned: boolean; created_at: Date }
type Slot = { id: bigint; subject: string; section: string; weekday: number; starts_at: string; ends_at: string; room: string }

// Portal tables are created once using SUPABASE_PORTAL_FIX_PUSH.sql.
// Avoid executing DDL in requests: pooled production database roles may not own schema objects.
const noStore = { 'Cache-Control': 'private, no-store' }
export async function GET() {
  try {
    const admin = await getAdminSession()
    const student = admin ? null : await getStudentSession()
    if (!admin && !student) return NextResponse.json({ error: 'يجب تسجيل الدخول' }, { status: 401 })
    const enrollments = student ? await getEnrollments(student.id) : []
    const notices = await db.$queryRaw<Notice[]>`SELECT id, title, body, subject, pinned, created_at FROM public.portal_notices ORDER BY pinned DESC, created_at DESC LIMIT 60`
    const slots = await db.$queryRaw<Slot[]>`SELECT id, subject, section, weekday, starts_at, ends_at, room FROM public.portal_timetable ORDER BY weekday,starts_at`
    const allowed = admin ? slots : slots.filter(slot => enrollments.some(e => e.title === slot.subject && e.section === slot.section))
    const progress = student ? await db.$queryRaw<{assignment_id:string}[]>`SELECT assignment_id FROM public.portal_student_progress WHERE student_id=${student.id}` : []
    const readNotices = student ? await db.$queryRaw<{notice_id:bigint}[]>`SELECT notice_id FROM public.portal_notice_reads WHERE student_id=${student.id}` : []
    const entitled = admin ? notices : notices.filter(n=>!n.subject || enrollments.some(e=>e.title===n.subject))
    return NextResponse.json({ notices: entitled.map(n=>({...n,id:String(n.id)})), readNoticeIds: readNotices.map(x=>x.notice_id.toString()), timetable: allowed.map(s=>({...s,id:String(s.id)})), completedIds: progress.map(p=>p.assignment_id), enrollments: enrollments.map(e=>({title:e.title,section:e.section})) }, {headers:noStore})
  } catch (e) { console.error('portal hub read',e);return NextResponse.json({error:'تعذّر تحميل لوحة المتابعة. تأكد من تنفيذ ملف SUPABASE_PORTAL_FIX_PUSH.sql في قاعدة البيانات الصحيحة.'},{status:503}) }
}
export async function POST(req: NextRequest) {
  const admin = await getAdminSession()
  const student = admin ? null : await getStudentSession()
  if (!admin && !student) return NextResponse.json({error:'يجب تسجيل الدخول'},{status:401})
  try {
    const input = await req.json()
    if (input.action === 'progress' && student && !admin) {
      const id = typeof input.assignmentId==='string' ? input.assignmentId : ''
      const a = await db.assignment.findUnique({where:{id}})
      if (!a || !a.published) return NextResponse.json({error:'الواجب غير موجود'},{status:404})
      const enrollments=await getEnrollments(student.id)
      if (!enrollments.length || (a.subject && !enrollments.some(e=>e.title===a.subject))) return NextResponse.json({error:'هذا الواجب خارج موادك'},{status:403})
      if (input.completed===true) await db.$executeRaw`INSERT INTO public.portal_student_progress (student_id,assignment_id) VALUES (${student.id},${id}) ON CONFLICT DO NOTHING`
      else await db.$executeRaw`DELETE FROM public.portal_student_progress WHERE student_id=${student.id} AND assignment_id=${id}`
      return NextResponse.json({success:true})
    }
    if (input.action === 'readNotice' && student && !admin) {
      const id = String(input.id || '')
      if (!/^\d{1,18}$/.test(id)) return NextResponse.json({error:'معرّف غير صحيح'},{status:400})
      const courseRows = await getEnrollments(student.id)
      const found = await db.$queryRaw<{id:bigint;subject:string|null}[]>`SELECT id,subject FROM public.portal_notices WHERE id=${BigInt(id)}`
      if (!found.length || (found[0].subject && !courseRows.some(c=>c.title===found[0].subject))) return NextResponse.json({error:'إعلان غير متاح'},{status:403})
      await db.$executeRaw`INSERT INTO public.portal_notice_reads(notice_id,student_id) VALUES(${BigInt(id)},${student.id}) ON CONFLICT DO NOTHING`
      return NextResponse.json({success:true})
    }
    if (!admin) return NextResponse.json({error:'صلاحية الإدارة مطلوبة'},{status:403})
    if (input.action==='notice') {
      const title=String(input.title||'').trim().slice(0,130)
      const body=String(input.body||'').trim().slice(0,1500)
      if(title.length<3) return NextResponse.json({error:'العنوان قصير'},{status:400})
      let subject: string | null
      try { subject = await resolveCourseSubject(input.subject) }
      catch(e) { return NextResponse.json({error:(e as Error).message},{status:400}) }
      await db.$executeRaw`INSERT INTO public.portal_notices(title,body,subject,pinned) VALUES (${title},${body},${subject},${input.pinned!==false})`
      after(() => notifyStudents({title:'إعلان جديد: '+title,body:body.slice(0,160),subject,url:'/'}))
      return NextResponse.json({success:true})
    }
    if (input.action==='deleteNotice') {
      const id=String(input.id||'')
      if(!/^\d+$/.test(id)) return NextResponse.json({error:'معرّف غير صحيح'},{status:400})
      await db.$executeRaw`DELETE FROM public.portal_notices WHERE id=${BigInt(id)}`
      return NextResponse.json({success:true})
    }
    if (input.action==='timetable') {
      const subject=String(input.subject||'').trim().slice(0,120)
      const section=String(input.section||'').trim().slice(0,30)
      const room=String(input.room||'').trim().slice(0,80)
      const weekday=Number(input.weekday)
      const starts=String(input.starts_at||'')
      const ends=String(input.ends_at||'')
      if (!subject||!/^\d{2,12}$/.test(section)||!Number.isInteger(weekday)||weekday<0||weekday>6|| !/^([01]\d|2[0-3]):[0-5]\d$/.test(starts)|| !/^([01]\d|2[0-3]):[0-5]\d$/.test(ends)||starts>=ends) return NextResponse.json({error:'تأكد من المادة والشعبة واليوم والوقت'},{status:400})
      let canonicalSubject: string
      try { canonicalSubject = (await resolveCourseSubject(subject, false))! }
      catch(e) { return NextResponse.json({error:(e as Error).message},{status:400}) }
      const conflict=await db.$queryRaw<{id:bigint}[]>`SELECT id FROM public.portal_timetable WHERE subject=${canonicalSubject} AND section=${section} AND weekday=${weekday} AND starts_at < ${ends} AND ends_at > ${starts} LIMIT 1`
      if(conflict.length) return NextResponse.json({error:'يوجد موعد متداخل لنفس المادة والشعبة'},{status:409})
      await db.$executeRaw`INSERT INTO public.portal_timetable(subject,section,weekday,starts_at,ends_at,room) VALUES (${canonicalSubject},${section},${weekday},${starts},${ends},${room})`
      after(() => notifyStudents({title:'موعد محاضرة جديد',body:`${canonicalSubject} - شعبة ${section}`,subject:canonicalSubject,section,url:'/'}))
      return NextResponse.json({success:true})
    }
    if (input.action==='deleteSlot') {
      const id=String(input.id||'')
      if(!/^\d+$/.test(id)) return NextResponse.json({error:'معرّف غير صحيح'},{status:400})
      await db.$executeRaw`DELETE FROM public.portal_timetable WHERE id=${BigInt(id)}`
      return NextResponse.json({success:true})
    }
    return NextResponse.json({error:'طلب غير معروف'},{status:400})
  } catch(e) {console.error('portal hub write',e);return NextResponse.json({error:'تعذّر حفظ الإعلان أو الموعد. تأكد من تشغيل ملف SUPABASE_PORTAL_FIX_PUSH.sql وأن DATABASE_URL متصل بنفس المشروع.'},{status:503})}
}
