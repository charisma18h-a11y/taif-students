'use client'
import { useEffect,useState } from 'react'
import { BellRing,BellOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
function decodeBase64Url(value:string):Uint8Array<ArrayBuffer> {
  const pad='='.repeat((4-value.length%4)%4)
  const binary=atob((value+pad).replace(/-/g,'+').replace(/_/g,'/'))
  const bytes=new Uint8Array(new ArrayBuffer(binary.length))
  for(let i=0;i<binary.length;i++)bytes[i]=binary.charCodeAt(i)
  return bytes
}
export default function PushNotifications() {
  const [key,setKey]=useState('')
  const [enabled,setEnabled]=useState(false)
  const [supported,setSupported]=useState(true)
  const [subscribed,setSubscribed]=useState(false)
  const [busy,setBusy]=useState(false)
  const [message,setMessage]=useState('')
  useEffect(()=>{
    setSupported('serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window)
    fetch('/api/notifications/push',{cache:'no-store'}).then(r=>r.json()).then(d=>{setKey(d.publicKey||'');setEnabled(Boolean(d.enabled))}).catch(()=>setMessage('تعذّر معرفة إعدادات الإشعارات'))
    if('serviceWorker' in navigator) navigator.serviceWorker.getRegistration('/sw.js').then(r=>r?.pushManager?.getSubscription()).then(s=>setSubscribed(Boolean(s))).catch(()=>{})
  },[])
  async function enable() {
    // Request permission directly in the button-click call stack (required on iOS).
    setBusy(true);setMessage('')
    try {
      const permission=await Notification.requestPermission()
      if(permission!=='granted')throw new Error('اسمح بالإشعارات من إعدادات جهازك ثم جرّب مرة أخرى')
      const reg=await navigator.serviceWorker.register('/sw.js',{scope:'/'})
      const sub=await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:decodeBase64Url(key)})
      const res=await fetch('/api/notifications/push',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(sub.toJSON())})
      const d=await res.json()
      if(!res.ok)throw new Error(d.error||'تعذّر حفظ الإشعارات')
      setSubscribed(true);setMessage('تم تفعيل إشعارات هذا الجهاز بنجاح')
    } catch(e){setMessage(e instanceof Error?e.message:'تعذر تفعيل الإشعارات')}
    finally{setBusy(false)}
  }
  async function disable() {
    setBusy(true);setMessage('')
    try {
      const reg=await navigator.serviceWorker.getRegistration('/sw.js')
      const sub=await reg?.pushManager?.getSubscription()
      if(sub){const res=await fetch('/api/notifications/push',{method:'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify({endpoint:sub.endpoint})});if(!res.ok)throw new Error('تعذر إيقاف الاشتراك على الخادم');await sub.unsubscribe()}
      setSubscribed(false);setMessage('تم إيقاف تنبيهات هذا الجهاز')
    } catch(e){setMessage(e instanceof Error?e.message:'تعذر إيقاف التنبيهات')}
    finally{setBusy(false)}
  }
  return <div className="rounded-xl border border-sky-400/20 bg-[#0b1b32] p-3 space-y-2" dir="rtl">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><p className="text-sm font-bold text-sky-100">إشعارات الجوال حتى عند إغلاق الموقع</p><p className="text-xs text-slate-300 mt-1">تحتاج موافقتك واتصال الجهاز بالإنترنت. للآيفون ثبّت الموقع على الشاشة الرئيسية أولًا.</p></div>
      {!subscribed?<Button type="button" size="sm" onClick={()=>void enable()} disabled={busy||!supported||!enabled}><BellRing className="ml-1 size-4"/>تفعيل الإشعارات</Button>:<Button type="button" size="sm" variant="outline" onClick={()=>void disable()} disabled={busy}><BellOff className="ml-1 size-4"/>إيقاف الإشعارات</Button>}
    </div>
    {!supported&&<p className="text-xs text-amber-200">المتصفح الحالي لا يدعم إشعارات الخلفية. على الآيفون استخدم الموقع بعد إضافته إلى الشاشة الرئيسية (iOS 16.4+).</p>}
    {supported&&!enabled&&<p className="text-xs text-amber-200">تنبيهات الخلفية تحتاج ضبط مفاتيح VAPID في Vercel من الإدارة.</p>}
    {message&&<p className="text-xs text-sky-200" role="status">{message}</p>}
  </div>
}
