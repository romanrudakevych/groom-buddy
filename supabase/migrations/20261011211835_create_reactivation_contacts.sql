CREATE TABLE public.reactivation_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dog_id uuid NOT NULL REFERENCES public.dogs(id) ON DELETE CASCADE,
  contacted_at date NOT NULL DEFAULT CURRENT_DATE,
  result text NOT NULL DEFAULT 'Kontaktován',
  reason text,
  note text,
  remind_on date,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reactivation_contacts TO anon, authenticated;
GRANT ALL ON public.reactivation_contacts TO service_role;
ALTER TABLE public.reactivation_contacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "reactivation_contacts open" ON public.reactivation_contacts FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);