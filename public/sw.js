// «وش علينا»: عامل خدمة خفيف لنسخة PWA، بدون إشعارات دفع.
// لا يضيف كاش للصفحات أو بيانات الطلاب، حتى تظهر تحديثات النشر فور تحديث الصفحة.
self.addEventListener('install', () => { self.skipWaiting(); });
self.addEventListener('activate', (event) => { event.waitUntil(self.clients.claim()); });
