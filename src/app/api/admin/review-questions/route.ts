export const maxDuration = 30
import { NextRequest,NextResponse } from 'next/server'
import {getAdminSession} from '@/lib/auth'
import {db} from '@/lib/db'
import {reviewState} from '@/lib/question-store'
import { resolveCourseSubject } from '@/lib/course-subject'
import { after } from 'next/server'
import { notifyStudents } from '@/lib/push-send'
export const dynamic='force-dynamic'
const deny=()=>NextResponse.json({error:'دخول الأدمن مطلوب'},{status:401})
export async function GET(){
 if(!await getAdminSession())return deny()
 try{const s=await reviewState();return NextResponse.json({enabled:s.enabled,showOriginal:s.showOriginal,questions:s.items.map(q=>({...q,id:q.id.toString()}))})}
 catch(e){console.error('review admin read',e);return NextResponse.json({error:'تعذر قراءة إعدادات الأسئلة'},{status:503})}
}
export async function POST(req:NextRequest){
 if(!await getAdminSession())return deny()
 const b=await req.json().catch(()=>null)
 if(!b||typeof b!=='object')return NextResponse.json({error:'طلب غير صالح'},{status:400})
 try{
  await reviewState()
  if(b.action==='settings'){
    if(typeof b.enabled!=='boolean'||typeof b.showOriginal!=='boolean')return NextResponse.json({error:'إعدادات غير صحيحة'},{status:400})
    await db.$executeRaw`UPDATE public.portal_question_settings SET enabled=${b.enabled},show_original=${b.showOriginal} WHERE id=1`
  }else if(b.action==='add'){
    const question=String(b.question||'').trim(),answer=String(b.answer||'').trim()
    if(question.length<4||question.length>2000||answer.length<1||answer.length>2000)return NextResponse.json({error:'تحقق من نص السؤال والإجابة'},{status:400})
    let subject: string | null
    try { subject = await resolveCourseSubject(b.subject) }
    catch(e) { return NextResponse.json({error:(e as Error).message},{status:400}) }
    await db.$executeRaw`INSERT INTO public.portal_review_questions(question,answer,subject) VALUES(${question},${answer},${subject})`
    after(() => notifyStudents({title:'أسئلة مراجعة جديدة',body:question.slice(0,120),subject,url:'/questions'}))
  }else if(b.action==='delete'){
    if(!/^\d{1,18}$/.test(String(b.id)))return NextResponse.json({error:'معرف غير صحيح'},{status:400})
    await db.$executeRaw`DELETE FROM public.portal_review_questions WHERE id=${BigInt(b.id)}`
  }else return NextResponse.json({error:'عملية غير معروفة'},{status:400})
  return NextResponse.json({success:true})
 }catch(e){console.error('review admin write',e);return NextResponse.json({error:'تعذر حفظ الأسئلة'},{status:503})}
}
