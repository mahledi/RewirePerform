# Jarvis Banger Readiness Block

## Plan

- Ziel: Die bereits vorhandenen Admin-Aggregate fuer den festen MahleOS-Reader vervollstaendigen, ohne Rohdaten oder private Inhalte zu erweitern.
- Scope: Activity-Trend-View im Machine-Read-Vertrag, lokal vorbereitete Auth-Coverage und zugehoerige geschlossene Contracts/Tests. Bestehende Feedback- und Admin-UI werden nur dort angepasst, wo der sichere Read-Contract es erfordert.
- Risiko: R3/R4 lokal vorbereitet und durch Mahles ausdrueckliches Block-Go freigegeben; Production-Apply, Function-Deploy, Push und Merge bleiben gesperrt.
- Pruefschritte: SQL-/Privilege-Vertrag, Contract-Generator, Typecheck, Tests, Build, Privacy-Checks und `git diff --check`.
- Rueckweg: isolierter Branch ab aktuellem `origin/main`; kein externer Zustand wird veraendert.

## Datenschutzgrenze

- Testprofile, Testinstanzen und Testteams bleiben ausgeschlossen.
- Keine Namen, E-Mails, direkten IDs, Freitexte, Journale oder Einzelwerte im Machine-Reader.
- Sensitive Gruppen bleiben bei `n < 5` unterdrueckt.
- Nur deskriptive Beobachtungen, keine Ursache oder Wirksamkeit.
