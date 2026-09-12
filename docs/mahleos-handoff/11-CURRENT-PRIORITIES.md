# Aktuelle Prioritaeten

## Aktuell in Arbeit

### P1 - NLZ Pilot Readiness abschliessen

- Status: `CONFIRMED_FROM_CODE` aktiver Branch und neueste Commits.
- Nutzerproblem: Mannschaftspilot braucht run-spezifische, privacy-sichere und belastbare Daten.
- Offen: mehrtaegiger Zeitlauf, echter iPhone/TestFlight-Test, Production-Freigabe.
- Definition of Done: Readiness-Gates bestanden, keine Privacy-/Integritaetsfehler, kontrollierter Rollout.

### P2 - Programmsprache neu uebersetzen

- Status: `CONFIRMED_FROM_CHAT`; Sprachstandard ist `CONFIRMED_FROM_CODE` bereits vorhanden.
- Nutzerproblem: Athleten ohne Mentaltraining-Vorwissen verstehen abstrakte Kurztexte nicht.
- Vorgehen: Architektur auditieren, Tage 1-7 konsistent ueber Science Bite, Task, Review und Reflexion ueberarbeiten, mobil testen, dann weiter bis Tag 56.
- Definition of Done: Ein 16-jaehriger Athlet versteht Situation, Handlung und Nutzen nach einmaligem Lesen; Mechanik bleibt gleich.

## Als Naechstes

- Production-Deployment der NLZ-Migrationen nur nach ausdruecklicher Freigabe.
- TestFlight-/App-Store-Gates, Privacy Manifest, echte Geraetetests.
- Account-Loeschprozess und Consent-Widerruf Ende-zu-Ende absichern.
- Performance-Profiling des grossen Bundles auf echten iPhones.

## Wichtig, aber spaeter

- Native APNs/Capacitor Push.
- Forschungsgerechteres Studiendesign oder Vergleichsgruppe.
- skalierte Vereins-/NLZ-Dossiers nach echten Pilotdaten.
- lokale/integrierte KI nur, wenn klarer Produktnutzen, Datenschutz und Wissensbasis belegt sind.
- Payments; aktuell nicht implementiert und nicht launchkritisch belegt.

## Bewusst nicht jetzt

- grosse neue Athletenfrageboegen.
- Persoenlichkeits-, Ego- oder Diagnosescores.
- ungepruefte Wearable-/Brain-Tracking-Features.
- komplette Neuarchitektur oder unnötiger Frameworkwechsel.
- Massenrollout vor kontrolliertem Pilot und Geraetetests.

## Konflikt

`CONFLICT`: Der Branch zeigt P1 als laufende technische Arbeit; der juengste alte Chat nennt P2 als naechsten grossen Qualitaetsblock. Mahle muss nur die unmittelbare Reihenfolge bestaetigen, nicht die Gueltigkeit beider Prioritaeten.
