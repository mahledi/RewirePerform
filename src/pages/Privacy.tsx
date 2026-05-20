import { Link } from "react-router-dom";
import { ArrowLeft, Shield } from "lucide-react";

const Privacy = () => {
  return (
    <main className="min-h-screen bg-background text-foreground px-6 py-10">
      <div className="max-w-3xl mx-auto">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-10">
          <ArrowLeft className="w-4 h-4" />
          Zurück
        </Link>

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
          <section>
            <h2 className="font-heading text-xl font-semibold text-foreground mb-2">Welche Daten verarbeitet werden</h2>
            <p>
              RewirePerform verarbeitet Accountdaten, Sportprofil-Angaben, Programmfortschritt, tägliche Check-ins,
              private Journal-Einträge, Fragebogenantworten, validierte Assessments, Trainingszeiten und optionale
              Push-Benachrichtigungseinstellungen.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-xl font-semibold text-foreground mb-2">Private Inhalte</h2>
            <p>
              Private Journaltexte, Freitextantworten und individuelle mentale Muster werden nicht an Coaches angezeigt.
              Coaches erhalten nur Status- und Team-Aggregate, sofern die notwendige Mindestgruppengröße erreicht ist.
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
