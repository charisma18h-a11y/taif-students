import Link from 'next/link'
import ExamQuestions from '@/components/exam-questions'

export default function QuestionsPage() {
  return <main dir="rtl" className="min-h-screen bg-[#0b1322] text-white px-4 py-10">
    <div className="max-w-3xl mx-auto space-y-6">
      <Link href="/" className="inline-block text-amber-300 hover:underline">العودة إلى وش علينا؟</Link>
      <h1 className="text-3xl font-bold">تسريبات الاختبار — الفيزياء</h1>
      <ExamQuestions expanded />
    </div>
  </main>
}
