CREATE TABLE public.cash_closings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_id uuid NOT NULL REFERENCES public.salons(id),
  date date NOT NULL,
  expected integer NOT NULL DEFAULT 0,
  counted integer NOT NULL DEFAULT 0,
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (salon_id, date)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cash_closings TO anon, authenticated;
GRANT ALL ON public.cash_closings TO service_role;
ALTER TABLE public.cash_closings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cash_closings open" ON public.cash_closings FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);