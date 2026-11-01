'use client'
import {useState} from 'react'
import {Pencil,Save} from 'lucide-react'
import {Card} from '@/components/ui/card'
import {Button} from '@/components/ui/button'
import {Input} from '@/components/ui/input'
type Student={id:string;name:string;phone:string;universityId:string|null}
export default function ProfileEditor({student,onUpdated}:{student:Student;onUpdated:(student:Student)=>void}){
 const [name,setName]=useState(student.name),[phone,setPhone]=useState(student.phone),[universityId,setUniversityId]=useState(student.universityId||''),[password,setPassword]=useState('')
 const [busy,setBusy]=useState(false),[message,setMessage]=useState(''),[error,setError]=useState('')
 async function submit(e:React.FormEvent){e.preventDefault();setBusy(true);setError('');setMessage('')
  try{const r=await fetch('/api/me/profile',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({name,phone,universityId,password})}),d=await r.json();if(!r.ok)throw new Error(d.error||'فشل حفظ البيانات');onUpdated(d.student);setPassword('');setMessage('تم تعديل بياناتك بنجاح')}
  catch(e){setError(e instanceof Error?e.message:'فشل الحفظ')}finally{setBusy(false)}
 }
 return <Card className="p-6 space-y-4"><div className="flex gap-2 items-center"><Pencil className="size-5 text-amber-500"/><h3 className="font-bold text-xl">تعديل بيانات الحساب</h3></div><p className="text-sm text-muted-foreground">غيّر اسمك أو رقم جوالك أو رقمك الجامعي. يلزم إدخال كلمة مرور الحساب لتأكيد التعديل.</p>
 <form className="grid gap-4" onSubmit={submit}><label className="space-y-1 text-sm">الاسم الكامل<Input required value={name} onChange={e=>setName(e.target.value)} maxLength={100}/></label><label className="space-y-1 text-sm">رقم الجوال<Input dir="ltr" required inputMode="tel" value={phone} onChange={e=>setPhone(e.target.value)}/></label><label className="space-y-1 text-sm">الرقم الجامعي<Input dir="ltr" required inputMode="numeric" value={universityId} onChange={e=>setUniversityId(e.target.value)}/></label><label className="space-y-1 text-sm">كلمة مرور حسابك للتأكيد<Input type="password" required autoComplete="current-password" value={password} onChange={e=>setPassword(e.target.value)}/></label>
 {error&&<p role="alert" className="text-sm text-red-400">{error}</p>}{message&&<p role="status" className="text-sm text-emerald-400">{message}</p>}<Button disabled={busy} type="submit"><Save className="size-4 ml-2"/>{busy?'جارٍ الحفظ...':'حفظ التعديلات'}</Button></form></Card>
}
