import { NextResponse } from 'next/server'
import { getStudentSession } from '@/lib/auth'
import { physicsQuestions } from '@/lib/physics-questions'

export const dynamic = 'force-dynamic'

export async function GET() {
  const student = await getStudentSession()
  if (!student) {
    return NextResponse.json({ error: 'سجّل الدخول لعرض الأسئلة' }, {
      status: 401, headers: { 'Cache-Control': 'private, no-store' },
    })
  }
  return NextResponse.json({ questions: physicsQuestions }, {
    headers: { 'Cache-Control': 'private, no-store' },
  })
}
