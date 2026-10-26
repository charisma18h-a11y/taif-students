# ربط المشروع بـ Supabase

تم إعداد Prisma للعمل مع جداول SQL التي أنشأتها (`students`, `assignments`, `views`) عبر `@@map` و`@map`.

1. افتح `.env` واستبدل `REPLACE_WITH_DATABASE_PASSWORD` بكلمة مرور قاعدة بيانات Supabase. إذا احتوت رموزاً خاصة، استخدم URL encoding. لا تشارك هذا الملف.
2. الاتصال المباشر `db.*:5432` يتطلب IPv6. إذا لم يتوفر، انسخ رابط **Session pooler** من زر Connect في Supabase وضعه في `DATABASE_URL` و`DIRECT_URL` (منفذ 5432).
3. غيّر `ADMIN_PASSWORD` لكلمة مرور قوية جديدة، وأنشئ `SESSION_SECRET` عشوائياً من 32 بايت على الأقل (مثلاً `openssl rand -hex 32`). كلمة مرور الأدمن القديمة كانت ظاهرة في كود المشروع ويجب عدم استخدامها مجدداً.
4. شغّل `npm install` ثم `npx prisma generate` ثم `npx prisma db pull --print` للفحص فقط.
5. شغّل `npm run dev` ثم اختبر تسجيل طالب والواجبات. **لا تشغّل db:push قبل التأكد من تطابق الجداول**.

ملاحظة: SQL السابق أنشأ الجداول في `public` مع RLS مفعل. اتصال Prisma بسلسلة قاعدة البيانات يستخدم دور Postgres المخوّل، ولا تعرض بيانات الاتصال في المتصفح. لم يتم الاتصال الفعلي بمشروع Supabase أو اختبار قاعدة البيانات لأن كلمة المرور غير متوفرة.
