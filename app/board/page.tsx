import Link from 'next/link'
import { ArrowRight, Crown } from 'lucide-react'
import HomeBoard from '@/components/home-board'

export const metadata = { title: 'مجلس الإدارة | وش علينا', description: 'أعضاء مجلس إدارة منصة وش علينا' }

export default function BoardPage() {
  return (
    <main dir="rtl" className="min-h-screen bg-pattern px-4 py-10 sm:py-16">
      <div className="mx-auto max-w-5xl space-y-7">
        <header className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-primary/20 bg-background/70 p-6 sm:p-8">
          <div className="flex items-center gap-3">
            <span className="rounded-2xl bg-primary/10 p-3 text-primary"><Crown className="size-7" /></span>
            <div><h1 className="text-2xl font-extrabold sm:text-3xl">مجلس الإدارة</h1><p className="mt-1 text-sm text-muted-foreground">التعريف بأعضاء إدارة منصة وش علينا</p></div>
          </div>
          <Link href="/" className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2 text-sm font-medium hover:bg-accent"><ArrowRight className="size-4" />العودة للمنصة</Link>
        </header>
        <HomeBoard />
      </div>
    </main>
  )
}
