import { NextResponse } from 'next/server'
import { getStudentSession } from '@/lib/auth'
import {staffPermissions} from '@/lib/staff-store'

// جلب معلومات الطالب الحالي (إذا مسجّل)
export async function GET() {
  const student = await getStudentSession()
  if (!student) {
    return NextResponse.json({ student: null })
  }
  const permissions=await staffPermissions(student.id).catch(()=>({can_publish:false,can_review_students:false}))
  return NextResponse.json({
    permissions,
    student: {
      id: student.id,
      name: student.name,
      phone: student.phone,
      universityId: student.universityId,
    },
  })
}
