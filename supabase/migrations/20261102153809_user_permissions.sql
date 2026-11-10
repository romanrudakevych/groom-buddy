CREATE TABLE public.user_permissions (
  user_id uuid NOT NULL,
  permission text NOT NULL,
  allowed boolean NOT NULL DEFAULT false,
  PRIMARY KEY (user_id, permission)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_permissions TO authenticated;
GRANT ALL ON public.user_permissions TO service_role;
ALTER TABLE public.user_permissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "uperms own or owner read" ON public.user_permissions FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'owner'));
CREATE POLICY "uperms owner write" ON public.user_permissions FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'owner') AND user_id <> auth.uid())
  WITH CHECK (public.has_role(auth.uid(), 'owner') AND user_id <> auth.uid());

INSERT INTO public.user_permissions (user_id, permission, allowed)
SELECT ur.user_id, rp.permission, rp.allowed FROM public.user_roles ur
JOIN public.role_permissions rp ON rp.role = ur.role
WHERE ur.role <> 'owner'
ON CONFLICT DO NOTHING;

CREATE OR REPLACE FUNCTION public.has_permission(_user_id uuid, _permission text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role(_user_id, 'owner') OR COALESCE(
    (SELECT up.allowed FROM public.user_permissions up WHERE up.user_id = _user_id AND up.permission = _permission),
    EXISTS (SELECT 1 FROM public.user_roles ur JOIN public.role_permissions rp ON rp.role = ur.role
      WHERE ur.user_id = _user_id AND rp.permission = _permission AND rp.allowed))
$$;

COMMENT ON TABLE public.role_permissions IS 'Role defaults for new users; personal overrides live in user_permissions';