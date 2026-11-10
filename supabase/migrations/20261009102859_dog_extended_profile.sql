ALTER TABLE public.dogs
  ADD COLUMN photo_url text,
  ADD COLUMN height numeric,
  ADD COLUMN weight numeric(5,1),
  ADD COLUMN pinned_groomer_id uuid REFERENCES public.groomers(id) ON DELETE SET NULL,
  ADD COLUMN grooming_instructions text,
  ADD COLUMN preferred_additional_services uuid[] NOT NULL DEFAULT '{}';