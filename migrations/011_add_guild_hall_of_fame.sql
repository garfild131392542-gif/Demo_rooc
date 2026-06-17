-- Add Hall of Fame manual selections to guilds table
ALTER TABLE public.guilds
ADD COLUMN IF NOT EXISTS hall_of_fame_gold_uid UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS hall_of_fame_silver_uid UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS hall_of_fame_bronze_uid UUID REFERENCES public.profiles(id) ON DELETE SET NULL;
