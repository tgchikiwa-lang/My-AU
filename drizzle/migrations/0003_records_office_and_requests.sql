ALTER TABLE public.account_access ADD COLUMN IF NOT EXISTS pending_approval boolean NOT NULL DEFAULT false;
ALTER TABLE public.account_access ADD COLUMN IF NOT EXISTS email text NOT NULL DEFAULT '';
ALTER TABLE public.account_access ADD COLUMN IF NOT EXISTS full_name text NOT NULL DEFAULT '';
ALTER TABLE public.account_access ADD COLUMN IF NOT EXISTS disabled_reason text;
ALTER TABLE public.account_access ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();

CREATE OR REPLACE FUNCTION public.create_student_profile() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles(id) VALUES (NEW.id) ON CONFLICT DO NOTHING;
  INSERT INTO public.account_access(user_id, pending_approval, email, full_name)
  VALUES (NEW.id, true, coalesce(NEW.email,''), left(coalesce(NEW.raw_user_meta_data->>'name',''),200))
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION public.account_is_enabled() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT auth.uid() IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.account_access WHERE user_id = auth.uid() AND (disabled_at IS NOT NULL OR pending_approval))
$$;

CREATE POLICY "Records staff read account access" ON public.account_access FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'records') OR public.has_role(auth.uid(), 'admin'));

ALTER TABLE public.verification_requests DROP CONSTRAINT IF EXISTS verification_requests_item_type_check;
ALTER TABLE public.verification_requests ADD CONSTRAINT verification_requests_item_type_check CHECK (item_type IN ('skill','project','academic','achievement','certificate','result','hackathon'));

CREATE POLICY "Records read all requests" ON public.verification_requests FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'records'));
CREATE POLICY "Records review requests" ON public.verification_requests FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'records'))
  WITH CHECK (public.has_role(auth.uid(), 'records') AND reviewer_id = auth.uid() AND student_id <> auth.uid());
DROP POLICY "Students withdraw own requests" ON public.verification_requests;
CREATE POLICY "Students withdraw own unverified requests" ON public.verification_requests FOR DELETE TO authenticated USING (student_id = auth.uid() AND status <> 'approved');

CREATE OR REPLACE FUNCTION public.protect_verified_profile_items() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r record; k text; o jsonb; n jsonb;
BEGIN
  FOR r IN SELECT item_type, item_id FROM public.verification_requests WHERE student_id = NEW.id AND status = 'approved' LOOP
    k := CASE r.item_type WHEN 'skill' THEN 'skills' WHEN 'project' THEN 'projects' WHEN 'academic' THEN 'academic'
      WHEN 'achievement' THEN 'achievements' WHEN 'hackathon' THEN 'achievements' WHEN 'certificate' THEN 'certificates' WHEN 'result' THEN 'results' END;
    SELECT e INTO o FROM jsonb_array_elements(coalesce(OLD.data->k,'[]'::jsonb)) e WHERE e->>'id' = r.item_id LIMIT 1;
    SELECT e INTO n FROM jsonb_array_elements(coalesce(NEW.data->k,'[]'::jsonb)) e WHERE e->>'id' = r.item_id LIMIT 1;
    IF o IS NOT NULL AND (n IS NULL OR n <> o) THEN
      RAISE EXCEPTION 'Verified items cannot be edited or removed';
    END IF;
  END LOOP;
  RETURN NEW;
END $$;
CREATE TRIGGER profile_verified_items_guard BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.protect_verified_profile_items();

CREATE TABLE public.records_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL,
  student_name text NOT NULL DEFAULT '',
  kind text NOT NULL CHECK (kind IN ('transcript','reference')),
  alumni boolean NOT NULL DEFAULT false,
  routed_to text NOT NULL DEFAULT 'records' CHECK (routed_to IN ('records','lecturer')),
  recipient_name text NOT NULL DEFAULT '',
  recipient_email text NOT NULL DEFAULT '',
  purpose text NOT NULL DEFAULT '',
  token_hash text,
  code_hash text,
  expires_at timestamptz,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','fulfilled','declined')),
  response text,
  responded_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.records_requests TO authenticated;
GRANT ALL ON public.records_requests TO service_role;
ALTER TABLE public.records_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Students read own records requests" ON public.records_requests FOR SELECT TO authenticated USING (student_id = auth.uid() AND public.account_is_enabled());
CREATE POLICY "Records read all records requests" ON public.records_requests FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'records'));