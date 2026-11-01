import { NextRequest,NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getStudentSession,validateSaudiPhone,validateUniversityId,verifyPassword } from '@/lib/auth'
import { initialize } from '@/lib/university-group-store'
export async function PATCH(req:NextRequest){
 const student=await getStudentSession()
 if(!student)return NextResponse.json({error:'تحتاج تسجيل الدخول'},{status:401})
 const body=await req.json().catch(()=>null)
 const name=typeof body?.name==='string'?body.name.trim().replace(/\s+/g,' '):''
 const phone=validateSaudiPhone(String(body?.phone||''))
 const universityId=validateUniversityId(body?.universityId)
 if(name.length<5||name.length>100||!phone.valid||!universityId.valid)return NextResponse.json({error:'تأكد من الاسم والجوال والرقم الجامعي'},{status:400})
 if(typeof body?.password!=='string'||!verifyPassword(body.password,student.password))return NextResponse.json({error:'كلمة مرور الحساب غير صحيحة'},{status:403})
 try{
  // Prevent collisions for new phone and university ID; Prisma unique indexes also guard races.
  const [otherPhone,otherUniversity]=await Promise.all([
   db.student.findUnique({where:{phone:phone.normalized},select:{id:true}}),
   db.student.findUnique({where:{universityId:universityId.normalized},select:{id:true}}),
  ])
  if(otherPhone&&otherPhone.id!==student.id)return NextResponse.json({error:'رقم الجوال مستخدم مسبقًا'},{status:409})
  if(otherUniversity&&otherUniversity.id!==student.id)return NextResponse.json({error:'الرقم الجامعي مستخدم مسبقًا'},{status:409})
  const otherName=await db.student.findFirst({where:{name:{equals:name,mode:'insensitive'}},select:{id:true}})
  if(otherName&&otherName.id!==student.id)return NextResponse.json({error:'الاسم مستخدم بحساب آخر'},{status:409})
  await initialize()
  await db.$transaction(async(tx)=>{
   await tx.student.update({where:{id:student.id},data:{name,phone:phone.normalized,universityId:universityId.normalized}})
   await tx.$executeRaw`UPDATE public.university_group_members SET name=${name},phone=${phone.normalized} WHERE student_id=${student.id}`
  })
  return NextResponse.json({success:true,student:{id:student.id,name,phone:phone.normalized,universityId:universityId.normalized}})
 }catch(e){
  if(e&&typeof e==='object'&&'code'in e&&(e.code==='P2002'||e.code==='23505'))return NextResponse.json({error:'الاسم أو الجوال أو الرقم الجامعي مستخدم مسبقًا في النظام'},{status:409})
  console.error('profile edit',e)
  return NextResponse.json({error:'تعذر تعديل البيانات، حاول مرة أخرى'},{status:503})
 }
}
