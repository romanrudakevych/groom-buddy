CREATE TYPE public.app_role AS ENUM ('owner', 'admin', 'groomer');

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text,
  full_name text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  groomer_id uuid REFERENCES public.groomers(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.is_staff(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role IN ('owner','admin'))
$$;

CREATE OR REPLACE FUNCTION public.has_any_role(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id)
$$;

CREATE OR REPLACE FUNCTION public.my_groomer_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT groomer_id FROM public.user_roles WHERE user_id = auth.uid() AND role = 'groomer' LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.groomer_can_see_dog(_dog_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.my_groomer_id() IS NOT NULL AND (
    EXISTS (SELECT 1 FROM public.dogs d WHERE d.id = _dog_id AND d.pinned_groomer_id = public.my_groomer_id())
    OR EXISTS (SELECT 1 FROM public.appointments a WHERE a.dog_id = _dog_id AND a.groomer_id = public.my_groomer_id())
  )
$$;

CREATE POLICY "profiles own or owner read" ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.has_role(auth.uid(), 'owner'));
CREATE POLICY "profiles own update" ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid()) WITH CHECK (id = auth.uid());

CREATE POLICY "roles own or owner read" ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'owner'));
CREATE POLICY "roles owner insert" ON public.user_roles FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'owner'));
CREATE POLICY "roles owner update" ON public.user_roles FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'owner')) WITH CHECK (public.has_role(auth.uid(), 'owner'));
CREATE POLICY "roles owner delete" ON public.user_roles FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'owner') AND user_id <> auth.uid());

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email))
  ON CONFLICT (id) DO NOTHING;
  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'owner') THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'owner');
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Replace open policies
DROP POLICY IF EXISTS "salons open" ON public.salons;
DROP POLICY IF EXISTS "services open" ON public.services;
DROP POLICY IF EXISTS "groomers open" ON public.groomers;
DROP POLICY IF EXISTS "shifts open" ON public.shifts;
DROP POLICY IF EXISTS "clients open" ON public.clients;
DROP POLICY IF EXISTS "client_dogs open" ON public.client_dogs;
DROP POLICY IF EXISTS "cash_operations open" ON public.cash_operations;
DROP POLICY IF EXISTS "cash_closings open" ON public.cash_closings;
DROP POLICY IF EXISTS "message_templates open" ON public.message_templates;
DROP POLICY IF EXISTS "reactivation_contacts open" ON public.reactivation_contacts;
DROP POLICY IF EXISTS "appointments open" ON public.appointments;
DROP POLICY IF EXISTS "appointment_services open" ON public.appointment_services;
DROP POLICY IF EXISTS "dogs open" ON public.dogs;
DROP POLICY IF EXISTS "audit_logs read" ON public.audit_logs;

-- Reference data: any team member reads, staff writes
CREATE POLICY "salons read" ON public.salons FOR SELECT TO authenticated USING (public.has_any_role(auth.uid()));
CREATE POLICY "salons staff write" ON public.salons FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "services read" ON public.services FOR SELECT TO authenticated USING (public.has_any_role(auth.uid()));
CREATE POLICY "services staff write" ON public.services FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "groomers read" ON public.groomers FOR SELECT TO authenticated USING (public.has_any_role(auth.uid()));
CREATE POLICY "groomers staff write" ON public.groomers FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "shifts read" ON public.shifts FOR SELECT TO authenticated USING (public.has_any_role(auth.uid()));
CREATE POLICY "shifts staff write" ON public.shifts FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

-- Staff only (groomers never see clients or money)
CREATE POLICY "clients staff" ON public.clients FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "client_dogs staff" ON public.client_dogs FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "cash_operations staff" ON public.cash_operations FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "cash_closings staff" ON public.cash_closings FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "message_templates staff" ON public.message_templates FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "reactivation_contacts staff" ON public.reactivation_contacts FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

-- Appointments
CREATE POLICY "appointments staff" ON public.appointments FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "appointments groomer read" ON public.appointments FOR SELECT TO authenticated USING (groomer_id = public.my_groomer_id());
CREATE POLICY "appointments groomer update" ON public.appointments FOR UPDATE TO authenticated USING (groomer_id = public.my_groomer_id()) WITH CHECK (groomer_id = public.my_groomer_id());
CREATE POLICY "appointment_services staff" ON public.appointment_services FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "appointment_services groomer read" ON public.appointment_services FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.appointments a WHERE a.id = appointment_id AND a.groomer_id = public.my_groomer_id()));

-- Dogs
CREATE POLICY "dogs staff" ON public.dogs FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "dogs groomer read" ON public.dogs FOR SELECT TO authenticated USING (public.groomer_can_see_dog(id));
CREATE POLICY "dogs groomer update" ON public.dogs FOR UPDATE TO authenticated USING (public.groomer_can_see_dog(id)) WITH CHECK (public.groomer_can_see_dog(id));

-- Audit logs: owner only
CREATE POLICY "audit_logs owner read" ON public.audit_logs FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'owner'));