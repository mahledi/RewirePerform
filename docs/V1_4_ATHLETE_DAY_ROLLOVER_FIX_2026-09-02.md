# V1.4 Athlete Day Rollover Fix — 2026-09-02

## Problem und Root Cause

Am 2. September zeigte ein realer Team-Athlet nach lokaler Mitternacht noch
Dienstag, den 1. September und Programmtag 1. Der Coach-Run war bereits auf
Programmtag 2.

Die beiden Oberflächen verwendeten unterschiedliche Kalenderuhren:

- `public.get_effective_today(uuid)` gab für reale Athleten `CURRENT_DATE`
  zurück. Die Production-Datenbanksession läuft in UTC.
- Run-spezifische Coach-RPCs berechneten das Datum bereits in der am
  `program_run` gespeicherten Zeitzone.
- In Europe/Berlin blieb der Athletenpfad dadurch nach lokaler Mitternacht bis
  01:00 Uhr im Winter beziehungsweise 02:00 Uhr im Sommer am Vortag.
- Der Client-Fallback verwendete ebenfalls die UTC-Datumskomponente aus
  `toISOString()` und durfte einen gerade vor Mitternacht geladenen Wert bis zu
  60 Sekunden cachen.
- Das gemountete Dashboard löste bei Focus nur seine Statusabfragen mit dem
  bereits gespeicherten `effectiveToday` erneut aus; es fragte das maßgebliche
  Datum selbst nicht erneut ab.

## Enger Fixvertrag

1. `get_effective_today` behält Self-/Admin-Guard, `SECURITY DEFINER`,
   `search_path` sowie Grants/Revoke unverändert bei.
2. User- und danach Team-QA-Override behalten ihre bestehende Priorität.
3. Ohne Override wird die Zeitzone des aktiven `program_run` über die aktive
   `program_instance` verwendet.
4. Die Zeitzone wird gegen `pg_timezone_names` validiert. Fehlende oder
   ungültige Werte sowie Solo-Instanzen fallen auf `Europe/Berlin` zurück.
5. Der Client-Fallback berechnet ein Kalenderdatum in `Europe/Berlin` und
   invalidiert seinen Cache zwingend am dortigen Tageswechsel.
6. Ein sichtbares Dashboard löst das Datum über einen DST-sicheren Timer am
   nächsten Europe/Berlin-Kalendertageswechsel sowie bei Window-Focus und
   sichtbarer `visibilitychange` erneut auf. Nach jedem Timerlauf wird die
   nächste reale Mitternacht neu berechnet; 23-/25-Stunden-Tage werden nicht als
   starre 24 Stunden behandelt. Bei einem neuen Tag werden Check-in, Journal,
   Messstatus, Fortschritt und verpasste Tage gemeinsam im Hintergrund
   aktualisiert; die Route wird nicht neu geladen.
7. Ein offener Daily-Flow blockiert den UI-Rollover bis zum Schließen. Sein
   lokaler datumsgebundener Entwurf wird weder zurückgesetzt noch auf einen
   anderen Tag umgehängt.
8. Das Day-Assignment bleibt lazy. Nach dem Rollover erhält der Daily-Flow beim
   Öffnen das neue Datum und `ensureAssignment` legt idempotent das Assignment
   für den neuen Programmtag an.

## Release-Grenze

Der Stand ist ausschließlich lokal vorbereitet. Diese Dokumentation ist kein
Beleg für Migration, Deployment, Production-Aktivierung, Geräteprüfung oder
Store-Release.

## Separates offenes V1.4-To-do

`OPEN / NOT IMPLEMENTED`: Web-Push-Zeitpläne brauchen einen eigenen
DST-Stabilitätsvertrag. Eine lokal konfigurierte Erinnerung um 07:30 Uhr muss
auch nach Sommer-/Winterzeitwechsel lokal 07:30 Uhr bleiben. Dieser Punkt ist
nicht Bestandteil des Athleten-Dashboard-Rollover-Fixes.
