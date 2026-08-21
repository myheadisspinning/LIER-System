-- Create user_preferences table for notification and privacy settings
CREATE TABLE IF NOT EXISTS public.user_preferences (
  user_id uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  urgent_broadcasts boolean NOT NULL DEFAULT true,
  case_progress boolean NOT NULL DEFAULT true,
  announcements boolean NOT NULL DEFAULT false,
  siren_alerts boolean NOT NULL DEFAULT true,
  gps_access boolean NOT NULL DEFAULT true,
  anonymous_reporting boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "owner read own preferences" ON public.user_preferences
    FOR SELECT USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "owner insert own preferences" ON public.user_preferences
    FOR INSERT WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "owner update own preferences" ON public.user_preferences
    FOR UPDATE USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
