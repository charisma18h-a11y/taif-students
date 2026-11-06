'use client'

import { useEffect, useId, useState } from 'react'
import { matchesQuestionSearch } from '@/lib/question-search'

type Question = { number: number; question: string; answer: string }

export default function ExamQuestions({ expanded = false }: { expanded?: boolean }) {
  const [questions, setQuestions] = useState<Question[]>([])
  const [status, setStatus] = useState<'loading' | 'ready' | 'error' | 'unauthorized'>('loading')
  const [attempt, setAttempt] = useState(0)
  const [disabled,setDisabled] = useState(false)
  const [search, setSearch] = useState('')
  const searchId = useId()
  const filteredQuestions = questions.filter(q => matchesQuestionSearch(q.question, search))

  useEffect(() => {
    const controller = new AbortController()
    setStatus('loading')
    fetch('/api/questions', { cache: 'no-store', signal: controller.signal })
      .then(async response => {
        if (response.status === 401) {
          setQuestions([])
          setStatus('unauthorized')
          return
        }
        if (!response.ok) throw new Error('Unable to load questions')
        const data = await response.json()
        if (!Array.isArray(data.questions)) throw new Error('Invalid response')
        setQuestions(data.questions)
        setDisabled(data.disabled===true)
        setStatus('ready')
      })
      .catch(() => {
        if (!controller.signal.aborted) setStatus('error')
      })
    return () => controller.abort()
  }, [attempt])

  if(disabled)return null
  return (
    <details open={expanded} dir="rtl" className="group rounded-2xl border border-border bg-card text-white overflow-hidden">
      <summary className="cursor-pointer p-5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary">
        <span className="font-bold text-xl text-primary">أسئلة المراجعة</span>
        <span className="block mt-2 text-sm text-muted-foreground">فيزياء عامة ١ · {status === 'ready' ? `${questions.length} سؤال مع الإجابات` : 'الأسئلة والإجابات'} — اضغط للعرض أو الإغلاق</span>
      </summary>
      <div className="border-t border-white/10 p-4 sm:p-6 space-y-4">
        {status === 'loading' && <p role="status" className="text-muted-foreground">جارٍ تحميل الأسئلة…</p>}
        {status === 'unauthorized' && <p role="alert">انتهت الجلسة. <a href="/" className="text-primary underline">سجّل الدخول مجدداً</a></p>}
        {status === 'error' && <div role="alert"><p>تعذّر تحميل الأسئلة.</p><button type="button" onClick={() => setAttempt(n => n + 1)} className="mt-3 rounded-lg border border-primary px-4 py-2 text-primary">إعادة المحاولة</button></div>}
        {status === 'ready' && (
          <div className="space-y-3">
            <label htmlFor={searchId} className="block font-semibold text-primary">البحث في أسئلة المراجعة</label>
            <div className="flex gap-2">
              <input
                id={searchId}
                type="search"
                value={search}
                onChange={event => setSearch(event.target.value)}
                placeholder="اكتب أول كلمة أو أي جزء من السؤال…"
                className="min-w-0 flex-1 rounded-xl border border-white/20 bg-secondary px-4 py-3 text-white placeholder:text-muted-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
              />
              {search && <button type="button" onClick={() => setSearch('')} className="shrink-0 rounded-xl border border-primary/40 px-4 py-2 text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary">مسح البحث</button>}
            </div>
            <p role="status" aria-live="polite" className="text-sm text-muted-foreground">
              عرض {filteredQuestions.length} من {questions.length} سؤال
            </p>
            {filteredQuestions.length === 0 && <p className="rounded-xl border border-white/10 p-5 text-muted-foreground">لا توجد أسئلة مطابقة. جرّب كلمة أخرى أو امسح البحث.</p>}
          </div>
        )}
        {status === 'ready' && filteredQuestions.map(q => (
          <article key={q.number} className="rounded-xl bg-secondary border border-white/10 p-4 sm:p-5">
            <p className="text-sm text-primary mb-2">السؤال {q.number}</p>
            <h2 className="font-semibold text-base sm:text-lg leading-8">{q.question}</h2>
            <div className="mt-4 pt-3 border-t border-white/10">
              <p className="text-xs text-muted-foreground mb-2">الإجابة</p>
              <p className="font-bold text-emerald-300 leading-7 whitespace-pre-wrap"><bdi>{q.answer}</bdi></p>
            </div>
          </article>
        ))}
      </div>
    </details>
  )
}
