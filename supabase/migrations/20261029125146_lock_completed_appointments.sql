CREATE OR REPLACE FUNCTION public.lock_completed_appointment()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF OLD.status = 'Dokončeno' AND (
    NEW.dog_id IS DISTINCT FROM OLD.dog_id OR NEW.groomer_id IS DISTINCT FROM OLD.groomer_id OR
    NEW.date IS DISTINCT FROM OLD.date OR NEW.time IS DISTINCT FROM OLD.time OR
    NEW.status IS DISTINCT FROM OLD.status OR NEW.price IS DISTINCT FROM OLD.price OR
    NEW.planned_duration IS DISTINCT FROM OLD.planned_duration OR
    NEW.actual_duration IS DISTINCT FROM OLD.actual_duration OR
    NEW.behavior_during_visit IS DISTINCT FROM OLD.behavior_during_visit OR
    NEW.paid_by_card IS DISTINCT FROM OLD.paid_by_card
  ) THEN
    RAISE EXCEPTION 'Completed visit is locked: only notes can be changed';
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER appointments_lock_completed BEFORE UPDATE ON public.appointments
FOR EACH ROW EXECUTE FUNCTION public.lock_completed_appointment();

CREATE OR REPLACE FUNCTION public.lock_completed_appointment_services()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM appointments WHERE id = NEW.appointment_id AND status = 'Dokončeno') THEN
    RAISE EXCEPTION 'Completed visit is locked: services cannot be changed';
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER appointment_services_lock_completed BEFORE INSERT ON public.appointment_services
FOR EACH ROW EXECUTE FUNCTION public.lock_completed_appointment_services();