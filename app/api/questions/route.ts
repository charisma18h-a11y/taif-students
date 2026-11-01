import { NextResponse } from 'next/server'
import { getStudentSession } from '@/lib/auth'
import { physicsQuestions } from '@/lib/physics-questions'
import {reviewState} from '@/lib/question-store'

export const dynamic = 'force-dynamic'

export async function GET() {
  const student = await getStudentSession()
  if (!student) {
    return NextResponse.json({ error: 'سجّل الدخول لعرض الأسئلة' }, {
      status: 401, headers: { 'Cache-Control': 'private, no-store' },
    })
  }
  if (!student.universityId) {
    return NextResponse.json({ error: 'أكمل الرقم الجامعي في ملفك أولاً' }, { status: 403 })
  }
  try {
    const state=await reviewState()
    if(!state.enabled)return NextResponse.json({questions:[],disabled:true},{headers:{'Cache-Control':'private, no-store'}})
    const original=state.showOriginal?physicsQuestions:[]
    const extra=state.items.map((q,i)=>({number:original.length+i+1,question:q.question,answer:q.answer}))
    return NextResponse.json({questions:[...original,...extra],disabled:false},{headers:{'Cache-Control':'private, no-store'}})
  }catch(e){console.error('review student read',e);return NextResponse.json({error:'تعذر تحميل أسئلة المراجعة'},{status:503})}
  /* return NextResponse.json({ questions: physicsQuestions }, {
    headers: { 'Cache-Control': 'private, no-store' },
  }) */
}
