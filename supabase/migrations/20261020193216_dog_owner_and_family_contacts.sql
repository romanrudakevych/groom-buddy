ALTER TABLE public.dogs ADD COLUMN owner_id uuid REFERENCES public.clients(id) ON DELETE SET NULL;
UPDATE public.dogs d SET owner_id = (SELECT cd.client_id FROM public.client_dogs cd JOIN public.clients c ON c.id = cd.client_id WHERE cd.dog_id = d.id ORDER BY c.created_at, c.id LIMIT 1);
CREATE INDEX dogs_owner_id_idx ON public.dogs(owner_id);
ALTER TABLE public.clients ADD COLUMN additional_contacts jsonb NOT NULL DEFAULT '[]'::jsonb;
COMMENT ON TABLE public.client_dogs IS 'DEPRECATED: replaced by dogs.owner_id';