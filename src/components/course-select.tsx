'use client'

import { useCallback, useEffect, useId, useMemo, useState } from 'react'
import { BookOpen, RefreshCw, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export type CatalogCourse = { id: string; title: string; sections: string[] }

export function useCourseCatalog(enabled = true) {
  const [courses, setCourses] = useState<CatalogCourse[]>([])
  const [loading, setLoading] = useState(enabled)
  const [error, setError] = useState('')
  const reload = useCallback(async () => {
    if (!enabled) return
    setLoading(true)
    try {
      const response = await fetch('/api/course-catalog', { cache: 'no-store' })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'تعذر تحميل المواد')
      setCourses(Array.isArray(data.courses) ? data.courses : [])
      setError('')
    } catch (e) { setError(e instanceof Error ? e.message : 'تعذر تحميل قائمة المواد') }
    finally { setLoading(false) }
  }, [enabled])
  useEffect(() => { void reload() }, [reload])
  return { courses, loading, error, reload }
}

type CourseSelectProps = {
  courses: CatalogCourse[]
  value: string
  onChange: (title: string) => void
  label?: string
  allowGeneral?: boolean
  required?: boolean
  disabled?: boolean
  loading?: boolean
  error?: string
  onRetry?: () => void
}

export function CourseSelect({ courses, value, onChange, label='المادة المستهدفة', allowGeneral=false, required=false, disabled=false, loading=false, error='', onRetry }: CourseSelectProps) {
  const id = useId()
  const [filter,setFilter] = useState('')
  const options = useMemo(() => courses.filter(c => c.title === value || c.title.toLocaleLowerCase().includes(filter.trim().toLocaleLowerCase())), [courses, filter, value])
  const stillAvailable = courses.some(c => c.title === value)
  return <div className="space-y-2" dir="rtl">
    <div className="flex items-center justify-between gap-2">
      <label htmlFor={id} className="text-sm font-bold flex items-center gap-2"><BookOpen className="size-4 text-sky-300"/>{label}{required?' *':''}</label>
      <span className="rounded-lg bg-sky-400/10 px-2 py-1 text-[11px] text-sky-200">{courses.length} مادة متاحة</span>
    </div>
    {courses.length > 5 && <div className="relative"><Search className="size-4 absolute right-3 top-3 text-slate-400"/>
      <Input className="pr-9" value={filter} onChange={e => setFilter(e.target.value)} placeholder="ابحث عن المادة بالاسم..." aria-label="البحث في أسماء المواد" />
    </div>}
    <select id={id} dir="rtl" className="w-full h-11 rounded-xl border border-sky-400/25 bg-[#10213b] text-slate-100 px-3 text-sm focus-visible:outline-2 focus-visible:outline-sky-400" value={value} onChange={e=>onChange(e.target.value)} disabled={disabled||loading||!!error} required={required}>
      <option value="">{loading?'جارٍ تحميل المواد...':allowGeneral?'جميع المواد (محتوى عام)':'اختر مادة من القائمة'}</option>
      {value && !stillAvailable && <option value={value}>{value} — مادة محفوظة سابقًا</option>}
      {options.map(course => <option key={course.id} value={course.title}>{course.title}</option>)}
    </select>
    {filter && options.length === 0 && <p className="text-xs text-slate-300">لا توجد مادة مطابقة للبحث. امسح البحث أو عدّله.</p>}
    {!loading && courses.length === 0 && !error && <p className="text-xs text-amber-200">لا توجد مواد مفعّلة. أضف مادة أولًا من لوحة الإدارة ← المواد والشعب.</p>}
    {error && <div className="flex items-center gap-2 text-xs text-rose-200"><span>{error}</span>{onRetry && <Button type="button" variant="outline" size="sm" onClick={onRetry}><RefreshCw className="size-3 ml-1"/>إعادة المحاولة</Button>}</div>}
  </div>
}
