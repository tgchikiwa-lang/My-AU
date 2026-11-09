BEGIN;

CREATE OR REPLACE FUNCTION public.create_student_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles(id)
  VALUES (NEW.id)
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.account_access(user_id, pending_approval, email, full_name)
  VALUES (
    NEW.id,
    false,
    coalesce(NEW.email, ''),
    left(coalesce(NEW.raw_user_meta_data->>'name', ''), 200)
  )
  ON CONFLICT (user_id) DO UPDATE
  SET pending_approval = false,
      email = EXCLUDED.email,
      full_name = EXCLUDED.full_name,
      updated_at = now();

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.account_is_enabled()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.account_access
      WHERE user_id = auth.uid()
        AND disabled_at IS NULL
    )
$$;

REVOKE ALL ON FUNCTION public.account_is_enabled() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.account_is_enabled() TO authenticated, service_role;

INSERT INTO public.profiles(id)
SELECT users.id
FROM auth.users AS users
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.account_access(user_id, pending_approval, email, full_name, disabled_at)
SELECT
  users.id,
  false,
  coalesce(users.email, ''),
  left(coalesce(users.raw_user_meta_data->>'name', ''), 200),
  CASE WHEN users.banned_until > now() THEN now() END
FROM auth.users AS users
ON CONFLICT (user_id) DO NOTHING;

UPDATE public.account_access AS access
SET disabled_at = coalesce(access.disabled_at, now()),
    updated_at = now()
FROM auth.users AS users
WHERE users.id = access.user_id
  AND users.banned_until > now();

UPDATE public.account_access
SET pending_approval = false,
    updated_at = now()
WHERE disabled_at IS NULL
  AND pending_approval;

COMMIT;
