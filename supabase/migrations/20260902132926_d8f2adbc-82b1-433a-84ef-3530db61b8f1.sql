-- SCHEMA
CREATE TABLE public.salons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.salons TO anon, authenticated;
GRANT ALL ON public.salons TO service_role;
ALTER TABLE public.salons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "salons open" ON public.salons FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  phone text,
  email text,
  instagram text,
  language text NOT NULL DEFAULT 'CZE' CHECK (language IN ('ENG','RUS','UKR','CZE')),
  preferred_contact text NOT NULL DEFAULT 'Phone' CHECK (preferred_contact IN ('SMS','Phone','Email','WhatsApp','Instagram')),
  preferred_salon_id uuid REFERENCES public.salons(id) ON DELETE SET NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.clients TO anon, authenticated;
GRANT ALL ON public.clients TO service_role;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "clients open" ON public.clients FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.dogs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  breed text,
  size text NOT NULL DEFAULT 'Střední' CHECK (size IN ('Malý','Střední','Velký','Obří')),
  coat text NOT NULL DEFAULT 'Krátká' CHECK (coat IN ('Krátká','Dlouhá','Dvojitá','Kudrnatá','Drátovitá')),
  behavior text NOT NULL DEFAULT 'Klidný' CHECK (behavior IN ('Klidný','Hravý','Úzkostný','Agresivní','Potřebuje přestávky')),
  age integer,
  sex text CHECK (sex IN ('Samec','Samice')),
  health_status text,
  coat_status text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.dogs TO anon, authenticated;
GRANT ALL ON public.dogs TO service_role;
ALTER TABLE public.dogs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "dogs open" ON public.dogs FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.client_dogs (
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  dog_id uuid NOT NULL REFERENCES public.dogs(id) ON DELETE CASCADE,
  PRIMARY KEY (client_id, dog_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.client_dogs TO anon, authenticated;
GRANT ALL ON public.client_dogs TO service_role;
ALTER TABLE public.client_dogs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "client_dogs open" ON public.client_dogs FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.groomers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  phone text,
  specialties text[] NOT NULL DEFAULT '{}',
  salon_id uuid NOT NULL REFERENCES public.salons(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.groomers TO anon, authenticated;
GRANT ALL ON public.groomers TO service_role;
ALTER TABLE public.groomers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "groomers open" ON public.groomers FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category text,
  duration_minutes integer NOT NULL DEFAULT 30,
  price integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.services TO anon, authenticated;
GRANT ALL ON public.services TO service_role;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
CREATE POLICY "services open" ON public.services FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dog_id uuid NOT NULL REFERENCES public.dogs(id) ON DELETE CASCADE,
  groomer_id uuid NOT NULL REFERENCES public.groomers(id) ON DELETE CASCADE,
  date date NOT NULL,
  time time NOT NULL,
  planned_duration integer NOT NULL DEFAULT 0,
  price integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'Naplánováno' CHECK (status IN ('Naplánováno','Dokončeno','Zrušeno','Nedostavil se')),
  actual_duration integer,
  behavior_during_visit text CHECK (behavior_during_visit IN ('Klidný','Hravý','Úzkostný','Agresivní','Potřebuje přestávky')),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.appointments TO anon, authenticated;
GRANT ALL ON public.appointments TO service_role;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "appointments open" ON public.appointments FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.appointment_services (
  appointment_id uuid NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
  service_id uuid NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  PRIMARY KEY (appointment_id, service_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.appointment_services TO anon, authenticated;
GRANT ALL ON public.appointment_services TO service_role;
ALTER TABLE public.appointment_services ENABLE ROW LEVEL SECURITY;
CREATE POLICY "appointment_services open" ON public.appointment_services FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.shifts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  groomer_id uuid NOT NULL REFERENCES public.groomers(id) ON DELETE CASCADE,
  week_start date NOT NULL,
  day_of_week integer NOT NULL CHECK (day_of_week BETWEEN 1 AND 7),
  value text NOT NULL DEFAULT 'Volno',
  UNIQUE (groomer_id, week_start, day_of_week)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.shifts TO anon, authenticated;
GRANT ALL ON public.shifts TO service_role;
ALTER TABLE public.shifts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "shifts open" ON public.shifts FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- SEED
INSERT INTO public.salons (name) VALUES ('Sokolovská'), ('Tuklatská');

INSERT INTO public.services (name, category, duration_minutes, price) VALUES
 ('Stříhání a trimování','Střih',90,890),
 ('Koupání a fénování','Hygiena',45,450),
 ('Stripping','Střih',60,690),
 ('Vyčesávání srsti','Péče o srst',40,400),
 ('Stříhání drápků','Hygiena',15,150),
 ('Čištění uší','Hygiena',15,150),
 ('Kompletní péče','Komplet',120,1200);
