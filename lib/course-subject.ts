import { getCatalog } from '@/lib/course-store'

// Use canonical course titles from the database, not free-form user input.
export async function resolveCourseSubject(raw: unknown, optional = true): Promise<string | null> {
  if (raw === null || raw === undefined || raw === '') {
    if (optional) return null
    throw new Error('اختر مادة من القائمة أولًا')
  }
  if (typeof raw !== 'string') throw new Error('اسم المادة غير صالح')
  const normalized = (text: string) => text.normalize('NFKC').replace(/\s+/g, ' ').trim()
  const target = normalized(raw)
  if (!target) {
    if (optional) return null
    throw new Error('اختر مادة من القائمة أولًا')
  }
  const course = (await getCatalog()).find(c => c.active && normalized(c.title) === target)
  if (!course) throw new Error('المادة غير موجودة أو غير مفعّلة. اخترها من القائمة أو فعّلها من إدارة المواد.')
  return course.title
}
