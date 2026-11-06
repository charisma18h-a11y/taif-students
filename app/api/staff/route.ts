export const maxDuration = 30
import {NextRequest,NextResponse} from 'next/server'
import {getStudentSession} from '@/lib/auth'
import {staffPermissions} from '@/lib/staff-store'
import {getCatalog,publicCatalog} from '@/lib/course-store'
import {db} from '@/lib/db'
import { after } from 'next/server'
import { notifyStudents } from '@/lib/push-send'
import { resolveCourseSubject } from '@/lib/course-subject'
export const dynamic='force-dynamic'
export async function GET(){
 const student=await getStudentSession()
 if(!student)return NextResponse.json({error:'الدخول مطلوب'},{status:401})
 const perms=await staffPermissions(student.id)
 if(!perms.can_publish&&!perms.can_review_students)return NextResponse.json({error:'غير مصرح'},{status:403})
 try{
  const courses=publicCatalog(await getCatalog())
  if(!perms.can_review_students)return NextResponse.json({courses,rows:[],students:[],permissions:perms})
  const [rows,students]=await Promise.all([
   db.$queryRaw<{student_id:string;course_id:bigint;section:string;name:string;phone:string;university_id:string|null}[]>`SELECT e.student_id,e.course_id,e.section,s.name,s.phone,s.university_id FROM public.portal_course_enrollments e JOIN public.students s ON e.student_id=s.id ORDER BY s.name`,
   db.student.findMany({select:{id:true,name:true,phone:true,universityId:true}})
  ])
  return NextResponse.json({courses,rows:rows.map(row=>({...row,course_id:row.course_id.toString()})),students,permissions:perms})
 }catch(e){console.error('staff get',e);return NextResponse.json({error:'تعذر تحميل بيانات الشعب'},{status:503})}
}
export async function POST(req:NextRequest){
 const student=await getStudentSession()
 if(!student)return NextResponse.json({error:'الدخول مطلوب'},{status:401})
 const perms=await staffPermissions(student.id)
 if(!perms.can_publish)return NextResponse.json({error:'ليس لديك صلاحية نشر الواجبات'},{status:403})
 const b=await req.json().catch(()=>null)
 const title=typeof b?.title==='string'?b.title.trim():'',description=typeof b?.description==='string'?b.description.trim():''
 if(title.length<3||title.length>150||description.length<3||description.length>3000)return NextResponse.json({error:'اكتب عنوانًا ووصفًا صحيحين'},{status:400})
 const subject=typeof b?.subject==='string'?b.subject.trim():''
 if(!subject)return NextResponse.json({error:'حدد مادة الواجب أو الاختبار'},{status:400})
 let resolvedSubject: string
 try { resolvedSubject = (await resolveCourseSubject(subject, false))! }
 catch(e) { return NextResponse.json({error:(e as Error).message},{status:400}) }
 const type=b?.type==='اختبار'?'اختبار':'واجب'
 try{
  await db.assignment.create({data:{title,description,type,subject:resolvedSubject,published:true}})
  after(() => notifyStudents({title:`${type} جديد: ${title}`,body:description.slice(0,160),subject:resolvedSubject,url:'/'}))
  return NextResponse.json({success:true})
 }catch(e){console.error('staff publish',e);return NextResponse.json({error:'تعذر نشر المطلوب'},{status:503})}
}
