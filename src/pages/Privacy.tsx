import { useNavigate } from "react-router-dom";
import { ArrowLeft, Shield } from "lucide-react";

const Privacy = () => {
  const navigate = useNavigate();

  const goBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
      return;
    }
    navigate("/settings", { replace: true });
  };

  return (
    <main className="min-h-screen bg-background text-foreground px-6 py-10">
      <div className="max-w-3xl mx-auto">
        <button
          type="button"
          onClick={goBack}
          className="mb-10 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="w-4 h-4" />
          Zurück
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Shield className="w-5 h-5 text-primary" />
          </div>
          <p className="text-xs uppercase tracking-[0.2em] text-primary font-semibold">Datenschutz</p>
        </div>

        <h1 className="font-heading text-3xl md:text-4xl font-bold mb-4">RewirePerform Datenschutz</h1>
        <p className="text-sm text-muted-foreground mb-8">
          Stand: 19. Mai 2026. Diese Seite beschreibt die geplante Datenschutz-Kommunikation für RewirePerform.
          Vor App-Store-Veröffentlichung sollte sie rechtlich final geprüft werden.
        </p>

        <div className="space-y-8 text-sm leading-relaxed text-muted-foreground">
          <section className="rounded-2xl border border-primary/20 bg-primary/5 p-5">
            <h2 className="font-heading text-xl font-semibold text-foreground mb-2">Warum RewirePerform Daten braucht</h2>
            <p>
              RewirePerform ist kein reines Inhaltsarchiv. Das System soll verstehen, wo du startest,
              wie du durch das Programm gehst und welche Rückmeldungen für deinen Fortschritt relevant sind.
              Deine Angaben helfen dabei, Aufgaben, Erinnerungen, Auswertungen und Rückblicke in einen sinnvollen
              Zusammenhang zu bringen.
            </p>
            <p className="mt-3">
              Der Zweck ist nicht, möglichst viel zu sammeln. Der Zweck ist, aus notwendigen Trainings- und
              Fortschrittsdaten eine nachvollziehbare Begleitung zu machen: Was wurde bearbeitet, was fehlt noch,
              wo zeigt sich Entwicklung und welche Inhalte passen zum aktuellen Programmstand?
            </p>
          </section>

          <section>
            <h2 className="font-heading text-xl font-semibold text-foreground mb-2">Welche Daten verarbeitet werden</h2>
            <p>
              RewirePerform verarbeitet Accountdaten, Sportprofil-Angaben, Programmfortschritt, tägliche Check-ins,
              private Journal-Einträge, Fragebogenantworten, validierte Assessments, Trainingszeiten und optionale
              Push-Benachrichtigungseinstellungen.
            </p>
            <ul className="mt-3 space-y-2">
              <li><span className="text-foreground">Fragebogen und Assessments:</span> helfen, Ausgangslage, Retests und Entwicklung über Zeit einzuordnen.</li>
              <li><span className="text-foreground">Check-ins:</span> zeigen Tageszustand, Bereitschaft und ob der tägliche Ablauf funktioniert.</li>
              <li><span className="text-foreground">Journaleinträge:</span> unterstützen persönliche Reflexion und können dem System helfen, wiederkehrende Themen vorsichtig zu erkennen.</li>
              <li><span className="text-foreground">Trainingszeiten und Fortschritt:</span> steuern Erinnerungen, Tageslogik, Streaks, Aufgabenstatus und Programmrhythmus.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-heading text-xl font-semibold text-foreground mb-2">Wie die Angaben im Hintergrundsystem genutzt werden</h2>
            <p>
              Das Hintergrundsystem nutzt deine Angaben, um den 56-Tage-Prozess technisch und inhaltlich konsistent zu halten:
              Es speichert Zwischenschritte, erkennt erledigte Aufgaben, ordnet Check-ins und Journale dem richtigen Programmtag zu
              und bereitet Fortschritt so auf, dass du später verstehen kannst, was du tatsächlich trainiert hast.
            </p>
            <p className="mt-3">
              Für Coaches und Admin-Bereiche werden private Inhalte nicht als Rohtexte sichtbar gemacht. Dort geht es um
              Aktivität, Datenqualität, Programmstatus und, wo ausreichend viele Teammitglieder vorhanden sind, geschützte Aggregate.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-xl font-semibold text-foreground mb-2">Private Inhalte</h2>
            <p>
              Private Journaltexte, Freitextantworten und individuelle mentale Muster werden nicht an Coaches angezeigt.
              Coaches erhalten nur Status- und Team-Aggregate, sofern die notwendige Mindestgruppengröße erreicht ist.
            </p>
            <p className="mt-3">
              Sensible Eingaben sollen mit Respekt behandelt werden: Sie sollen dir helfen, ehrlich zu reflektieren,
              ohne dass daraus eine öffentliche Bewertung oder ein einzelner Coach-Bericht entsteht.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-xl font-semibold text-foreground mb-2">Team- und Coach-Daten</h2>
            <p>
              Teamansichten sind auf aggregierte Informationen ausgelegt. Einzelne Stimmungswerte, persönliche
              Reflexionen und individuelle Development-Index-Antworten werden Coaches nicht als Rohdaten angezeigt.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-xl font-semibold text-foreground mb-2">Benachrichtigungen</h2>
            <p>
              Push-Benachrichtigungen sind optional. Wenn sie aktiviert werden, speichern wir eine technische
              Push-Subscription und gewählte Reminder-Zeiten, um Check-in-, Trainings- und Journal-Erinnerungen zu senden.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-xl font-semibold text-foreground mb-2">Keine Diagnose</h2>
            <p>
              RewirePerform ist ein Performance- und Reflexionssystem. Die App stellt keine medizinische Diagnose,
              ersetzt keine Behandlung und ist nicht für akute psychische Krisen gedacht.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-xl font-semibold text-foreground mb-2">Kontakt</h2>
            <p>
              Für Datenschutz- oder Supportfragen:{" "}
              <a href="mailto:hello@rewireperform.com" className="text-primary hover:underline">
                hello@rewireperform.com
              </a>
            </p>
          </section>
        </div>
      </div>
    </main>
  );
};

export default Privacy;
