'use client'
import {useCallback,useEffect,useMemo,useState} from 'react'
import {Card} from '@/components/ui/card'
import {Button} from '@/components/ui/button'
import {Input} from '@/components/ui/input'
import {Textarea} from '@/components/ui/textarea'
import {BookOpen,CheckCircle2,ClipboardList,Download,Link2,RefreshCcw,ShieldAlert,UploadCloud,UserRoundX,Users} from 'lucide-react'
import {compareRoster,normalizeRosterName,parseRosterText,type CourseEnrollment,type OfficialEntry,type OfficialResult,type RosterStudent} from '@/lib/roster-match'

type Course={id:string;title:string;active:boolean}
type List={id:string;courseId:string;section:string}
type Data={courses:Course[];lists:List[];entries:OfficialEntry[];students:RosterStudent[];enrollments:CourseEnrollment[]}
const empty:Data={courses:[],lists:[],entries:[],students:[],enrollments:[]}
function inSearch(value:string,query:string){return normalizeRosterName(value).includes(normalizeRosterName(query))}
function csvEsc(s:string){return '"'+s.replace(/"/g,'""')+'"'}

export default function OfficialRosterManager(){
 const [data,setData]=useState<Data>(empty)
 const [courseId,setCourseId]=useState('')
 const [section,setSection]=useState('')
 const [text,setText]=useState('')
 const [search,setSearch]=useState('')
 const [activeEntry,setActiveEntry]=useState<string|null>(null)
 const [candidateSearch,setCandidateSearch]=useState('')
 const [busy,setBusy]=useState(false),[loading,setLoading]=useState(true)
 const [error,setError]=useState(''),[notice,setNotice]=useState('')
 const load=useCallback(async()=>{
   setLoading(true)
   try{
     const r=await fetch('/api/admin/official-rosters',{cache:'no-store'})
     const d=await r.json()
     if(!r.ok)throw Error(d.error||'تعذر تحميل الكشوف')
     setData(d as Data)
     setError('')
     setCourseId(v=>v||d.courses?.[0]?.id||'')
   }catch(e){setError(e instanceof Error?e.message:'تعذر تحميل الكشوف')}
   finally{setLoading(false)}
 },[])
 useEffect(()=>{void load()},[load])
 const sections=useMemo(()=>Array.from(new Set([
   ...data.lists.filter(r=>r.courseId===courseId).map(r=>r.section),
   ...data.enrollments.filter(r=>r.courseId===courseId).map(r=>r.section),
 ])).sort((a,b)=>a.localeCompare(b,'ar')),[data,courseId])
 const currentList=useMemo(()=>data.lists.find(r=>r.courseId===courseId&&r.section===section),[data,courseId,section])
 const currentEntries=useMemo(()=>data.entries.filter(e=>e.rosterId===currentList?.id),[data.entries,currentList])
 const {rosterResults,needingReview}=useMemo(()=>currentList?compareRoster(currentEntries,data.students,data.enrollments,courseId,section):{rosterResults:[],needingReview:[]},[currentList,currentEntries,data,courseId,section])
 const matched=rosterResults.filter(r=>r.state==='matched')
 const hasAccount=rosterResults.filter(r=>r.state==='account_elsewhere')
 const noAccount=rosterResults.filter(r=>r.state==='no_account_match')
 const selected=rosterResults.find(r=>r.entry.id===activeEntry)
 const options=useMemo(()=>data.students.filter(s=>`${s.name} ${s.universityId||''}`.toLocaleLowerCase().includes(candidateSearch.trim().toLocaleLowerCase())).slice(0,35),[data.students,candidateSearch])
 const csvRows=useMemo(()=>[
  ...rosterResults.map(r=>[r.entry.fullName,r.student?.name||'',r.student?.universityId||'',r.state==='matched'?'مطابق للاسم ومسجل في الشعبة':r.state==='account_elsewhere'?'له حساب لكن ليس مسجلا في هذه الشعبة':'لا يوجد حساب مطابق تلقائيا']),
  ...needingReview.map(s=>['',s.name,s.universityId||'','مسجل في الشعبة وغير مطابق للكشف'])
 ],[rosterResults,needingReview])
 async function save(body:Record<string,unknown>){
   setBusy(true);setError('');setNotice('')
   try{
     const r=await fetch('/api/admin/official-rosters',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)})
     const d=await r.json();if(!r.ok)throw Error(d.error||'تعذر الحفظ')
     setNotice(body.action==='import'?`تم استيراد ${d.count} اسمًا إلى شعبة ${section} بنجاح. ${d.duplicates?'المكرر المتجاهل: '+d.duplicates:''}`:'تم تحديث الربط بالحساب')
     if(body.action==='import')setText('')
     setActiveEntry(null);setCandidateSearch('')
     await load()
   }catch(e){setError(e instanceof Error?e.message:'تعذر الحفظ')}
   finally{setBusy(false)}
 }
 function exportCsv(){
   const rows=[['اسم كشف البلاك','الاسم في المنصة','الرقم الجامعي (إن وجد)','النتيجة'],...csvRows]
   const csv='\uFEFF'+rows.map(row=>row.map(csvEsc).join(',')).join('\r\n')
   const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8;'}))
   const a=document.createElement('a');a.href=url;a.download=`تقرير_شعبة_${section}_${courseId}.csv`;a.click();URL.revokeObjectURL(url)
 }
 function officialCard(r:OfficialResult){
   return <div key={r.entry.id} className="rounded-xl border border-sky-400/15 bg-slate-950/30 p-3 space-y-1">
    <p className="font-semibold text-sm break-words">{r.entry.fullName}</p>
    {r.student&&<p className="text-xs text-slate-400">حساب المنصة: {r.student.name}{r.student.universityId?` · ${r.student.universityId}`:''}</p>}
    {r.student && r.state==='account_elsewhere' && <p className="text-xs text-amber-300">اختيارات الحساب: {data.enrollments.filter(e=>e.studentId===r.student!.id).map(e=>`${data.courses.find(c=>c.id===e.courseId)?.title||'مادة'} / شعبة ${e.section}`).join(' • ')||'لا توجد مواد مختارة'}</p>}
    {r.ambiguous&&<p className="text-xs text-amber-300">يوجد أكثر من حساب بنفس الاسم، يحتاج ربطًا يدويًا</p>}
    {r.manual&&<p className="text-xs text-sky-300">مرتبط يدويًا بحساب</p>}
    <div className="pt-1 flex flex-wrap gap-2">
      <Button type="button" size="sm" variant="outline" className="text-xs" onClick={()=>{setActiveEntry(r.entry.id);setCandidateSearch('')}}><Link2 className="size-3.5 ml-1"/> {r.student?'تعديل الربط':'ربط بحساب'}</Button>
      {r.entry.linkedStudentId&&<Button type="button" size="sm" variant="ghost" disabled={busy} onClick={()=>void save({action:'link',entryId:r.entry.id,studentId:null})}>إلغاء الربط</Button>}
    </div>
   </div>
 }
 const tiles=[
  {label:'أسماء الكشف',value:rosterResults.length,icon:ClipboardList},
  {label:'مطابقون في الشعبة',value:matched.length,icon:CheckCircle2},
  {label:'لديهم حساب لكن غير مسجلين بالشعبة',value:hasAccount.length,icon:Users},
  {label:'لم نجد حسابًا مطابقًا',value:noAccount.length,icon:UserRoundX},
  {label:'مسجلون في الشعبة خارج الكشف',value:needingReview.length,icon:ShieldAlert},
 ]
 const filterResults=(rows:OfficialResult[])=>rows.filter(r=>inSearch(`${r.entry.fullName} ${r.student?.name||''} ${r.student?.universityId||''}`,search))
 const filterStudents=(rows:RosterStudent[])=>rows.filter(s=>inSearch(`${s.name} ${s.universityId||''}`,search))
 return <section dir="rtl" className="space-y-4">
  <Card className="p-4 sm:p-6 space-y-3 border-sky-400/20">
    <div className="flex items-center gap-2"><BookOpen className="size-5 text-sky-400"/><h2 className="text-lg sm:text-xl font-bold">مطابقة كشوف البلاك مع حسابات المنصة</h2></div>
    <p className="text-sm text-muted-foreground">كل مادة وشعبة مستقلة. لا يتغير حساب أي طالب أو اشتراكه، ولا يجري طرد أحد تلقائيًا. تطابق الاسم يساعد في المراجعة لكنه ليس تحقق هوية رسميًا.</p>
    <div className="grid gap-2 sm:grid-cols-3">
      <label className="text-xs space-y-1">المادة<select aria-label="اختر المادة" value={courseId} onChange={e=>{setCourseId(e.target.value);setSection('');setSearch('');setActiveEntry(null)}} className="block w-full rounded-lg bg-background border p-2.5 text-sm"><option value="">اختر المادة</option>{data.courses.map(c=><option key={c.id} value={c.id}>{c.title}</option>)}</select></label>
      <label className="text-xs space-y-1">الشعبة<Input dir="ltr" value={section} onChange={e=>{setSection(e.target.value.replace(/[^0-9]/g,''));setActiveEntry(null)}} list="roster-section-list" placeholder="مثال: 1819" maxLength={12}/><datalist id="roster-section-list">{sections.map(s=><option key={s} value={s}/>)}</datalist></label>
      <div className="flex flex-wrap gap-2 items-end"><Button variant="outline" disabled={loading} onClick={()=>void load()}><RefreshCcw className="size-4 ml-2"/>تحديث</Button><Button variant="outline" disabled={!currentList} onClick={exportCsv}><Download className="size-4 ml-2"/>تصدير CSV</Button></div>
    </div>
    {sections.length>0&&<div className="flex flex-wrap gap-1.5">{sections.map(s=><Button key={s} type="button" variant={section===s?'default':'outline'} size="sm" onClick={()=>{setSection(s);setActiveEntry(null)}}>شعبة {s}</Button>)}</div>}
    {loading&&<p className="text-xs text-sky-300">جارٍ تحميل الكشوف...</p>}
  </Card>
  {courseId&&/^\d{2,12}$/.test(section)&&<>
   <Card className="p-4 sm:p-5 space-y-3"><h3 className="font-bold flex items-center gap-2"><UploadCloud className="size-5 text-sky-400"/> استيراد كشف الشعبة {section}</h3>
    <p className="text-xs text-muted-foreground">ألصق الأسماء التي نسختها من Blackboard (حتى لو بين كل اسم وكلمة «الطالب»). إذا استوردت كشفًا جديدًا للشعبة نفسها، يستبدل الكشف السابق لهذه الشعبة فقط مع الاحتفاظ بالربط اليدوي للأسماء الباقية.</p>
    <Textarea value={text} onChange={e=>setText(e.target.value)} rows={5} placeholder={'خالد احمد خالد الهلال\nالطالب\nغازي بن عبدالرحمن بن المطوع النفيعي\nالطالب'} />
    <div className="flex justify-between gap-3 items-center flex-wrap"><span className="text-xs text-muted-foreground">الأسماء المكتشفة: {parseRosterText(text).names.length}</span><Button disabled={busy||parseRosterText(text).names.length===0} onClick={()=>{if(window.confirm(`استيراد الكشف إلى الشعبة ${section}؟ سيستبدل قائمة الكشف لهذه الشعبة فقط دون تغيير حسابات الطلاب.`))void save({action:'import',courseId,section,text})}}><UploadCloud className="size-4 ml-2"/>{currentList?'تحديث الكشف':'حفظ الكشف'}</Button></div>
   </Card>
   {!currentList?<Card className="p-6 text-sm text-center text-muted-foreground">لم يُرفع كشف رسمي لهذه الشعبة بعد. ألصقه أعلاه لتظهر المقارنة. تسجيل الطلاب بالموقع وحده لا يكفي لإثبات عضويتهم في كشف البلاك.</Card>:<>
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-2">{tiles.map(t=><Card className="p-3 sm:p-4 space-y-1" key={t.label}><t.icon className="size-5 text-sky-400"/><p className="text-2xl font-extrabold tabular-nums">{t.value}</p><p className="text-xs text-muted-foreground">{t.label}</p></Card>)}</div>
    <Input aria-label="بحث النتائج" value={search} onChange={e=>setSearch(e.target.value)} placeholder="ابحث في نتائج الشعبة بالاسم أو الرقم الجامعي"/>
    {selected&&<Card className="p-4 border-sky-500/50 space-y-3"><div className="flex justify-between items-center"><p className="font-bold">ربط «{selected.entry.fullName}» بحساب طالب</p><Button variant="ghost" size="sm" onClick={()=>setActiveEntry(null)}>إغلاق</Button></div><p className="text-xs text-muted-foreground">اختر الحساب الصحيح بعد التأكد من هويته. لا تعتمد على تشابه الاسم وحده.</p><Input value={candidateSearch} onChange={e=>setCandidateSearch(e.target.value)} placeholder="ابحث باسم الطالب أو الرقم الجامعي" autoFocus/><div className="max-h-48 overflow-y-auto space-y-1">{options.map(s=><button key={s.id} disabled={busy} type="button" onClick={()=>{if(window.confirm(`ربط ${selected.entry.fullName} بحساب ${s.name}؟`))void save({action:'link',entryId:selected.entry.id,studentId:s.id})}} className="block text-right w-full p-2 rounded-lg border hover:bg-sky-400/10 text-sm"><span className="font-semibold">{s.name}</span> <span className="text-xs text-muted-foreground">{s.universityId||'لا رقم جامعي'}</span></button>)}</div></Card>}
    <div className="grid lg:grid-cols-2 gap-4">
     <Card className="p-4 space-y-3"><h3 className="font-bold text-emerald-400 flex gap-2 items-center"><CheckCircle2 className="size-4"/> في الكشف ومسجلون بالشعبة ({matched.length})</h3><div className="space-y-2 max-h-96 overflow-y-auto">{filterResults(matched).map(officialCard)}{!filterResults(matched).length&&<p className="text-xs text-muted-foreground">لا توجد نتائج</p>}</div></Card>
     <Card className="p-4 space-y-3"><h3 className="font-bold text-amber-300 flex gap-2 items-center"><Users className="size-4"/> في الكشف ولديهم حساب خارج الشعبة ({hasAccount.length})</h3><div className="space-y-2 max-h-96 overflow-y-auto">{filterResults(hasAccount).map(officialCard)}{!filterResults(hasAccount).length&&<p className="text-xs text-muted-foreground">لا توجد نتائج</p>}</div></Card>
     <Card className="p-4 space-y-3"><h3 className="font-bold text-rose-300 flex gap-2 items-center"><UserRoundX className="size-4"/> في الكشف ولا يظهر لهم حساب مطابق ({noAccount.length})</h3><p className="text-xs text-muted-foreground">هذه القائمة لا تثبت عدم وجود حساب؛ قد يكون الاسم مختلفًا في الموقع. راجع قبل تصنيف الطالب بأنه لم يسجل.</p><div className="space-y-2 max-h-96 overflow-y-auto">{filterResults(noAccount).map(officialCard)}{!filterResults(noAccount).length&&<p className="text-xs text-muted-foreground">لا توجد نتائج</p>}</div></Card>
     <Card className="p-4 space-y-3"><h3 className="font-bold text-sky-300 flex gap-2 items-center"><ShieldAlert className="size-4"/> مسجلون في الشعبة وغير مطابقين للكشف ({needingReview.length})</h3><p className="text-xs text-muted-foreground">قد يكونون مسجلين بأسماء مختصرة أو مختلفة، وليس بالضرورة خارج الشعبة.</p><div className="space-y-2 max-h-96 overflow-y-auto">{filterStudents(needingReview).map(s=><div className="border rounded-xl p-3 bg-slate-950/30" key={s.id}><p className="font-semibold text-sm">{s.name}</p><p className="text-xs text-muted-foreground">{s.universityId||'لا رقم جامعي'}</p></div>)}{!filterStudents(needingReview).length&&<p className="text-xs text-muted-foreground">لا توجد نتائج</p>}</div></Card>
    </div>
   </>}
  </>}
  {error&&<p role="alert" className="text-red-400 text-sm">{error}</p>}{notice&&<p role="status" className="text-emerald-300 text-sm">{notice}</p>}
 </section>
}
