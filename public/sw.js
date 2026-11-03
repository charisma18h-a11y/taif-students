/* إشعارات وش علينا: لا يتعامل هذا العامل مع كلمات المرور أو أرقام الطلاب. */
self.addEventListener('push', (event) => {
  let data = {title:'تنبيه من وش علينا',body:'لديك تحديث دراسي جديد',url:'/'}
  try { if(event.data) data = Object.assign(data,event.data.json()) } catch (_) {}
  const path = typeof data.url === 'string' && data.url.startsWith('/') && !data.url.startsWith('//') ? data.url : '/'
  event.waitUntil(self.registration.showNotification(String(data.title||'تنبيه من وش علينا').slice(0,130),{
    body:String(data.body||'').slice(0,180),icon:'/pwa-icon-192.png',badge:'/pwa-icon-192.png',data:{url:path},tag:'wosh-'+Date.now()
  }))
})
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const path=event.notification.data?.url || '/'
  const url=new URL(path,self.location.origin)
  if(url.origin !== self.location.origin) return
  event.waitUntil((async()=>{
    const clientsList=await clients.matchAll({type:'window',includeUncontrolled:true})
    for (const c of clientsList) if (c.url.startsWith(self.location.origin)) {await c.focus();if('navigate' in c) await c.navigate(url.href);return}
    await clients.openWindow(url.href)
  })())
})
