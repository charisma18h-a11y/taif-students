-- نفّذ هذا الملف مرة واحدة في Supabase > SQL Editor قبل رفع النسخة الجديدة.
-- نستخدم عموداً يقبل NULL حفاظاً على حسابات الطلاب المسجلين سابقاً.
ALTER TABLE public.students
  ADD COLUMN IF NOT EXISTS university_id TEXT;

-- يمنع تكرار الرقم الجامعي بين حسابين (يسمح بـ NULL للحسابات القديمة).
CREATE UNIQUE INDEX IF NOT EXISTS students_university_id_key
  ON public.students (university_id);
