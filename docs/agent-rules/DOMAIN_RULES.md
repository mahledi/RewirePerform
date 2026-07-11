# Active Domain Rules

Quelle: aktive `RP-DR-*`-Regeln im Manifest.

- Rollen sind `athlete`, `coach`, `admin`; Autorisierung bleibt serverseitig.
- Ein Team verbindet Mitglieder, Coaches, Codes, Kalender, Start und Program Runs.
- Eine Programminstanz ist ein individueller 56-Tage-Lauf; ein Program Run grenzt einen Mannschaftspilot ab.
- Neue Pilot-Auswertungen bleiben auf Run und zugeordnete Instanzen begrenzt. Historische unzugeordnete Daten werden nicht automatisch eingemischt.
- Die 56-Tage-Mechanik bleibt fachlich stabil. Training, Wettkampf und Ruhetag passen reale Anwendung und Zeitform an.
- Kanonischer Content liegt im Repository; die DB speichert Zuweisung und Bearbeitung.
- Finales Daily Tracking speichert Check-in vor Completion atomar und idempotent. Kein Check-in-Erfolg bedeutet keine Completion.
- Pflichtantworten blockieren den aktuellen naechsten Schritt.
- Richtige Verstaendnisantworten duerfen nicht positionsfest erscheinen.
- Assessments und Development Index sind Messanker, keine Diagnose.
- Direkt erhobene Zustandsdimensionen werden nur innerhalb ihrer Messgrenze interpretiert.
- Coach-Einzelansicht ist operativ; sensible Teamwerte sind Aggregate ab n=5 und bei n<10 niedrige Konfidenz.
- Consent beeinflusst Evidence, nicht den regulaeren Produktzugang.
- Journal, Dankbarkeit und freie Reflexion bleiben privat; fuer Evidence ist nur Teilnahme/Anzahl zulaessig.
- Verpasste Tage duerfen als kompakter Rueckblick erscheinen; der aktuelle Tag bleibt prioritaer.
- Coach-Beobachtungen bleiben neutral und nicht bevormundend.

Stoppen, wenn eine Aenderung Programmlogik, Rollen, Trackingidentitaet, Consent oder sensitive Sichtbarkeit veraendert.

