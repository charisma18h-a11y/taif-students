'use client'

import { useEffect, useState } from 'react'

type Question = { number: number; question: string; answer: string }

export default function ExamQuestions({ expanded = false }: { expanded?: boolean }) {
  const [questions, setQuestions] = useState<Question[]>([])
  const [status, setStatus] = useState<'loading' | 'ready' | 'error' | 'unauthorized'>('loading')
  const [attempt, setAttempt] = useState(0)

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
        setStatus('ready')
      })
      .catch(() => {
        if (!controller.signal.aborted) setStatus('error')
      })
    return () => controller.abort()
  }, [attempt])

  return (
    <details open={expanded} dir="rtl" className="group rounded-2xl border border-amber-400/40 bg-[#101c30] text-white overflow-hidden">
      <summary className="cursor-pointer p-5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-300">
        <span className="font-bold text-xl text-amber-300">تسريبات الاختبار</span>
        <span className="block mt-2 text-sm text-slate-300">فيزياء عامة ١ · {status === 'ready' ? `${questions.length} سؤال مع الإجابات` : 'الأسئلة والإجابات'} — اضغط للعرض أو الإغلاق</span>
      </summary>
      <div className="border-t border-white/10 p-4 sm:p-6 space-y-4">
        {status === 'loading' && <p role="status" className="text-slate-300">جارٍ تحميل الأسئلة…</p>}
        {status === 'unauthorized' && <p role="alert">انتهت الجلسة. <a href="/" className="text-amber-300 underline">سجّل الدخول مجدداً</a></p>}
        {status === 'error' && <div role="alert"><p>تعذّر تحميل الأسئلة.</p><button type="button" onClick={() => setAttempt(n => n + 1)} className="mt-3 rounded-lg border border-amber-300 px-4 py-2 text-amber-300">إعادة المحاولة</button></div>}
        {status === 'ready' && questions.map(q => (
          <article key={q.number} className="rounded-xl bg-[#192740] border border-white/10 p-4 sm:p-5">
            <p className="text-sm text-amber-300 mb-2">السؤال {q.number}</p>
            <h2 className="font-semibold text-base sm:text-lg leading-8">{q.question}</h2>
            <div className="mt-4 pt-3 border-t border-white/10">
              <p className="text-xs text-slate-400 mb-2">الإجابة</p>
              <p className="font-bold text-emerald-300 leading-7 whitespace-pre-wrap"><bdi>{q.answer}</bdi></p>
            </div>
          </article>
        ))}
      </div>
    </details>
  )
}
