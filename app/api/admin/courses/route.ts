import { NextRequest,NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAdminSession } from '@/lib/auth'
import { getCatalog,initCourses,publicCatalog } from '@/lib/course-store'
export const dynamic='force-dynamic'
const err=(message:string,status=400)=>NextResponse.json({error:message},{status})
export async function GET(){
 if(!await getAdminSession())return err('غير مصرح',401)
 try{
  const courses=publicCatalog(await getCatalog())
  const enrollments=await db.$queryRaw<{student_id:string;course_id:bigint;section:string;name:string;phone:string;university_id:string|null}[]>`SELECT e.student_id,e.course_id,e.section,s.name,s.phone,s.university_id FROM public.portal_course_enrollments e JOIN public.students s ON s.id=e.student_id ORDER BY s.name`
  return NextResponse.json({courses,enrollments:enrollments.map(r=>({...r,course_id:r.course_id.toString()}))},{headers:{'Cache-Control':'no-store'}})
 }catch(e){console.error('admin courses get',e);return err('تعذر تحميل المواد',503)}
}
export async function POST(req:NextRequest){
 if(!await getAdminSession())return err('غير مصرح',401)
 const body=await req.json().catch(()=>null)
 if(!body||typeof body!=='object')return err('طلب غير صالح')
 try{
  await initCourses()
  if(body.action==='add'){
   const title=String(body.title||'').replace(/\s+/g,' ').trim()
   if(title.length<3||title.length>80)return err('اكتب اسم مادة صحيحًا')
   await db.$executeRaw`INSERT INTO public.portal_courses(title) VALUES(${title}) ON CONFLICT (title) DO UPDATE SET active=TRUE`
  }else if(body.action==='toggle'){
   if(!/^\d{1,18}$/.test(String(body.id)))return err('معرف غير صحيح')
   const id=BigInt(body.id)
   await db.$executeRaw`UPDATE public.portal_courses SET active=NOT active WHERE id=${id}`
  }else if(body.action==='remove-enrollment'){
   if(typeof body.studentId!=='string'||!/^\d{1,18}$/.test(String(body.courseId)))return err('بيانات غير صالحة')
   await db.$executeRaw`DELETE FROM public.portal_course_enrollments WHERE student_id=${body.studentId} AND course_id=${BigInt(body.courseId)}`
  }else if(body.action==='update-section'){
   const sec=String(body.section||'').trim()
   if(typeof body.studentId!=='string'||!/^\d{1,18}$/.test(String(body.courseId))||!/^[0-9]{2,12}$/.test(sec))return err('رقم شعبة غير صالح')
   await db.$executeRaw`UPDATE public.portal_course_enrollments SET section=${sec},updated_at=now() WHERE student_id=${body.studentId} AND course_id=${BigInt(body.courseId)}`
  }else return err('عملية غير معروفة')
  return NextResponse.json({success:true})
 }catch(e){console.error('admin courses save',e);return err('فشل حفظ البيانات؛ تأكد من عدم تكرار اسم المادة',503)}
}
