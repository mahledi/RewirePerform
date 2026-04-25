-- Neue Spalte für Spielerposition
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS position TEXT NULL;

-- Backfill: alte "team"-Werte als Position übernehmen, falls position noch leer ist
UPDATE public.profiles
SET position = team
WHERE position IS NULL AND team IS NOT NULL AND team <> '';
