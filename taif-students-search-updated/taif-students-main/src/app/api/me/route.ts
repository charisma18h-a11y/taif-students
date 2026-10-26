import { NextResponse } from 'next/server'
import { getStudentSession } from '@/lib/auth'

// جلب معلومات الطالب الحالي (إذا مسجّل)
export async function GET() {
  const student = await getStudentSession()
  if (!student) {
    return NextResponse.json({ student: null })
  }
  return NextResponse.json({
    student: {
      id: student.id,
      name: student.name,
      phone: student.phone,
    },
  })
}
