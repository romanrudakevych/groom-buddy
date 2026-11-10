ALTER TABLE public.clients ADD COLUMN review_taken boolean NOT NULL DEFAULT false;
COMMENT ON COLUMN public.clients.review_taken IS 'We received a review/feedback from this client (Брали отзыв)';