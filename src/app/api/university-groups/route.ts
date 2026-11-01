import { NextRequest, NextResponse } from 'next/server'
import { getStudentSession } from '@/lib/auth'

// مفتاح publishable عام فقط؛ لا تضع service_role أو كلمات مرور في الواجهة.
const PROJECT_URL = process.env.GROUPS_SUPABASE_URL || 'https://vhiwizczjipxzvhbdmje.supabase.co'
const PUBLISHABLE_KEY = process.env.GROUPS_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_AY0EMpBPp_dqpeD8VbetYQ_gmRyo48f'

type RosterMember = { group_id: number; name: string; role: string }
type Membership = { group_id: number; role: string }

async function rpc<T>(name: string, data: Record<string, unknown>): Promise<T> {
  const response = await fetch(`${PROJECT_URL}/rest/v1/rpc/${name}`, {
    method: 'POST',
    headers: { apikey: PUBLISHABLE_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
    cache: 'no-store',
  })
  const result: unknown = await response.json().catch(() => null)
  if (!response.ok) {
    // لا نكشف محتوى رسائل PostgreSQL الداخلية للمستخدم.
    const message = result && typeof result === 'object' && 'message' in result
      ? String((result as { message: unknown }).message) : 'تعذر الاتصال بقاعدة المجموعات'
    if (/duplicate|unique|مسجل|كلمة السر|غير متطابق|غير صحيحة|اختر مجموعة|اسمك الكامل|رقم الجوال|لقائد/.test(message)) {
      throw new Error(message)
    }
    console.error('group rpc error:', name, response.status, message)
    throw new Error('تعذر تنفيذ العملية. تأكد من تثبيت ملف SQL الخاص بربط المجموعات.')
  }
  return result as T
}

async function membership(phone: string): Promise<Membership | null> {
  const result = await rpc<Membership[]>('my_group_by_phone', { p_phone: phone })
  return Array.isArray(result) && result.length ? result[0] : null
}

export async function GET() {
  try {
    const student = await getStudentSession()
    if (!student) return NextResponse.json({ error: 'سجل دخولك أولاً' }, { status: 401 })
    const [members, mine] = await Promise.all([
      rpc<RosterMember[]>('list_group_students', {}),
      membership(student.phone),
    ])
    return NextResponse.json({ members, mine }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'حدث خطأ' }, { status: 503 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const student = await getStudentSession()
    if (!student) return NextResponse.json({ error: 'سجل دخولك أولاً' }, { status: 401 })
    const body: unknown = await req.json()
    if (!body || typeof body !== 'object') return NextResponse.json({ error: 'بيانات غير صحيحة' }, { status: 400 })
    const { groupId, password } = body as { groupId?: unknown; password?: unknown }
    if (typeof groupId !== 'number' || !Number.isInteger(groupId) || groupId < 1 || groupId > 8) {
      return NextResponse.json({ error: 'اختر مجموعة من 1 إلى 8' }, { status: 400 })
    }
    const mine = await membership(student.phone)
    if (mine?.group_id === groupId) return NextResponse.json({ error: 'أنت مسجل في هذه المجموعة بالفعل' }, { status: 409 })
    if (mine) {
      if (typeof password !== 'string' || password.length < 1 || password.length > 150) {
        return NextResponse.json({ error: 'تغيير المجموعة يتطلب كلمة سر الإدارة' }, { status: 400 })
      }
      await rpc('move_student_by_phone', { p_phone: student.phone, p_new_group_id: groupId, p_password: password })
    } else {
      await rpc('join_student_group', { p_name: student.name, p_phone: student.phone, p_group_id: groupId })
    }
    return NextResponse.json({ success: true, message: mine ? 'تم تغيير المجموعة' : 'تم الانضمام للمجموعة' })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'تعذر التسجيل' }, { status: 400 })
  }
}
