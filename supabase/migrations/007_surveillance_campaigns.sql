-- VitaWeave 007 - Campaign publish fields + surveillance helpers
ALTER TABLE public.campaigns ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ;
ALTER TABLE public.campaigns ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES public.profiles(id);
ALTER TABLE public.campaigns ADD COLUMN IF NOT EXISTS ward TEXT;
ALTER TABLE public.community_alerts ADD COLUMN IF NOT EXISTS ward TEXT;
ALTER TABLE public.community_alerts ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'manual';
