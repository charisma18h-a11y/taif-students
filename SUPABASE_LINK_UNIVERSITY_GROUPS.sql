-- شغّل في مشروع Supabase الذي توجد فيه public.group_students.
-- ملاحظة: نفّذ ملف قاعدة_بيانات_المجموعات.sql أولاً إذا لم تنشئ الجداول والدوال بعد.
-- هذه الإضافة لا تحذف أي مجموعة أو طالب.

CREATE OR REPLACE FUNCTION public.my_group_by_phone(p_phone text)
RETURNS TABLE(group_id integer, role text)
LANGUAGE sql SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT s.group_id, s.role FROM public.group_students s
  WHERE s.phone = p_phone
  LIMIT 1;
$$;
REVOKE ALL ON FUNCTION public.my_group_by_phone(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.my_group_by_phone(text) TO anon, authenticated;

-- كلمة السر تتحقق في قاعدة البيانات نفسها ولا تُرسل ضمن شفرة الصفحة.
CREATE OR REPLACE FUNCTION public.move_student_by_phone(
  p_phone text, p_new_group_id integer, p_password text
)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_id bigint;
BEGIN
  IF p_new_group_id NOT BETWEEN 1 AND 8 THEN
    RAISE EXCEPTION 'اختر مجموعة صحيحة';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.group_admin_settings
    WHERE singleton = true
    AND password_hash = extensions.crypt(coalesce(p_password,''), password_hash)
  ) THEN RAISE EXCEPTION 'كلمة السر غير صحيحة'; END IF;
  SELECT id INTO v_id FROM public.group_students
    WHERE phone = p_phone AND role = 'member';
  IF v_id IS NULL THEN
    RAISE EXCEPTION 'لم يتم العثور على عضويتك، أو أنك قائد مجموعة';
  END IF;
  UPDATE public.group_students SET group_id=p_new_group_id WHERE id=v_id;
  RETURN 'تم النقل بنجاح';
END;
$$;
REVOKE ALL ON FUNCTION public.move_student_by_phone(text, integer, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.move_student_by_phone(text, integer, text) TO anon, authenticated;
