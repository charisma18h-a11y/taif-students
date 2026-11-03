 'use client'
import {useCallback,useEffect,useState} from 'react'
import {Button} from '@/components/ui/button'
import {Card} from '@/components/ui/card'
import {Textarea} from '@/components/ui/textarea'
import {CourseSelect,useCourseCatalog} from '@/components/course-select'
type Q={id:string;question:string;answer:string;subject:string|null}
export default function QuestionAdminManager(){
 const [enabled,setEnabled]=useState(true),[showOriginal,setShowOriginal]=useState(true),[questions,setQuestions]=useState<Q[]>([])
 const [question,setQuestion]=useState(''),[answer,setAnswer]=useState(''),[subject,setSubject]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState(''),[msg,setMsg]=useState('')
 const {courses,loading:catalogLoading,error:catalogError,reload:reloadCatalog}=useCourseCatalog()
 const load=useCallback(async()=>{try{const r=await fetch('/api/admin/review-questions',{cache:'no-store'});const d=await r.json();if(!r.ok)throw Error(d.error);setEnabled(d.enabled);setShowOriginal(d.showOriginal);setQuestions(d.questions||[]);setError('')}catch(e){setError(e instanceof Error?e.message:'تعذر التحميل')}},[])
 useEffect(()=>{void load()},[load])
 async function save(payload:Record<string,unknown>){setBusy(true);setError('');setMsg('');try{const r=await fetch('/api/admin/review-questions',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});const d=await r.json();if(!r.ok)throw Error(d.error);setMsg('تم حفظ التعديل');if(payload.action==='add'){setQuestion('');setAnswer('');setSubject('')}await load()}catch(e){setError(e instanceof Error?e.message:'تعذر الحفظ')}finally{setBusy(false)}}
 return <div dir="rtl" className="space-y-4"><Card className="p-5 space-y-4"><h2 className="text-xl font-bold">إدارة أسئلة المراجعة</h2><p className="text-sm text-muted-foreground">تستطيع إظهار أو إخفاء القسم بالكامل وإضافة أسئلة مراجعة أو حذف الأسئلة التي أضفتها.</p>
 <label className="flex items-center gap-3"><input type="checkbox" checked={enabled} onChange={e=>setEnabled(e.target.checked)}/>إظهار القسم للطلاب</label>
 <label className="flex items-center gap-3"><input type="checkbox" checked={showOriginal} onChange={e=>setShowOriginal(e.target.checked)}/>إظهار بنك الأسئلة القديم</label>
 <Button disabled={busy} onClick={()=>void save({action:'settings',enabled,showOriginal})}>حفظ إعدادات القسم</Button></Card>
 <Card className="p-5 space-y-3"><h3 className="font-bold">إضافة سؤال للمراجعة</h3><CourseSelect courses={courses} value={subject} onChange={setSubject} label="المادة الخاصة بالسؤال" allowGeneral loading={catalogLoading} error={catalogError} onRetry={reloadCatalog}/><p className="text-xs text-muted-foreground">عند تحديد مادة لا يظهر السؤال إلا لطلابها. بدون تحديد يظهر السؤال لجميع الطلاب.</p><Textarea value={question} onChange={e=>setQuestion(e.target.value)} placeholder="نص السؤال"/><Textarea value={answer} onChange={e=>setAnswer(e.target.value)} placeholder="الإجابة"/><Button disabled={busy||catalogLoading||!!catalogError||!question.trim()||!answer.trim()} onClick={()=>void save({action:'add',question,answer,subject})}>إضافة السؤال</Button></Card>
 <Card className="p-5 space-y-3"><h3 className="font-bold">الأسئلة المضافة ({questions.length})</h3>{questions.map(q=><div key={q.id} className="flex justify-between gap-4 border-b py-3"><div><p className="font-medium">{q.question}</p><p className="text-xs text-sky-300 mb-1">{q.subject||'سؤال عام'}</p><p className="text-sm text-muted-foreground">{q.answer}</p></div><Button size="sm" variant="destructive" disabled={busy} onClick={()=>{if(window.confirm('حذف هذا السؤال؟'))void save({action:'delete',id:q.id})}}>حذف</Button></div>)}</Card>
 {error&&<p role="alert" className="text-red-500">{error}</p>}{msg&&<p role="status" className="text-emerald-500">{msg}</p>}</div>
}
