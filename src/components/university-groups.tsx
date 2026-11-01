'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { ArrowLeftRight, BookOpen, CheckCircle2, ChevronDown, Crown, LockKeyhole, RefreshCw, Search, ShieldCheck, Sparkles, Users, X } from 'lucide-react'
import { ORIGINAL_GROUPS_ROSTER } from '@/lib/original-groups-roster'

type Member = { group_id: number; name: string; role: string }
type BoardMember = {id:string;name:string;title:string;description:string;display_order:number}
type Membership = { group_id: number; role: string }
const labels = ['الأولى', 'الثانية', 'الثالثة', 'الرابعة', 'الخامسة', 'السادسة', 'السابعة', 'الثامنة']

export default function UniversityGroups() {
  const [members, setMembers] = useState<Member[]>(ORIGINAL_GROUPS_ROSTER)
  const [board,setBoard] = useState<BoardMember[]>([])
  const [archiveNotice, setArchiveNotice] = useState<string | null>('جاري تحميل القوائم الحية...')
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
      const liveMembers = Array.isArray(data.members) && data.members.length > 0 ? data.members as Member[] : null
      setBoard(Array.isArray(data.board)?data.board:[])
      if (liveMembers) {
        setMembers(liveMembers)
        setMine(data.mine || null)
        setArchiveNotice(data.archiveNotice || (data.source === 'snapshot' ? 'قائمة أرشيفية للعرض فقط؛ انضمام الطلاب وتغيير المجموعات غير متاحين حاليًا.' : null))
      } else {
        setMembers(ORIGINAL_GROUPS_ROSTER)
        setMine(null)
        setArchiveNotice('القوائم الأصلية للـ66 طالبًا (عرض فقط). قاعدة البيانات الحية لم تُرجع أسماء؛ لا يمكن الانضمام أو تغيير المجموعة الآن.')
      }
      setError('')
    } catch (e) {
      setMembers(ORIGINAL_GROUPS_ROSTER)
      setMine(null)
      setArchiveNotice('القائمة الأصلية للـ66 طالبًا ظاهرة للعرض فقط؛ تعذر التحقق من اتصال قاعدة البيانات الحية.')
      setError(e instanceof Error ? e.message : 'تعذر تحميل البيانات الحية')
    }
    finally { setLoading(false) }
  }, [])

  useEffect(() => {
    void refresh()
    const timer = setInterval(() => { if (document.visibilityState === 'visible') void refresh() }, 15000)
    return () => clearInterval(timer)
  }, [refresh])

  const total = members.length
  const q = search.trim().toLocaleLowerCase('ar')
  const visible = useMemo(() => labels.map((label, index) => {
    const id = index + 1
    const roster = members.filter(member => member.group_id === id)
    return { id, label, roster, leader: roster.find(member => member.role === 'leader'), others: roster.filter(member => member.role !== 'leader') }
  }).filter(group => !q || `المجموعة ${group.label}`.includes(q) || group.roster.some(m => m.name.toLocaleLowerCase('ar').includes(q))), [members, q])

  const save = async () => {
    if (target === null || busy || archiveNotice) return
    setBusy(true); setError(''); setMessage('')
    try {
      const res = await fetch('/api/university-groups', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ groupId: target, password: mine ? password : undefined }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'تعذر إتمام العملية')
      setMessage(data.message || 'تم تحديث المجموعة بنجاح')
      setExpanded(target); setTarget(null); setPassword('')
      await refresh()
    } catch (e) { setError(e instanceof Error ? e.message : 'حدث خطأ') }
    finally { setBusy(false) }
  }

  return <section dir="rtl" className="ug-wrap" id="university-groups">
    <div className="ug-hero">
      <div className="ug-orbit ug-orbit-one"/><div className="ug-orbit ug-orbit-two"/>
      <div className="ug-hero-main">
        <div className="ug-eyebrow"><Sparkles size={15}/> المساحة الأكاديمية · شعبة 1825</div>
        <h2>المهارات <span>الجامعية</span></h2>
        <p>مجموعتك، زملاؤك، وكل شيء يخص مادة المهارات الجامعية في مكان واحد. سجّل بمعلومات حسابك الحالي في «وش علينا».</p>
        <div className="ug-status"><ShieldCheck size={17}/>{mine ? `أنت في المجموعة ${labels[mine.group_id - 1]}` : 'اختر مجموعتك من البطاقات أدناه'}</div>
      </div>
      <div className="ug-stats">
        <div><strong>08</strong><small>مجموعات دراسية</small></div>
        <div><strong>{loading ? '…' : total}</strong><small>طلاب مسجلون</small></div>
      </div>
    </div>

    {board.length>0 && <div className="ug-board" aria-label="مجلس الإدارة">
      <div className="ug-board-heading"><Crown size={21}/><div><h3>مجلس الإدارة</h3><p>الأعضاء والمناصب المعتمدة من إدارة المنصة</p></div></div>
      <div className="ug-board-grid">{board.map(b=><article className="ug-board-person" key={b.id}><div className="ug-board-badge"><ShieldCheck size={17}/></div><small>{b.title}</small><strong>{b.name}</strong>{b.description&&<p>{b.description}</p>}</article>)}</div>
    </div>}
    <div className="ug-toolbar">
      <div className="ug-search"><Search size={18}/><input aria-label="البحث عن مجموعة أو طالب" value={search} onChange={e=>setSearch(e.target.value)} placeholder="ابحث باسم طالب أو مجموعة..."/></div>
      <button className="ug-refresh" type="button" onClick={()=>void refresh()} disabled={loading}><RefreshCw size={17}/> تحديث القوائم</button>
    </div>

    {archiveNotice && <div className="ug-notice ug-error" role="status">{archiveNotice}</div>}
    {message && <div className="ug-notice ug-success" role="status"><CheckCircle2 size={18}/>{message}</div>}
    {error && <div className="ug-notice ug-error" role="alert">{error}</div>}
    {loading ? <div className="ug-loading">جاري تحميل مجموعات الطلاب...</div> :
      <div className="ug-grid">
      {visible.map(group => {
        const active = mine?.group_id === group.id
        const isOpen = expanded === group.id
        return <article key={group.id} className={`ug-card ${active ? 'ug-card-active' : ''}`}>
          <div className="ug-card-top"><div className="ug-number">{String(group.id).padStart(2,'0')}</div>{active ? <span className="ug-chip"><CheckCircle2 size={13}/> مجموعتك</span> : <span className="ug-chip ug-chip-muted">شعبة 1825</span>}</div>
          <h3>المجموعة {group.label}</h3>
          <p className="ug-count"><Users size={16}/> {group.roster.length} أعضاء</p>
          <div className="ug-leader"><div className="ug-crown"><Crown size={18}/></div><div><small>قائد المجموعة</small><strong>{group.leader?.name || 'لم يتم تعيين قائد'}</strong></div></div>
          <button type="button" className="ug-members-toggle" onClick={()=>setExpanded(isOpen?null:group.id)} aria-expanded={isOpen}><span>استعراض أعضاء المجموعة</span><ChevronDown size={17} className={isOpen?'ug-rotated':''}/></button>
          {isOpen && <div className="ug-members">{group.others.length ? group.others.map((member, index)=><div className="ug-member" key={`${member.name}-${index}`}><span>{String(index+1).padStart(2,'0')}</span><p>{member.name}</p></div>) : <p className="ug-no-members">لا يوجد أعضاء مسجلون بعد</p>}</div>}
          <button type="button" disabled={!!archiveNotice} className={`ug-join ${active?'ug-join-current':''}`} onClick={()=>{
            if (active) {setExpanded(isOpen?null:group.id);return}
            setMessage('');setError('');setPassword('');setTarget(group.id)
          }}>{active ? <><CheckCircle2 size={16}/> أنت في هذه المجموعة</> : mine ? <><ArrowLeftRight size={16}/> تغيير إلى هذه المجموعة</> : <><BookOpen size={16}/> انضم للمجموعة</>}</button>
        </article>
      })}
      {!visible.length && <div className="ug-empty">ما لقينا نتائج تطابق البحث.</div>}
      </div>}
    <p className="ug-privacy"><ShieldCheck size={15}/> الأسماء ظاهرة للأعضاء، وأرقام الجوال لا تظهر في القوائم. يتم تحديث البيانات دوريًا.</p>

    {target!==null && <div className="ug-modal-cover" onMouseDown={e=>{if(e.target===e.currentTarget && !busy)setTarget(null)}}>
      <div className="ug-modal" role="dialog" aria-modal="true" aria-label="تأكيد المجموعة">
        <button type="button" className="ug-close" aria-label="إغلاق" onClick={()=>setTarget(null)} disabled={busy}><X size={19}/></button>
        <div className="ug-modal-symbol">{mine ? <LockKeyhole size={28}/> : <Users size={28}/>}</div>
        <h3>{mine ? 'تغيير المجموعة' : 'تأكيد الانضمام'}</h3>
        <p>{mine ? `تريد الانتقال من المجموعة ${labels[mine.group_id-1]} إلى المجموعة ${labels[target-1]}.` : `سيتم تسجيلك في المجموعة ${labels[target-1]} باسمك ورقم جوالك الموجودين بحسابك.`}</p>
        {mine && <label className="ug-secret-label">كلمة سر تغيير المجموعة<input autoFocus type="password" autoComplete="off" value={password} onChange={e=>setPassword(e.target.value)} placeholder="أدخل كلمة السر" onKeyDown={e=>{if(e.key==='Enter'&&!busy&&password) void save()}} /></label>}
        <div className="ug-modal-actions"><button type="button" disabled={busy || (!!mine&&!password)} onClick={()=>void save()}>{busy?'جاري الحفظ...':'تأكيد الاختيار'}</button><button type="button" disabled={busy} onClick={()=>{setTarget(null);setPassword('')}}>إلغاء</button></div>
      </div>
    </div>}
  </section>
}
