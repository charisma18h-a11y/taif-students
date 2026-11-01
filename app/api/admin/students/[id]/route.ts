import { NextRequest,NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAdminSession } from '@/lib/auth'
import { initialize } from '@/lib/university-group-store'
// حذف حساب طالب بعد التأكد من الصلاحيات؛ يتم عبر جلسة الأدمن فقط.
export async function DELETE(_req:NextRequest,{params}:{params:Promise<{id:string}>}){
 if(!await getAdminSession())return NextResponse.json({error:'غير مصرح'},{status:401})
 const {id}=await params
 if(!id||id.length>100)return NextResponse.json({error:'معرف غير صحيح'},{status:400})
 try{
  await initialize()
  await db.$transaction(async tx=>{
   await tx.$executeRaw`DELETE FROM public.university_group_members WHERE student_id=${id}`
   await tx.student.delete({where:{id}})
  })
  return NextResponse.json({success:true})
 }catch(e){console.error('admin student delete',e);return NextResponse.json({error:'تعذر حذف الحساب، أو أنه غير موجود'},{status:503})}
}
