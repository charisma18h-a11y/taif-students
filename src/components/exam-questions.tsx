import { physicsQuestions } from '@/lib/physics-questions'

export default function ExamQuestions({ expanded = false }: { expanded?: boolean }) {
  return (
    <details open={expanded} dir="rtl" className="group rounded-2xl border border-amber-400/40 bg-[#101c30] text-white overflow-hidden">
      <summary className="cursor-pointer p-5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-300">
        <span className="font-bold text-xl text-amber-300">تسريبات الاختبار</span>
        <span className="block mt-2 text-sm text-slate-300">فيزياء عامة ١ · ٢٠ سؤال مع الإجابات — اضغط للعرض أو الإغلاق</span>
      </summary>
      <div className="border-t border-white/10 p-4 sm:p-6 space-y-4">
        {physicsQuestions.map(q => (
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
