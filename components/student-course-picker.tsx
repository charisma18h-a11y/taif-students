'use client'
import {useCallback,useEffect,useState} from 'react'
import {BookOpen,Save,CheckCircle2,PlusCircle} from 'lucide-react'
import {Card} from '@/components/ui/card'
import {Button} from '@/components/ui/button'
import {Input} from '@/components/ui/input'

type Course={id:string;title:string;active:boolean}
type Entry={course_id:string;section:string;title:string}
export default function StudentCoursePicker({onEnrollmentChange,required=false}:{onEnrollmentChange?:(hasCourses:boolean)=>void;required?:boolean}){
 const [courses,setCourses]=useState<Course[]>([])
 const [selected,setSelected]=useState<Record<string,string>>({})
 const [busy,setBusy]=useState(false),[loading,setLoading]=useState(true)
 const [message,setMessage]=useState(''),[error,setError]=useState('')
 const [initialized,setInitialized]=useState(false)
 const load=useCallback(async()=>{
  setLoading(true)
  try{
   const res=await fetch('/api/my-courses',{cache:'no-store'}),data=await res.json()
   if(!res.ok)throw new Error(data.error||'تعذر تحميل المواد')
   const current:Record<string,string>={}
   for(const e of data.enrollments as Entry[])current[e.course_id]=e.section
   setCourses(data.courses||[]);setSelected(current);setInitialized(Object.keys(current).length>0)
   onEnrollmentChange?.(Object.keys(current).length>0);setError('')
  }catch(e){setError(e instanceof Error?e.message:'تعذر تحميل المواد')}
  finally{setLoading(false)}
 },[onEnrollmentChange])
 useEffect(()=>{void load()},[load])
 async function save(){
  setBusy(true);setError('');setMessage('')
  try{
   const selections=Object.entries(selected).filter(([,sec])=>sec!==undefined).map(([courseId,section])=>({courseId,section:section.trim()}))
   if(!selections.length)throw new Error('اختر مادة واحدة على الأقل')
   if(selections.some(e=>!/^[0-9]{2,12}$/.test(e.section)))throw new Error('اكتب رقم الشعبة لكل مادة (أرقام فقط)')
   const res=await fetch('/api/my-courses',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({selections})})
   const data=await res.json();if(!res.ok)throw new Error(data.error||'فشل الحفظ')
   setMessage('تم حفظ المواد والشُّعب بنجاح');setInitialized(true);onEnrollmentChange?.(true);window.dispatchEvent(new Event('student-courses-updated'))
  }catch(e){setError(e instanceof Error?e.message:'فشل الحفظ')}
  finally{setBusy(false)}
 }
 return <Card className="p-5 sm:p-7 border-amber-500/30 bg-gradient-to-br from-amber-500/10 via-emerald-500/5 to-transparent space-y-5 shadow-xl shadow-amber-500/5">
  <div className="flex flex-wrap justify-between gap-2 items-start"><div><div className="flex gap-2 items-center"><BookOpen className="text-amber-500 size-5"/><h2 className="text-xl font-extrabold">موادي وشُعبي الدراسية</h2></div><p className="text-sm text-muted-foreground mt-2">{required?'يجب اختيار مادة واحدة على الأقل وكتابة رقم شعبتها للمتابعة':initialized?'تقدر تعدّل اختيارك في أي وقت':'اختر المواد اللي تدرسها واكتب رقم شعبة كل مادة'}</p></div><span className="text-xs rounded-full border border-amber-500/40 px-3 py-1 text-amber-500">شُعبك المسجلة</span></div>
  {loading?<p className="text-muted-foreground">جاري تحميل المواد...</p>:<div className="grid gap-3 sm:grid-cols-2">{courses.map(c=><div key={c.id} className={`rounded-xl border p-4 transition ${selected[c.id]!==undefined?'border-emerald-500 bg-emerald-500/10':'border-border bg-background/40'}`}>
    <label className="flex items-center gap-3 cursor-pointer"><input type="checkbox" className="size-4 accent-emerald-600" checked={selected[c.id]!==undefined} onChange={e=>setSelected(prev=>{const n={...prev};if(e.target.checked)n[c.id]='';else delete n[c.id];return n})}/><span className="font-semibold">{c.title}</span></label>
    {selected[c.id]!==undefined&&<Input dir="ltr" inputMode="numeric" placeholder="رقم الشعبة، مثال: 1825" className="mt-3 text-right" maxLength={12} value={selected[c.id]} onChange={e=>setSelected(p=>({...p,[c.id]:e.target.value.replace(/[^0-9]/g,'')}))}/>}
   </div>)}</div>}
  {!loading&&!courses.length&&<p className="text-sm text-amber-500">لم يضف المشرف موادًا بعد. يمكنه إضافتها من لوحة الإدارة.</p>}
  {error&&<p role="alert" className="text-sm text-red-400">{error}</p>}{message&&<p role="status" className="text-sm text-emerald-400 flex items-center gap-2"><CheckCircle2 className="size-4"/>{message}</p>}
  <div className="flex items-center flex-wrap justify-between gap-3"><p className="text-xs text-muted-foreground">هذه البيانات يراجعها المشرف لتنظيم العضوية في الشعب، وليست تحققًا رسميًا من الجامعة.</p><Button onClick={save} disabled={busy||loading||courses.length===0}><Save className="size-4 ml-2"/>{busy?'جارٍ الحفظ...':'حفظ موادي وشُعبي'}</Button></div>
 </Card>
}
