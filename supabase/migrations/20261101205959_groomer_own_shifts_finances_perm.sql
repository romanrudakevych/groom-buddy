CREATE POLICY "shifts groomer own write" ON public.shifts FOR ALL TO authenticated
  USING (groomer_id = public.my_groomer_id()) WITH CHECK (groomer_id = public.my_groomer_id());
INSERT INTO public.role_permissions (role, permission, allowed)
  VALUES ('admin', 'groomer_finances', true), ('groomer', 'groomer_finances', false)
  ON CONFLICT (role, permission) DO NOTHING;