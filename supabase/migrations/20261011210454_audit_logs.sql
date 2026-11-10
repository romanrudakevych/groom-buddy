CREATE TABLE public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  actor_id uuid,
  actor_name text NOT NULL DEFAULT 'Администратор',
  entity_type text NOT NULL,
  entity_id uuid,
  action text NOT NULL,
  description text NOT NULL DEFAULT '',
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  salon_id uuid
);
CREATE INDEX audit_logs_created_idx ON public.audit_logs (created_at DESC);
GRANT SELECT ON public.audit_logs TO anon, authenticated;
GRANT ALL ON public.audit_logs TO service_role;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "audit_logs read" ON public.audit_logs FOR SELECT TO anon, authenticated USING (true);

CREATE OR REPLACE FUNCTION public.log_appointment_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  r record; v_dog text; v_groomer text; v_salon uuid; v_action text; v_desc text; v_details jsonb;
BEGIN
  IF TG_OP = 'DELETE' THEN r := OLD; ELSE r := NEW; END IF;
  SELECT name INTO v_dog FROM dogs WHERE id = r.dog_id;
  SELECT name, salon_id INTO v_groomer, v_salon FROM groomers WHERE id = r.groomer_id;
  v_details := jsonb_build_object('dog', v_dog, 'groomer', v_groomer, 'date', r.date, 'time', to_char(r.time,'HH24:MI'), 'status', r.status, 'price', r.price);
  IF TG_OP = 'INSERT' THEN
    v_action := 'create';
  ELSIF TG_OP = 'DELETE' THEN
    v_action := 'delete';
  ELSE
    IF OLD.date IS DISTINCT FROM NEW.date OR OLD.time IS DISTINCT FROM NEW.time OR OLD.groomer_id IS DISTINCT FROM NEW.groomer_id THEN
      v_action := 'reschedule';
      v_details := v_details || jsonb_build_object('old_date', OLD.date, 'old_time', to_char(OLD.time,'HH24:MI'), 'old_groomer', (SELECT name FROM groomers WHERE id = OLD.groomer_id));
    ELSIF OLD.status IS DISTINCT FROM NEW.status THEN
      v_action := 'status_change';
      v_details := v_details || jsonb_build_object('old_status', OLD.status);
    ELSIF OLD.paid_by_card IS DISTINCT FROM NEW.paid_by_card THEN
      v_action := 'payment_change';
      v_details := v_details || jsonb_build_object('paid_by_card', NEW.paid_by_card);
    ELSE
      v_action := 'update';
    END IF;
  END IF;
  v_desc := coalesce(v_dog,'?') || ' · ' || coalesce(v_groomer,'?') || ' · ' || to_char(r.date,'DD.MM.YYYY') || ' ' || to_char(r.time,'HH24:MI');
  INSERT INTO audit_logs(entity_type, entity_id, action, description, details, salon_id)
  VALUES ('appointment', r.id, v_action, v_desc, v_details, v_salon);
  RETURN NULL;
END $$;

CREATE TRIGGER appointments_audit AFTER INSERT OR UPDATE OR DELETE ON public.appointments
FOR EACH ROW EXECUTE FUNCTION public.log_appointment_change();

CREATE OR REPLACE FUNCTION public.log_cash_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r record; v_action text;
BEGIN
  IF TG_OP = 'DELETE' THEN r := OLD; v_action := 'delete';
  ELSIF TG_OP = 'INSERT' THEN r := NEW; v_action := 'create';
  ELSE r := NEW; v_action := 'update'; END IF;
  INSERT INTO audit_logs(entity_type, entity_id, action, description, details, salon_id)
  VALUES ('cash', r.id, v_action, r.type || ' ' || r.amount || ' Kč' || coalesce(' · ' || r.note, ''),
    jsonb_build_object('type', r.type, 'amount', r.amount, 'date', r.date, 'note', r.note), r.salon_id);
  RETURN NULL;
END $$;

CREATE TRIGGER cash_operations_audit AFTER INSERT OR UPDATE OR DELETE ON public.cash_operations
FOR EACH ROW EXECUTE FUNCTION public.log_cash_change();