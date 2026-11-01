import { NextRequest, NextResponse } from 'next/server'
import { getStudentSession } from '@/lib/auth'
import { db } from '@/lib/db'
import { ORIGINAL_GROUPS_ROSTER } from '@/lib/original-groups-roster'

export const dynamic = 'force-dynamic'

// Read the group roster through the same PostgreSQL connection as the signed-in
// student's account. This avoids dependence on the PostgREST RPC schema cache.
// An independent Supabase REST project is only a secondary source.
const PROJECT_URL = process.env.GROUPS_SUPABASE_URL || 'https://vhiwizczjipxzvhbdmje.supabase.co'
const PUBLIC_KEY = process.env.GROUPS_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_AY0EMpBPp_dqpeD8VbetYQ_gmRyo48f'

type StoredMember = { id: bigint | number; group_id: number; name: string; phone: string | null; role: string }
type Member = { group_id: number; name: string; role: string }
type Membership = { group_id: number; role: string }

class GroupError extends Error {
  constructor(message: string, readonly status = 503) { super(message) }
}

const normalizedPhone = (value: string) => {
  const digits = value.replace(/[٠-٩]/g, x => String(x.charCodeAt(0) - 0x660))
    .replace(/[۰-۹]/g, x => String(x.charCodeAt(0) - 0x6f0)).replace(/\D/g, '')
  if (/^9665\d{8}$/.test(digits)) return `0${digits.slice(3)}`
  if (/^5\d{8}$/.test(digits)) return `0${digits}`
  return digits
}
const normalizedName = (value: string) => value.normalize('NFKC')
  .replace(/[أإآٱ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه')
  .replace(/ـ/g, '').replace(/\s+/g, ' ').trim().toLowerCase()

async function postRpc<T>(functionName: string, data: Record<string, unknown>): Promise<T> {
  const response = await fetch(`${PROJECT_URL}/rest/v1/rpc/${functionName}`, {
    method: 'POST',
    headers: { apikey: PUBLIC_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify(data), cache: 'no-store', signal: AbortSignal.timeout(10000),
  })
  const json: unknown = await response.json().catch(() => null)
  if (!response.ok) {
    const e = json && typeof json === 'object' ? json as { code?: string; message?: string } : {}
    console.error('[groups] fallback RPC failure', { functionName, status: response.status, code: e.code, message: e.message })
    throw new GroupError(e.message || 'تعذر الاتصال بقاعدة بيانات المجموعات', response.status === 400 ? 400 : 503)
  }
  return json as T
}

// Raw SQL is parameterized and server-only; never return private phone numbers.
async function databaseRoster(): Promise<StoredMember[] | null> {
  try {
    const rows = await db.$queryRaw<StoredMember[]>`
      SELECT id, group_id, name, phone, role
      FROM public.group_students
      ORDER BY group_id, CASE WHEN role = 'leader' THEN 0 ELSE 1 END, id
    `
    console.info('[groups] primary PostgreSQL roster', { count: rows.length })
    return rows
  } catch (error) {
    // The legacy account DB may not contain the optional group_students table.
    console.warn('[groups] primary PostgreSQL roster unavailable', error instanceof Error ? error.message : String(error))
    return null
  }
}

async function getRoster(): Promise<{ records: StoredMember[]; source: 'postgres' | 'rest' | 'snapshot' }> {
  const direct = await databaseRoster()
  if (direct?.length) return { records: direct, source: 'postgres' }
  try {
    const remote = await postRpc<Member[]>('list_group_students', {})
    if (Array.isArray(remote) && remote.length) {
      console.info('[groups] REST roster', { count: remote.length })
      // No private numbers are returned by this read-only RPC.
      return { records: remote.map((m, i) => ({ id: i, ...m, phone: null })), source: 'rest' }
    }
    console.warn('[groups] REST roster returned zero records', { project: new URL(PROJECT_URL).hostname })
  } catch (error) {
    console.warn('[groups] REST roster unavailable', error instanceof Error ? error.message : String(error))
  }
  console.warn('[groups] LIVE DATABASE EMPTY: showing archived roster in read-only mode', {
    directCount: direct?.length ?? null,
    remoteProject: new URL(PROJECT_URL).hostname,
  })
  return {
    records: ORIGINAL_GROUPS_ROSTER.map((m, i) => ({ ...m, id: i, phone: null })),
    source: 'snapshot',
  }
}

function membership(records: StoredMember[], name: string, phone: string): Membership | null {
  const exact = records.find(r => r.phone && normalizedPhone(r.phone) === normalizedPhone(phone))
  if (exact) return { group_id: exact.group_id, role: exact.role }
  const matches = records.filter(r => normalizedName(r.name) === normalizedName(name))
  return matches.length === 1 ? { group_id: matches[0].group_id, role: matches[0].role } : null
}

export async function GET() {
  try {
    const student = await getStudentSession()
    if (!student) return NextResponse.json({ error: 'سجل دخولك أولاً' }, { status: 401 })
    const { records, source } = await getRoster()
    return NextResponse.json({
      members: records.map(({ group_id, name, role }) => ({ group_id, name, role })),
      mine: membership(records, student.name, student.phone),
      source,
      archiveNotice: source === 'snapshot' ? 'عرض مؤقت من القائمة الأصلية: تعذرت قراءة قاعدة البيانات الحية. الانضمام وتغيير المجموعة معطلان حتى يتم ربط مصدر الطلاب الصحيح.' : null,
    }, { headers: { 'Cache-Control': 'private, no-store' } })
  } catch (error) {
    console.error('[groups] roster endpoint', error instanceof Error ? error.message : String(error))
    return NextResponse.json({ error: error instanceof Error ? error.message : 'تعذر عرض القوائم' }, { status: error instanceof GroupError ? error.status : 503 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const student = await getStudentSession()
    if (!student) return NextResponse.json({ error: 'سجل دخولك أولاً' }, { status: 401 })
    const data: unknown = await req.json().catch(() => null)
    if (!data || typeof data !== 'object') return NextResponse.json({ error: 'بيانات غير صالحة' }, { status: 400 })
    const { groupId, password } = data as { groupId?: unknown; password?: unknown }
    if (typeof groupId !== 'number' || !Number.isInteger(groupId) || groupId < 1 || groupId > 8)
      return NextResponse.json({ error: 'اختر مجموعة صحيحة' }, { status: 400 })

    const { records, source } = await getRoster()
    if (source === 'snapshot') throw new GroupError('لا يمكن حفظ التغييرات أثناء عرض النسخة الأرشيفية. تحقق من قاعدة البيانات التي يتصل بها Vercel.', 503)
    const mine = membership(records, student.name, student.phone)
    if (mine?.group_id === groupId) return NextResponse.json({ error: 'أنت مسجل في هذه المجموعة' }, { status: 409 })
    if (mine && (typeof password !== 'string' || !password || password.length > 150))
      return NextResponse.json({ error: 'تغيير المجموعة يحتاج كلمة السر' }, { status: 400 })

    if (source === 'postgres') {
      // These database functions validate uniqueness and the admin password.
      // They run through the trusted server DB connection, not a public RPC.
      if (mine) {
        const current = records.find(r => r.phone && normalizedPhone(r.phone) === normalizedPhone(student.phone))
          || records.find(r => normalizedName(r.name) === normalizedName(student.name))
        if (!current || !current.phone) throw new GroupError('العضوية القديمة لا تحتوي رقم جوال؛ يلزم ربطها بحسابك قبل نقلها', 409)
        if (current.role === 'leader') throw new GroupError('نقل قائد المجموعة يتطلب إجراء إداري', 403)
        await db.$queryRaw`SELECT public.move_student_by_phone(${normalizedPhone(current.phone)}, ${groupId}::integer, ${password as string})`
      } else {
        await db.$queryRaw`SELECT public.join_student_group(${student.name}, ${normalizedPhone(student.phone)}, ${groupId}::integer)`
      }
    } else {
      // Secondary REST path, only where the group DB is separate from the account DB.
      if (mine) throw new GroupError('تعذر مطابقة العضوية القديمة بأمان؛ لا يمكن نقلها قبل ربط قاعدة المجموعات بحسابات الموقع', 409)
      await postRpc('join_student_group', { p_name: student.name, p_phone: normalizedPhone(student.phone), p_group_id: groupId })
    }
    return NextResponse.json({ success: true, message: mine ? 'تم تغيير المجموعة' : 'تم الانضمام للمجموعة' })
  } catch (error) {
    console.error('[groups] membership update', error instanceof Error ? error.message : String(error))
    return NextResponse.json({ error: error instanceof Error ? error.message : 'تعذر تحديث المجموعة' }, { status: error instanceof GroupError ? error.status : 503 })
  }
}
