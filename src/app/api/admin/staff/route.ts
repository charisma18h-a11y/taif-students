import {NextRequest,NextResponse} from 'next/server'
import {getAdminSession} from '@/lib/auth'
import {db} from '@/lib/db'
import {initStaff} from '@/lib/staff-store'
export const dynamic='force-dynamic'
export async function GET(){
 if(!await getAdminSession())return NextResponse.json({error:'دخول الأدمن مطلوب'},{status:401})
 try{
  await initStaff()
  const [students,roles]=await Promise.all([
   db.student.findMany({orderBy:{name:'asc'},select:{id:true,name:true,phone:true,universityId:true}}),
   db.$queryRaw<{student_id:string;can_publish:boolean;can_review_students:boolean}[]>`SELECT student_id,can_publish,can_review_students FROM public.portal_staff_permissions`
  ])
  return NextResponse.json({students,roles})
 }catch(e){console.error('staff admin read',e);return NextResponse.json({error:'فشل قراءة الصلاحيات'},{status:503})}
}
export async function POST(req:NextRequest){
 if(!await getAdminSession())return NextResponse.json({error:'دخول الأدمن مطلوب'},{status:401})
 const b=await req.json().catch(()=>null)
 if(!b||typeof b.studentId!=='string'||typeof b.canPublish!=='boolean'||typeof b.canReviewStudents!=='boolean')return NextResponse.json({error:'بيانات غير صحيحة'},{status:400})
 try{
  await initStaff()
  if(!await db.student.findUnique({where:{id:b.studentId},select:{id:true}}))return NextResponse.json({error:'حساب الطالب غير موجود'},{status:404})
  await db.$executeRaw`INSERT INTO public.portal_staff_permissions(student_id,can_publish,can_review_students) VALUES (${b.studentId},${b.canPublish},${b.canReviewStudents}) ON CONFLICT (student_id) DO UPDATE SET can_publish=EXCLUDED.can_publish,can_review_students=EXCLUDED.can_review_students`
  return NextResponse.json({success:true})
 }catch(e){console.error('staff admin update',e);return NextResponse.json({error:'تعذر حفظ الصلاحيات'},{status:503})}
}
