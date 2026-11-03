'use client'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Bell, CalendarDays, BookOpen, CheckCircle2, Circle, Search, Megaphone, Plus, Trash2, Clock, RefreshCw } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

type Assignment = { id:string;title:string;description:string;type:string;subject:string|null;dueDate:string|null;createdAt:string }
type Enrollment = { title:string; section:string }
type Notice = { id:string;title:string;body:string;pinned:boolean;created_at:string }
type Slot = { id:string;subject:string;section:string;weekday:number;starts_at:string;ends_at:string;room:string }
const weekdays=['الأحد','الاثنين','الثلاثاء','الأربعاء','الخميس','الجمعة','السبت']
const dateText = (date:string) => new Date(date).toLocaleDateString('ar-SA',{day:'numeric',month:'long'})
function timeLeft(d:string) {const days=Math.ceil((new Date(d).getTime()-Date.now())/86400000);return days<0?'انتهى الموعد':days===0?'اليوم':days===1?'غدًا':`باقي ${days} يوم`}
export default function PortalHub({assignments,admin=false}:{assignments?:Assignment[];admin?:boolean}) {
  const [notices,setNotices]=useState<Notice[]>([])
  const [slots,setSlots]=useState<Slot[]>([])
  const [completed,setCompleted]=useState<string[]>([])
  const [courses,setCourses]=useState<Enrollment[]>([])
  const [tab,setTab]=useState<'overview'|'calendar'|'courses'|'alerts'>('overview')
  const [course,setCourse]=useState('')
  const [search,setSearch]=useState('')
  const [error,setError]=useState('')
  const [busy,setBusy]=useState(false)
  const [noticeTitle,setNoticeTitle]=useState('')
  const [noticeBody,setNoticeBody]=useState('')
  const [slotSubject,setSlotSubject]=useState('')
  const [slotSection,setSlotSection]=useState('')
  const [slotDay,setSlotDay]=useState(0)
  const [slotStart,setSlotStart]=useState('08:00')
  const [slotEnd,setSlotEnd]=useState('09:00')
  const [slotRoom,setSlotRoom]=useState('')
  const reload=useCallback(async()=>{try{const r=await fetch('/api/portal-hub',{cache:'no-store'});const data=await r.json();if(!r.ok)throw new Error(data.error||'تعذر الاتصال');setNotices(data.notices||[]);setSlots(data.timetable||[]);setCompleted(data.completedIds||[]);setCourses(data.enrollments||[]);setError('')}catch(e){setError(e instanceof Error?e.message:'تعذر التحميل')}},[])
  useEffect(()=>{void reload()},[reload])
  const list=assignments||[]
  const relevant=useMemo(()=>list.filter(a=>(!course||a.subject===course)&&`${a.title} ${a.description} ${a.subject||''}`.toLowerCase().includes(search.toLowerCase())),[list,course,search])
  const deadlines=list.filter(a=>a.dueDate&&new Date(a.dueDate).getTime()>=Date.now()).sort((a,b)=>new Date(a.dueDate!).getTime()-new Date(b.dueDate!).getTime())
  const completedCount=list.filter(a=>completed.includes(a.id)).length
  const send=async (payload:Record<string,unknown>)=>{setBusy(true);try{const r=await fetch('/api/portal-hub',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});const d=await r.json();if(!r.ok)throw new Error(d.error||'فشل الحفظ');await reload();setError('');return true}catch(e){setError(e instanceof Error?e.message:'فشل الحفظ');return false}finally{setBusy(false)}}
  const toggle=async (id:string)=>{const was=completed.includes(id);setCompleted(v=>was?v.filter(x=>x!==id):[...v,id]);const ok=await send({action:'progress',assignmentId:id,completed:!was});if(!ok)setCompleted(v=>was?[...v,id]:v.filter(x=>x!==id))}
  return <section className="space-y-4" aria-label={admin?'إدارة المنصة الذكية':'مركز الطالب الذكي'}>
    <div className="flex items-center justify-between gap-2 flex-wrap"><div><p className="text-xs uppercase tracking-widest text-cyan-300">WOSH ALINA • CAMPUS HUB</p><h2 className="text-xl font-extrabold mt-1">{admin?'مركز إدارة المنصة':'مركز المتابعة الذكي'}</h2><p className="text-sm text-muted-foreground">{admin?'إدارة الإعلانات والجدول الدراسي':'مهامك وتنبيهاتك وموادك في مكان واحد'}</p></div><Button size="sm" variant="outline" onClick={reload}><RefreshCw className="size-4 ml-2"/>تحديث</Button></div>
    {error&&<div role="alert" className="rounded-xl border border-amber-400/30 bg-amber-400/10 p-3 text-sm text-amber-200">{error}</div>}
    {!admin&&<div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <Metric label="إجمالي المطلوب" value={list.length} icon={<BookOpen/>}/>
      <Metric label="أنجزتها" value={completedCount} icon={<CheckCircle2/>}/>
      <Metric label="الاختبارات والمهام القادمة" value={deadlines.length} icon={<Clock/>}/>
      <Metric label="التنبيهات" value={notices.length} icon={<Bell/>}/>
    </div>}
    {!admin&&<div className="flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="أقسام لوحة الطالب">{([['overview','الرئيسية'],['calendar','جدولي'],['courses','موادي'],['alerts','الإشعارات']] as const).map(([key,label])=><Button key={key} size="sm" variant={tab===key?'default':'outline'} role="tab" aria-selected={tab===key} onClick={()=>setTab(key)}>{label}</Button>)}</div>}
    {(admin||tab==='alerts'||tab==='overview')&&<div className="space-y-3"><div className="flex items-center gap-2 font-bold"><Megaphone className="size-4 text-cyan-300"/>الإعلانات المثبتة</div>
      {notices.length===0&&<p className="text-sm text-muted-foreground">لا توجد إعلانات حاليًا.</p>}
      <div className="grid md:grid-cols-2 gap-3">{notices.map(n=><Card key={n.id} className="p-4 space-y-2"><div className="flex justify-between gap-2"><div className="font-bold">{n.pinned?'📌 ':''}{n.title}</div>{admin&&<Button title="حذف الإعلان" size="icon" variant="ghost" disabled={busy} onClick={()=>void send({action:'deleteNotice',id:n.id})}><Trash2 className="size-4"/></Button>}</div><p className="text-sm text-muted-foreground whitespace-pre-wrap">{n.body}</p><p className="text-xs text-muted-foreground">{dateText(n.created_at)}</p></Card>)}</div></div>}
    {!admin&&tab==='overview'&&<Card className="p-4"><h3 className="font-bold mb-3">أقرب موعد تسليم أو اختبار</h3>{deadlines.length===0?<p className="text-sm text-muted-foreground">لا توجد مواعيد قادمة مسجلة.</p>:<div className="space-y-2">{deadlines.slice(0,4).map(a=><div key={a.id} className="flex gap-3 justify-between items-center rounded-xl bg-white/5 p-3"><div><p className="font-semibold text-sm">{a.title}</p><p className="text-xs text-muted-foreground">{a.subject||'عام'} · {dateText(a.dueDate!)}</p></div><span className="text-xs text-cyan-300 whitespace-nowrap">{timeLeft(a.dueDate!)}</span></div>)}</div>}</Card>}
    {(admin||tab==='calendar')&&<div className="space-y-3"><h3 className="font-bold flex gap-2 items-center"><CalendarDays className="size-4 text-cyan-300"/>الجدول الأسبوعي</h3>{slots.length===0?<p className="text-sm text-muted-foreground">لم تضف الإدارة محاضرات للشُعب المسجلة بعد.</p>:<div className="grid md:grid-cols-2 gap-2">{slots.map(s=><Card key={s.id} className="p-3 flex items-center justify-between gap-3"><div><p className="font-bold">{s.subject} · {s.section}</p><p className="text-xs text-muted-foreground">{weekdays[s.weekday]} • {s.starts_at}–{s.ends_at}{s.room?` • ${s.room}`:''}</p></div>{admin&&<Button size="icon" variant="ghost" onClick={()=>void send({action:'deleteSlot',id:s.id})}><Trash2 className="size-4"/></Button>}</Card>)}</div>}</div>}
    {!admin&&tab==='courses'&&<div className="space-y-3"><div className="flex flex-wrap gap-2"><Button variant={course===''?'default':'outline'} onClick={()=>setCourse('')}>كل المواد</Button>{courses.map((c,i)=><Button variant={course===c.title?'default':'outline'} key={i} onClick={()=>setCourse(c.title)}>{c.title} · {c.section}</Button>)}</div><p className="text-xs text-muted-foreground">يظهر المطلوب لكل مادة على حدة؛ الشعبة تُدار من ملفك الشخصي.</p></div>}
    {!admin&&(tab==='overview'||tab==='courses')&&<div className="space-y-3"><div className="flex items-center gap-2 font-bold"><CheckCircle2 className="size-4 text-cyan-300"/>متابعة إنجاز المهام <span className="text-xs text-muted-foreground">{completedCount}/{list.length}</span></div><div className="relative"><Search className="absolute right-3 top-3 size-4 text-muted-foreground"/><Input className="pr-10" placeholder="بحث في المطلوب والمواد..." value={search} onChange={e=>setSearch(e.target.value)}/></div><div className="space-y-2 max-h-80 overflow-y-auto">{relevant.length===0?<p className="text-sm text-muted-foreground">لا يوجد مطلوب مطابق.</p>:relevant.map(a=><div key={a.id} className="flex items-center justify-between gap-3 rounded-xl border border-white/10 p-3"><div className="min-w-0"><p className="text-sm font-bold truncate">{a.title}</p><p className="text-xs text-muted-foreground">{a.subject||'عام'} · {a.type}{a.dueDate?` · ${dateText(a.dueDate)}`:''}</p></div><Button size="sm" variant={completed.includes(a.id)?'default':'outline'} disabled={busy} onClick={()=>void toggle(a.id)}>{completed.includes(a.id)?<><CheckCircle2 className="size-4 ml-1"/>أنجزت</>:<><Circle className="size-4 ml-1"/>تحديد الإنجاز</>}</Button></div>)}</div><p className="text-xs text-muted-foreground">الإنجاز هنا علامة شخصية للتنظيم، ولا يعني تسليم الواجب للدكتور.</p></div>}
    {admin&&<div className="grid md:grid-cols-2 gap-4"><Card className="p-4 space-y-3"><h3 className="font-bold">إعلان جديد</h3><Input placeholder="عنوان الإعلان" value={noticeTitle} onChange={e=>setNoticeTitle(e.target.value)}/><textarea className="w-full rounded-lg border border-border bg-background p-3 text-sm min-h-24" placeholder="نص الإعلان" value={noticeBody} onChange={e=>setNoticeBody(e.target.value)}/><Button disabled={busy} onClick={async()=>{if(await send({action:'notice',title:noticeTitle,body:noticeBody,pinned:true})){setNoticeTitle('');setNoticeBody('')}}}><Plus className="size-4 ml-1"/>نشر الإعلان</Button></Card><Card className="p-4 space-y-3"><h3 className="font-bold">إضافة محاضرة للجدول</h3><Input placeholder="اسم المادة مطابق لقائمة المواد" value={slotSubject} onChange={e=>setSlotSubject(e.target.value)}/><Input placeholder="رقم الشعبة" value={slotSection} onChange={e=>setSlotSection(e.target.value)}/><select className="w-full rounded-lg border border-border bg-background p-2" value={slotDay} onChange={e=>setSlotDay(Number(e.target.value))}>{weekdays.map((d,i)=><option value={i} key={i}>{d}</option>)}</select><div className="grid grid-cols-2 gap-2"><label className="text-xs">البداية<Input type="time" value={slotStart} onChange={e=>setSlotStart(e.target.value)}/></label><label className="text-xs">النهاية<Input type="time" value={slotEnd} onChange={e=>setSlotEnd(e.target.value)}/></label></div><Input placeholder="القاعة (اختياري)" value={slotRoom} onChange={e=>setSlotRoom(e.target.value)}/><Button disabled={busy} onClick={async()=>{if(await send({action:'timetable',subject:slotSubject,section:slotSection,weekday:slotDay,starts_at:slotStart,ends_at:slotEnd,room:slotRoom})){setSlotSubject('');setSlotSection('');setSlotRoom('')}}}><Plus className="size-4 ml-1"/>حفظ المحاضرة</Button></Card></div>}
  </section>
}
function Metric({label,value,icon}:{label:string;value:number;icon:React.ReactNode}){return <Card className="p-4 border-cyan-500/15"><div className="text-cyan-300 [&>svg]:size-5 mb-3">{icon}</div><p className="text-2xl font-bold">{value}</p><p className="text-xs text-muted-foreground">{label}</p></Card>}
