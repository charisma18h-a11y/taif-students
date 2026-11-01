import { cookies } from 'next/headers'
import { db } from '@/lib/db'
import { randomBytes, scryptSync, timingSafeEqual, createHmac } from 'crypto'

// باسورد الأدمن - يقدر تغيّره لاحقاً
export const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || ''
const SESSION_SECRET = process.env.SESSION_SECRET || ''
function sign(value: string) {
  if (!SESSION_SECRET || SESSION_SECRET.startsWith('REPLACE_')) throw new Error('SESSION_SECRET is not configured')
  return createHmac('sha256', SESSION_SECRET).update(value).digest('hex')
}
function validSignature(value: string, signature: string) {
  if (!/^[a-f0-9]{64}$/.test(signature)) return false
  return timingSafeEqual(Buffer.from(sign(value), 'hex'), Buffer.from(signature, 'hex'))
}

// ========== تشفير الباسورد (scrypt) ==========
export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex')
  const hash = scryptSync(password, salt, 64).toString('hex')
  return `${salt}:${hash}`
}

export function verifyPassword(password: string, stored: string): boolean {
  try {
    const [salt, hash] = stored.split(':')
    if (!salt || !hash) return false
    const hashBuf = Buffer.from(hash, 'hex')
    const testBuf = scryptSync(password, salt, 64)
    // مقارنة آمنة لمنع توقيت الهجمات
    if (hashBuf.length !== testBuf.length) return false
    return timingSafeEqual(hashBuf, testBuf)
  } catch {
    return false
  }
}

// التحقق من قوة الباسورد (6 أحرف على الأقل)
export function validatePassword(password: string): { valid: boolean; error?: string } {
  if (!password || password.length < 6) {
    return { valid: false, error: 'الباسورد يجب أن يكون 6 أحرف على الأقل' }
  }
  if (password.length > 100) {
    return { valid: false, error: 'الباسورد طويل جداً' }
  }
  return { valid: true }
}

// اسماء الـ cookies
const STUDENT_COOKIE = 'student_session'
const ADMIN_COOKIE = 'admin_session'

// ========== جلسة الطالب ==========
export async function setStudentSession(studentId: string) {
  const cookieStore = await cookies()
  // نضيف توقيع بسيط مع الـ ID
  const token = `${studentId}.${sign(studentId)}`
  cookieStore.set(STUDENT_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 24 * 30, // 30 يوم
    path: '/',
  })
}

export async function getStudentSession() {
  const cookieStore = await cookies()
  const token = cookieStore.get(STUDENT_COOKIE)?.value
  if (!token) return null

  const [studentId, signature] = token.split('.')
  if (!studentId || !signature) return null

  // تحقق من التوقيع
  const expected = sign(studentId)
  if (!validSignature(studentId, signature)) return null

  // تحقق من وجود الطالب
  const student = await db.student.findUnique({
    where: { id: studentId },
  })
  return student
}

export async function clearStudentSession() {
  const cookieStore = await cookies()
  cookieStore.delete(STUDENT_COOKIE)
}

// ========== جلسة الأدمن ==========
export async function setAdminSession() {
  const cookieStore = await cookies()
  const token = `admin.${sign('admin')}`
  cookieStore.set(ADMIN_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 12, // 12 ساعة
    path: '/',
  })
}

export async function getAdminSession() {
  const cookieStore = await cookies()
  const token = cookieStore.get(ADMIN_COOKIE)?.value
  if (!token) return false

  const [role, signature] = token.split('.')
  if (role !== 'admin' || !signature) return false

  const expected = sign('admin')
  return validSignature('admin', signature)
}

export async function clearAdminSession() {
  const cookieStore = await cookies()
  cookieStore.delete(ADMIN_COOKIE)
}

// ========== تحقق من رقم الجوال السعودي ==========
export function validateSaudiPhone(phone: string): { valid: boolean; normalized: string } {
  // نشيل المسافات والشرطات
  const cleaned = phone.replace(/[\s\-()]/g, '')
  // الأنواع المقبولة: 05XXXXXXXX أو 5XXXXXXXX أو 9665XXXXXXXX أو +9665XXXXXXXX
  let normalized = cleaned
  if (cleaned.startsWith('+966')) {
    normalized = '0' + cleaned.slice(4)
  } else if (cleaned.startsWith('966')) {
    normalized = '0' + cleaned.slice(3)
  } else if (cleaned.startsWith('5') && cleaned.length === 9) {
    normalized = '0' + cleaned
  }
  // لازم يبدأ بـ 05 وبيكون 10 أرقام
  const valid = /^05\d{8}$/.test(normalized)
  return { valid, normalized }
}


// الرقم الجامعي حقل شخصي؛ لا يعني إدخاله أن الجامعة أكدت هوية صاحب الحساب.
export function validateUniversityId(input: unknown): { valid: boolean; normalized: string } {
  const raw = typeof input === 'string' ? input.trim() : ''
  const normalized = raw
    .replace(/[٠-٩]/g, (digit) => String(digit.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, (digit) => String(digit.charCodeAt(0) - 0x06f0))
  return { valid: /^\d{6,15}$/.test(normalized), normalized }
}
