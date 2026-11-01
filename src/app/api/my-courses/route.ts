import { NextRequest,NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getStudentSession } from '@/lib/auth'
import { getCatalog,getEnrollments,publicCatalog,publicEnrollments } from '@/lib/course-store'

export const dynamic='force-dynamic'
export async function GET() {
 const user=await getStudentSession()
 if(!user)return NextResponse.json({error:'تحتاج تسجيل الدخول'},{status:401})
 try { const [courses,enrollments]=await Promise.all([getCatalog(),getEnrollments(user.id)])
  return NextResponse.json({courses:publicCatalog(courses).filter(c=>c.active),enrollments:publicEnrollments(enrollments)},{headers:{'Cache-Control':'no-store'}})
 }catch(e){console.error('course get',e);return NextResponse.json({error:'تعذر قراءة بيانات المواد. تحقق من صلاحيات قاعدة البيانات.'},{status:503})}
}
export async function POST(req:NextRequest) {
 const user=await getStudentSession()
 if(!user)return NextResponse.json({error:'تحتاج تسجيل الدخول'},{status:401})
 const body=await req.json().catch(()=>null)
 const list=body?.selections
 if(!Array.isArray(list)||list.length<1||list.length>30)return NextResponse.json({error:'اختر مادة واحدة على الأقل'},{status:400})
 const selections=[] as {id:bigint;section:string}[]
 for(const entry of list){
  const str=String(entry?.courseId??'')
  const section=String(entry?.section??'').trim().replace(/[٠-٩]/g,(d)=>String(d.charCodeAt(0)-0x660)).replace(/[۰-۹]/g,(d)=>String(d.charCodeAt(0)-0x6f0))
  if(!/^\d{1,18}$/.test(str)||!/^[0-9]{2,12}$/.test(section))return NextResponse.json({error:'اختر المادة واكتب رقم شعبة صحيحًا من 2 إلى 12 رقمًا'},{status:400})
  selections.push({id:BigInt(str),section})
 }
 if(new Set(selections.map(s=>s.id.toString())).size!==selections.length)return NextResponse.json({error:'المادة مكررة'},{status:400})
 try{
  const courses=await getCatalog(); const active=new Set(courses.filter(c=>c.active).map(c=>c.id.toString()))
  const old=await getEnrollments(user.id);const previous=new Set(old.map(e=>e.course_id.toString()))
  if(selections.some(s=>!active.has(s.id.toString())&&!previous.has(s.id.toString())))return NextResponse.json({error:'مادة غير متاحة'},{status:400})
  await db.$transaction(async(tx)=>{
   // Updates are atomic. No forged student ID accepted; use server session only.
   await tx.$executeRaw`DELETE FROM public.portal_course_enrollments WHERE student_id=${user.id}`
   for(const s of selections)await tx.$executeRaw`INSERT INTO public.portal_course_enrollments (student_id,course_id,section) VALUES (${user.id},${s.id},${s.section})`
  })
  return NextResponse.json({success:true})
 }catch(e){console.error('course save',e);return NextResponse.json({error:'تعذر حفظ المواد حاليًا'},{status:503})}
}
