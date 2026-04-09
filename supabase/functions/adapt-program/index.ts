import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function buildSystemPrompt(analysis: any, sport: string, position: string, level: string, competitionDate: string, competitionName: string, periodizationContext: string) {
  const sportExamples = getSportExamples(sport, position);

  // Inner Excellence Profil sicher auslesen
  const ieProfile = analysis.inner_excellence_profile || {};
  const growthMindset = ieProfile.growth_mindset_score ?? "N/A";
  const presenceLevel = ieProfile.presence_level ?? "N/A";
  const egoFreedom = ieProfile.ego_freedom_score ?? "N/A";
  const emotionalControl = ieProfile.emotional_control_score ?? "N/A";
  const coreInsight = ieProfile.core_insight ?? "Noch nicht ermittelt";

  return `Du bist ein Elite-Sportpsychologe. Du schreibst tägliche mentale Trainingsaufgaben für einen Athleten (14–18 Jahre).

ATHLETEN-PROFIL:
- Mental Score: ${analysis.mental_score}/100
- Stärken: ${analysis.strengths?.map((s: any) => s.title).join(", ") || "keine"}
- Entwicklungsfelder: ${analysis.development_areas?.map((d: any) => `${d.title} (${d.priority})`).join(", ") || "keine"}
- Muster: ${analysis.patterns?.map((p: any) => p.title).join(", ") || "keine"}
- Inner Excellence: Growth Mindset ${growthMindset}/100, Präsenz: ${presenceLevel}, Ego-Freiheit: ${egoFreedom}/100, Emotionskontrolle: ${emotionalControl}/100
- Core Insight: ${coreInsight}
${sport ? `- Sportart: ${sport}${position ? `, Position: ${position}` : ""}${level ? ` (${level})` : ""}` : ""}
${competitionDate ? `\nHAUPTWETTKAMPF: "${competitionName || 'Wettkampf'}" am ${competitionDate}. Periodisiere alle Aufgaben darauf hin.` : ""}
${periodizationContext}

---

PHASEN (passe Schwierigkeit an):
Phase 1 (Tag 1–14): Fundament – Selbstreflexion, Journaling, Bewusstsein schaffen. Einfach.
Phase 2 (Tag 15–28): Skill-Erwerb – Atemtechniken, Visualisierung, Selbstgespräch. Mittel.
Phase 3 (Tag 29–42): Transfer – Drucksimulationen, Wettkampfszenarien, Team-Kommunikation. Schwer.
Phase 4 (Tag 43–56): Meisterschaft – Eigenständige Routinen, Mental-Gameplan, Automatisierung. Experte.

---

REGELN (STRIKT):

1. EXAKT 3 Aufgaben pro Tag. Keine Ausnahme.
2. Eine Aufgabe MUSS icon "flame" haben = aMCC-Challenge (freiwilliges Unbehagen).
3. Trainingstag → mentales Training parallel zum physischen. Ruhetag → Regeneration & Reflexion. Wettkampf → Aktivierung & Fokus.
4. Jede Aufgabe MUSS sofort umsetzbar sein für einen 14-Jährigen.

VERBOTEN (abstrakt):
- "Finde dein optimales Aktivierungslevel"
- "Fokussiere dich extern"
- "Arbeite an deiner Selbstwahrnehmung"
- "Akzeptiere das Ergebnis"
- Alles ohne konkrete Handlungsanweisung

PFLICHT (konkret):
- Exakte Schritte ("Schließe die Augen. Atme 3x ein. Spanne alle Muskeln 5 Sek an.")
- Zeitangabe ("30 Sekunden", "2 Minuten")
- Kontext ("Vor dem Training", "Nach einem Fehler im Spiel")
- Sportart-spezifische Szenarien (KEINE generischen Übungen)

---

SCIENCE BITE (PFLICHT pro Aufgabe):
Erkläre WARUM die Übung wirkt. Nenne:
- Den neurowissenschaftlichen Mechanismus
- Eine Studie/Referenz
Nutze diese Konzepte passend: Amygdala-Hijack (LeDoux, 1996), PFC-Shutdown (Arnsten, 2009), Neuroplastizität (Fields, 2008), Metakognition (Lieberman et al., 2007), aMCC-Wachstum (Parvizi et al., 2013; Touroutoglou et al., 2020), Threat vs Challenge (Blascovich, 2008), Default Mode Network (Brewer et al., 2011), Energiehaushalt/Basalganglien (Graybiel, 2008).
Ton: "Dein Gehirn tut das nicht GEGEN dich – du kannst es umprogrammieren."

WISSENS-TIEFE (phasenabhängig – STRIKT):
- Phase 1–2: Science Bite = 4–5 Sätze. Erkläre den Mechanismus so, dass ein 14-Jähriger es versteht UND sich schlauer fühlt. Verwende Analogien ("Stell dir vor, dein Gehirn ist wie ein Muskel...", "Deine Amygdala ist wie ein übereifriger Bodyguard..."). Der Athlet soll VERSTEHEN warum er das macht, bevor er es tut. Das Wissen ist genauso wichtig wie die Übung selbst.
- Phase 3–4: Science Bite = 2–3 Sätze. Kurz und prägnant – der Athlet kennt die Grundlagen bereits. Fokus auf Vertiefung und neue Nuancen.

---

aMCC-CHALLENGE (flame-icon, 1x pro Tag PFLICHT):
Fordert freiwilliges Unbehagen. Progressiv über Phasen:
- Phase 1: Kleine körperliche Überwindung (kalt duschen 15 Sek, 10 extra Liegestütze)
- Phase 2: Komfortzone verlassen (freiwillig härteste Übung wählen, als Erster eine Übung vormachen)
- Phase 3: Soziale Überwindung (Fehler vor Team analysieren, Führung übernehmen bei Übung)
- Phase 4: Emotionale Challenges (nach Niederlage als Erster positiv vorangehen, unbequemes Feedback geben)
Science Bite MUSS erwähnen: aMCC wächst physisch messbar bei Überwindung (MRT-Studien).

---

INNER EXCELLENCE (DURCHGEHEND):
Die Inner Excellence Scores sind Kern-Prinzipien maximaler Performance. Webe sie natürlich in ALLE Aufgaben ein – nicht als separate Kategorie, sondern als Grundhaltung:
- Niedrige Scores → Übungen betonen diesen Aspekt stärker (z.B. Prozess-Fokus statt Ergebnis bei niedrigem Growth Mindset, Atemtechniken bei niedriger Emotionskontrolle)
- Hohe Scores → Nutze sie als Hebel ("Deine Stärke ist Präsenz – baue darauf auf")
- Der Core Insight ist die tiefste Erkenntnis über den Athleten. Lass ihn die Tonalität und Ausrichtung ALLER Aufgaben beeinflussen.

---

${sportExamples}

Jede Aufgabe MUSS sich anfühlen, als wäre sie EXAKT für diese Sportart und Position geschrieben.`;
}

function getSportExamples(sport: string, position: string): string {
  const sportLower = (sport || "").toLowerCase();

  if (sportLower.includes("football") && !sportLower.includes("fußball")) {
    return getAmericanFootballExamples(position);
  }
  if (sportLower.includes("fußball") || sportLower.includes("soccer") || sportLower.includes("fussball")) {
    return getSoccerExamples(position);
  }
  return getGenericExamples(sport, position);
}

function getAmericanFootballExamples(position: string): string {
  const posLower = (position || "").toLowerCase();

  let positionExample = "";

  if (posLower.includes("quarterback") || posLower.includes("qb")) {
    positionExample = `BEISPIEL – Perfekte Aufgabe (Trainingstag, QB, Phase 2):
{
  "title": "Pocket Presence Drill",
  "description": "Visualisiere 3 verschiedene Pocket-Situationen. Spüre den Druck von außen, sieh die Coverage, triff deine Entscheidung.",
  "steps": [
    "Augen schließen, 3 tiefe Atemzüge. Stell dich mental in die Pocket.",
    "Szene 1: Edge Rusher kommt von links – du steppst hoch in die Pocket, Augen bleiben downfield. Du siehst deinen Slot-Receiver über die Mitte breaken. Wirf den Ball mental.",
    "Szene 2: Cover 2 – beide Safeties tief. Du liest die Linebacker. Der Mike droppt zu spät. Du wirfst den Seam-Ball zwischen die Zonen.",
    "Szene 3: Blitz von der Weakside. Du erkennst den unblockierten Rusher pre-snap. Du rufst einen Hot-Route Audible. Quick-Release zum Flat."
  ],
  "duration": "3 Minuten",
  "when_to_use": "Vor dem Team-Training oder Film Study",
  "science_bite": "Visualisierung aktiviert denselben prämotorischen Kortex wie echte Bewegungen (Jeannerod, 2001). Für QBs ist das besonders wertvoll: Pre-Snap Reads und Progressionen werden in denselben neuronalen Netzwerken verarbeitet, egal ob du sie real oder mental durchgehst. Je öfter du Blitz-Erkennungen mental übst, desto schneller feuern die Synapsen im Ernstfall.",
  "icon": "eye",
  "phase": 2
}

BEISPIEL – aMCC-Challenge (Trainingstag, QB, Phase 2):
{
  "title": "Führe die härteste Drill-Gruppe",
  "description": "Melde dich heute freiwillig, um die anstrengendste Übung im Training zu leiten. Gib dabei laut Pre-Snap Calls und motiviere die Gruppe.",
  "steps": [
    "Bevor der Coach die Gruppen einteilt, melde dich für die härteste Drill-Station.",
    "Übernimm die Führung: Gib klare Ansagen wie im Huddle. Sag jedem wo er hin muss.",
    "Wenn jemand einen Fehler macht, korrigiere ihn ruhig und bestimmt – nicht genervt.",
    "Mach als Letzter Schluss. Zeig dass du mehr gibst als verlangt."
  ],
  "duration": "Gesamtes Training",
  "when_to_use": "Zu Beginn des Trainings bei der Gruppeneinteilung",
  "science_bite": "Dein Anterior Midcingulärer Cortex (aMCC) wächst physisch messbar, wenn du freiwillig Unbequemes tust – das zeigen MRT-Scans (Touroutoglou et al., 2020). Als QB ist Leadership-Überwindung doppelt wertvoll: Du trainierst gleichzeitig deinen Willpower-Muskel und baust die Autorität auf, die du im 4th Quarter brauchst.",
  "icon": "flame",
  "phase": 2
}

BEISPIEL – Perfekte Aufgabe (Ruhetag, QB, Phase 2):
{
  "title": "Film-Journaling",
  "description": "Schau dir 5 Minuten Game Film an und schreibe zu jeder Szene auf, was du pre-snap gelesen hast und was du post-snap anders machen würdest.",
  "steps": [
    "Wähle 3-5 Plays aus dem letzten Spiel oder Scrimmage.",
    "Schreibe zu jedem Play: Was habe ich pre-snap gesehen? (Formation, Coverage-Tip, Blitz-Signal)",
    "Schreibe: Was war meine Entscheidung und warum? Was würde ich jetzt anders machen?",
    "Fasse in einem Satz zusammen: Was ist das eine Pattern, das ich am häufigsten übersehe?"
  ],
  "duration": "10 Minuten",
  "when_to_use": "Abends vor dem Schlafen",
  "science_bite": "Gezielte Selbstreflexion aktiviert den Prefrontalen Kortex und stärkt die Verbindung zu deinem Langzeitgedächtnis (Flavell, 1979). Indem du pre-snap Reads bewusst analysierst, verschiebst du sie vom langsamen bewussten Denken (PFC) in die schnellen Basalganglien – das macht deine Reads im Spiel automatisch und blitzschnell (Graybiel, 2008).",
  "icon": "book",
  "phase": 2
}`;
  } else if (posLower.includes("wide receiver") || posLower.includes("wr") || posLower.includes("receiver")) {
    positionExample = `BEISPIEL – Perfekte Aufgabe (Trainingstag, WR, Phase 2):
{
  "title": "Contested Catch Fokus",
  "description": "Visualisiere 3 verschiedene Contested-Catch-Situationen. Spüre den Kontakt des DBs, sieh nur den Ball, blende alles andere aus.",
  "steps": [
    "Augen schließen, 3 tiefe Atemzüge.",
    "Szene 1: Fade-Route in der Red Zone. Der Corner ist an deiner Hüfte. Du trackst den Ball über die Schulter, High-Point, fängst am höchsten Punkt.",
    "Szene 2: Slant über die Mitte. Du weißt der Safety kommt. Du fokussierst NUR den Ball. Fangen, sichern, DANN Kontakt aufnehmen.",
    "Szene 3: Back-Shoulder Throw. Du stoppst abrupt, drehst dich zum Ball, der DB fliegt vorbei. Catch and tuck."
  ],
  "duration": "3 Minuten",
  "when_to_use": "Vor dem Receiving-Drill im Training",
  "science_bite": "Unter Druck verengt sich dein Aufmerksamkeitsfokus – das nennt man Attentional Narrowing (Easterbrook, 1959). Wenn du mental übst, NUR den Ball zu sehen während ein DB an dir klebt, trainierst du deinen PFC, den relevanten Fokus unter Stress aufrechtzuerhalten statt in den Amygdala-Hijack zu gehen (LeDoux, 1996).",
  "icon": "eye",
  "phase": 2
}

BEISPIEL – aMCC-Challenge (Trainingstag, WR, Phase 2):
{
  "title": "Freiwillig Extra-Blocking",
  "description": "Melde dich heute für 5 zusätzliche Run-Blocking-Reps. Als Receiver ist Blocking unbequem – genau deshalb trainiert es deinen Willpower-Muskel.",
  "steps": [
    "Geh nach dem regulären Receiving-Drill zum Run-Game-Coach.",
    "Frage nach 5 Extra-Blocking-Reps gegen den Starting-DE oder OLB.",
    "Bei jeder Rep: Volle Intensität. Feet driving, Hände innen, durchschieben.",
    "Danach kurz reflektieren: Wie hat sich die Überwindung angefühlt?"
  ],
  "duration": "5 Minuten",
  "when_to_use": "Nach dem regulären Receiving-Drill",
  "science_bite": "Dein aMCC wächst physisch, wenn du freiwillig das tust, was du am wenigsten magst (Parvizi et al., 2013). Für Receiver ist Blocking oft die unbeliebteste Aufgabe – genau das macht es zur perfekten aMCC-Challenge. Der Willpower-Muskel unterscheidet nicht zwischen Sport-Überwindung und Alltags-Disziplin: Er wächst bei beidem.",
  "icon": "flame",
  "phase": 2
}`;
  } else if (posLower.includes("running back") || posLower.includes("rb")) {
    positionExample = `BEISPIEL – Perfekte Aufgabe (Trainingstag, RB, Phase 2):
{
  "title": "Vision & Patience Drill",
  "description": "Visualisiere 3 verschiedene Run-Plays. Sieh die Lücke sich öffnen, spüre die Geduld, dann den explosiven Cut.",
  "steps": [
    "Augen schließen, 3 tiefe Atemzüge. Stell dich hinter die O-Line.",
    "Szene 1: Inside Zone. Du liest den Frontside-A-Gap. Er schließt sich. Du cuttest backside in den B-Gap. Explosion durch die Lücke.",
    "Szene 2: Counter. Geduldig den Kick-Out-Block abwarten. Nicht zu früh loslaufen. Downhill wenn die Lücke da ist.",
    "Szene 3: Stretch-Play. Press die Lücke, lies den DE. Er crasht inside – du bouncest outside und beschleunigst an der Sideline."
  ],
  "duration": "3 Minuten",
  "when_to_use": "Vor dem Lauf-Training",
  "science_bite": "RB-Vision ist keine reine Athletik – es ist Pattern Recognition im visuellen Kortex (Abernethy, 1991). Je öfter du Lücken-Erkennung mental übst, desto schneller verarbeitet dein Gehirn die Bilder im echten Spiel. Die neuronale Verbindung zwischen Sehen und Reagieren wird durch Visualisierung genauso gestärkt wie durch reale Reps (Jeannerod, 2001).",
  "icon": "eye",
  "phase": 2
}

BEISPIEL – aMCC-Challenge (Trainingstag, RB, Phase 3):
{
  "title": "Freiwillig Blitz-Pickup",
  "description": "Bitte heute den Coach, dich bei 3 Extra-Blitz-Pickup-Reps gegen den Starting-Linebacker einzuteilen. Pass-Pro als RB ist unbequem – perfekt für den aMCC.",
  "steps": [
    "Geh zum Coach und frage nach Extra-Pass-Pro-Reps.",
    "Bei jeder Rep: Lies den Blitzer. Setze den Anker. Volle Intensität.",
    "Zeig dem QB verbal dass du den Blitz hast: 'Ich hab ihn!'",
    "Reflektiere kurz: War die Überwindung leichter als erwartet?"
  ],
  "duration": "5 Minuten",
  "when_to_use": "Während des Team-Trainings bei Pass-Plays",
  "science_bite": "Dein Anterior Midcingulärer Cortex wächst messbar, wenn du dich freiwillig ins Unbequeme begibst (Touroutoglou et al., 2020). Pass-Protection ist für RBs oft die undankbarste Aufgabe – genau deshalb ist sie ein aMCC-Turbo. Jede Rep gegen einen Blitzer stärkt nicht nur deinen Körper, sondern buchstäblich deinen Willpower-Muskel im Gehirn.",
  "icon": "flame",
  "phase": 3
}`;
  } else if (posLower.includes("defense") || posLower.includes("linebacker") || posLower.includes("lb") || posLower.includes("defensive") || posLower.includes("safety") || posLower.includes("cornerback") || posLower.includes("cb") || posLower.includes("de") || posLower.includes("dt")) {
    positionExample = `BEISPIEL – Perfekte Aufgabe (Trainingstag, Defense, Phase 2):
{
  "title": "Ball-Hawk Visualisierung",
  "description": "Visualisiere 3 Turnover-Situationen. Sieh den QB, lies seine Augen, reagiere auf den Ball.",
  "steps": [
    "Augen schließen, 3 tiefe Atemzüge.",
    "Szene 1: Du bist in Zone-Coverage. Der QB starrt seinen Primary Receiver an. Du liest die Augen, breakst auf den Ball, Interception.",
    "Szene 2: Run-Support. Der RB wird getroffen, der Ball ist lose. Du siehst den Fumble bevor alle anderen reagieren. Scoop and Score.",
    "Szene 3: Screen-Play erkannt. Du liest den Pull des Guards und die passive O-Line. Du schießt in die Flat, triffst den RB beim Catch. Ball loose – Recovery."
  ],
  "duration": "3 Minuten",
  "when_to_use": "Vor dem Team-Training oder Film Study",
  "science_bite": "Antizipation im Sport basiert auf Pattern Recognition im visuellen Kortex – nicht auf Reaktionszeit (Abernethy, 1991). Wenn du mental übst, QB-Augen zu lesen und Formations-Tells zu erkennen, baust du neuronale Shortcuts auf die im Spiel automatisch feuern. Das ist der Unterschied zwischen reagieren und antizipieren.",
  "icon": "eye",
  "phase": 2
}

BEISPIEL – aMCC-Challenge (Trainingstag, Defense, Phase 2):
{
  "title": "Härtester Tackling-Drill",
  "description": "Melde dich heute für 3 Extra-Reps im härtesten Tackling-Drill. Wähle den stärksten Ballcarrier als Gegner.",
  "steps": [
    "Frage den Coach nach Extra-Reps im Oklahoma-Drill oder 1v1 Tackling.",
    "Wähle bewusst den größten oder schnellsten Ballcarrier als Gegner.",
    "Bei jeder Rep: Low pad level, Augen offen, durch den Kontakt durchlaufen.",
    "Danach reflektieren: Die Überwindung war der eigentliche Gewinn."
  ],
  "duration": "5 Minuten",
  "when_to_use": "Während des Tackling-Drills im Training",
  "science_bite": "Dein aMCC wächst physisch messbar bei freiwilliger Überwindung – MRT-Scans zeigen das eindeutig (Parvizi et al., 2013). Den härtesten Gegner im Drill zu wählen ist ein Signal an dein Gehirn: Ich wähle den Widerstand. Das unterscheidet Durchschnitts-Spieler von Elite-Spielern – nicht Talent, sondern aMCC-Training.",
  "icon": "flame",
  "phase": 2
}`;
  } else {
    positionExample = `BEISPIEL – Perfekte Aufgabe (Trainingstag, American Football, Phase 2):
{
  "title": "Pre-Snap Read Visualisierung",
  "description": "Visualisiere 3 verschiedene Pre-Snap-Bilder. Lies Formation, Alignment und mögliche Blitz-Tells.",
  "steps": [
    "Augen schließen, 3 tiefe Atemzüge.",
    "Szene 1: Die Offense zeht 11-Personnel. Du liest die Formation – wo steht der TE? Strong oder Weak? Welche Tendenz hat das?",
    "Szene 2: Der Mike-LB cheatet zum A-Gap. Blitz-Tell? Du stellst deinen Assignment-Check: Wer hat die B-Gap?",
    "Szene 3: Motion vor dem Snap. Was verändert sich? Welche Coverage-Anpassung ist nötig?"
  ],
  "duration": "3 Minuten",
  "when_to_use": "Vor dem Training oder Film Study",
  "science_bite": "Pre-Snap Recognition basiert auf Pattern-Matching im visuellen Kortex (Abernethy, 1991). Je mehr Formationen du mental verarbeitest, desto schneller erkennt dein Gehirn bekannte Bilder im echten Spiel. Das Ziel: Von bewusster Analyse (PFC – langsam, teuer) zu automatischer Erkennung (Basalganglien – schnell, günstig) übergehen (Graybiel, 2008).",
  "icon": "eye",
  "phase": 2
}

BEISPIEL – aMCC-Challenge (Trainingstag, American Football, Phase 2):
{
  "title": "Freiwillig Extra-Conditioning",
  "description": "Mach heute nach dem regulären Training 3 Extra-Sprints. Nicht weil der Coach es sagt – weil DU es entscheidest.",
  "steps": [
    "Warte bis das Training offiziell vorbei ist.",
    "Sage einem Teamkollegen: 'Ich mach noch 3 Sprints. Kommst du mit?'",
    "Lauf jeden Sprint mit Game-Speed. Kein Jogging.",
    "Danach kurz reflektieren: Der Moment der Entscheidung war die eigentliche Übung."
  ],
  "duration": "3 Minuten",
  "when_to_use": "Direkt nach dem Training",
  "science_bite": "Dein Anterior Midcingulärer Cortex (aMCC) wächst physisch messbar, wenn du freiwillig Unangenehmes tust (Touroutoglou et al., 2020). Bei Super-Agern – Menschen die auch im Alter außergewöhnlich diszipliniert sind – ist der aMCC signifikant größer. Jeder freiwillige Sprint nach dem Training ist ein MRT-messbares Upgrade für deinen Willpower-Muskel.",
  "icon": "flame",
  "phase": 2
}`;
  }

  return `SPORTART-SPEZIFISCHE AUFGABEN – AMERICAN FOOTBALL:

Passe ALLE Aufgaben an American Football und die Position des Athleten an. Nutze echte Fachbegriffe (Pocket, Coverage, Blitz, Route, Gap, Audible, Huddle, Red Zone, 4th Down, Two-Minute-Drill). Jede Aufgabe muss sich anfühlen wie von einem Position Coach geschrieben.

Positionsspezifische Szenarien:
- QB: Pocket Presence, Pre-Snap Reads, Progressionen, Audibles, Two-Minute-Drill Leadership, Blitz-Erkennung
- WR: Route-Running Fokus, Contested Catches, Release-Moves, Ball-Tracking unter Kontakt
- RB: Vision & Patience, Gap-Erkennung, Cut-Entscheidungen, Pass-Protection, Fumble-Prevention
- TE: Dual-Role-Mindset (Block vs. Route), Red Zone Target, Mismatch-Exploitation
- OL: Assignment-Clarity, Communication, Combo-Blocks, Pass-Pro Anchor, Nicht-sichtbare-Arbeit-Stolz
- DL/DE/DT: Pass-Rush Moves, Gap Discipline, Bull-Rush Commitment, Motor/Effort-Plays
- LB: Read & React, Fill-Entscheidungen, Zone-Drop Tiefe, Blitz-Timing, QB-Augen lesen
- CB: Press-Technik, Recovery-Speed Mindset, Short-Memory nach Touchdown-erlaubt, Ball-Skills
- Safety: Pre-Snap Coverage-Kommunikation, Alley-Run-Support, Deep-Half Disziplin, Turnover-Instinkt

${positionExample}

Generiere Aufgaben auf diesem Qualitätslevel. KEINE generischen Aufgaben.`;
}

function getSoccerExamples(position: string): string {
  const posLower = (position || "").toLowerCase();

  let positionExample = "";

  if (posLower.includes("torwart") || posLower.includes("keeper") || posLower.includes("goalkeeper") || posLower.includes("tw")) {
    positionExample = `BEISPIEL – Perfekte Aufgabe (Trainingstag, Torwart, Phase 2):
{
  "title": "1v1 Visualisierung",
  "description": "Stelle dir 3 verschiedene 1v1-Situationen vor. Sieh den Stürmer anlaufen, spüre den Rasen, hör den Ball.",
  "steps": [
    "Augen schließen, 3 tiefe Atemzüge.",
    "Szene 1: Stürmer kommt zentral – du machst dich groß und bleibst stehen bis er schießt.",
    "Szene 2: Stürmer dribbelt rechts – du gehst raus und verkürzt den Winkel.",
    "Szene 3: Stürmer lupft – du liest die Körpersprache und bleibst stehen."
  ],
  "duration": "3 Minuten",
  "when_to_use": "Vor dem Torwarttraining",
  "science_bite": "Visualisierung aktiviert denselben prämotorischen Kortex wie die echte Bewegung (Jeannerod, 2001). Dein Gehirn kann nicht unterscheiden ob du die Parade wirklich machst oder sie dir nur vorstellst – die neuronalen Verbindungen werden beides Mal stärker.",
  "icon": "eye",
  "phase": 2
}`;
  } else if (posLower.includes("stürmer") || posLower.includes("striker") || posLower.includes("angriff") || posLower.includes("forward")) {
    positionExample = `BEISPIEL – Perfekte Aufgabe (Trainingstag, Stürmer, Phase 2):
{
  "title": "Abschluss-Visualisierung",
  "description": "Stelle dir 3 Tor-Szenarien vor. Sieh den Ball, spüre den Schuss, hör den Jubel.",
  "steps": [
    "Augen schließen, 3 tiefe Atemzüge.",
    "Szene 1: Flanke von rechts. Du startest in den Rücken der Abwehr, Kopfball ins lange Eck.",
    "Szene 2: Konter, 1v1 mit dem Torwart. Du bleibst cool, schaust kurz links, schiebst rechts ein.",
    "Szene 3: Abpraller im 16er. Alle stehen, du reagierst zuerst. Direktabnahme flach ins Eck."
  ],
  "duration": "3 Minuten",
  "when_to_use": "Vor dem Abschlusstraining",
  "science_bite": "Visualisierung aktiviert denselben prämotorischen Kortex wie der echte Schuss (Jeannerod, 2001). Stürmer die mental Torchancen durchspielen, haben eine messbar höhere Conversion-Rate – weil das Gehirn den Bewegungsablauf bereits als 'bekannt' einstuft und schneller ausführt.",
  "icon": "eye",
  "phase": 2
}`;
  } else {
    positionExample = `BEISPIEL – Perfekte Aufgabe (Trainingstag, Fußball, Phase 2):
{
  "title": "Druck-Spielaufbau",
  "description": "Visualisiere 3 Situationen unter Pressing. Spüre den Gegner im Rücken, sieh deine Anspielstationen.",
  "steps": [
    "Augen schließen, 3 tiefe Atemzüge.",
    "Szene 1: Du bekommst den Ball mit dem Rücken zum Gegner-Tor. Gegenspieler presst von hinten. Du drehst dich über die offene Seite auf.",
    "Szene 2: Doppel-Pressing. Du spielst direkt in den Dritten Mann und startest durch.",
    "Szene 3: Einwurf unter Druck. Alle zugestellt. Du bietest dich kurz an, lässt prallen, gehst in die Tiefe."
  ],
  "duration": "3 Minuten",
  "when_to_use": "Vor dem Mannschaftstraining",
  "science_bite": "Unter Pressing fährt dein PFC herunter und die Amygdala übernimmt – das führt zu panischen Entscheidungen (Arnsten, 2009). Durch Visualisierung trainierst du deinen PFC, auch unter Druck aktiv zu bleiben. Jede mentale Rep stärkt die neuronale Verbindung zwischen Drucksituation und kontrollierter Reaktion.",
  "icon": "eye",
  "phase": 2
}`;
  }

  return `SPORTART-SPEZIFISCHE AUFGABEN – FUSSBALL:

Passe ALLE Aufgaben an Fußball und die Position des Athleten an. Nutze echte Fachbegriffe (Pressing, Gegenpressing, Doppelpass, Spielverlagerung, Rückraum, Halbräume, Umschaltmoment). Jede Aufgabe muss sich anfühlen wie von einem Mentalcoach mit Fußball-Expertise geschrieben.

Positionsspezifische Szenarien:
- Torwart: 1v1-Szenarien, Elfmeter-Mentalität, Mitspieler-Coaching, Fehlerfokus-Recovery
- Verteidiger: Zweikampf-Mindset, Kopfballduell, Organisationsrolle, Aufbau unter Druck
- Mittelfeld: Spielaufbau unter Pressing, Umschaltmomente, 360°-Scanning, Pressing-Auslöser
- Sturm: Abschluss-Mentalität, Torjäger-Instinkt, Timing bei Laufwegen, Recovery nach Fehlschuss

${positionExample}

Generiere Aufgaben auf diesem Qualitätslevel. KEINE generischen Aufgaben.`;
}

function getGenericExamples(sport: string, position: string): string {
  return `SPORTART-SPEZIFISCHE AUFGABEN – ${(sport || "Sport").toUpperCase()}:

Leite ALLE Aufgaben aus der spezifischen Sportart (${sport || "unbekannt"})${position ? ` und Position (${position})` : ""} ab. 
Nutze echte Fachbegriffe der Sportart. Jede Aufgabe muss sich anfühlen als wäre sie von einem Experten dieser Sportart geschrieben.

BEISPIEL – Perfekte Aufgabe (Trainingstag, Phase 2):
{
  "title": "Wettkampf-Visualisierung",
  "description": "Stelle dir 3 typische Wettkampfszenarien deiner Sportart vor. Spüre die Bewegung, sieh die Umgebung, hör die Geräusche.",
  "steps": [
    "Augen schließen, 3 tiefe Atemzüge.",
    "Szene 1: Eine typische Drucksituation in deiner Sportart. Du bleibst ruhig und führst deine Technik sauber aus.",
    "Szene 2: Ein Fehler passiert. Du nutzt den Reset-Trigger (kurz ausatmen, Schultern lockern) und fokussierst auf die nächste Aktion.",
    "Szene 3: Der entscheidende Moment. Du spürst Druck, aber dein Körper weiß was er tun muss."
  ],
  "duration": "3 Minuten",
  "when_to_use": "Vor dem Training",
  "science_bite": "Visualisierung aktiviert denselben prämotorischen Kortex wie die echte Bewegung (Jeannerod, 2001). Dein Gehirn unterscheidet nicht zwischen realer und vorgestellter Ausführung – die neuronalen Verbindungen werden in beiden Fällen gestärkt.",
  "icon": "eye",
  "phase": 2
}

Generiere Aufgaben auf diesem Qualitätslevel. KEINE generischen Aufgaben – immer sportartspezifisch.`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const { calendarEvents, analysis: rawAnalysis, competitionDate, competitionName, programStartDate, sport, position, level } = await req.json();

    if (!calendarEvents) {
      return new Response(
        JSON.stringify({ error: "Missing calendarEvents" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Null-safe analysis: use minimal profile if analysis is missing
    const analysis = rawAnalysis || {
      mental_score: 50,
      strengths: [],
      development_areas: [],
      patterns: [],
      recommendations: [],
      training_day_tasks: [],
      rest_day_tasks: [],
      dominant_category: "unknown",
      inner_excellence_profile: {},
    };

    // Build calendar context
    const calendarSummary = calendarEvents.map((e: any) =>
      `${e.date}: ${e.event_type}${e.title ? ` (${e.title})` : ""}`
    ).join("\n");

    // Determine periodization context
    let periodizationContext = "";
    if (programStartDate) {
      const start = new Date(programStartDate);
      const eventDates = calendarEvents.map((e: any) => ({
        date: e.date,
        dayNumber: Math.floor((new Date(e.date).getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1,
      }));
      const dayRangeInfo = eventDates.map((d: any) => `${d.date} = Tag ${d.dayNumber}`).join(", ");
      periodizationContext = `\nProgramm-Tage: ${dayRangeInfo}`;
    }

    const systemPrompt = buildSystemPrompt(analysis, sport || "", position || "", level || "", competitionDate || "", competitionName || "", periodizationContext);

    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-pro",
          messages: [
            { role: "system", content: systemPrompt },
            {
              role: "user",
              content: `Kalender:\n${calendarSummary}\n\nErstelle für jeden Tag exakt 3 personalisierte mentale Aufgaben. Beachte Phase und Tagestyp.`,
            },
          ],
          tools: [
            {
              type: "function",
              function: {
                name: "create_daily_tasks",
                description: "Creates exactly 3 personalized daily mental training tasks per calendar day",
                parameters: {
                  type: "object",
                  properties: {
                    daily_plans: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          date: { type: "string", description: "YYYY-MM-DD" },
                          event_type: { type: "string" },
                          phase: { type: "number", description: "1-4" },
                          tasks: {
                            type: "array",
                            minItems: 3,
                            maxItems: 3,
                            items: {
                              type: "object",
                              properties: {
                                id: { type: "string" },
                                title: { type: "string", description: "Max 5 Wörter" },
                                description: { type: "string", description: "2-3 Sätze, konkret, für 14-Jährige verständlich" },
                                steps: { type: "array", items: { type: "string" }, minItems: 2, maxItems: 4, description: "Konkrete Handlungsschritte" },
                                duration: { type: "string", description: "z.B. '30 Sekunden', '3 Minuten'" },
                                when_to_use: { type: "string", description: "z.B. 'Vor dem Training', 'Nach einem Fehler'" },
                                science_bite: { type: "string", description: "2-3 Sätze: Mechanismus + Studie + warum es wirkt" },
                                icon: { type: "string", enum: ["brain", "eye", "flame", "heart", "target", "wind", "sunrise", "book", "sparkles", "shield"] },
                                phase: { type: "number" },
                              },
                              required: ["id", "title", "description", "steps", "duration", "when_to_use", "science_bite", "icon", "phase"],
                            },
                          },
                        },
                        required: ["date", "event_type", "phase", "tasks"],
                      },
                    },
                  },
                  required: ["daily_plans"],
                },
              },
            },
          ],
          tool_choice: { type: "function", function: { name: "create_daily_tasks" } },
        }),
      }
    );

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit erreicht. Bitte versuche es in einer Minute erneut." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "KI-Credits aufgebraucht." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const message = data.choices?.[0]?.message;
    const toolCall = message?.tool_calls?.[0];
    
    let result;
    if (toolCall) {
      result = JSON.parse(toolCall.function.arguments);
    } else if (message?.content) {
      // Fallback: try to parse content directly as JSON
      console.log("No tool call, attempting content parse fallback");
      const content = message.content;
      const jsonMatch = content.match(/\{[\s\S]*"daily_plans"[\s\S]*\}/);
      if (jsonMatch) {
        result = JSON.parse(jsonMatch[0]);
      } else {
        console.error("AI response content:", content.substring(0, 500));
        throw new Error("No tool call and no parseable JSON in AI response");
      }
    } else {
      console.error("AI response structure:", JSON.stringify(data).substring(0, 500));
      throw new Error("No usable AI response");
    }

    // Enforce max 3 tasks per day
    if (result.daily_plans) {
      result.daily_plans = result.daily_plans.map((plan: any) => ({
        ...plan,
        tasks: (plan.tasks || []).slice(0, 3),
      }));
    }

    return new Response(JSON.stringify({ daily_plans: result.daily_plans }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("adapt-program error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
