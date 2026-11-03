import { NextRequest, NextResponse } from 'next/server'
import { createHash, timingSafeEqual } from 'node:crypto'
import { getStudentSession } from '@/lib/auth'
import { db } from '@/lib/db'
import { initialize,readBoard,boardPublic } from '@/lib/university-group-store'
import { getEnrollments } from '@/lib/course-store'

export const dynamic = 'force-dynamic'

type Row = { id: bigint; group_id: number; name: string; phone: string | null; role: string; student_id: string | null }
const normName = (s: string) => s.normalize('NFKC').replace(/[أإآٱ]/g,'ا').replace(/ى/g,'ي').replace(/ة/g,'ه').replace(/ـ/g,'').replace(/\s+/g,' ').trim().toLowerCase()
const normPhone = (s: string) => {
  let v=s.replace(/[٠-٩]/g,x=>String(x.charCodeAt(0)-0x660)).replace(/[۰-۹]/g,x=>String(x.charCodeAt(0)-0x6f0)).replace(/\D/g,'')
  if (/^9665\d{8}$/.test(v)) v='0'+v.slice(3)
  else if (/^5\d{8}$/.test(v)) v='0'+v
  return v
}
const PASS_HASH = '048c37dccade504ac168936758c6590f3519b93b4d0159d818d5fb2dab45d712'
function correctPassword(candidate: string): boolean {
  if (candidate.length > 150) return false
  const required = process.env.GROUP_CHANGE_PASSWORD
  const input = createHash('sha256').update(candidate).digest()
  const expected = required ? createHash('sha256').update(required).digest() : Buffer.from(PASS_HASH,'hex')
  return timingSafeEqual(input, expected)
}

async function roster(): Promise<Row[]> {
  return db.$queryRaw<Row[]>`SELECT id,group_id,name,phone,role,student_id FROM public.university_group_members ORDER BY group_id, CASE WHEN role='leader' THEN 0 ELSE 1 END, id`
}
function findMember(records: Row[], student: { id: string; name: string; phone: string }) {
  const owned=records.find(r=>r.student_id===student.id)
  if (owned) return owned
  const phone=normPhone(student.phone)
  const matchPhone=records.find(r=>r.phone && normPhone(r.phone)===phone)
  if (matchPhone) return matchPhone
  // Name-only matching is just for a legacy entry with no phone.
  const matches=records.filter(r=>!r.phone && normName(r.name)===normName(student.name))
  return matches.length===1 ? matches[0] : null
}

export async function GET() {
  try {
    const student=await getStudentSession()
    if (!student) return NextResponse.json({error:'سجل دخولك أولاً'},{status:401})
    await initialize()
    const records=await roster()
    const board=boardPublic(await readBoard())
    const mine=findMember(records,student)
    return NextResponse.json({
      members:records.map(r=>({group_id:r.group_id,name:r.name,role:r.role})),
      board,
      mine:mine?{group_id:mine.group_id,role:mine.role}:null,
      source:'postgres',archiveNotice:null
    },{headers:{'Cache-Control':'private, no-store'}})
  } catch(e) {
    console.error('[groups] roster database error',e)
    return NextResponse.json({error:'تعذر تجهيز مجموعات الطلاب في قاعدة بيانات الموقع. راجع Logs لصلاحية CREATE TABLE.'},{status:503})
  }
}
export async function POST(req: NextRequest) {
  try {
    const student=await getStudentSession()
    if (!student) return NextResponse.json({error:'سجل دخولك أولاً'},{status:401})
    const enrolled = await getEnrollments(student.id)
    if (!enrolled.length) return NextResponse.json({error:'سجّل مادة وشعبة واحدة على الأقل قبل الانضمام للمجموعة'},{status:403})
    const input: unknown=await req.json().catch(()=>null)
    if(!input || typeof input!=='object') return NextResponse.json({error:'بيانات غير صالحة'},{status:400})
    const {groupId,password}=input as {groupId?:unknown;password?:unknown}
    if(typeof groupId!=='number'||!Number.isInteger(groupId)||groupId<1||groupId>8)
      return NextResponse.json({error:'اختر مجموعة صحيحة'},{status:400})
    await initialize()
    const result=await db.$transaction(async tx=>{
      // All registration and move operations are serialized to prevent duplicate names/phones.
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(1825, 2026)`
      const records=await tx.$queryRaw<Row[]>`SELECT id,group_id,name,phone,role,student_id FROM public.university_group_members ORDER BY id`
      const current=findMember(records,student)
      const phone=normPhone(student.phone)
      if(!/^05\d{8}$/.test(phone)) return {error:'رقم الجوال في حسابك غير صالح',status:400}
      if(current?.student_id && current.student_id!==student.id)
        return {error:'هذا الاسم أو الرقم مربوط بحساب طالب آخر. راجع الإدارة.',status:409}
      if(current) {
        if(current.group_id===groupId) return {error:'أنت مسجل بالفعل في هذه المجموعة',status:409}
        if(current.role==='leader') return {error:'نقل قائد المجموعة يحتاج موافقة الإدارة',status:403}
        if(typeof password!=='string'||!correctPassword(password)) return {error:'كلمة سر تغيير المجموعة غير صحيحة',status:403}
        if(current.phone && normPhone(current.phone)!==phone)
          return {error:'رقم الجوال لا يطابق سجل الطالب القديم',status:409}
        // Claim name-only archival entries once the existing account is authenticated.
        await tx.$executeRaw`UPDATE public.university_group_members SET group_id=${groupId}, student_id=${student.id},phone=${phone} WHERE id=${current.id}`
        return {success:true,message:'تم تغيير مجموعتك وحفظها بنجاح'}
      }
      if(records.some(r=>normName(r.name)===normName(student.name)|| (r.phone && normPhone(r.phone)===phone)))
        return {error:'اسمك أو رقم جوالك مسجل في مجموعة أخرى، راجع الإدارة',status:409}
      await tx.$executeRaw`INSERT INTO public.university_group_members (group_id,name,phone,role,student_id) VALUES (${groupId},${student.name},${phone},'member',${student.id})`
      return {success:true,message:'تم تسجيلك في المجموعة وحفظ اسمك بنجاح'}
    })
    if('error' in result) return NextResponse.json({error:result.error},{status:result.status})
    return NextResponse.json(result)
  } catch(e) {
    console.error('[groups] join database error',e)
    if(e instanceof Error && (e.message.includes('Unique constraint')||e.message.includes('23505')))
      return NextResponse.json({error:'الاسم أو رقم الجوال مسجل مسبقًا'},{status:409})
    return NextResponse.json({error:'تعذر حفظ المجموعة في قاعدة بيانات الموقع. راجع Logs.'},{status:503})
  }
}
