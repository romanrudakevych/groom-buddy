ALTER TABLE public.services ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 100;

UPDATE public.services SET sort_order = CASE name
  WHEN 'Kompletní péče' THEN 1
  WHEN 'Stříhání drápků' THEN 2
  WHEN 'Čištění zubů' THEN 3
  WHEN 'Parfém' THEN 4
  WHEN 'Asistence' THEN 5
  WHEN 'Čištění uší' THEN 6
  WHEN 'Hydratační a zklidňující maska' THEN 7
  WHEN 'Koupání a fénování' THEN 8
  WHEN 'Maska proti línání' THEN 9
  WHEN 'Odstranění klíštěte' THEN 10
  WHEN 'Ošetření proti blechám' THEN 11
  WHEN 'Stříhání a trimování' THEN 12
  WHEN 'Stříhání srsti mezi polštářky' THEN 13
  WHEN 'Stripping' THEN 14
  WHEN 'Vyčesávání dredů' THEN 15
  WHEN 'Vyčesávání srsti' THEN 16
  WHEN 'Vyholení tlapek' THEN 17
  WHEN 'Vyživující a hydratační maska' THEN 18
  ELSE 100
END;