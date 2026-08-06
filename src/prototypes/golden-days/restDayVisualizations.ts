import type {
  GoldenDayDraft,
  GoldenDayQuestion,
  GoldenDayStage,
} from "./goldenDayDrafts";

export type RestVisualizationPhaseId =
  | "arrive"
  | "scene"
  | "moment"
  | "anchor"
  | "action"
  | "replay"
  | "transfer";

export type RestVisualizationPhase = {
  id: RestVisualizationPhaseId;
  prompt: string;
  durationSec: number;
  reveal?: string;
};

export type RestDayVisualization = {
  day: number;
  title: string;
  estimatedMinutes: number;
  phases: RestVisualizationPhase[];
  ownScenePhases: RestVisualizationPhase[];
  journal: {
    title: string;
    intro: string;
    questions: [GoldenDayQuestion, GoldenDayQuestion];
  };
};

type RestEditorial = {
  scene: string;
  moment: string;
  action: string;
  transfer: string;
  journalTitle: string;
  journalQuestions: [string, string];
};

const EDITORIAL: Record<number, RestEditorial> = {
  1: {
    scene: "Du bist mitten in deinem Sport. Eine Aktion klappt nicht so, wie du wolltest.",
    moment: "Dein Kopf bleibt bei der letzten Aktion hängen. Das, was jetzt kommt, wird kurz unscharf.",
    action: "Sieh, wie dein Blick und dein Körper wieder bei der nächsten Aktion ankommen.",
    transfer: "Beim nächsten echten Wegdriften suchst du nur die nächste Aktion.",
    journalTitle: "Wie kam ich im Kopf zurück?",
    journalQuestions: [
      "Woran hast du in deiner Vorstellung gemerkt, dass dein Kopf noch bei der letzten Aktion war?",
      "Was willst du beim nächsten echten Wegdriften zuerst tun?",
    ],
  },
  2: {
    scene: "Du bist in einer sportlichen Situation, in der andere dich sehen. Du willst unbedingt gut wirken.",
    moment: "Während du dich selbst beobachtest, wird die eigentliche Aufgabe weniger klar.",
    action: "Sieh, wie du eine wichtige Qualität wählst und genau danach handelst.",
    transfer: "Beim nächsten ähnlichen Moment fragst du, was die Aufgabe braucht.",
    journalTitle: "Was brauchte die Aufgabe?",
    journalQuestions: [
      "Womit warst du in deiner Vorstellung zuerst beschäftigt: mit der Aufgabe oder mit deinem Eindruck?",
      "Welche eine Qualität willst du beim nächsten echten Moment zeigen?",
    ],
  },
  3: {
    scene: "Du bist mitten in deinem Sport. Etwas außerhalb der aktuellen Aufgabe zieht deinen Kopf weg.",
    moment: "Du bemerkst das erste kleine Zeichen, dass deine Aufmerksamkeit nicht mehr da ist.",
    action: "Hol deinen Satz selbst zurück und richte dich auf deine nächste konkrete Aktion.",
    transfer: "Beim nächsten Wegdriften willst du den Satz etwas früher finden.",
    journalTitle: "Wie früh fand ich zurück?",
    journalQuestions: [
      "Welches erste Zeichen des Wegdriftens hast du in deiner Vorstellung bemerkt?",
      "Was willst du beim nächsten echten Moment direkt danach tun?",
    ],
  },
  4: {
    scene: "Du machst in deinem Sport einen Fehler. Für einen Moment willst du dich darüber ärgern oder dich selbst bewerten.",
    moment: "Der Fehler ist vorbei. Eine brauchbare Information daraus ist noch da.",
    action: "Hol genau eine Information heraus und nutze sie in der nächsten passenden Handlung.",
    transfer: "Nach dem nächsten Fehler suchst du eine Information statt eines Urteils.",
    journalTitle: "Was zeigte mir der Fehler?",
    journalQuestions: [
      "Welche eine brauchbare Information hast du aus dem vorgestellten Fehler geholt?",
      "Wie willst du diese Information beim nächsten echten Fehler nutzen?",
    ],
  },
  5: {
    scene: "Du bist in einer Aufgabe und merkst, dass du wieder stärker auf dich als auf die Aufgabe achtest.",
    moment: "Du weißt noch nicht genau, wie du handeln willst.",
    action: "Wähle eine Qualität wie Ruhe, Tempo oder Klarheit und zeig sie in deiner nächsten Handlung.",
    transfer: "Beim nächsten ähnlichen Moment wählst du eine Qualität statt weiter über dich nachzudenken.",
    journalTitle: "Welche Qualität führte?",
    journalQuestions: [
      "Welche eine Qualität hast du für die vorgestellte Aufgabe gewählt?",
      "Wie soll diese Qualität beim nächsten echten Moment sichtbar werden?",
    ],
  },
  6: {
    scene: "In deinem Sport passiert etwas, das du nicht mehr ändern kannst.",
    moment: "Du merkst, wie dein Kopf trotzdem weiter dagegen ankämpft.",
    action: "Trenne das Feststehende ab und richte deine Energie auf eine Sache, die du noch tun kannst.",
    transfer: "Beim nächsten unveränderbaren Moment suchst du deinen verbleibenden Einfluss.",
    journalTitle: "Was blieb bei mir?",
    journalQuestions: [
      "Was konntest du in deiner Vorstellung nicht mehr verändern?",
      "Welche eine Handlung lag trotzdem noch bei dir?",
    ],
  },
  7: {
    scene: "Du bist mitten in deinem Sport. Das Ergebnis, die Meinung anderer oder ein innerer Kommentar hält deinen Kopf fest.",
    moment: "Du merkst genauer, wodurch deine Aufmerksamkeit gerade gebunden ist.",
    action: "Komm zuerst zur nächsten Aktion zurück. Klär nur dann eine Qualität, wenn sie noch fehlt.",
    transfer: "Beim nächsten ähnlichen Moment trennst du Rückkehr und Handlungsqualität.",
    journalTitle: "Was band meine Aufmerksamkeit?",
    journalQuestions: [
      "Wodurch wurde deine Aufmerksamkeit in der Vorstellung gebunden?",
      "Was willst du beim nächsten echten Moment zuerst tun?",
    ],
  },
  8: {
    scene: "In deinem Sport taucht ein unangenehmer Gedanke oder ein starkes Gefühl auf.",
    moment: "Es drängt dich sofort zu Rückzug, Vermeidung oder einer schnellen Reaktion.",
    action: "Lass den Gedanken oder das Gefühl da sein und wähle trotzdem die Handlung, die besser zur Aufgabe passt.",
    transfer: "Beim nächsten starken inneren Impuls entscheidest du erst nach der Aufgabe.",
    journalTitle: "Was entschied wirklich?",
    journalQuestions: [
      "Zu welcher schnellen Handlung wollte dich der vorgestellte Gedanke oder das Gefühl drängen?",
      "Welche Handlung willst du beim nächsten echten Moment bewusst wählen?",
    ],
  },
  9: {
    scene: "Du machst einen Fehler, den du schon kennst. Dein Kopf will sofort lange darin hängen bleiben.",
    moment: "Du erinnerst dich an deine kurze Fehlerkette, bevor du weiter analysierst.",
    action: "Nimm eine brauchbare Information und setze sie in der nächsten Handlung um.",
    transfer: "Nach dem nächsten Fehler hältst du die Korrektur kurz und brauchbar.",
    journalTitle: "Welche Information blieb?",
    journalQuestions: [
      "Welche eine Information hast du aus dem vorgestellten Fehler gewählt?",
      "Wie sieht die nächste Handlung mit dieser Information aus?",
    ],
  },
  10: {
    scene: "Vor dir liegt eine sportliche Handlung, deren Ausgang du nicht sicher kennst.",
    moment: "Unsicherheit ist da. Du behandelst sie weder als Stopp noch als Mutprobe.",
    action: "Prüfe kurz Sicherheit, Erlaubnis und Aufgabe. Wähle dann einen kontrollierten Versuch.",
    transfer: "Bei der nächsten unsicheren Handlung prüfst du zuerst und entscheidest danach.",
    journalTitle: "Was war ein passender Versuch?",
    journalQuestions: [
      "Was machte die vorgestellte Handlung unsicher?",
      "Welchen sicheren und passenden Versuch willst du in einer echten Situation wählen?",
    ],
  },
  11: {
    scene: "In deinem Sport ärgerst du dich über etwas, das bereits feststeht.",
    moment: "Neben dem echten Problem entsteht ein zweiter Kampf in deinem Kopf.",
    action: "Lass den zusätzlichen Kampf los und richte dich auf das aus, was noch bei dir liegt.",
    transfer: "Beim nächsten Ärger trennst du Problem und zusätzlichen Kampf.",
    journalTitle: "Welchen Kampf ließ ich los?",
    journalQuestions: [
      "Was war in deiner Vorstellung das reale Problem und was kam im Kopf noch dazu?",
      "Worauf willst du deinen Einfluss beim nächsten echten Moment richten?",
    ],
  },
  12: {
    scene: "Eine sichtbare sportliche Handlung steht an. Du willst damit unbedingt etwas beweisen.",
    moment: "Beweisdruck und echte Aufgabenqualität fühlen sich für einen Moment gleich an.",
    action: "Frag, was die Aufgabe wirklich braucht, und handle aus dieser Qualität.",
    transfer: "Bei der nächsten wichtigen Handlung lässt du die Aufgabe statt den Beweis führen.",
    journalTitle: "Qualität statt Beweis",
    journalQuestions: [
      "Was wolltest du in deiner Vorstellung beweisen?",
      "Welche Qualität soll beim nächsten echten Moment stattdessen führen?",
    ],
  },
  13: {
    scene: "Ein Gedanke oder Gefühl taucht auf und will dich sofort zu Rückzug, Vermeidung oder Überreaktion bringen.",
    moment: "Du bemerkst nicht nur den inneren Impuls, sondern auch die Handlung, zu der er dich drängt.",
    action: "Lass den Impuls kurz da sein und entscheide, was besser zur Aufgabe passt.",
    transfer: "Beim nächsten inneren Impuls willst du die gedrängte Handlung früher erkennen.",
    journalTitle: "Wohin drängte mich der Impuls?",
    journalQuestions: [
      "Zu welcher Handlung hat dich der vorgestellte Impuls gedrängt?",
      "Welche Handlung willst du beim nächsten echten Moment stattdessen wählen?",
    ],
  },
  14: {
    scene: "Du bist mitten in einer sportlichen Aktion und denkst schon an Stand, Ausgang oder Ergebnis.",
    moment: "Die nächste ausführbare Handlung bekommt dadurch weniger Aufmerksamkeit.",
    action: "Lass das Ziel stehen und komm mit deinem Blick zur nächsten Aktion zurück.",
    transfer: "Beim nächsten Ergebnisgedanken suchst du wieder das, was jetzt ausführbar ist.",
    journalTitle: "Was war jetzt ausführbar?",
    journalQuestions: [
      "Bei welchem Ergebnis war dein Kopf in der Vorstellung?",
      "Welche nächste Aktion willst du in einem echten Moment wieder klar sehen?",
    ],
  },
  15: {
    scene: "Ein Problem in deinem Sport nimmt fast dein ganzes inneres Bild ein.",
    moment: "Andere reale Dinge, die funktionieren oder helfen könnten, verschwinden aus deinem Blick.",
    action: "Lass das Problem stehen und nimm zwei weitere reale Dinge in das Bild auf.",
    transfer: "Beim nächsten Tunnelblick fragst du, was außerdem da ist.",
    journalTitle: "Was war außerdem da?",
    journalQuestions: [
      "Was hat in deiner Vorstellung zuerst fast das ganze Bild eingenommen?",
      "Welche zwei weiteren Dinge willst du beim nächsten echten Tunnelblick wahrnehmen?",
    ],
  },
  16: {
    scene: "Eine passende sportliche Handlung fühlt sich unsicher an. Du möchtest lieber noch länger warten.",
    moment: "Du trennst fehlende Sicherheit von echter Gefahr oder fehlender Vorbereitung.",
    action: "Prüfe Sicherheit und Vorbereitung. Wenn es passt, stell dir einen angemessenen Versuch vor.",
    transfer: "Beim nächsten Warten prüfst du, ob ein passender Versuch schon möglich ist.",
    journalTitle: "Warten oder versuchen?",
    journalQuestions: [
      "Was hat die vorgestellte Handlung unsicher gemacht?",
      "Welcher angemessene Versuch wäre in einer echten Situation möglich?",
    ],
  },
  17: {
    scene: "Nach einem Fehler willst du in deinem Kopf sofort viele Dinge gleichzeitig verändern.",
    moment: "Die vielen Korrekturen machen die nächste Handlung unklar.",
    action: "Wähle eine kleine Korrektur mit direktem Nutzen und setze nur diese um.",
    transfer: "Beim nächsten Fehler trennst du Sofortkorrektur und spätere Analyse.",
    journalTitle: "Welche Korrektur zählt jetzt?",
    journalQuestions: [
      "Welche eine Korrektur war in deiner Vorstellung sofort ausführbar?",
      "Was darf beim nächsten echten Fehler bewusst bis später warten?",
    ],
  },
  18: {
    scene: "Du gehst in eine sportliche Situation, obwohl Motivation, Energie oder Präsenz nicht ideal sind.",
    moment: "Du nimmst deinen Zustand ehrlich wahr, ohne ihn zum vollständigen Stopp zu machen.",
    action: "Prüfe, was sicher und sinnvoll möglich ist, und richte dich auf genau diese nächste Aktion.",
    transfer: "Beim nächsten schwierigen Zustand suchst du das, was trotzdem passend möglich ist.",
    journalTitle: "Was war trotzdem möglich?",
    journalQuestions: [
      "Welcher Zustand war in deiner Vorstellung deutlich da?",
      "Welche sichere und sinnvolle nächste Aktion willst du in einem echten Moment finden?",
    ],
  },
  19: {
    scene: "Ein unveränderbarer Moment aus deinem Sport läuft zum zweiten oder dritten Mal in deinem Kopf.",
    moment: "Du merkst, wie dieselben Gedanken den Ärger erneut verstärken.",
    action: "Unterbrich die Wiederholung und gib deine Aufmerksamkeit einer Handlung, die noch bei dir liegt.",
    transfer: "Beim nächsten wiederholten Ärger suchst du früher deinen Einfluss.",
    journalTitle: "Was verstärkte den Ärger?",
    journalQuestions: [
      "Welcher Gedanke hat den vorgestellten Ärger immer weiter verstärkt?",
      "Wohin willst du deine Aufmerksamkeit beim nächsten echten Moment lenken?",
    ],
  },
  20: {
    scene: "In einer sportlichen Situation reagierst du sehr schnell und fast automatisch.",
    moment: "Du lässt die Szene langsamer laufen: Situation, innerer Impuls und gedrängte Handlung werden einzeln sichtbar.",
    action: "Finde die Stelle, an der du anders entscheiden kannst, und stell dir diese Handlung vor.",
    transfer: "Beim nächsten schnellen Impuls suchst du den kleinen Entscheidungsmoment.",
    journalTitle: "Wo konnte ich entscheiden?",
    journalQuestions: [
      "An welcher Stelle der vorgestellten Kette lag deine Entscheidung?",
      "Welche andere Handlung willst du beim nächsten echten Impuls wählen?",
    ],
  },
  21: {
    scene: "Du beschäftigst dich in deinem Sport stark mit deiner Wirkung, Bewertung oder Position.",
    moment: "Während dein Bild im Mittelpunkt steht, wird dein konkreter Beitrag zur Aufgabe leiser.",
    action: "Wähle einen Beitrag und stell dir vor, wie du ihn in der nächsten Handlung sichtbar machst.",
    transfer: "Beim nächsten Selbstbeobachten suchst du deinen Beitrag zur Aufgabe.",
    journalTitle: "Welchen Beitrag zeigte ich?",
    journalQuestions: [
      "Welchen konkreten Beitrag brauchte die vorgestellte Aufgabe von dir?",
      "Wie willst du diesen Beitrag beim nächsten echten Moment sichtbar machen?",
    ],
  },
  22: {
    scene: "Ein Problem oder Mangel bestimmt fast deine ganze sportliche Situation.",
    moment: "Du erkennst das Problem und suchst gleichzeitig nach dem, was funktioniert, trägt oder möglich bleibt.",
    action: "Nimm das vollständigere Bild auf und wähle daraus deine nächste Handlung.",
    transfer: "Beim nächsten engen Blick öffnest du erst das Bild und handelst dann.",
    journalTitle: "Was wurde wieder sichtbar?",
    journalQuestions: [
      "Was war neben dem Problem in deiner Vorstellung noch real vorhanden?",
      "Welche Handlung willst du beim nächsten echten Moment daraus wählen?",
    ],
  },
  23: {
    scene: "Eine sinnvolle sportliche Handlung fühlt sich wegen möglicher Außenwirkung wie eine persönliche Prüfung an.",
    moment: "Du trennst den Ausgang des Versuchs von deinem Wert als Person.",
    action: "Prüfe Sicherheit, Nutzen und Lernchance. Wähle danach einen angemessenen Versuch.",
    transfer: "Beim nächsten Lernversuch prüfst du die Handlung statt deinen Wert.",
    journalTitle: "Versuch statt Wertprüfung",
    journalQuestions: [
      "Warum fühlte sich die vorgestellte Handlung wie eine persönliche Prüfung an?",
      "Welchen angemessenen Versuch willst du in einer echten Situation wählen?",
    ],
  },
  24: {
    scene: "Stell dir eine sportliche Handlung vor, die wirklich gut zur Aufgabe passt.",
    moment: "Du hältst nicht das Ergebnis fest, sondern die Qualität, die in deiner Handlung sichtbar war.",
    action: "Lass dieselbe Qualität in einer zweiten ähnlichen Handlung noch einmal auftauchen.",
    transfer: "Beim nächsten guten Moment merkst du dir die wiederholbare Qualität.",
    journalTitle: "Welche Qualität will ich wiederholen?",
    journalQuestions: [
      "Welche Qualität war in deiner vorgestellten Handlung sichtbar?",
      "Wie willst du diese Qualität beim nächsten echten Moment erneut zeigen?",
    ],
  },
  25: {
    scene: "Vor einer sportlichen Handlung sagt dein Kopf, dass du noch nicht bereit bist oder es lieber lassen solltest.",
    moment: "Du bemerkst den Zweifel, ohne auf ein anderes Gefühl zu warten.",
    action: "Prüfe die Aufgabe und stell dir vor, wie du die passende Handlung trotzdem beginnst.",
    transfer: "Beim nächsten Zweifel entscheidest du nach der Aufgabe, nicht nach innerer Erlaubnis.",
    journalTitle: "Worauf wartete mein Kopf?",
    journalQuestions: [
      "Welche innere Erlaubnis wollte dein Kopf in der Vorstellung abwarten?",
      "Welche passende Handlung willst du beim nächsten echten Zweifel trotzdem beginnen?",
    ],
  },
  26: {
    scene: "Eine unsichere sportliche Situation wirkt im ersten Moment gefährlich oder wie ein Test deiner Person.",
    moment: "Du verlangsamst deine erste Einschätzung und prüfst reale Gefahr, Vorbereitung und Aufgabe.",
    action: "Wähle danach einen sicheren und passenden nächsten Schritt.",
    transfer: "Beim nächsten starken ersten Eindruck prüfst du die Fakten, bevor du entscheidest.",
    journalTitle: "Was zeigte die Prüfung?",
    journalQuestions: [
      "Wie wirkte die vorgestellte Situation im ersten Moment auf dich?",
      "Welcher sichere nächste Schritt wurde nach der Prüfung passend?",
    ],
  },
  27: {
    scene: "Du kennst die passende sportliche Handlung, aber nicht ihren Ausgang.",
    moment: "Du lässt den offenen Ausgang stehen und bestimmst trotzdem, wie du handeln willst.",
    action: "Wähle eine Qualität und stell dir vor, wie du die Handlung genau damit ausführst.",
    transfer: "Beim nächsten offenen Ausgang führst du über die Qualität statt über Sicherheit.",
    journalTitle: "Welche Qualität blieb wählbar?",
    journalQuestions: [
      "Welche Qualität hast du trotz des offenen Ausgangs gewählt?",
      "Wie willst du diese Qualität in einer echten unsicheren Handlung zeigen?",
    ],
  },
  28: {
    scene: "Du hängst in einer sportlichen Situation fest und weißt zunächst nicht, was dir helfen kann.",
    moment: "Du öffnest zuerst deinen Blick und erkennst danach genauer, welche Art von Problem vorliegt.",
    action: "Wähle ein bekanntes Werkzeug und stell dir die daraus folgende Handlung vor.",
    transfer: "Beim nächsten Festhängen öffnest du den Blick und wählst dann ein Werkzeug.",
    journalTitle: "Welches Werkzeug passte?",
    journalQuestions: [
      "Was wurde in deiner Vorstellung sichtbar, nachdem du den Blick geöffnet hast?",
      "Welches eine Werkzeug willst du in einer ähnlichen echten Situation wählen?",
    ],
  },
  29: {
    scene: "Du bemerkst erst spät, dass deine Aufmerksamkeit schon länger nicht mehr bei der sportlichen Aufgabe ist.",
    moment: "Du lässt die Szene zurücklaufen und findest das erste kleine Zeichen des Wegdriftens.",
    action: "Beginne die Szene erneut und nutze deinen Satz direkt bei diesem früheren Zeichen.",
    transfer: "Beim nächsten Wegdriften achtest du auf genau dieses frühe Zeichen.",
    journalTitle: "Was war mein erstes Zeichen?",
    journalQuestions: [
      "Welches frühe Zeichen des Wegdriftens hast du in der Vorstellung gefunden?",
      "Was willst du in einer echten Situation direkt danach tun?",
    ],
  },
  30: {
    scene: "Du planst eine intensive oder besonders sichtbare sportliche Handlung.",
    moment: "Du prüfst, ob sie wirklich zur Aufgabe beiträgt oder vor allem etwas beweisen soll.",
    action: "Lass unnötigen Beweisdruck weg und führe nur die passende Qualität aus.",
    transfer: "Bei der nächsten sichtbaren Handlung prüfst du Beitrag und Qualität.",
    journalTitle: "Beitrag oder Beweis?",
    journalQuestions: [
      "Welchen Beitrag sollte die vorgestellte Handlung zur Aufgabe leisten?",
      "Was willst du beim nächsten echten Moment ohne zusätzlichen Beweisdruck tun?",
    ],
  },
  31: {
    scene: "Ein sportlicher Fehler beeinflusst in deinem Kopf bereits mehrere weitere Handlungen.",
    moment: "Du trennst den Fehler, dein erstes Urteil und die Verengung danach voneinander.",
    action: "Nimm eine brauchbare Information und stell dir die nächste Handlung ohne das Urteil vor.",
    transfer: "Beim nächsten Fehler willst du Urteil und Information schneller trennen.",
    journalTitle: "Was blieb ohne das Urteil?",
    journalQuestions: [
      "Welches Urteil kam in deiner Vorstellung direkt nach dem Fehler?",
      "Welche Information und nächste Handlung blieben ohne dieses Urteil übrig?",
    ],
  },
  32: {
    scene: "Frust und mögliche nächste Schritte gehen in einer sportlichen Situation durcheinander.",
    moment: "Du trennst den reinen Fakt von deinem zusätzlichen inneren Kampf.",
    action: "Wähle eine Sache, die du trotzdem noch tun kannst, und stell dir diese Handlung vor.",
    transfer: "Beim nächsten Frust trennst du Fakt, Kampf und nächsten Schritt.",
    journalTitle: "Was war Fakt, was Kampf?",
    journalQuestions: [
      "Was war in deiner Vorstellung der reine Fakt und was kam im Kopf noch dazu?",
      "Welche Handlung willst du beim nächsten echten Frust trotzdem nutzen?",
    ],
  },
  33: {
    scene: "Du willst in deinem Sport sofort reagieren, vermeiden oder aufgeben.",
    moment: "Du erkennst den ersten Gedanken oder das erste Gefühl und die Handlung, zu der es dich drängt.",
    action: "Halte den kleinen Entscheidungsmoment fest und wähle, was besser zur Aufgabe passt.",
    transfer: "Beim nächsten schnellen Impuls suchst du genau diesen Entscheidungsmoment.",
    journalTitle: "Wo lag meine Entscheidung?",
    journalQuestions: [
      "Zu welcher automatischen Handlung hat dich der vorgestellte Impuls gedrängt?",
      "Welche bewusste Entscheidung willst du beim nächsten echten Moment treffen?",
    ],
  },
  34: {
    scene: "Eine neue oder schwierige sportliche Handlung wirkt entweder zu groß oder leicht vermeidbar.",
    moment: "Du prüfst Sicherheit und Vorbereitung, ohne Schwierigkeit blind zu suchen.",
    action: "Passe Größe, Tempo oder Schwierigkeit an und stell dir den passenden Versuch vor.",
    transfer: "Bei der nächsten Herausforderung suchst du die passende Größe.",
    journalTitle: "Welche Größe passte?",
    journalQuestions: [
      "Wie hast du den vorgestellten Versuch passend groß gemacht?",
      "Was willst du bei der nächsten echten Herausforderung zuerst prüfen?",
    ],
  },
  35: {
    scene: "Ein Problem nimmt in einer sportlichen Situation fast dein gesamtes inneres Bild ein.",
    moment: "Du hältst die Szene an und suchst zwei reale Informationen, die damals ebenfalls da waren.",
    action: "Nimm die fehlenden Informationen auf und stell dir die dadurch mögliche Handlung vor.",
    transfer: "Beim nächsten engen Blick suchst du bewusst nach fehlenden Informationen.",
    journalTitle: "Welche Informationen fehlten?",
    journalQuestions: [
      "Welche zwei realen Informationen hast du dem vorgestellten Bild hinzugefügt?",
      "Welche andere Handlung willst du dadurch in einer echten Situation erkennen?",
    ],
  },
  36: {
    scene: "Viele Reize und Gedanken ziehen in deinem Sport gleichzeitig an deiner Aufmerksamkeit.",
    moment: "Du merkst: Mein Kopf ist gerade überall. Du versuchst nicht, alles auf einmal zu lösen.",
    action: "Lass den Rest kurz unscharf werden und richte dich auf eine nächste konkrete Aktion.",
    transfer: "Beim nächsten Chaos suchst du nicht die perfekte Ordnung, sondern die nächste Aktion.",
    journalTitle: "Was war meine nächste Aktion?",
    journalQuestions: [
      "Woran hast du die verteilte Aufmerksamkeit in deiner Vorstellung gemerkt?",
      "Welche nächste Aktion willst du beim nächsten echten Chaos finden?",
    ],
  },
  37: {
    scene: "Die nötige sportliche Handlung ist klar, aber ihre Ausführung fühlt sich unsicher an.",
    moment: "Du bestimmst zuerst die Qualität der Aufgabe und prüfst danach die passende Größe des Versuchs.",
    action: "Stell dir vor, wie du genau diese Qualität sicher und passend ausführst.",
    transfer: "Beim nächsten unsicheren Versuch lässt du zuerst die Aufgabe führen.",
    journalTitle: "Welche Qualität führte?",
    journalQuestions: [
      "Welche Qualität brauchte die vorgestellte Aufgabe?",
      "Wie willst du diese Qualität beim nächsten echten Versuch passend ausführen?",
    ],
  },
  38: {
    scene: "Nach einem sportlichen Fehler kämpfst du zugleich gegen Bedingungen, Entscheidungen oder den vergangenen Moment.",
    moment: "Du trennst deinen veränderbaren Anteil vom Teil, der bereits feststeht.",
    action: "Hol eine brauchbare Information aus deinem Anteil und nutze sie in der nächsten Handlung.",
    transfer: "Beim nächsten Fehler trennst du Korrektur und Protest.",
    journalTitle: "Was war wirklich korrigierbar?",
    journalQuestions: [
      "Welche Information aus deinem Anteil war in der Vorstellung brauchbar?",
      "Welche nächste Handlung willst du daraus in einer echten Situation machen?",
    ],
  },
  39: {
    scene: "Direkt nach einem sportlichen Fehler taucht ein harter oder endgültiger Satz in deinem Kopf auf.",
    moment: "Du erkennst diesen Satz als Gedanken, nicht als vollständige Wahrheit über den Fehler.",
    action: "Suche die sachliche Information und stell dir deine nächste Handlung daraus vor.",
    transfer: "Beim nächsten harten Satz lässt du die Information statt das Urteil korrigieren.",
    journalTitle: "Welcher Satz wollte bestimmen?",
    journalQuestions: [
      "Welcher erste Satz tauchte in deiner Vorstellung nach dem Fehler auf?",
      "Welche sachliche Information willst du beim nächsten echten Fehler stattdessen nutzen?",
    ],
  },
  40: {
    scene: "Du entscheidest zwischen einer sicheren Standardhandlung und einer schwierigeren sportlichen Möglichkeit.",
    moment: "Du prüfst Aufgabe, Sicherheit und Lernwert statt Show oder Beweis.",
    action: "Wähle die Handlung mit dem besseren Gesamtwert und stell dir ihre Ausführung vor.",
    transfer: "Bei der nächsten Wahl prüfst du den Nutzen der Herausforderung.",
    journalTitle: "Welche Handlung hatte mehr Wert?",
    journalQuestions: [
      "Welche Handlung diente in deiner Vorstellung Aufgabe, Sicherheit und Lernen besser?",
      "Was willst du bei der nächsten echten Wahl prüfen?",
    ],
  },
  41: {
    scene: "Mehrere Belastungen stapeln sich und machen deinen Blick in einer sportlichen Situation immer enger.",
    moment: "Du nimmst das Problem und weitere reale Informationen gleichzeitig wahr.",
    action: "Finde eine kleine Handlung in deinem Einfluss und stell dir vor, wie du sie beginnst.",
    transfer: "Wenn sich Belastung wieder stapelt, öffnest du den Blick und suchst eine kleine Handlung.",
    journalTitle: "Was blieb trotz Belastung möglich?",
    journalQuestions: [
      "Was war in deiner Vorstellung trotz der Belastung noch hilfreich oder möglich?",
      "Welche kleine Handlung willst du beim nächsten echten Moment nutzen?",
    ],
  },
  42: {
    scene: "Mehrere innere Reaktionen laufen in einer sportlichen Situation nacheinander ab.",
    moment: "Du hältst die Szene genau dort an, wo du festhängst.",
    action: "Wähle ein bekanntes Werkzeug und stell dir die daraus folgende Handlung vor.",
    transfer: "Beim nächsten Festhängen suchst du zuerst die genaue Stelle und dann ein Werkzeug.",
    journalTitle: "Wo hing ich fest?",
    journalQuestions: [
      "An welcher Stelle der vorgestellten Szene bist du festgehangen?",
      "Welches eine Werkzeug willst du in einer ähnlichen echten Situation nutzen?",
    ],
  },
  43: {
    scene: "Ein kleines Zeichen zeigt dir, dass deine Aufmerksamkeit nicht mehr vollständig bei der sportlichen Aufgabe ist.",
    moment: "Du bemerkst das Wegdriften, bevor es groß wird.",
    action: "Hol deinen Satz ohne Erklärung zurück und beginne deine nächste Aktion.",
    transfer: "Beim nächsten kleinen Zeichen willst du den Satz selbst finden.",
    journalTitle: "Wie schnell kam mein Satz?",
    journalQuestions: [
      "Welches erste Zeichen des Wegdriftens hast du in der Vorstellung erkannt?",
      "Wie willst du deinen Satz beim nächsten echten Moment schneller zurückholen?",
    ],
  },
  44: {
    scene: "Eine wichtige sportliche Handlung fühlt sich zugleich wie ein Test deiner Person an.",
    moment: "Du erinnerst dich an die Aufgabe und lässt den zusätzlichen Selbstbeweis weg.",
    action: "Wähle die nötige Qualität und stell dir eine ruhige, klare Ausführung vor.",
    transfer: "Beim nächsten wichtigen Moment zeigst du Qualität ohne dich zu beweisen.",
    journalTitle: "Qualität ohne Selbstbeweis",
    journalQuestions: [
      "Welche Qualität brauchte die vorgestellte Aufgabe unabhängig von deinem Bild?",
      "Wie willst du sie beim nächsten echten Moment ruhig zeigen?",
    ],
  },
  45: {
    scene: "Ein sportlicher Fehler fühlt sich sofort wie eine Aussage über dich an.",
    moment: "Du beschreibst den Fehler als Fakt und lässt das persönliche Urteil danebenstehen.",
    action: "Wähle eine brauchbare Information und stell dir deine nächste Handlung vor.",
    transfer: "Beim nächsten persönlichen Fehlergefühl trennst du Fakt und Urteil.",
    journalTitle: "Fehler oder Urteil?",
    journalQuestions: [
      "Welches persönliche Urteil wollte dein Kopf aus dem vorgestellten Fehler machen?",
      "Welche Information und nächste Handlung willst du in einer echten Situation behalten?",
    ],
  },
  46: {
    scene: "Du kämpfst in deinem Kopf erneut gegen eine sportliche Realität, die bereits feststeht.",
    moment: "Du erkennst, wie dieser Kampf deine Energie weiter bindet.",
    action: "Hol deine Einflussfrage selbst zurück und handle an einem verfügbaren Punkt weiter.",
    transfer: "Beim nächsten inneren Kampf bringst du deine Energie zu dem zurück, was du tun kannst.",
    journalTitle: "Wohin ging meine Energie?",
    journalQuestions: [
      "Welche feststehende Realität hast du in deiner Vorstellung weiter bekämpft?",
      "Welche Handlung willst du beim nächsten echten Moment wieder möglich machen?",
    ],
  },
  47: {
    scene: "Ein harter innerer Satz taucht in deinem Sport wiederholt und überzeugend auf.",
    moment: "Du lässt ihn da sein, ohne ihn zu bekämpfen oder ihm zu folgen.",
    action: "Hol deinen Satz für heute zurück und wähle deine Handlung nach der Aufgabe.",
    transfer: "Beim nächsten lauten Gedanken lässt du die Aufgabe entscheiden.",
    journalTitle: "Welchem Satz folgte ich nicht?",
    journalQuestions: [
      "Wozu wollte dich der vorgestellte innere Satz bringen?",
      "Welche Handlung willst du beim nächsten echten Moment nach der Aufgabe wählen?",
    ],
  },
  48: {
    scene: "Eine sportliche Handlung läuft schwerer als erwartet.",
    moment: "Du behandelst die Schwierigkeit als Information über Vorbereitung oder Größe des Versuchs.",
    action: "Passe den Versuch an und stell dir den nächsten sicheren und sinnvollen Schritt vor.",
    transfer: "Beim nächsten schwierigen Moment fragst du, was die Schwierigkeit konkret zeigt.",
    journalTitle: "Was zeigte die Schwierigkeit?",
    journalQuestions: [
      "Was hat die vorgestellte Schwierigkeit über Vorbereitung oder Größe gezeigt?",
      "Welchen passenden nächsten Schritt willst du in einer echten Situation wählen?",
    ],
  },
  49: {
    scene: "Du bist in einem gewöhnlichen sportlichen Moment. Es gibt kein großes Problem.",
    moment: "Du merkst, worauf dein Blick zuerst gerichtet ist, und holst deine Frage selbst zurück.",
    action: "Nimm zwei weitere reale Dinge in deinem Umfeld wahr.",
    transfer: "Beim nächsten normalen Moment öffnest du deinen Blick, bevor er eng wird.",
    journalTitle: "Was sah ich zusätzlich?",
    journalQuestions: [
      "Worauf war dein Blick in der Vorstellung zuerst gerichtet?",
      "Welche zwei weiteren Dinge willst du in einem echten normalen Moment wahrnehmen?",
    ],
  },
  50: {
    scene: "Mehrere gute oder schlechte sportliche Aktionen liegen direkt hinter dir.",
    moment: "Du merkst, wie der bisherige Verlauf deine nächste Handlung mitziehen will.",
    action: "Komm zu deiner nächsten Aktion zurück, wähle eine Qualität und führe sie aus.",
    transfer: "Beim nächsten starken Verlauf lässt du die aktuelle Aufgabe neu beginnen.",
    journalTitle: "Was bestimmte die nächste Aktion?",
    journalQuestions: [
      "Wie wollte der vorgestellte Verlauf deine nächste Handlung beeinflussen?",
      "Welche Aktion und Qualität willst du beim nächsten echten Moment wählen?",
    ],
  },
  51: {
    scene: "Direkt nach einem sportlichen Fehler taucht ein harter innerer Satz auf.",
    moment: "Du erkennst den Satz, ohne ihm automatisch zu folgen, und schaust wieder auf den Fehler.",
    action: "Hol eine brauchbare Information heraus und nutze sie in deiner nächsten Handlung.",
    transfer: "Beim nächsten Fehler löst du zuerst den Gedanken und arbeitest dann mit der Information.",
    journalTitle: "Gedanke, Information, Handlung",
    journalQuestions: [
      "Welcher innere Satz tauchte in deiner Vorstellung direkt nach dem Fehler auf?",
      "Welche Information willst du beim nächsten echten Fehler für deine Handlung nutzen?",
    ],
  },
  52: {
    scene: "Ein unveränderbarer Teil einer sportlichen Situation bestimmt fast dein gesamtes Bild.",
    moment: "Du benennst den Fakt und nimmst weitere reale Informationen dazu.",
    action: "Finde im vollständigeren Bild einen Punkt in deinem Einfluss und nutze ihn.",
    transfer: "Beim nächsten unveränderbaren Moment siehst du erst vollständig und handelst dann.",
    journalTitle: "Was gehörte noch zur Realität?",
    journalQuestions: [
      "Welche weiteren Informationen gehörten in deiner Vorstellung zum feststehenden Fakt?",
      "Welchen Punkt willst du in einer echten Situation beeinflussen?",
    ],
  },
  53: {
    scene: "Du musst eine schwierige sportliche Handlung bewusst wählen oder ablehnen.",
    moment: "Du prüfst Sicherheit, Größe, Aufgabenwert und Lernchance.",
    action: "Triff eine klare Entscheidung und stell dir vor, wie du sie ruhig ausführst.",
    transfer: "Bei der nächsten Herausforderung prüfst du, ob sie wirklich zu dir und der Aufgabe passt.",
    journalTitle: "Welche Herausforderung passte?",
    journalQuestions: [
      "Wie passten in deiner Vorstellung Sicherheit, Aufgabe und Lernchance zusammen?",
      "Welche klare Entscheidung willst du bei einer ähnlichen echten Herausforderung treffen?",
    ],
  },
  54: {
    scene: "Vor deiner nächsten sportlichen Handlung wartet dein Kopf auf Lob, Erfolg oder ein besseres Gefühl.",
    moment: "Du bemerkst den Wunsch nach Bestätigung, ohne ihn entscheiden zu lassen.",
    action: "Wähle die passende Aktion und stell dir vor, wie du sie ruhig ohne neuen Beweis ausführst.",
    transfer: "Beim nächsten Warten auf Bestätigung handelst du wieder nach der Aufgabe.",
    journalTitle: "Worauf wollte ich warten?",
    journalQuestions: [
      "Auf welche Bestätigung wollte dein Kopf in der Vorstellung warten?",
      "Welche Handlung willst du beim nächsten echten Moment trotzdem ruhig ausführen?",
    ],
  },
  55: {
    scene: "Du siehst zwei sportliche Handlungen vor dir, die du in Zukunft häufiger zeigen möchtest.",
    moment: "Du erkennst die gemeinsame Qualität hinter beiden Handlungen.",
    action: "Lass beide Handlungen noch einmal laufen und halte die gemeinsame Qualität fest.",
    transfer: "Bei der nächsten Gelegenheit zeigst du deinen Standard durch eine konkrete Handlung.",
    journalTitle: "Welchen Standard will ich zeigen?",
    journalQuestions: [
      "Welche gemeinsame Qualität hatten deine beiden vorgestellten Handlungen?",
      "Mit welcher konkreten Handlung willst du diesen Standard als Nächstes zeigen?",
    ],
  },
  56: {
    scene: "Du bist in einer sportlichen Situation, in der du mental festhängst.",
    moment: "Du erkennst zuerst die Art des Problems und gehst deine bekannten Werkzeuge ruhig durch.",
    action: "Wähle genau ein Werkzeug und stell dir die daraus folgende Handlung vollständig vor.",
    transfer: "Nach dem Programm nutzt du weiter: erkennen, ein Werkzeug wählen und handeln.",
    journalTitle: "Welches Werkzeug nehme ich mit?",
    journalQuestions: [
      "Welches Werkzeug hast du in deiner Vorstellung gewählt und warum passte es?",
      "Wie willst du dieses Werkzeug in den nächsten Wochen weiter erinnern?",
    ],
  },
};

const PHASE_DURATIONS: Record<GoldenDayStage, [number, number, number, number, number, number, number]> = {
  Aufbau: [20, 40, 30, 25, 45, 60, 20],
  Rückkehr: [20, 45, 35, 40, 45, 65, 20],
  Vertiefung: [25, 55, 50, 40, 60, 75, 25],
  Integration: [30, 65, 55, 45, 75, 90, 30],
  Abschluss: [30, 80, 65, 60, 90, 120, 35],
};

const replayPrompt = (stage: GoldenDayStage): string => {
  if (stage === "Aufbau") return "Lass dieselbe Szene noch einmal laufen. Nutze deinen Satz diesmal etwas früher.";
  if (stage === "Rückkehr") return "Lass die Szene noch einmal laufen. Hol deinen Satz diesmal ohne Hilfe zurück.";
  if (stage === "Vertiefung") return "Lass die Szene noch einmal laufen. Erkenne den entscheidenden Moment etwas früher.";
  if (stage === "Integration") return "Lass die ganze Szene noch einmal ruhig und ohne Unterbrechung laufen.";
  return "Lass die ganze Szene noch einmal mit möglichst wenig Hilfe durchlaufen.";
};

const anchorPhase = (
  draft: GoldenDayDraft,
  durationSec: number,
): RestVisualizationPhase => {
  if (draft.stage === "Aufbau") {
    return {
      id: "anchor",
      prompt: `Sag dir jetzt: ${draft.cue}`,
      durationSec,
    };
  }

  return {
    id: "anchor",
    prompt: "Welcher Satz hilft dir jetzt? Hol ihn zuerst selbst zurück.",
    durationSec,
    reveal: draft.cue,
  };
};

const buildPhases = (
  draft: GoldenDayDraft,
  editorial: RestEditorial,
  ownScene: boolean,
): RestVisualizationPhase[] => {
  const durations = PHASE_DURATIONS[draft.stage];
  return [
    {
      id: "arrive",
      prompt: "Mach es dir bequem. Lass deine Schultern kurz locker und komm hier an.",
      durationSec: durations[0],
    },
    {
      id: "scene",
      prompt: ownScene
        ? "Hol deine eigene passende Sportszene zurück. Lass sie kurz vor dem wichtigen Moment beginnen."
        : editorial.scene,
      durationSec: durations[1],
    },
    {
      id: "moment",
      prompt: editorial.moment,
      durationSec: durations[2],
    },
    anchorPhase(draft, durations[3]),
    {
      id: "action",
      prompt: editorial.action,
      durationSec: durations[4],
    },
    {
      id: "replay",
      prompt: replayPrompt(draft.stage),
      durationSec: durations[5],
    },
    {
      id: "transfer",
      prompt: editorial.transfer,
      durationSec: durations[6],
    },
  ];
};

export const getRestDayVisualization = (draft: GoldenDayDraft): RestDayVisualization => {
  const editorial = EDITORIAL[draft.day];
  if (!editorial) throw new Error(`Rest-Day-Redaktion für Tag ${draft.day} fehlt`);
  const phases = buildPhases(draft, editorial, false);
  const ownScenePhases = buildPhases(draft, editorial, true);
  const totalSeconds = phases.reduce((sum, phase) => sum + phase.durationSec, 0);

  return {
    day: draft.day,
    title: draft.title,
    estimatedMinutes: Math.ceil(totalSeconds / 60),
    phases,
    ownScenePhases,
    journal: {
      title: editorial.journalTitle,
      intro: "Denk an deine mentale Einheit von heute. Du musst keine echte Anwendung behaupten.",
      questions: editorial.journalQuestions.map((prompt, index) => ({
        id: `d${draft.day}-rest-j${index + 1}`,
        prompt,
        placeholder: index === 0
          ? "Beschreibe den entscheidenden Moment in einem kurzen Satz."
          : "Schreib auf, was du beim nächsten echten Moment tun willst.",
      })) as [GoldenDayQuestion, GoldenDayQuestion],
    },
  };
};

export const REST_DAY_EDITORIAL_COUNT = Object.keys(EDITORIAL).length;
