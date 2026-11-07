BEGIN;
ALTER TABLE public.user_roles
DROP CONSTRAINT IF EXISTS user_roles_role_check;

ALTER TABLE public.user_roles
ADD CONSTRAINT user_roles_role_check
CHECK (role IN ('student', 'lecturer', 'admin', 'records'));
COMMIT;
