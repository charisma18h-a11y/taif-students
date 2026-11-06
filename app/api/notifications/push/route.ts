import { NextRequest,NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getStudentSession } from '@/lib/auth'
import { publicPushKey, validPushEndpoint } from '@/lib/push-send'
export const dynamic='force-dynamic'
export const runtime='nodejs'
const headers={'Cache-Control':'private, no-store'}
export async function GET() {
  const student=await getStudentSession()
  if(!student)return NextResponse.json({error:'سجّل الدخول أولاً'},{status:401,headers})
  return NextResponse.json({enabled:Boolean(publicPushKey()),publicKey:publicPushKey()},{headers})
}
export async function POST(req:NextRequest) {
  const student=await getStudentSession()
  if(!student)return NextResponse.json({error:'سجّل الدخول أولاً'},{status:401})
  if(!publicPushKey())return NextResponse.json({error:'لم تُضبط مفاتيح الإشعارات في Vercel بعد'},{status:503})
  const b=await req.json().catch(()=>null)
  const endpoint=b?.endpoint, keys=b?.keys
  if(typeof endpoint!=='string'||endpoint.length>2048||!validPushEndpoint(endpoint)||typeof keys?.p256dh!=='string'||typeof keys?.auth!=='string'||keys.p256dh.length>256||keys.auth.length>256||!/^[A-Za-z0-9_-]+$/.test(keys.p256dh)||!/^[A-Za-z0-9_-]+$/.test(keys.auth))return NextResponse.json({error:'اشتراك الإشعار غير صالح'},{status:400})
  try {
    await db.$executeRaw`INSERT INTO public.portal_push_subscriptions(student_id,endpoint,p256dh,auth)
      VALUES(${student.id},${endpoint},${keys.p256dh},${keys.auth})
      ON CONFLICT(endpoint) DO UPDATE SET student_id=EXCLUDED.student_id,p256dh=EXCLUDED.p256dh,auth=EXCLUDED.auth,updated_at=now()`
    return NextResponse.json({success:true},{headers})
  }catch(e){console.error('push save',e);return NextResponse.json({error:'تعذّر حفظ اشتراك الإشعارات. نفّذ ملف إعداد قاعدة البيانات.'},{status:503})}
}
export async function DELETE(req:NextRequest) {
  const student=await getStudentSession()
  if(!student)return NextResponse.json({error:'سجّل الدخول أولاً'},{status:401})
  const b=await req.json().catch(()=>null)
  if(typeof b?.endpoint!=='string'||b.endpoint.length>2048)return NextResponse.json({error:'بيانات غير صالحة'},{status:400})
  try { await db.$executeRaw`DELETE FROM public.portal_push_subscriptions WHERE endpoint=${b.endpoint} AND student_id=${student.id}`
    return NextResponse.json({success:true},{headers})
  }catch(e){console.error('push delete',e);return NextResponse.json({error:'تعذّر إيقاف الإشعارات'},{status:503})}
}
