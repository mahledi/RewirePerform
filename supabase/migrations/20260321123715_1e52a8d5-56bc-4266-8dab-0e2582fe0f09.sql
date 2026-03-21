
-- Calendar events table (training, rest, competition days)
CREATE TABLE public.calendar_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id TEXT NOT NULL,
  date DATE NOT NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('training', 'rest', 'competition')),
  title TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Daily check-ins table
CREATE TABLE public.daily_checkins (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id TEXT NOT NULL,
  date DATE NOT NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('training', 'rest', 'competition')),
  mood_before INTEGER CHECK (mood_before >= 1 AND mood_before <= 10),
  energy_level INTEGER CHECK (energy_level >= 1 AND energy_level <= 10),
  focus_rating INTEGER CHECK (focus_rating >= 1 AND focus_rating <= 10),
  tasks_completed JSONB DEFAULT '[]'::jsonb,
  reflection TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(session_id, date)
);

-- Enable RLS
ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_checkins ENABLE ROW LEVEL SECURITY;

-- Allow public access for now (no auth yet)
CREATE POLICY "Allow public read calendar_events" ON public.calendar_events FOR SELECT USING (true);
CREATE POLICY "Allow public insert calendar_events" ON public.calendar_events FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update calendar_events" ON public.calendar_events FOR UPDATE USING (true);
CREATE POLICY "Allow public delete calendar_events" ON public.calendar_events FOR DELETE USING (true);

CREATE POLICY "Allow public read daily_checkins" ON public.daily_checkins FOR SELECT USING (true);
CREATE POLICY "Allow public insert daily_checkins" ON public.daily_checkins FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update daily_checkins" ON public.daily_checkins FOR UPDATE USING (true);
