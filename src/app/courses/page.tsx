'use client'
import {useEffect,useState} from 'react'
import Link from 'next/link'
import {BookOpen,ArrowRight,Search,CalendarDays} from 'lucide-react'
import {Input} from '@/components/ui/input'
import {Card} from '@/components/ui/card'

type Course={title:string;section:string}
type Assignment={id:string;title:string;description:string;type:string;subject:string|null;dueDate:string|null}
export default function CoursesPage(){
  const [courses,setCourses]=useState<Course[]>([])
  const [items,setItems]=useState<Assignment[]>([])
  const [chosen,setChosen]=useState('')
  const [search,setSearch]=useState('')
  const [error,setError]=useState('')
  useEffect(()=>{let active=true;Promise.all([fetch('/api/my-courses',{cache:'no-store'}),fetch('/api/assignments',{cache:'no-store'})]).then(async([c,a])=>{if(!c.ok||!a.ok)throw Error('سجّل دخولك وأكمل موادك أولاً');const cs=await c.json(),as=await a.json();if(active){setCourses(cs.enrollments||[]);setItems(as.assignments||[]);setChosen((cs.enrollments||[])[0]?.title||'')}}).catch(e=>{if(active)setError(String(e.message))});return()=>{active=false}},[])
  const filtered=items.filter(a=>(!a.subject||a.subject===chosen)&&`${a.title} ${a.description}`.toLowerCase().includes(search.toLowerCase()))
  return <main className="container mx-auto max-w-5xl px-4 py-8 space-y-6 min-h-screen"><Link className="text-sm text-cyan-300 flex gap-2 items-center" href="/"><ArrowRight className="size-4"/>العودة للرئيسية</Link><div><p className="text-sm text-cyan-300">ACADEMIC COURSES</p><h1 className="text-3xl font-extrabold">موادي الدراسية</h1><p className="text-muted-foreground mt-2">محتوى كل مادة وشعبتها في صفحة مستقلة</p></div>{error&&<Card className="p-4 border-amber-500/30">{error}</Card>}<nav className="grid md:grid-cols-3 gap-3" aria-label="اختيار المادة">{courses.map((c,i)=><button key={i} className={`text-right rounded-2xl border p-5 transition ${chosen===c.title?'bg-primary/20 border-primary':'bg-card border-border'}`} onClick={()=>setChosen(c.title)}><BookOpen className="size-5 text-cyan-300 mb-3"/><span className="block font-bold">{c.title}</span><span className="block text-xs text-muted-foreground mt-1">الشعبة {c.section}</span></button>)}</nav><div className="relative"><Search className="absolute right-3 top-3 size-4 text-muted-foreground"/><Input className="pr-10" placeholder="ابحث في محتوى المادة..." value={search} onChange={e=>setSearch(e.target.value)}/></div><h2 className="font-bold text-xl">المطلوب في {chosen||'المواد'}</h2><div className="grid md:grid-cols-2 gap-3">{filtered.map(a=><Card key={a.id} className="p-5 space-y-2"><span className="text-xs text-cyan-300">{a.type}</span><h3 className="font-bold text-lg">{a.title}</h3><p className="text-sm text-muted-foreground">{a.description}</p>{a.dueDate&&<p className="text-xs flex gap-2 items-center"><CalendarDays className="size-4"/>{new Date(a.dueDate).toLocaleDateString('ar-SA')}</p>}</Card>)}{!filtered.length&&<p className="text-muted-foreground text-sm">لا يوجد محتوى منشور لهذه المادة حاليًا.</p>}</div><Link className="inline-flex text-cyan-300 underline text-sm" href="/questions">بنك أسئلة المراجعة</Link></main>
}
