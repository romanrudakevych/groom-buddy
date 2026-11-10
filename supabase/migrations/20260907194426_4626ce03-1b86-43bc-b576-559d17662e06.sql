CREATE TABLE public.message_templates (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  language text NOT NULL DEFAULT 'CZE',
  type text NOT NULL DEFAULT 'Připomínka zítřejší návštěvy',
  title text NOT NULL,
  body text NOT NULL DEFAULT '',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.message_templates TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.message_templates TO authenticated;
GRANT ALL ON public.message_templates TO service_role;

ALTER TABLE public.message_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "message_templates open" ON public.message_templates FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.update_updated_at_column() RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_message_templates_updated_at BEFORE UPDATE ON public.message_templates
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.message_templates (language, type, title, body) VALUES
('CZE','Připomínka zítřejší návštěvy','Připomínka – zítřejší návštěva','Dobrý den, připomínáme zítřejší návštěvu {pes} v {cas} v salonu {salon}. Těšíme se na vás! Pokud vám termín nevyhovuje, dejte nám prosím vědět.'),
('CZE','Pes je připraven k vyzvednutí','Pes je hotový','Dobrý den, {pes} je hotový a připravený k vyzvednutí. Těšíme se na vás v salonu {salon}.'),
('CZE','Potvrzení rezervace','Potvrzení rezervace','Dobrý den, potvrzujeme rezervaci pro {pes} na {datum} v {cas}, salon {salon}. Celková cena je {cena}.'),
('CZE','Následná péče / poděkování','Děkujeme za návštěvu','Dobrý den, děkujeme za dnešní návštěvu. {pes} byl skvělý! Doporučujeme další návštěvu za 6–8 týdnů.'),
('CZE','Nedostavil se','Nedostavení se na termín','Dobrý den, dnes jsme vás s {pes} bohužel nezastihli na rezervovaném termínu. Chcete si zarezervovat nový?'),
('ENG','Připomínka zítřejší návštěvy','Reminder – tomorrow''s appointment','Hello, this is a reminder of tomorrow''s appointment for {pes} at {cas} in our {salon} salon. See you soon! Let us know if the time does not suit you.'),
('ENG','Pes je připraven k vyzvednutí','Ready for pick-up','Hello, {pes} is all done and ready for pick-up at our {salon} salon. See you soon!'),
('ENG','Potvrzení rezervace','Booking confirmation','Hello, your booking for {pes} on {datum} at {cas} in the {salon} salon is confirmed. Total price: {cena}.'),
('ENG','Následná péče / poděkování','Thank you for your visit','Hello, thank you for visiting us today. {pes} was wonderful! We recommend the next grooming in 6–8 weeks.'),
('RUS','Připomínka zítřejší návštěvy','Напоминание – запись на завтра','Здравствуйте! Напоминаем о завтрашней записи для {pes} в {cas}, салон {salon}. Если время не подходит, сообщите нам.'),
('RUS','Pes je připraven k vyzvednutí','Собака готова','Здравствуйте! {pes} готов, можно забирать. Ждём вас в салоне {salon}.'),
('RUS','Potvrzení rezervace','Подтверждение записи','Здравствуйте! Подтверждаем запись для {pes} на {datum} в {cas}, салон {salon}. Стоимость: {cena}.'),
('RUS','Následná péče / poděkování','Спасибо за визит','Здравствуйте! Спасибо за сегодняшний визит. {pes} вёл себя отлично! Рекомендуем следующую стрижку через 6–8 недель.'),
('UKR','Připomínka zítřejší návštěvy','Нагадування – запис на завтра','Добрий день! Нагадуємо про завтрашній запис для {pes} на {cas}, салон {salon}. Якщо час не підходить, повідомте нас.'),
('UKR','Pes je připraven k vyzvednutí','Собака готова','Добрий день! {pes} готовий, можна забирати. Чекаємо на вас у салоні {salon}.'),
('UKR','Potvrzení rezervace','Підтвердження запису','Добрий день! Підтверджуємо запис для {pes} на {datum} о {cas}, салон {salon}. Вартість: {cena}.'),
('UKR','Následná péče / poděkování','Дякуємо за візит','Добрий день! Дякуємо за сьогоднішній візит. {pes} був чудовий! Рекомендуємо наступну стрижку через 6–8 тижнів.');