import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'node:crypto'
import { db } from '@/lib/db'
import { getAdminSession } from '@/lib/auth'
import { getCatalog, publicCatalog } from '@/lib/course-store'
import { normalizeRosterName, parseRosterText } from '@/lib/roster-match'

export const dynamic = 'force-dynamic'
const reply = (error:string,status=400)=>NextResponse.json({error},{status,headers:{'Cache-Control':'no-store'}})
const validCourse = (id:unknown): id is string => typeof id==='string' && /^\d{1,18}$/.test(id)
const validSection = (v:unknown):v is string => typeof v==='string' && /^\d{2,12}$/.test(v)

type DbList = { id:bigint; course_id:bigint; section:string }
type DbEntry = {id:bigint; roster_id:bigint; full_name:string; normalized_name:string; linked_student_id:string|null}
type DbEnrollment={student_id:string;course_id:bigint;section:string}

export async function GET(){
  if(!await getAdminSession())return reply('صلاحية الأدمن مطلوبة',401)
  try {
    const [courses,lists,entries,students,enrollments] = await Promise.all([
      getCatalog(),
      db.$queryRaw<DbList[]>`SELECT id, course_id, section FROM public.portal_official_rosters ORDER BY course_id, section`,
      db.$queryRaw<DbEntry[]>`SELECT id, roster_id, full_name, normalized_name, linked_student_id FROM public.portal_official_roster_entries ORDER BY full_name`,
      db.student.findMany({select:{id:true,name:true,universityId:true},orderBy:{name:'asc'}}),
      db.$queryRaw<DbEnrollment[]>`SELECT student_id,course_id,section FROM public.portal_course_enrollments`,
    ])
    return NextResponse.json({
      courses:publicCatalog(courses),
      lists:lists.map(l=>({id:String(l.id),courseId:String(l.course_id),section:l.section})),
      entries:entries.map(e=>({id:String(e.id),rosterId:String(e.roster_id),fullName:e.full_name,normalizedName:e.normalized_name,linkedStudentId:e.linked_student_id})),
      students,
      enrollments:enrollments.map(e=>({studentId:e.student_id,courseId:String(e.course_id),section:e.section}))
    },{headers:{'Cache-Control':'no-store'}})
  }catch(e){
    console.error('official rosters get',e)
    return reply('تعذر تحميل الكشوف. تأكد من تشغيل ملف SQL المرفق في Supabase.',503)
  }
}

export async function POST(req:NextRequest){
  if(!await getAdminSession())return reply('صلاحية الأدمن مطلوبة',401)
  const body:unknown=await req.json().catch(()=>null)
  if(!body || typeof body!=='object')return reply('طلب غير صالح')
  const b=body as Record<string,unknown>
  try{
    if(b.action==='import'){
      if(!validCourse(b.courseId)||!validSection(b.section)||typeof b.text!=='string'||b.text.length>50000)return reply('اختر المادة والشعبة وألصق كشفًا صالحًا (حتى 50 ألف حرف)')
      const parsed=parseRosterText(b.text)
      if(parsed.names.length<1||parsed.names.length>500)return reply('لم أجد أسماء كافية، أو الكشف أكبر من 500 اسم')
      const courseId=BigInt(b.courseId),section=b.section
      const existing=await db.$queryRaw<{id:bigint}[]>`SELECT id FROM public.portal_courses WHERE id=${courseId}`
      if(!existing.length)return reply('المادة غير موجودة في المنصة؛ أضفها من إدارة المواد أولًا')
      const marker=randomUUID()
      await db.$transaction(async tx=>{
        const lists=await tx.$queryRaw<{id:bigint}[]>`INSERT INTO public.portal_official_rosters (course_id,section)
          VALUES (${courseId},${section}) ON CONFLICT (course_id,section) DO UPDATE SET section=EXCLUDED.section RETURNING id`
        const rosterId=lists[0].id
        const payload=JSON.stringify(parsed.names.map(fullName=>({full_name:fullName,normalized_name:normalizeRosterName(fullName)})))
        await tx.$executeRaw`INSERT INTO public.portal_official_roster_entries (roster_id,full_name,normalized_name,import_marker)
          SELECT ${rosterId},row.full_name,row.normalized_name,${marker}
          FROM jsonb_to_recordset(${payload}::jsonb) AS row(full_name text,normalized_name text)
          ON CONFLICT (roster_id,normalized_name) DO UPDATE SET full_name=EXCLUDED.full_name,import_marker=EXCLUDED.import_marker`
        await tx.$executeRaw`DELETE FROM public.portal_official_roster_entries WHERE roster_id=${rosterId} AND import_marker<>${marker}`
      },{timeout:30000,maxWait:10000})
      return NextResponse.json({success:true,count:parsed.names.length,duplicates:parsed.duplicates,skipped:parsed.skipped})
    }
    if(b.action==='link'){
      if(!validCourse(b.entryId)||!(b.studentId===null || typeof b.studentId==='string' && b.studentId.length<=100))return reply('بيانات الربط غير صحيحة')
      const entryId=BigInt(b.entryId),studentId=b.studentId as string|null
      if(studentId){
        const student=await db.student.findUnique({where:{id:studentId},select:{id:true}})
        if(!student)return reply('الحساب المحدد غير موجود')
      }
      const count=await db.$executeRaw`UPDATE public.portal_official_roster_entries SET linked_student_id=${studentId} WHERE id=${entryId}`
      if(!count)return reply('الاسم غير موجود في الكشف',404)
      return NextResponse.json({success:true})
    }
    return reply('إجراء غير معروف')
  }catch(e){
    console.error('official rosters save',e)
    return reply('تعذر حفظ الكشف أو الربط. تأكد من تشغيل ملف SQL ومن عدم ربط حسابين بالاسم نفسه.',503)
  }
}
