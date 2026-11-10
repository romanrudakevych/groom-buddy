ALTER TABLE public.groomers ADD COLUMN color text;
WITH ranked AS (SELECT id, (row_number() OVER (ORDER BY created_at, id) - 1) % 8 AS n FROM public.groomers)
UPDATE public.groomers g SET color = (ARRAY['#0d9488','#7c3aed','#d97706','#059669','#e11d48','#4f46e5','#0284c7','#c026d3'])[ranked.n + 1]
FROM ranked WHERE ranked.id = g.id;