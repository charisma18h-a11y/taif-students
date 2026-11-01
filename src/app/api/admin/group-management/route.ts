import { NextRequest,NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/auth'
import { db } from '@/lib/db'
import { initialize,readBoard,boardPublic } from '@/lib/university-group-store'

export const dynamic='force-dynamic'
type GroupRow={id:bigint;group_id:number;name:string;phone:string|null;role:string;student_id:string|null}
const normalize=(s:string)=>s.normalize('NFKC').replace(/[أإآٱ]/g,'ا').replace(/ى/g,'ي').replace(/ة/g,'ه').replace(/ـ/g,'').replace(/\s+/g,' ').trim().toLowerCase()
const cleanPhone=(value:string)=>{
 let v=value.replace(/[٠-٩]/g,x=>String(x.charCodeAt(0)-0x660)).replace(/[۰-۹]/g,x=>String(x.charCodeAt(0)-0x6f0)).replace(/\D/g,'')
 if(/^9665\d{8}$/.test(v))v='0'+v.slice(3)
 if(/^5\d{8}$/.test(v))v='0'+v
 return v
}
const err=(message:string,status=400)=>NextResponse.json({error:message},{status})
const validName=(v:unknown)=>typeof v==='string'&&v.trim().length>=3&&v.trim().length<=100
const validGroup=(v:unknown)=>typeof v==='number'&&Number.isInteger(v)&&v>=1&&v<=8
const validRole=(v:unknown)=>v==='member'||v==='leader'
const parsedId=(v:unknown)=>typeof v==='string'&&/^\d{1,18}$/.test(v)?BigInt(v):null
export async function GET(){
 if(!await getAdminSession())return err('دخول الإدارة مطلوب',401)
 try{
  await initialize()
  const rows=await db.$queryRaw<GroupRow[]>`SELECT id,group_id,name,phone,role,student_id FROM public.university_group_members ORDER BY group_id,CASE WHEN role='leader' THEN 0 ELSE 1 END,id`
  return NextResponse.json({members:rows.map(r=>({...r,id:r.id.toString()})),board:boardPublic(await readBoard())},{headers:{'Cache-Control':'no-store'}})
 }catch(e){console.error('[groups admin] load',e);return err('تعذر تحميل إدارة المجموعات من قاعدة البيانات',503)}
}
export async function POST(req:NextRequest){
 if(!await getAdminSession())return err('دخول الإدارة مطلوب',401)
 const body:unknown=await req.json().catch(()=>null)
 if(!body||typeof body!=='object')return err('بيانات غير صالحة')
 const v=body as Record<string,unknown>
 const action=v.action
 try{
  await initialize()
  if(action==='board-add'||action==='board-update'){
   if(!validName(v.name)||typeof v.title!=='string'||!v.title.trim()||v.title.length>90||typeof v.description!=='string'||v.description.length>250)return err('تأكد من اسم العضو ومنصبه (والوصف الاختياري)')
   const name=(v.name as string).trim(),title=(v.title as string).trim(),description=(v.description as string).trim()
   const order=typeof v.display_order==='number'&&Number.isInteger(v.display_order)&&v.display_order>=0&&v.display_order<1000?v.display_order:0
   if(action==='board-add')await db.$executeRaw`INSERT INTO public.university_group_board(name,title,description,display_order) VALUES (${name},${title},${description},${order})`
   else{
    const id=parsedId(v.id);if(id===null)return err('معرف غير صحيح')
    const count=await db.$executeRaw`UPDATE public.university_group_board SET name=${name},title=${title},description=${description},display_order=${order} WHERE id=${id}`
    if(!count)return err('عضو المجلس غير موجود',404)
   }
  }else if(action==='board-delete'){
   const id=parsedId(v.id);if(id===null)return err('معرف غير صحيح')
   await db.$executeRaw`DELETE FROM public.university_group_board WHERE id=${id}`
  }else if(action==='member-add'||action==='member-update'||action==='member-delete'){
   await db.$transaction(async tx=>{
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(1825,2026)`
    const members=await tx.$queryRaw<GroupRow[]>`SELECT id,group_id,name,phone,role,student_id FROM public.university_group_members`
    const id=action==='member-add'?null:parsedId(v.id)
    const old=id===null?null:members.find(r=>r.id===id)
    if(action!=='member-add'&&!old)throw new Error('الطالب غير موجود')
    if(action==='member-delete'){
     if(!old)throw new Error('الطالب غير موجود')
     await tx.$executeRaw`DELETE FROM public.university_group_members WHERE id=${old.id}`
     return
    }
    if(!validName(v.name)||!validGroup(v.group_id)||!validRole(v.role))throw new Error('تأكد من الاسم والمجموعة والدور')
    const name=(v.name as string).trim(),role=v.role as string,group=v.group_id as number
    const phone=v.phone===null||v.phone===''?null:typeof v.phone==='string'?cleanPhone(v.phone):''
    if(phone!==null&&!/^05\d{8}$/.test(phone))throw new Error('رقم الجوال غير صحيح')
    if(members.some(r=>r.id!==id&&(normalize(r.name)===normalize(name)||(phone&&r.phone&&cleanPhone(r.phone)===phone))))throw new Error('الاسم أو رقم الجوال موجود بالفعل')
    if(action==='member-add')await tx.$executeRaw`INSERT INTO public.university_group_members(group_id,name,phone,role) VALUES (${group},${name},${phone},${role})`
    else if(old){
     // Updating an existing account-bound record preserves its student_id.
     await tx.$executeRaw`UPDATE public.university_group_members SET group_id=${group},name=${name},phone=${phone},role=${role} WHERE id=${old.id}`
    }
   })
  }else return err('عملية غير مدعومة')
  return NextResponse.json({success:true})
 }catch(e){console.error('[groups admin] mutation',e);return err(e instanceof Error&&('الطالب غير موجود'===e.message||e.message.includes('موجود بالفعل')||e.message.includes('غير صحيح')||e.message.includes('تأكد من'))?e.message:'فشل الحفظ؛ تأكد من عدم تكرار الاسم أو رقم الجوال',400)}
}
