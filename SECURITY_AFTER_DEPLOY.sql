-- Run once in Supabase SQL Editor AFTER confirming the website runs using DATABASE_URL
-- This revokes direct public API access to private tables. All legitimate reads/writes use server-validated sessions.
BEGIN;
REVOKE ALL ON TABLE public.university_group_members FROM anon, authenticated;
REVOKE ALL ON TABLE public.university_group_config FROM anon, authenticated;
REVOKE ALL ON TABLE public.university_group_board FROM anon, authenticated;
REVOKE ALL ON TABLE public.students FROM anon, authenticated;
REVOKE ALL ON TABLE public.group_admin_settings FROM anon, authenticated;
REVOKE ALL ON TABLE public.group_students FROM anon, authenticated;
-- Protect new tables if already created by first visit to the portal hub.
DO $$ BEGIN
  IF to_regclass('public.portal_notices') IS NOT NULL THEN
    REVOKE ALL ON TABLE public.portal_notices FROM anon, authenticated;
  END IF;
  IF to_regclass('public.portal_student_progress') IS NOT NULL THEN
    REVOKE ALL ON TABLE public.portal_student_progress FROM anon, authenticated;
  END IF;
  IF to_regclass('public.portal_timetable') IS NOT NULL THEN
    REVOKE ALL ON TABLE public.portal_timetable FROM anon, authenticated;
  END IF;
END $$;
COMMIT;
