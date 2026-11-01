'use client'

import { useCallback, useEffect, useState } from 'react'
import { BookOpen, Users, Crown, LockKeyhole, RefreshCw, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Label } from '@/components/ui/label'

type Member = { group_id: number; name: string; role: string }
type Membership = { group_id: number; role: string }
const labels = ['الأولى', 'الثانية', 'الثالثة', 'الرابعة', 'الخامسة', 'السادسة', 'السابعة', 'الثامنة']

export default function UniversityGroups() {
  const [members, setMembers] = useState<Member[]>([])
  const [mine, setMine] = useState<Membership | null>(null)
  const [expanded, setExpanded] = useState<number | null>(null)
  const [target, setTarget] = useState<number | null>(null)
  const [password, setPassword] = useState('')
  const [search, setSearch] = useState('')
  const [busy, setBusy] = useState(false)
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const refresh = useCallback(async () => {
    try {
      const res = await fetch('/api/university-groups', { cache: 'no-store' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'تعذر تحميل المجموعات')
      setMembers(Array.isArray(data.members) ? data.members : [])
      setMine(data.mine || null)
      setError('')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'تعذر تحميل البيانات')
    } finally { setLoading(false) }
  }, [])
  useEffect(() => {
    void refresh()
    const timer = setInterval(() => { void refresh() }, 15000)
    return () => clearInterval(timer)
  }, [refresh])

  const select = (id: number) => {
    setMessage(''); setError(''); setPassword('')
    if (mine?.group_id === id) { setExpanded(expanded === id ? null : id); return }
    setTarget(id)
  }

  const save = async () => {
    if (target === null || busy) return
    setBusy(true); setError(''); setMessage('')
    try {
      const res = await fetch('/api/university-groups', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ groupId: target, password: mine ? password : undefined }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'تعذر إتمام العملية')
      setMessage(data.message || 'تم الحفظ')
      setExpanded(target)
      setTarget(null); setPassword('')
      await refresh()
    } catch (e) { setError(e instanceof Error ? e.message : 'حدث خطأ') }
    finally { setBusy(false) }
  }
  const q = search.trim().toLocaleLowerCase('ar')
  return (
    <section dir="rtl" className="space-y-5">
      <div className="rounded-2xl bg-gradient-to-l from-emerald-950 via-slate-900 to-slate-950 border border-amber-500/30 p-6 text-white">
        <div className="flex items-center gap-3"><BookOpen className="size-7 text-amber-400"/><div><h2 className="text-2xl font-extrabold">المهارات الجامعية</h2><p className="text-emerald-200 text-sm">شعبة 1825 • المجموعات الثماني</p></div></div>
        <p className="text-sm text-slate-200 mt-3">اختر مجموعتك باستخدام حسابك في «وش علينا». الاسم والجوال يؤخذان من حسابك تلقائياً، ولا يظهر رقم الجوال لبقية الطلاب.</p>
        <p className="mt-3 font-bold text-amber-300">{mine ? `مجموعتك الحالية: المجموعة ${labels[mine.group_id - 1]}` : 'لم تنضم إلى مجموعة بعد'}</p>
      </div>
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-48"><Search className="absolute right-3 top-3 size-4 text-muted-foreground"/><Input className="pr-9" value={search} onChange={e=>setSearch(e.target.value)} placeholder="ابحث باسم الطالب أو المجموعة"/></div>
        <Button type="button" variant="outline" disabled={loading} onClick={() => void refresh()}><RefreshCw className="size-4 ml-2"/> تحديث</Button>
      </div>
      {message && <p role="status" className="rounded-lg bg-emerald-950/10 border border-emerald-600/30 text-emerald-700 dark:text-emerald-300 px-4 py-3">{message}</p>}
      {error && <p role="alert" className="rounded-lg bg-red-950/10 border border-red-600/30 text-red-700 dark:text-red-300 px-4 py-3">{error}</p>}
      {loading && <p className="text-muted-foreground">جاري تحميل المجموعات...</p>}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {labels.map((label,i)=>{
          const id=i+1
          const roster=members.filter(m=>m.group_id===id)
          const leader=roster.find(m=>m.role==='leader')
          const others=roster.filter(m=>m.role!=='leader')
          const match=!q || `المجموعة ${label}`.includes(q) || roster.some(m=>m.name.toLocaleLowerCase('ar').includes(q))
          if (!match) return null
          return <Card key={id} className={`p-4 space-y-3 border ${mine?.group_id===id ? 'border-emerald-500' : 'border-amber-500/20'}`}>
            <div className="flex items-center justify-between"><h3 className="font-bold text-lg">المجموعة {label}</h3>{mine?.group_id===id && <span className="text-xs text-emerald-600 font-bold">مجموعتك ✓</span>}</div>
            <p className="text-muted-foreground text-sm flex items-center gap-2"><Users className="size-4"/>{roster.length} أعضاء</p>
            {leader && <div className="text-sm rounded-lg bg-amber-500/10 p-2"><Crown className="size-4 inline text-amber-500 ml-1"/>القائد: {leader.name}</div>}
            <Button className="w-full" variant={mine?.group_id===id ? 'outline' : 'default'} onClick={()=>select(id)}>{mine?.group_id===id ? 'عرض / إخفاء الأعضاء' : mine ? 'طلب تغيير المجموعة' : 'الانضمام للمجموعة'}</Button>
            {expanded===id && <div className="border-t pt-2 space-y-2"><p className="text-sm font-semibold">أسماء الأعضاء:</p>{others.length===0 ? <p className="text-xs text-muted-foreground">لا يوجد أعضاء بعد</p> : others.map((m,j)=><p key={`${m.name}-${j}`} className="text-xs bg-muted/40 rounded p-2">{j+1}. {m.name}</p>)}</div>}
          </Card>
        })}
      </div>
      {target !== null && <div role="dialog" aria-modal="true" aria-label="تأكيد اختيار المجموعة" className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
        <Card className="w-full max-w-md p-6 space-y-4"><h3 className="text-lg font-bold">{mine ? 'تغيير المجموعة' : 'تأكيد الانضمام'}</h3>
        <p className="text-sm">{mine ? `تريد الانتقال من المجموعة ${labels[mine.group_id-1]} إلى المجموعة ${labels[target-1]}.` : `هل تريد الانضمام إلى المجموعة ${labels[target-1]}؟`}</p>
        {mine && <div className="space-y-2"><Label htmlFor="group-secret">كلمة سر تغيير المجموعة</Label><div className="relative"><LockKeyhole className="absolute right-3 top-3 size-4 text-muted-foreground"/><Input id="group-secret" type="password" autoComplete="off" className="pr-9" value={password} onChange={e=>setPassword(e.target.value)} placeholder="أدخل كلمة السر"/></div></div>}
        <div className="flex gap-2"><Button disabled={busy || (!!mine && !password)} onClick={()=>void save()}>{busy ? 'جاري الحفظ...' : 'تأكيد'}</Button><Button variant="outline" disabled={busy} onClick={()=>{setTarget(null);setPassword('')}}>إلغاء</Button></div>
        </Card></div>}
    </section>
  )
}
