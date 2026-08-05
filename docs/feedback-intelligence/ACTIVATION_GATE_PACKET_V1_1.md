# Feedback Intelligence 1.1 – Aktivierungspaket

Stand: 5. August 2026

## Aktueller Zustand

Der lokale Integrationskandidat ist technisch grün und absichtlich nicht
aktiviert. Die App kann ohne offene Server- und Client-Gates weder einen
Feedback-Checkpoint beanspruchen noch Rohtext sammeln oder an einen
Machine-Consumer ausgeben.

`npm run feedback:release:check` prüft reproduzierbar:

- alle Dateien und Paketdigests des v0.2-Exportvertrags;
- alle Dateien und Paketdigests des v0.3-Semantikkatalogs;
- exakte Übereinstimmung von Guardian-Scope, Consent-Version, Notice-Hashes,
  Aufbewahrungsdauer und Processor-Modus;
- geschlossene Collection-, Privacy-, Store-, Minor- und Machine-Gates;
- den fehlenden Execute-Grant des Machine-RPCs.

## Kontrollierte Reihenfolge

1. **Fachprüfung:** Rechtsgrundlage, Art.-8-Pfad, Guardian-Verifikation,
   365-Tage-Höchstdauer, altersgerechte Texte und mögliche DSFA schriftlich
   entscheiden.
2. **Store-Wahrheit:** App Privacy Details für `Other User Content`,
   `Product Interaction` und `User ID` mit den Zwecken `App Functionality`
   und `Analytics` als linked, aber nicht Tracking, gegen den echten RC
   eintragen. Die Altersfrage bewusst beantworten; bei einer EULA-Grenze ab
   15 kann Apples höherer Override erforderlich sein.
3. **Geschlossen deployen:** Migrationen, Edge Function und App gemeinsam in
   die autorisierte Zielumgebung bringen, während sämtliche Collection- und
   Machine-Gates `false` und die Guardian-Policy `draft` bleiben.
4. **Zielumgebung negativ prüfen:** `anon`, normale Athleten, Coaches, Admins
   und `service_role` dürfen keine direkten Raw-/Analysis-/Machine-Reads
   erhalten. Fehlender, falscher, widerrufener oder veralteter Consent muss
   Rohtext und Export jeweils fail-closed blockieren.
5. **Lebenszyklus prüfen:** Grant, Ablehnung, Widerruf, Account-Löschung,
   Retention, Policy-Retirement, Contract-Drift, Offline-Retry und Rollback mit
   ausschließlich synthetischen Testkonten nachweisen.
6. **Athleten-Collection getrennt öffnen:** Erst nach bestandenen Punkten 1–5
   die DE-Policy und notwendigen App-/Server-Gates in einem auditierten,
   reversiblen Schritt öffnen. Text-Collection bleibt ein eigener Schalter und
   Ablehnung darf Programm und strukturierte Antworten nie blockieren.
7. **Machine-Pfad zuletzt:** Zuerst einen separat genehmigten synthetischen
   Read mit dediziertem read-only Actor ausführen. Ein echter Jarvis-Read folgt
   erst nach erneuter Contract-, Privacy-, Credential- und Löschprüfung.

## Harte Stop-Bedingungen

- kein qualifiziertes deutsches Legal-/Privacy-Ergebnis;
- App-Store-Angaben oder Altersfreigabe stimmen nicht mit dem RC überein;
- ein direktes Tabellenrecht oder unerwarteter RPC-Execute-Grant existiert;
- Rohtext erscheint ohne gültige Athleten- und nötigenfalls Guardian-Freigabe;
- Widerruf oder Löschung lässt Rohtext beziehungsweise personenbeziehbare
  Ableitungen zurück;
- Producer- oder Consumer-Hash driftet;
- ein Consumer speichert einen zweiten Rohtextbestand;
- Journal-, Reflexions-, Coach-, Team-, Namens- oder E-Mail-Daten gelangen in
  Feedbackexport oder Modellkontext;
- eine Gruppe unter fünf Athleten wird sichtbar oder ein beobachtender
  Zusammenhang wird als kausale Wirkung formuliert.

## Aktuelle Primärquellen

- Apple App Review Guidelines 5.1: https://developer.apple.com/app-store/review/guidelines/
- Apple App Privacy Details: https://developer.apple.com/app-store/app-privacy-details/
- Apple App Store Connect – Age Rating und Override: https://developer.apple.com/help/app-store-connect/manage-app-information/set-an-app-age-rating
- DSGVO Art. 7, 8, 9, 13 und 17: https://eur-lex.europa.eu/eli/reg/2016/679/oj

Die Quellen stützen die konservativen Gates. Sie ersetzen keine fallbezogene
deutsche Rechts- oder Datenschutzfreigabe.
