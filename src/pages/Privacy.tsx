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
          Stand: 14. Juli 2026. Diese Seite erklärt ehrlich, welche Daten RewirePerform erhebt, warum,
          auf welcher Rechtsgrundlage und was mit ihnen passiert — und was ausdrücklich <em>nicht</em>
          passiert. Vor App-Store-Veröffentlichung wird der Text juristisch final geprüft.
        </p>

        <div className="space-y-8 text-sm leading-relaxed text-muted-foreground">

          <section className="rounded-2xl border border-primary/20 bg-primary/5 p-5">
            <h2 className="font-heading text-xl font-semibold text-foreground mb-2">Die kurze Wahrheit zuerst</h2>
            <ul className="space-y-2">
              <li><span className="text-foreground">Deine Journale und Freitexte werden nicht gelesen, nicht analysiert, nicht von einer AI verarbeitet und nicht in Statistiken einbezogen.</span> Sie liegen zugriffsgeschützt in deinem Account, damit <em>du</em> sie später wieder sehen kannst. Mehr nicht.</li>
              <li><span className="text-foreground">Coaches sehen keine privaten Athleteninhalte.</span> Keine Stimmungswerte, keine Journale, keine Einzelantworten und keine psychologischen Labels. Coaches können nur eigene, strukturierte Beobachtungen zu sichtbarem Sportverhalten erfassen.</li>
              <li><span className="text-foreground">Gruppierte Fortschrittsdaten ohne direkte Identifikatoren</span> können beobachtete Veränderungen und Datenqualität dokumentieren - <em>aber nur, wenn du aktiv zustimmst</em>. Du entscheidest. Du kannst jederzeit widerrufen.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-heading text-xl font-semibold text-foreground mb-2">Warum überhaupt Daten erhoben werden</h2>
            <p>
              RewirePerform ist kein Inhaltsarchiv, sondern ein 56-Tage-Prozess. Ohne minimale Daten
              kann das System nicht erkennen, an welchem Tag du stehst, welche Aufgabe heute zu dir passt,
              ob deine Pre/Post-Veränderung sichtbar wird oder ob ein Reminder gesendet werden soll.
            </p>
            <p className="mt-3">
              Erhoben wird ausschließlich, was für drei Zwecke nötig ist:
              <span className="text-foreground"> (1)</span> dein Programm sauber durchzuführen,
              <span className="text-foreground"> (2)</span> dir am Ende ehrlich zu zeigen, was sich verändert hat, und
              <span className="text-foreground"> (3)</span> - wenn du zustimmst - beobachtete Veränderungen gruppiert und mit klaren Aussagegrenzen auszuwerten.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-xl font-semibold text-foreground mb-2">Rechtsgrundlage (DSGVO)</h2>
            <ul className="space-y-2">
              <li><span className="text-foreground">Art. 6 Abs. 1 lit. b DSGVO — Vertragserfüllung:</span> Account, Programmfortschritt, Tageslogik, Check-ins, Assessments, Erinnerungen. Ohne diese Daten gibt es schlicht keine App.</li>
              <li><span className="text-foreground">Art. 6 Abs. 1 lit. a DSGVO - Einwilligung:</span> Die Nutzung consentierter, gruppierter Evaluationsdaten für interne Auswertung und freigegebene Evidence-Berichte. <span className="text-foreground">Ohne dein aktives Ja passiert hier nichts.</span></li>
              <li><span className="text-foreground">Art. 9 Abs. 2 lit. a DSGVO - ausdrückliche Einwilligung:</span> Soweit psychologisch sensible Angaben verarbeitet werden, ist dafür eine gesonderte, ausdrückliche Einwilligung erforderlich.</li>
              <li><span className="text-foreground">Minderjährige:</span> Das normale Programm bleibt nutzbar. Zusätzliche Evidence-Erhebung bleibt gesperrt, bis die erforderliche Einwilligung eines Sorgeberechtigten und die verständliche Zustimmung des Jugendlichen vollständig und geprüft vorliegen.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-heading text-xl font-semibold text-foreground mb-2">Welche Daten konkret verarbeitet werden</h2>
            <ul className="space-y-2">
              <li><span className="text-foreground">Account:</span> E-Mail, Passwort-Hash, Rolle (Athlet/Coach/Admin), Sportprofil-Angaben.</li>
              <li><span className="text-foreground">Programmfortschritt:</span> aktueller Tag, erledigte Aufgaben, Streaks, Phase.</li>
              <li><span className="text-foreground">Check-ins:</span> Mood, Energy, Focus als Zahlenwerte pro Tag.</li>
              <li><span className="text-foreground">Strukturierte Assessments und Fragebögen:</span> Pre-, Mid- und Post-Werte, um beobachtete Veränderungen über die 56 Tage zu dokumentieren. Aussagekraft, Version und Nutzungsrechte jedes Instruments werden getrennt bewertet.</li>
              <li><span className="text-foreground">Strukturierte Transfer-Beobachtungen:</span> An ausgewählten Tagen eine kurze Antwort zu einem konkreten Verhalten in Training oder Wettkampf. Sie ersetzt die optionale freie Reflexion und enthält keinen Freitext.</li>
              <li><span className="text-foreground">Coach-Beobachtungen:</span> Strukturierte Bewertungen direkt beobachtbaren Sportverhaltens. Sie enthalten keine Diagnose und keinen Pflicht-Freitext.</li>
              <li><span className="text-foreground">Journal- und Freitexte:</span> werden ausschließlich gespeichert, damit du sie wieder findest. <span className="text-foreground">Sie werden nicht ausgewertet, nicht durchsucht, nicht von einer AI gelesen, nicht in Aggregate einbezogen, nicht für Personalisierung verwendet.</span></li>
              <li><span className="text-foreground">Trainingszeiten & Push-Settings:</span> nur, wenn du Erinnerungen aktivierst.</li>
            </ul>
          </section>

          <section className="rounded-2xl border border-primary/20 bg-primary/5 p-5">
            <h2 className="font-heading text-xl font-semibold text-foreground mb-2">Journale & Freitexte — die ehrliche Klarstellung</h2>
            <p>
              In früheren Versionen dieser Seite stand sinngemäß, das System könne „wiederkehrende Themen
              vorsichtig erkennen". Das stimmt nicht und wird hiermit korrigiert.
            </p>
            <p className="mt-3 text-foreground">
              Wahrheit: Deine Journale und Freitexte werden gespeichert, damit du sie selbst wieder lesen kannst.
              Sonst nichts.
            </p>
            <p className="mt-3">
              Konkret bedeutet das: Keine AI verarbeitet sie. Keine Mustererkennung läuft darüber.
              Keine Personalisierung greift auf sie zu. Keine Mitarbeiter lesen sie zur Verbesserung des Produkts.
              Sie fließen nicht in die anonymen Aggregat-Statistiken ein, selbst wenn du deren Nutzung erlaubst.
              Coaches sehen sie nie — auch nicht in Ausschnitten, auch nicht in Stichwörtern, auch nicht aggregiert.
            </p>
            <p className="mt-3">
              Reflexion funktioniert nur, wenn sie ehrlich ist. Ehrlich wird sie nur, wenn sie sicher ist.
              Deshalb diese Linie. Sie bleibt.
            </p>
          </section>

          <section className="rounded-2xl border border-primary/30 bg-primary/10 p-5">
            <h2 className="font-heading text-xl font-semibold text-foreground mb-2">Gruppierte Evaluationsdaten - hilf anderen Athleten</h2>
            <p>
              Wenn du zustimmst, dürfen ausgewählte Fortschrittsdaten <span className="text-foreground">gruppiert und ohne direkte Identifikatoren</span> ausgewertet werden. Sie dokumentieren Nutzung, Datenqualität und beobachtete Veränderungen. Sie beweisen für sich allein weder Ursache noch sportliche Leistungssteigerung.
            </p>
            <p className="mt-3 text-foreground">Was konkret in solche Aggregate einfließen darf:</p>
            <ul className="mt-2 space-y-1">
              <li>– Programmfortschritt (Tage, Streaks, Completion-Raten)</li>
              <li>– Pre-/Post-Veränderungen aus freigegebenen, versionierten Assessments und Fragebögen</li>
              <li>– Check-in-Trends (Mood, Energy, Focus) im Zeitverlauf</li>
              <li>– Strukturierte Transfer-Pulse und Teambeobachtungen von Coaches</li>
            </ul>
            <p className="mt-3 text-foreground">Was niemals einfließt — auch nicht mit deiner Zustimmung:</p>
            <ul className="mt-2 space-y-1">
              <li>– Journaltexte, Freitexte, persönliche Reflexionen</li>
              <li>– Individuelle Antworten auf einzelne Fragen</li>
              <li>– Identifizierende Merkmale (Name, E-Mail, Geburtsdatum, Position, Verein)</li>
              <li>– Werte aus Gruppen kleiner als fünf Personen (n≥5-Schwelle)</li>
            </ul>
            <p className="mt-3">
              Gruppenaggregate werden erst ab mindestens fünf freigegebenen Personen ausgegeben und enthalten keine Namen oder E-Mail-Adressen. Die Einwilligung
              ist freiwillig, jederzeit in den Einstellungen widerrufbar und beeinflusst <span className="text-foreground">in keiner Weise</span>,
              wie die App für dich funktioniert.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-xl font-semibold text-foreground mb-2">Wie das Hintergrundsystem deine Angaben nutzt</h2>
            <p>
              Das System ordnet Check-ins, Aufgaben und Assessments dem richtigen Programmtag zu, berechnet
              Streaks und Completion, entscheidet, welcher Tagesinhalt heute angezeigt wird, und bereitet
              deinen Pre/Post-Vergleich auf. Personalisierte Inhalte (z.B. AI-generierte Aufgaben) basieren
              auf strukturierten Profildaten und Assessment-Werten — <span className="text-foreground">nie auf Journal- oder Freitexten</span>.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-xl font-semibold text-foreground mb-2">Coach- und Team-Sicht</h2>
            <p>
              Coaches sehen für ihr zugeordnetes Team operative Programmdaten wie letzte Aktivität, erledigte Tage,
              Completion-Rate, aktuelle Streak, Check-ins der letzten 7 Tage, Journal-<em>Anzahl</em> (nie Inhalt) und
              Inaktivitäts-Hinweis. Sensible Team-Zustandswerte erscheinen erst ab fünf freigegebenen Athleten.
            </p>
            <p className="mt-3">
              Ausdrücklich nicht sichtbar für Coaches: einzelne Mood-/Energy-/Focus-Werte, Journaltexte,
              Freitextantworten, individuelle Assessment-Scores, persönliche Entwicklungs-Labels.
            </p>
            <p className="mt-3">
              Ein Coach kann zusätzlich eigene strukturierte Team- oder Einzelbeobachtungen zu fünf direkt sichtbaren
              Verhaltensbereichen speichern. Eine Einzelbeobachtung kann nur der eingebende Coach erneut öffnen. Sie wird
              weder dem Athleten angezeigt noch in Website-, KI- oder externe Evidence-Exporte aufgenommen.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-xl font-semibold text-foreground mb-2">Deine Rechte</h2>
            <ul className="space-y-2">
              <li><span className="text-foreground">Auskunft (Art. 15):</span> Du kannst eine Kopie aller gespeicherten Daten anfordern.</li>
              <li><span className="text-foreground">Berichtigung (Art. 16):</span> Falsche Angaben korrigieren wir auf Wunsch.</li>
              <li><span className="text-foreground">Löschung (Art. 17):</span> Unter „Einstellungen → Konto & Daten“ kannst du dein Konto und die zugehörigen personenbezogenen Daten direkt löschen.</li>
              <li><span className="text-foreground">Datenübertragbarkeit (Art. 20):</span> Export deiner Daten in einem maschinenlesbaren Format.</li>
              <li><span className="text-foreground">Widerruf (Art. 7 Abs. 3):</span> Einwilligungen kannst du jederzeit widerrufen, ohne Begründung, ohne Nachteil.</li>
              <li><span className="text-foreground">Beschwerde (Art. 77):</span> Bei der zuständigen Datenschutz-Aufsichtsbehörde.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-heading text-xl font-semibold text-foreground mb-2">Speicherdauer</h2>
            <p>
              Programmdaten bleiben gespeichert, solange dein Account aktiv ist. Bei der Account-Löschung werden dein
              Zugang und die personenbezogenen Daten direkt aus dem aktiven System entfernt. Soweit Daten vorübergehend in
              technisch notwendigen Sicherungskopien oder Sicherheitsprotokollen verbleiben, sind sie vom aktiven
              Produktdatenbestand getrennt und für Produkt- oder Analysezwecke gesperrt. Sie werden gelöscht, sobald der
              Sicherungs- oder Sicherheitszweck und etwaige gesetzliche Aufbewahrungspflichten entfallen. Bereits zuvor mit
              Einwilligung gebildete Gruppenstatistiken können bestehen bleiben, wenn sie vollständig aggregiert sind und
              keinen Rückschluss auf einzelne Personen zulassen.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-xl font-semibold text-foreground mb-2">Auftragsverarbeiter</h2>
            <p>
              Hosting, Datenbank, Authentifizierung und Push-Infrastruktur laufen über professionelle
              Cloud-Anbieter mit DSGVO-konformen Auftragsverarbeitungsverträgen, bevorzugt in EU-Rechenzentren.
              Es findet keine Weitergabe an Werbenetzwerke, Datenhändler oder Tracking-Dienste statt.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-xl font-semibold text-foreground mb-2">Benachrichtigungen</h2>
            <p>
              Push-Benachrichtigungen sind optional. Wenn du sie aktivierst, speichern wir nur eine
              technische Push-Subscription und deine gewählten Reminder-Zeiten.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-xl font-semibold text-foreground mb-2">Keine Diagnose</h2>
            <p>
              RewirePerform ist ein Performance- und Reflexionssystem. Die App stellt keine medizinische
              Diagnose, ersetzt keine Behandlung und ist nicht für akute psychische Krisen gedacht.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-xl font-semibold text-foreground mb-2">Kontakt</h2>
            <p>
              Für Datenschutz-, Widerrufs- oder Auskunftsanfragen:{" "}
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
