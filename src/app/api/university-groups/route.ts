import { NextRequest, NextResponse } from 'next/server'
import { getStudentSession } from '@/lib/auth'

// قسم المجموعات يستخدم المشروع الذي توجد فيه القائمة الأصلية (66 طالباً).
// نثبّت المرجع هنا حتى لا تحوّل متغيرات Vercel القديمة الطلب إلى مشروع آخر.
// هذا مفتاح publishable عام، وليس service_role أو مفتاحاً سرياً.
const GROUPS_PROJECT = 'https://vhiwizczjipxzvhbdmje.supabase.co'
const GROUPS_PUBLIC_KEY = 'sb_publishable_AY0EMpBPp_dqpeD8VbetYQ_gmRyo48f'

type RosterMember = { group_id: number; name: string; role: string }
type Membership = { group_id: number; role: string }

class GroupApiError extends Error {
  constructor(message: string, readonly status: number, readonly code?: string) {
    super(message)
  }
}

function normalizePhone(value: string): string {
  const digits = value.replace(/[٠-٩]/g, digit => String(digit.charCodeAt(0) - 0x660))
    .replace(/[۰-۹]/g, digit => String(digit.charCodeAt(0) - 0x6f0))
    .replace(/\D/g, '')
  if (/^9665\d{8}$/.test(digits)) return `0${digits.slice(3)}`
  if (/^5\d{8}$/.test(digits)) return `0${digits}`
  return digits
}

function normalizeName(value: string): string {
  return value.normalize('NFKC').replace(/[أإآٱ]/g, 'ا').replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه').replace(/ـ/g, '').replace(/\s+/g, ' ').trim().toLowerCase()
}

async function rpc<T>(name: string, data: Record<string, unknown>): Promise<T> {
  let response: Response
  try {
    response = await fetch(`${GROUPS_PROJECT}/rest/v1/rpc/${name}`, {
      method: 'POST',
      headers: { apikey: GROUPS_PUBLIC_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
      cache: 'no-store',
      signal: AbortSignal.timeout(12000),
    })
  } catch (error) {
    console.error('[groups] connection error', name, error)
    throw new GroupApiError('تعذر الاتصال بقاعدة المجموعات، حاول تحديث الصفحة.', 503)
  }

  const body: unknown = await response.json().catch(() => null)
  if (!response.ok) {
    const value = body && typeof body === 'object' ? body as { message?: string; code?: string } : {}
    const message = typeof value.message === 'string' ? value.message : 'طلب غير ناجح'
    console.error('[groups] RPC failure', { function: name, status: response.status, code: value.code, project: 'vhiwizczjipxzvhbdmje', message })
    if (response.status === 404 || value.code === 'PGRST202') {
      throw new GroupApiError(`وظيفة قاعدة البيانات ${name} غير ظاهرة في مشروع المجموعات.`, 503, 'RPC_MISSING')
    }
    if (response.status === 401 || response.status === 403) {
      throw new GroupApiError('مفتاح الاتصال أو صلاحيات قاعدة المجموعات غير صحيحة.', 503, 'ACCESS_DENIED')
    }
    if (/duplicate|unique|مسجل|كلمة السر|غير متطابق|غير صحيحة|اختر مجموعة|اسمك الكامل|رقم الجوال|لقائد|لم يتم العثور/.test(message)) {
      throw new GroupApiError(message, 400)
    }
    throw new GroupApiError('تعذر تنفيذ الطلب على قاعدة المجموعات. راجع سجل Vercel.', 503)
  }
  return body as T
}

async function roster(): Promise<RosterMember[]> {
  const result = await rpc<RosterMember[]>('list_group_students', {})
  if (!Array.isArray(result)) throw new GroupApiError('استجابة قائمة الطلاب غير صحيحة.', 503)
  return result
}

async function membership(phone: string, name: string, members: RosterMember[]): Promise<Membership | null> {
  try {
    const result = await rpc<Membership[]>('my_group_by_phone', { p_phone: normalizePhone(phone) })
    if (Array.isArray(result) && result.length) return result[0]
  } catch (error) {
    // بعض مشاريع Supabase لم تحدّث schema cache الخاص بهذه الدالة.
    // يمكن عرض عضوية موجودة بالاسم من قائمة الأعضاء دون السماح بنقلها بهذا التطابق وحده.
    if (!(error instanceof GroupApiError && error.code === 'RPC_MISSING')) throw error
    console.warn('[groups] membership RPC unavailable; using roster name for display only')
  }
  const matches = members.filter(member => normalizeName(member.name) === normalizeName(name))
  return matches.length === 1 ? { group_id: matches[0].group_id, role: matches[0].role } : null
}

export async function GET() {
  try {
    const student = await getStudentSession()
    if (!student) return NextResponse.json({ error: 'سجل دخولك أولاً' }, { status: 401 })
    const members = await roster()
    const mine = await membership(student.phone, student.name, members)
    return NextResponse.json({ members, mine }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'تعذر عرض الطلاب' }, { status: error instanceof GroupApiError ? error.status : 503 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const student = await getStudentSession()
    if (!student) return NextResponse.json({ error: 'سجل دخولك أولاً' }, { status: 401 })
    const body: unknown = await req.json().catch(() => null)
    if (!body || typeof body !== 'object') return NextResponse.json({ error: 'بيانات غير صحيحة' }, { status: 400 })
    const { groupId, password } = body as { groupId?: unknown; password?: unknown }
    if (typeof groupId !== 'number' || !Number.isInteger(groupId) || groupId < 1 || groupId > 8) {
      return NextResponse.json({ error: 'اختر مجموعة من 1 إلى 8' }, { status: 400 })
    }
    const members = await roster()
    const mine = await membership(student.phone, student.name, members)
    if (mine?.group_id === groupId) return NextResponse.json({ error: 'أنت مسجل في هذه المجموعة بالفعل' }, { status: 409 })
    if (mine) {
      if (typeof password !== 'string' || !password || password.length > 150) {
        return NextResponse.json({ error: 'تغيير المجموعة يتطلب كلمة سر الإدارة' }, { status: 400 })
      }
      // يتحقق السيرفر من الطالب المسجل، وتتحقق الدالة من كلمة السر في قاعدة البيانات.
      await rpc('move_student_by_phone', { p_phone: normalizePhone(student.phone), p_new_group_id: groupId, p_password: password })
    } else {
      await rpc('join_student_group', { p_name: student.name, p_phone: normalizePhone(student.phone), p_group_id: groupId })
    }
    return NextResponse.json({ success: true, message: mine ? 'تم تغيير المجموعة' : 'تم الانضمام للمجموعة' })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'تعذر التسجيل' }, { status: error instanceof GroupApiError ? error.status : 400 })
  }
}
