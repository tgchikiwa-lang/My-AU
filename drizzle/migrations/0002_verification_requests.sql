CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE TABLE public.verification_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL DEFAULT auth.uid(),
  student_name text NOT NULL DEFAULT '',
  item_type text NOT NULL CHECK (item_type IN ('skill','project','academic','achievement','certificate')),
  item_id text NOT NULL,
  item_summary text NOT NULL CHECK (char_length(item_summary) <= 500),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  reviewer_id uuid,
  reviewer_note text CHECK (char_length(reviewer_note) <= 500),
  created_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz,
  UNIQUE (student_id, item_type, item_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.verification_requests TO authenticated;
GRANT ALL ON public.verification_requests TO service_role;
ALTER TABLE public.verification_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enabled accounts only" ON public.verification_requests AS RESTRICTIVE FOR ALL TO authenticated
  USING (public.account_is_enabled()) WITH CHECK (public.account_is_enabled());
CREATE POLICY "Students read own requests" ON public.verification_requests FOR SELECT TO authenticated USING (student_id = auth.uid());
CREATE POLICY "Students create pending requests" ON public.verification_requests FOR INSERT TO authenticated
  WITH CHECK (student_id = auth.uid() AND status = 'pending' AND reviewer_id IS NULL AND reviewed_at IS NULL AND reviewer_note IS NULL);
CREATE POLICY "Students withdraw own requests" ON public.verification_requests FOR DELETE TO authenticated USING (student_id = auth.uid());
CREATE POLICY "Lecturers read all requests" ON public.verification_requests FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'lecturer'));
CREATE POLICY "Lecturers review requests" ON public.verification_requests FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'lecturer'))
  WITH CHECK (public.has_role(auth.uid(), 'lecturer') AND reviewer_id = auth.uid() AND student_id <> auth.uid());

CREATE OR REPLACE FUNCTION public.protect_verification_fields() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.student_id <> OLD.student_id OR NEW.item_type <> OLD.item_type OR NEW.item_id <> OLD.item_id
     OR NEW.item_summary <> OLD.item_summary OR NEW.student_name <> OLD.student_name OR NEW.created_at <> OLD.created_at THEN
    RAISE EXCEPTION 'Only review fields can change';
  END IF;
  NEW.reviewed_at := now();
  RETURN NEW;
END $$;
CREATE TRIGGER verification_review_guard BEFORE UPDATE ON public.verification_requests FOR EACH ROW EXECUTE FUNCTION public.protect_verification_fields();