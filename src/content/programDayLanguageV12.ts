import type { GoldenDayDraft } from "@/prototypes/golden-days/goldenDayDrafts";

type LanguageOverride = {
  title?: string;
  purpose?: string;
  tool?: string;
  mission?: Partial<GoldenDayDraft["mission"]>;
  preTraining?: Partial<NonNullable<GoldenDayDraft["preTraining"]>>;
};

/**
 * Eng begrenzte Sprachkorrekturen für sichtbare Missionen.
 *
 * Die Tagesmechanik, Reihenfolge, Anker und fachliche Bedeutung bleiben gleich.
 * Korrigiert werden nur Begriffe, die ohne Erklärung abstrakt oder technisch
 * wirken. Die freiwillige Vertiefung lebt getrennt in programDayExplanations.
 */
const LANGUAGE_OVERRIDES: Record<number, LanguageOverride> = {
  1: {
    mission: { title: "Wegdriften merken und zurückkommen" },
  },
  7: {
    mission: {
      why: "Komm zuerst zur aktuellen Aufgabe zurück. Entscheide danach, wie du diese eine Handlung ausführen willst.",
    },
    preTraining: {
      recallPrompt: "Welcher Satz bringt dich zurück, wenn dein Kopf noch beim Ergebnis ist?",
    },
  },
  11: {
    title: "Verlier keine weitere Kraft am selben Problem",
    purpose: "Du erkennst, wann dein Kopf immer wieder gegen dasselbe unveränderbare Problem kämpft.",
    mission: {
      title: "Problem erkennen und wieder handeln",
      steps: [
        "Benenne ehrlich, was passiert ist.",
        "Merk, wenn dein Kopf immer wieder dagegen ankämpft.",
        "Frag: Was kann ich jetzt beeinflussen? Handle dort weiter.",
      ],
    },
  },
  12: {
    title: "Handle für die Aufgabe, nicht für einen Beweis",
    mission: {
      title: "Den Grund hinter deiner Handlung prüfen",
      steps: [
        "Frag dich: Hilft meine Handlung der Aufgabe oder will ich etwas beweisen?",
        "Klär, was die Aufgabe wirklich braucht.",
        "Handle danach, ohne dich beweisen zu müssen.",
      ],
      why: "Dein Anspruch bleibt hoch. Die Aufgabe bestimmt, wie du ihn in dieser Situation zeigst.",
    },
  },
  21: {
    purpose: "Du richtest deine Aufmerksamkeit auf einen konkreten Beitrag, der der Aufgabe wirklich hilft.",
  },
  22: {
    purpose: "Du öffnest deinen Blick und siehst Problem, Funktionierendes und Möglichkeiten gleichzeitig.",
  },
  23: {
    title: "Trenne den Versuch von deinem Wert",
    mission: {
      trigger: "Wenn eine sinnvolle Handlung vor allem deshalb riskant wirkt, weil andere sie sehen.",
      steps: [
        "Prüfe Sicherheit, Nutzen für die Aufgabe und Lernchance.",
        "Trenne das Ergebnis des Versuchs von deinem Wert.",
        "Wähle einen angemessenen Versuch oder eine passende Anpassung.",
      ],
    },
  },
  24: {
    mission: {
      trigger: "Nach einer Situation, in der du bewusst so gehandelt hast, wie es die Aufgabe gebraucht hat.",
    },
  },
  27: {
    preTraining: {
      application: "Wähle eine Qualität. Prüfe danach nur kurz, ob der Versuch sicher und passend ist.",
    },
  },
  28: {
    title: "Erkenne, was dir gerade hilft",
    purpose: "Du ordnest die sieben bekannten Reaktionen und erkennst, welche zu welchem Problem passt.",
    tool: "Dein mentales System",
    mission: {
      title: "Problem erkennen und eine Reaktion wählen",
      steps: [
        "Frag zuerst: Was ist außerdem da?",
        "Erkenne danach, welche Art von Problem vorlag.",
        "Wähle genau eine bekannte Reaktion als nächsten Schritt.",
      ],
    },
    preTraining: {
      recallPrompt: "Welche Frage öffnet zuerst deinen Blick?",
      application: "Wenn du festhängst: Blick öffnen, Problem erkennen und eine passende Reaktion wählen.",
    },
  },
  29: {
    title: "Erkenne das Wegdriften früher",
    mission: {
      steps: [
        "Frag rückblickend: Was war mein erstes Zeichen?",
        "Achte in der nächsten ähnlichen Szene genau darauf.",
        "Nutze dann sofort deinen bekannten Satz.",
      ],
    },
  },
  30: {
    mission: {
      steps: [
        "Frag, welche Qualität die Aufgabe braucht.",
        "Prüfe, welchen Beitrag die Handlung leistet.",
        "Lass den Wunsch, etwas zu beweisen, aus der Ausführung heraus.",
      ],
    },
  },
  31: {
    mission: {
      steps: [
        "Trenne den Fehler von deinem ersten Urteil über dich.",
        "Finde die brauchbare Information im Fehler.",
        "Formuliere deine nächste klare Handlung ohne dieses Urteil.",
      ],
    },
  },
  37: {
    mission: {
      title: "Qualität wählen und den Versuch anpassen",
      why: "Bestimme zuerst, wie du handeln willst. Prüfe danach, in welcher sicheren Form du es umsetzen kannst.",
    },
  },
  38: {
    mission: {
      why: "Nutze zuerst die Information aus dem Fehler. Lass danach den Teil zurück, den du nicht mehr ändern kannst.",
    },
  },
  39: {
    mission: {
      why: "Erkenne zuerst den Gedanken. Entscheide danach sachlich, was du aus dem Fehler mitnehmen kannst.",
    },
  },
  40: {
    purpose: "Du prüfst eine schwierige Handlung nach ihrem Nutzen für die Aufgabe und dein Lernen.",
    mission: {
      steps: [
        "Prüfe, was die Aufgabe braucht.",
        "Prüfe Sicherheit und möglichen Nutzen der schwierigeren Handlung.",
        "Wähle die Handlung, die dir und der Aufgabe wirklich mehr bringt.",
      ],
    },
  },
  42: {
    purpose: "Du erkennst, wo du festhängst, und wählst genau eine bekannte Reaktion für die nächste Handlung.",
    mission: {
      title: "Erkennen, wo du festhängst",
      steps: [
        "Finde die Stelle, an der du festhingst.",
        "Wähle genau eine bekannte Reaktion, die dort hilft.",
        "Formuliere die daraus folgende Handlung.",
      ],
    },
    preTraining: {
      recallPrompt: "Welche Frage hilft dir zuerst, wenn du festhängst?",
      application: "Frag zuerst, was du beeinflussen kannst. Wähle danach eine passende bekannte Reaktion.",
    },
  },
  43: {
    title: "Ruf deinen Satz ohne Erklärung ab",
    mission: { title: "Wegdriften, Satz, nächste Aktion" },
    preTraining: {
      recallPrompt: "Schreib deinen bekannten Satz für den Fokus aus dem Gedächtnis auf.",
    },
  },
  46: {
    purpose: "Du erkennst, wenn du weiter gegen etwas Feststehendes ankämpfst, und nutzt selbstständig, was du noch beeinflussen kannst.",
    mission: {
      title: "Merken, dass du gegen Feststehendes kämpfst",
      steps: [
        "Merk, dass du erneut gegen etwas Feststehendes kämpfst.",
        "Ruf deine Einflussfrage ab.",
        "Handle an einem Punkt weiter, den du noch beeinflussen kannst.",
      ],
    },
  },
  47: {
    purpose: "Du rufst deinen bekannten Satz für Gedanken selbst ab, ohne den Gedanken zu bekämpfen oder zu ersetzen.",
    mission: {
      why: "Stabilität bedeutet nicht, dass schwierige Gedanken verschwinden. Sie bedeutet, dass du deine Handlung trotzdem selbst wählst.",
    },
  },
  49: {
    purpose: "Du öffnest deinen Blick auch an einem normalen Tag, bevor ein Problem fast alles andere verdeckt.",
  },
  50: {
    mission: { title: "Verlauf merken und zur nächsten Aktion kommen" },
  },
  51: {
    mission: {
      why: "Dein bekannter Satz für Gedanken hilft kurz im Hintergrund. Im Vordergrund bleibt: Passiert. Lernen. Weiter.",
    },
  },
  53: {
    mission: {
      steps: [
        "Prüfe Sicherheit und passende Größe.",
        "Prüfe, ob sie der Aufgabe hilft und dir eine echte Lernchance gibt.",
        "Entscheide bewusst. Dein persönlicher Grund darf dich unterstützen.",
      ],
    },
  },
  55: {
    mission: {
      trigger: "Denk an mehrere Situationen, in denen du bewusst anders und besser für deine Aufgabe gehandelt hast.",
    },
  },
  56: {
    title: "Erkenne, was dir hilft, und wende es an",
    purpose: "Du ordnest die sieben bekannten Reaktionen und planst, wie du sie nach dem Programm weiter nutzt.",
    tool: "Dein mentales System",
    mission: {
      title: "Erkennen, wählen und handeln",
      steps: [
        "Erkenne die Art des Problems.",
        "Wähle genau eine passende bekannte Reaktion.",
        "Formuliere die daraus folgende Handlung.",
      ],
      why: "Der Abschluss prüft keinen perfekten Menschen. Er zeigt dir, wie du das Gelernte selbstständig nutzen kannst.",
    },
    preTraining: {
      recallPrompt: "Welche drei Schritte ordnen dein mentales System?",
      application: "Erkennen. Eine passende Reaktion wählen. Die nächste Handlung ausführen.",
    },
  },
};

const simplifyVisibleCopy = (copy: string): string => copy
  .replace(/deinen Werkzeugkasten/giu, "dein mentales System")
  .replace(/Ein Werkzeugkasten/gu, "Ein mentales System")
  .replace(/ein Werkzeugkasten/gu, "ein mentales System")
  .replace(/Werkzeugbild/gu, "Übersicht der Reaktionen")
  .replace(/Unsicherheitswerkzeug/gu, "kurze Prüfung")
  .replace(/Welches Werkzeug/gu, "Welche Reaktion")
  .replace(/welches Werkzeug/gu, "welche Reaktion")
  .replace(/Dieses Werkzeug/gu, "Diese Reaktion")
  .replace(/dieses Werkzeug/gu, "diese Reaktion")
  .replace(/Das Werkzeug/gu, "Die Reaktion")
  .replace(/das Werkzeug/gu, "die Reaktion")
  .replace(/Ein Werkzeug/gu, "Eine Reaktion")
  .replace(/ein Werkzeug/gu, "eine Reaktion")
  .replace(/Einem Werkzeug/gu, "Einer Reaktion")
  .replace(/einem Werkzeug/gu, "einer Reaktion")
  .replace(/Alle sieben Werkzeuge/gu, "Alle sieben Reaktionen")
  .replace(/alle sieben Werkzeuge/gu, "alle sieben Reaktionen")
  .replace(/Werkzeugen/gu, "Reaktionen")
  .replace(/Werkzeuge/gu, "Reaktionen")
  .replace(/Werkzeug/gu, "Reaktion")
  .replace(/Alle sieben Cues/gu, "Alle sieben Sätze")
  .replace(/alle sieben Cues/gu, "alle sieben Sätze")
  .replace(/\bCues\b/gu, "Sätze")
  .replace(/\bCue\b/gu, "Satz")
  .replace(/Aufgabenwert und möglichen Lernnutzen/gu, "Nutzen für die Aufgabe und mögliche Lernchance")
  .replace(/Aufgabenwert und Lernnutzen/gu, "Nutzen für die Aufgabe und Lernchance")
  .replace(/Aufgabenwert/gu, "Nutzen für die Aufgabe")
  .replace(/Lernnutzen/gu, "Lernchance")
  .replace(/Aufgabenqualität/gu, "Qualität für die Aufgabe")
  .replace(/Beweisdruck/gu, "Druck, etwas beweisen zu müssen")
  .replace(/Wertbeweis/gu, "Beweis für deinen Wert")
  .replace(/Streuung merken, eine Aktion wählen/gu, "Merken, dass dein Kopf überall ist")
  .replace(/Merk die Streuung/gu, "Merk, dass deine Aufmerksamkeit überall ist")
  .replace(/Woran hast du die Streuung deiner Aufmerksamkeit gemerkt\?/gu, "Woran hast du gemerkt, dass deine Aufmerksamkeit überall war?")
  .replace(/Blicköffner-Frage/gu, "Frage für den breiteren Blick")
  .replace(/Der Blicköffner/gu, "Die Frage für den breiteren Blick")
  .replace(/den Blicköffner/gu, "die Frage für den breiteren Blick")
  .replace(/der Blicköffner/gu, "die Frage für den breiteren Blick")
  .replace(/Blicköffner/gu, "Frage für den breiteren Blick");

const fixReactionGrammar = (copy: string): string => copy
  .replace(/jedes Reaktion/gu, "jede Reaktion")
  .replace(/ein passendes Reaktion/gu, "eine passende Reaktion")
  .replace(/ein bekanntes Reaktion/gu, "eine bekannte Reaktion")
  .replace(/welches eine Reaktion/gu, "welche Reaktion")
  .replace(/Welches eine Reaktion/gu, "Welche Reaktion");

const mapVisibleCopy = <T,>(value: T): T => {
  if (typeof value === "string") return fixReactionGrammar(simplifyVisibleCopy(value)) as T;
  if (Array.isArray(value)) return value.map((entry) => mapVisibleCopy(entry)) as T;
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [key, mapVisibleCopy(entry)]),
    ) as T;
  }
  return value;
};

export const applyProgramDayLanguageV12 = (draft: GoldenDayDraft): GoldenDayDraft => {
  const override = LANGUAGE_OVERRIDES[draft.day];
  const merged = override ? {
    ...draft,
    ...override,
    mission: {
      ...draft.mission,
      ...override.mission,
    },
    preTraining: draft.preTraining
      ? {
          ...draft.preTraining,
          ...override.preTraining,
        }
      : draft.preTraining,
  } : draft;

  return mapVisibleCopy(merged);
};
