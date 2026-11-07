BEGIN;

ALTER POLICY "Records read all records requests"
ON public.records_requests
USING (
    has_role(auth.uid(), 'records')
    OR has_role(auth.uid(), 'admin')
);

COMMIT;
