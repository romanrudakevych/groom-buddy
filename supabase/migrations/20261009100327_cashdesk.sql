ALTER TABLE public.appointments ADD COLUMN paid_by_card boolean NOT NULL DEFAULT false;
CREATE TABLE public.cash_operations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_id uuid NOT NULL REFERENCES public.salons(id),
  type text NOT NULL DEFAULT 'Vklad',
  amount integer NOT NULL DEFAULT 0,
  date date NOT NULL DEFAULT CURRENT_DATE,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cash_operations TO anon, authenticated;
GRANT ALL ON public.cash_operations TO service_role;
ALTER TABLE public.cash_operations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cash_operations open" ON public.cash_operations FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);