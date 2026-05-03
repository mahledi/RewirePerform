/**
 * Coach Toolkit — deterministische, hardcoded Inhalte.
 * KEIN AI-Call. Nur programm- und coach-facing Sprache.
 */

export interface CoachScienceBite {
  id: string;
  title: string;
  explanation: string; // 3-5 Sätze
  coachAngle: string; // Was bedeutet das für dich als Coach?
}

export const COACH_SCIENCE_BITES: CoachScienceBite[] = [
  {
    id: "growth-mindset",
    title: "Growth Mindset",
    explanation:
      "Spieler profitieren, wenn Aufwand, Strategie, Lernverhalten und Erholung nach Fehlern verstärkt werden — nicht nur Talent oder Ergebnis. Verhaltensbezogenes Feedback ist mit stabileren Lernkurven verbunden. Identitätslob kann kurzfristig motivieren, aber Fehler später bedrohlicher wirken lassen.",
    coachAngle:
      "Lobe spezifisches Verhalten: \u201eDu bist nach dem Fehler direkt wieder in die n\u00e4chste Aktion gegangen.\u201c",
  },
  {
    id: "error-climate",
    title: "Fehlerkultur",
    explanation:
      "Wie ein Team auf Fehler reagiert, kann beeinflussen, ob Spieler Risiken vermeiden oder im Lernen bleiben. Ein stabiles Fehlerklima ist mit h\u00f6herer Lernbereitschaft verbunden.",
    coachAngle:
      "Stabilisiere nach Fehlern zuerst das Verhalten, bevor du tief analysierst.",
  },
  {
    id: "process-orientation",
    title: "Prozessorientierung",
    explanation:
      "Ergebnis z\u00e4hlt, aber Leistung wird stabiler, wenn die Aufmerksamkeit immer wieder auf kontrollierbare Handlungen zur\u00fcckkehrt. Prozessfokus ist mit konsistenterem Verhalten unter Druck verbunden.",
    coachAngle:
      "Definiere vor Training oder Wettkampf einen klaren Prozessfokus.",
  },
  {
    id: "pressure-interpretation",
    title: "Druckinterpretation",
    explanation:
      "Druck ist nicht automatisch sch\u00e4dlich. Wie Athleten Druck interpretieren, kann beeinflussen, ob sie bedrohungs- oder herausforderungsorientiert reagieren.",
    coachAngle:
      "Frame Druck als Situation zum Handeln, nicht als Beweis der Identit\u00e4t.",
  },
  {
    id: "ego-self-worth",
    title: "Ego, Selbstwert & Bewertung",
    explanation:
      "Wenn Spieler Leistung zu stark mit Selbstwert verkn\u00fcpfen, k\u00f6nnen Druck und Angst vor Bewertung steigen. Identit\u00e4tslabels k\u00f6nnen diese Verkn\u00fcpfung verst\u00e4rken.",
    coachAngle:
      "Vermeide Identit\u00e4tslabels. Sprich \u00fcber beobachtbares Verhalten und n\u00e4chste Handlung.",
  },
  {
    id: "gratitude-team",
    title: "Dankbarkeit & Teamklima",
    explanation:
      "Dankbarkeit und Wertsch\u00e4tzung k\u00f6nnen soziale Verbindung, emotionale Regulation und Teamklima unterst\u00fctzen.",
    coachAngle:
      "Beende eine Woche mit einer kurzen Wertsch\u00e4tzungsfrage.",
  },
  {
    id: "amcc-effort",
    title: "aMCC, Anstrengung & Unbehagen",
    explanation:
      "Der anteriore mediale cinguläre Kortex (aMCC) ist mit anstrengungsvollem Handeln verbunden, besonders wenn etwas schwierig oder unangenehm ist. Das ist ein Zusammenhang, kein direkter Beweis.",
    coachAngle:
      "Schwere, aber machbare Aufgaben k\u00f6nnen Toleranz f\u00fcr Unbehagen unterst\u00fctzen, wenn klare Standards und Erholung dazu kommen.",
  },
  {
    id: "amygdala-acc",
    title: "Amygdala, ACC & Druck",
    explanation:
      "In Drucksituationen k\u00f6nnen bedrohungsbezogene Systeme wie die Amygdala und Monitoring-Systeme rund um den ACC st\u00e4rker aktiv sein. Ziel ist nicht, Angst auszuschalten, sondern Verhalten unter Druck handlungsf\u00e4hig zu halten.",
    coachAngle:
      "Nutze kurze prozessfokussierte Sprache, die Aufmerksamkeit zur\u00fcck zur Handlung bringt.",
  },
];

/** W\u00e4hlt deterministisch eine Science Bite pro Woche. */
export const getWeeklyScienceBite = (date: Date = new Date()): CoachScienceBite => {
  const start = new Date(date.getFullYear(), 0, 1);
  const week = Math.floor((date.getTime() - start.getTime()) / (7 * 24 * 60 * 60 * 1000));
  return COACH_SCIENCE_BITES[week % COACH_SCIENCE_BITES.length];
};

export interface TeamStandard {
  id: string;
  title: string;
  explanation: string;
  coachBehavior: string;
}

export const TEAM_STANDARDS: TeamStandard[] = [
  {
    id: "mistakes-not-identity",
    title: "Fehler sind Information, nicht Identit\u00e4t.",
    explanation:
      "Ein Spieler sollte einen Fehler nicht so verlassen, als w\u00fcrde er definieren, wer er ist.",
    coachBehavior: "Sprich \u00fcber n\u00e4chste Handlung, nicht \u00fcber Charakter.",
  },
  {
    id: "next-action",
    title: "Nach einem Fehler z\u00e4hlt die n\u00e4chste Handlung.",
    explanation:
      "Das Programm trainiert wiederholt Return-to-Task-Verhalten.",
    coachBehavior:
      "F\u00fchre den Spieler nach einem Fehler zur\u00fcck zu einer sauberen Aktion.",
  },
  {
    id: "praise-behavior",
    title: "Verhalten loben, nicht nur Ergebnis.",
    explanation:
      "Talent- und Ergebnislob kann n\u00fctzlich sein, aber Verhaltenslob unterst\u00fctzt Lernen und wiederholbare Leistung.",
    coachBehavior:
      "Benenne die konkrete Aktion, Anstrengung oder Recovery-Handlung.",
  },
  {
    id: "pressure-application",
    title: "Druck ist ein Ort zur Anwendung.",
    explanation:
      "Druck ist der Ort, an dem das System ge\u00fcbt wird, nicht der Ort, an dem Identit\u00e4t bewertet wird.",
    coachBehavior: "Nutze Prozesssprache unter Druck.",
  },
  {
    id: "private-stays-private",
    title: "Private Reflexion bleibt privat.",
    explanation:
      "Spieler reflektieren nur ehrlich, wenn sie vertrauen, dass verletzliche Reflexionen nicht gegen sie verwendet werden.",
    coachBehavior: "Nutze aggregierte Team-Daten, nicht private Spielertexte.",
  },
];

export const COACH_JOURNAL_QUESTIONS = {
  gratitude:
    "Wof\u00fcr bin ich diese Woche in diesem Team ehrlich dankbar?",
  reflection_1:
    "Wo habe ich diese Woche Growth Mindset im Team verst\u00e4rkt?",
  reflection_2:
    "Wo habe ich m\u00f6glicherweise unbewusst Ergebnisdruck, Angst vor Fehlern oder Selbstbewertung verst\u00e4rkt?",
  reflection_3:
    "Welche Team-Situation h\u00e4tte ich besser f\u00fchren k\u00f6nnen, ohne Spieler \u00f6ffentlich zu besch\u00e4men oder kleinzumachen?",
  action_commitment:
    "Welche eine Kommunikationsgewohnheit will ich n\u00e4chste Woche bewusst setzen?",
};

/**
 * Coach-facing Tagesguidance, abgeleitet vom primaryMechanism.
 * Deterministisch — keine AI.
 */
export interface CoachDayGuidance {
  support: string;
  avoid: string;
  integration60s: string;
}

export const getCoachDayGuidance = (
  primaryMechanism: string | undefined,
  lens: string | undefined
): CoachDayGuidance => {
  const m = (primaryMechanism ?? "").toLowerCase();
  const l = (lens ?? "").toLowerCase();
  const hay = `${m} ${l}`;

  if (/(process|prozess|result|ergebnis)/.test(hay)) {
    return {
      support:
        "Heute hilft es, Spieler nach Fehlern oder wichtigen Aktionen kurz auf die n\u00e4chste kontrollierbare Handlung zur\u00fcckzuf\u00fchren.",
      avoid:
        "Spieler nicht \u00fcber Ergebnis, Charakter oder Mentalit\u00e4t definieren. Besser \u00fcber Verhalten sprechen.",
      integration60s:
        "Vor dem Training kurz sagen: \u201eHeute z\u00e4hlt, wie schnell wir nach Ergebnisdruck wieder in die Aufgabe zur\u00fcckkommen.\u201c",
    };
  }
  if (/(pressure|druck|threat|challenge)/.test(hay)) {
    return {
      support:
        "Heute ist wichtig, dass Spieler Druck als Handlungssituation erleben, nicht als Bewertung ihrer Identit\u00e4t.",
      avoid:
        "Druck nicht moralisch aufladen oder als Charaktertest framen.",
      integration60s:
        "Vor dem Training: einen klaren Prozessfokus benennen, der unter Druck g\u00fcltig ist.",
    };
  }
  if (/(mistake|fehler|error|return)/.test(hay)) {
    return {
      support:
        "Heute hilft es, Fehler nicht gro\u00df zu machen, sondern Spieler schnell zur\u00fcck in die n\u00e4chste Handlung zu f\u00fchren.",
      avoid:
        "Nicht sofort Charakter oder Mentalit\u00e4t bewerten. Nicht lange erkl\u00e4ren, bevor der Spieler wieder handeln darf.",
      integration60s:
        "W\u00e4hrend des Trainings auf den Reset nach Fehlern achten — eine kurze, klare Cue.",
    };
  }
  if (/(identity|identit|self|selbst|ego)/.test(hay)) {
    return {
      support:
        "Heute hilft es, Spieler \u00fcber konkretes Verhalten zu spiegeln, nicht \u00fcber Etiketten.",
      avoid: "Keine Identit\u00e4tslabels (\u201egut\u201c, \u201eschwach\u201c, \u201eMentalit\u00e4t\u201c).",
      integration60s:
        "Nach dem Training eine Frage stellen, die auf Handlung zielt: \u201eWelche Aktion ist dir heute klar gelungen?\u201c",
    };
  }
  if (/(gratitude|dankbar|team|connection|sozial)/.test(hay)) {
    return {
      support:
        "Heute kann eine kurze Wertsch\u00e4tzung im Team das Klima stabilisieren.",
      avoid: "Keine ironischen oder vergleichenden Kommentare im Plenum.",
      integration60s:
        "Am Ende: ein Spieler benennt eine konkrete Handlung eines anderen, die heute geholfen hat.",
    };
  }
  if (/(effort|anstreng|discomfort|unbehagen|amcc)/.test(hay)) {
    return {
      support:
        "Heute kann eine kurze, schwierige aber machbare Sequenz Toleranz f\u00fcr Unbehagen aufbauen.",
      avoid: "Nicht in \u201eHarte-Hand\u201c-Sprache rutschen oder Erholung weglassen.",
      integration60s:
        "Eine 60-Sekunden-Sequenz: bewusst unangenehm, klar begrenzt, sauber abgeschlossen.",
    };
  }
  return {
    support:
      "Heute hilft es, den Tagesinhalt kurz vor dem Training zu benennen und Spieler in die Anwendung zu f\u00fchren.",
    avoid:
      "Den Tagesinhalt nicht als zus\u00e4tzlichen Druck framen.",
    integration60s:
      "Vor dem Training: eine Zeile zum Tagesfokus. Nach dem Training: eine kurze Frage dazu.",
  };
};
