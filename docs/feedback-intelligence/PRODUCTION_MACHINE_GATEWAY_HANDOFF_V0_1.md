# Feedback Intelligence Production Gateway V0.1

Stand: 11. August 2026

Status: lokal vorbereitet, nicht aktiviert, nicht deployed und ohne
Credentials oder echten Datenread.

## Ziel

Der reale Deutschland-Pfad hat einen eigenen Endpoint, Reader, Secret-Namespace
und eine eigene nicht exponierte RPC-Schema-Grenze. Replay-/Rate-Limit-Tabellen
bleiben bewusst gemeinsam, sind aber durch unterschiedliche Client-IDs
getrennt. Ein Staging-Key, eine Staging-Datenbank-URL oder der Staging-Endpoint
kann den Production-Pfad nicht autorisieren.

## Lokaler Umfang

- eigener Endpoint `mahleos-feedback-intelligence-production-read`;
- exakte Production-Hostbindung an `bqsbxesmybthwtxmowfz`;
- eigene Rolle `mahleos_feedback_production_reader` ohne Passwort und ohne
  Tabellen- oder Sequenzrechte;
- vollständige erneute Rollen-Härtung, Zurücksetzen alter Rollen-Konfiguration
  und Entfernung sämtlicher unerwarteter Rollenmitgliedschaften bei jeder
  Anwendung;
- RPC ausschließlich im nicht exponierten Schema `feedback_machine_production`;
- fail-closed Apply, falls dieses private Schema oder irgendein dortiges
  Objektinventar wider Erwarten bereits existiert;
- fail-closed Apply, sobald eine fremde, über `PUBLIC` aufrufbare
  `SECURITY DEFINER`-Funktion in `public` existiert;
- eigene Machine-Key-, Reader-URL-, Machine-Gate- und Real-Data-Gate-Namen;
- ausschließlich `data_scope=production` und der gepinnte Export v0.2.1;
- persistenter Replay-Schutz, höchstens vier manuelle Versuche pro Stunde,
  kein CORS, keine Browsernutzung und keine Response- oder Secret-Logs;
- unveränderte upstreamseitige Consent-, Guardian-, DE-, n>=5- und
  Aktivitätsminimierung.

## Was dieser Stand nicht tut

- keine Migration angewendet;
- keine Edge Function deployed;
- kein Passwort, Machine-Key oder Secret erzeugt;
- kein Gate geöffnet;
- keine echten oder synthetischen Anwendungsdaten gelesen;
- keine Privacy-, Consent-, Guardian- oder App-Store-Freigabe behauptet;
- kein Push, Merge, TestFlight- oder App-Store-Schritt.

## Nächste Gates

1. unabhängige lokale Byte-/Semantik-/Security-Abnahme;
2. qualifizierte DE-Rechts-/Privacy-/Minor-Abnahme der finalen Texte;
3. separat freigegebener Production-Predeploy-Audit;
4. separat freigegebener Apply nur dieser Migration und Deploy nur dieses
   Endpoints, weiterhin ohne Credentials;
5. metadata-only Postdeploy-Audit;
6. eigene Freigabe für temporäre Production-Credentials und genau einen
   kontrollierten realen Read.

Jeder Schritt bleibt fail-closed und autorisiert den folgenden Schritt nicht
automatisch.
