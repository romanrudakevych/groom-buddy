ALTER TABLE public.dogs ADD COLUMN IF NOT EXISTS is_healthy boolean NOT NULL DEFAULT true;
ALTER TABLE public.dogs ADD COLUMN IF NOT EXISTS brushes_teeth boolean NOT NULL DEFAULT false;
ALTER TABLE public.dogs ADD COLUMN IF NOT EXISTS toothbrush_number text;
ALTER TABLE public.dogs ADD COLUMN IF NOT EXISTS extra_notes text[] NOT NULL DEFAULT '{}'::text[];
UPDATE public.dogs SET is_healthy = false WHERE health_status IS NOT NULL AND btrim(health_status) <> '' AND lower(btrim(health_status)) NOT IN ('zdravý','zdravá','zdravy','zdrava','здоров','здорова','ok','bez problémů');
COMMENT ON COLUMN public.dogs.coat_status IS 'DEPRECATED: hidden from the dog card';
COMMENT ON COLUMN public.dogs.health_status IS 'Health note, used only when is_healthy = false';