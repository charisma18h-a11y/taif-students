import { db } from '@/lib/db'
import webpush from 'web-push'

type Target = { title:string; body:string; subject?:string|null; section?:string|null; url?:string }
type Stored = { endpoint:string; p256dh:string; auth:string }
export function pushConfigured() {
  return Boolean(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY && process.env.VAPID_CONTACT?.startsWith('mailto:'))
}
export function publicPushKey() { return pushConfigured() ? process.env.VAPID_PUBLIC_KEY! : '' }

// Reject arbitrary subscription endpoints: avoids server-side requests to private hosts.
export function validPushEndpoint(value: string) {
  try {
    const u = new URL(value)
    if(u.protocol !== 'https:' || u.port || u.username || u.password || u.hash) return false
    const host = u.hostname.toLowerCase()
    return host === 'fcm.googleapis.com' || host === 'updates.push.services.mozilla.com' || host === 'updates-autopush.stage.mozaws.net' || host === 'web.push.apple.com' || host.endsWith('.push.apple.com') || host.endsWith('.notify.windows.com')
  } catch { return false }
}

export async function notifyStudents({title,body,subject=null,section=null,url='/'}:Target) {
  if (!pushConfigured()) return
  try {
    webpush.setVapidDetails(process.env.VAPID_CONTACT!,process.env.VAPID_PUBLIC_KEY!,process.env.VAPID_PRIVATE_KEY!)
    let subscriptions:Stored[]
    if (subject && section) {
      subscriptions = await db.$queryRaw<Stored[]>`
        SELECT p.endpoint,p.p256dh,p.auth FROM public.portal_push_subscriptions p
        WHERE EXISTS(SELECT 1 FROM public.portal_course_enrollments e
          JOIN public.portal_courses c ON c.id=e.course_id
          WHERE e.student_id=p.student_id AND c.title=${subject} AND e.section=${section}) LIMIT 500`
    } else if (subject) {
      subscriptions = await db.$queryRaw<Stored[]>`
        SELECT p.endpoint,p.p256dh,p.auth FROM public.portal_push_subscriptions p
        WHERE EXISTS(SELECT 1 FROM public.portal_course_enrollments e
          JOIN public.portal_courses c ON c.id=e.course_id
          WHERE e.student_id=p.student_id AND c.title=${subject}) LIMIT 500`
    } else {
      subscriptions = await db.$queryRaw<Stored[]>`SELECT endpoint,p256dh,auth FROM public.portal_push_subscriptions LIMIT 500`
    }
    const payload=JSON.stringify({title:title.slice(0,130),body:body.slice(0,180),url:url.startsWith('/') && !url.startsWith('//')?url:'/'})
    for(let i=0;i<subscriptions.length;i+=15) {
      await Promise.allSettled(subscriptions.slice(i,i+15).map(async sub => {
        if(!validPushEndpoint(sub.endpoint)) return
        try {
          await webpush.sendNotification({endpoint:sub.endpoint,keys:{p256dh:sub.p256dh,auth:sub.auth}},payload,{TTL:86400,timeout:3500})
        } catch(e) {
          const status=(e as {statusCode?:number})?.statusCode
          if(status===404 || status===410) await db.$executeRaw`DELETE FROM public.portal_push_subscriptions WHERE endpoint=${sub.endpoint}`
          else console.error('[push] could not deliver',status||'network')
        }
      }))
    }
  } catch(e) { console.error('[push] dispatch error',e instanceof Error?e.message:'unknown') }
}
