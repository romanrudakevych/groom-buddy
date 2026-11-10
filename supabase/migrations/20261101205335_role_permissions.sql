CREATE TABLE public.role_permissions (
  role public.app_role NOT NULL,
  permission text NOT NULL,
  allowed boolean NOT NULL DEFAULT false,
  PRIMARY KEY (role, permission)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.role_permissions TO authenticated;
GRANT ALL ON public.role_permissions TO service_role;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "perms staff read" ON public.role_permissions FOR SELECT TO authenticated USING (public.has_any_role(auth.uid()));
CREATE POLICY "perms owner insert" ON public.role_permissions FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'owner') AND role <> 'owner');
CREATE POLICY "perms owner update" ON public.role_permissions FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'owner') AND role <> 'owner') WITH CHECK (public.has_role(auth.uid(), 'owner') AND role <> 'owner');

INSERT INTO public.role_permissions (role, permission, allowed) VALUES
('admin','calendar_all',true),('admin','appointments_create',true),('admin','appointments_delete',true),('admin','client_contacts',true),('admin','dogs_edit',true),('admin','cash_daily',true),('admin','cash_page',false),('admin','reports',false),('admin','logs',false),
('groomer','calendar_all',false),('groomer','appointments_create',false),('groomer','appointments_delete',false),('groomer','client_contacts',false),('groomer','dogs_edit',true),('groomer','cash_daily',false),('groomer','cash_page',false),('groomer','reports',false),('groomer','logs',false);

CREATE OR REPLACE FUNCTION public.has_permission(_user_id uuid, _permission text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role(_user_id, 'owner') OR EXISTS (
    SELECT 1 FROM public.user_roles ur JOIN public.role_permissions rp ON rp.role = ur.role
    WHERE ur.user_id = _user_id AND rp.permission = _permission AND rp.allowed)
$$;