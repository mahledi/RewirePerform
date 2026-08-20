import { useNavigate } from "react-router-dom";
import { ArrowLeft, Shield } from "lucide-react";
import { BrandLockup } from "@/components/brand/BrandLogo";
import { SUPPORT_EMAIL, SUPPORT_MAILTO } from "@/config/contact";
import { isFeedbackIntelligenceClientEnabled, isFeedbackTextClientEnabled } from "@/lib/feedbackIntelligenceApi";

const Privacy = () => {
  const navigate = useNavigate();
  const feedbackEnabled = isFeedbackIntelligenceClientEnabled() && isFeedbackTextClientEnabled();

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
        <div className="mb-10 flex items-center justify-between gap-4">
          <button
            type="button"
            onClick={goBack}
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="w-4 h-4" />
            Zurück
          </button>
          <BrandLockup symbolSize={24} textClassName="hidden text-sm sm:inline" />
        </div>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Shield className="w-5 h-5 text-primary" />
          </div>
          <p className="text-xs uppercase tracking-[0.2em] text-primary font-semibold">Datenschutz</p>
        </div>

        <h1 className="font-heading text-3xl md:text-4xl font-bold mb-4">RewirePerform Datenschutz</h1>
        <p className="text-sm text-muted-foreground mb-8">
          Stand: {feedbackEnabled ? "20. August 2026" : "10. August 2026"}. Diese Seite erklärt, welche Daten RewirePerform erhebt, warum,
          auf welcher Rechtsgrundlage und was mit ihnen passiert — und was ausdrücklich <em>nicht</em>
          passiert.
        </p>

        <div className="space-y-8 text-sm leading-relaxed text-muted-foreground">

          <section>
            <h2 className="font-heading text-xl font-semibold text-foreground mb-2">Verantwortlicher</h2>
            <p className="text-foreground">Mahle Herzog, handelnd unter RewirePerform</p>
            <p className="mt-2">Postanschrift:</p>
            <address className="not-italic">
              Wiefeldick 16<br />
              42699 Solingen<br />
              Deutschland
            </address>
            <p className="mt-2">
              Datenschutzkontakt: <a href={SUPPORT_MAILTO} className="text-primary hover:underline">{SUPPORT_EMAIL}</a>
            </p>
          </section>

          <section className="rounded-2xl border border-primary/20 bg-primary/5 p-5">
            <h2 className="font-heading text-xl font-semibold text-foreground mb-2">Die kurze Wahrheit zuerst</h2>
            <ul className="space-y-2">
              <li><span className="text-foreground">Deine Journale, privaten Reflexionen und sonstigen freien Antworten werden nicht gelesen, analysiert oder von einer KI verarbeitet.</span> Sie liegen zugriffsgeschützt in deinem Konto, damit <em>du</em> sie später wieder sehen kannst.</li>
              {feedbackEnabled ? (
                <li><span className="text-foreground">Feedback Intelligence ist freiwillig und klar getrennt.</span> An Tag 10, 24, 39 und 55 kannst du überspringbare Auswahlfragen beantworten. Einen klar als Produktfeedback markierten Kommentar verarbeitet RewirePerform nur nach deiner zusätzlichen ausdrücklichen Einwilligung; dein Nein hat keinen Nachteil.</li>
              ) : (
                <li><span className="text-foreground">Feedback Intelligence ist nicht Teil dieser V1.1-Auslieferung.</span> In V1.1 werden keine Feedback-Checkpoints, keine freiwilligen Produktfeedback-Kommentare und keine hierfür vorgesehenen Analysedaten erhoben oder verarbeitet.</li>
              )}
              <li><span className="text-foreground">Trainer sehen keine privaten Athleteninhalte.</span> Keine Stimmungswerte, keine Journale, keine Einzelantworten und keine psychologischen Bezeichnungen. Trainer können nur eigene, strukturierte Beobachtungen zu sichtbarem Sportverhalten erfassen.</li>
              <li><span className="text-foreground">Gruppierte Fortschrittsdaten ohne direkte Identifikatoren</span> können beobachtete Veränderungen und Datenqualität dokumentieren - <em>aber nur, wenn du aktiv zustimmst</em>. Du entscheidest. Du kannst jederzeit widerrufen.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-heading text-xl font-semibold text-foreground mb-2">Warum überhaupt Daten erhoben werden</h2>
            <p>
              RewirePerform ist kein Inhaltsarchiv, sondern ein 56-Tage-Prozess. Ohne minimale Daten
              kann das System nicht erkennen, an welchem Tag du stehst, welche Aufgabe heute zu dir passt,
              ob deine Veränderung zwischen Anfang und Ende sichtbar wird oder ob eine Erinnerung gesendet werden soll.
            </p>
            <p className="mt-3">
              Erhoben wird ausschließlich, was für vier klar getrennte Zwecke nötig ist:
              <span className="text-foreground"> (1)</span> dein Programm sauber durchzuführen,
              <span className="text-foreground"> (2)</span> dir am Ende ehrlich zu zeigen, was sich verändert hat, und
              <span className="text-foreground"> (3)</span> - wenn du zustimmst - beobachtete Veränderungen gruppiert und mit klaren Aussagegrenzen auszuwerten.
              {feedbackEnabled
                ? " (4) freiwilliges Produktfeedback zu nutzen, um RewirePerform verständlicher und hilfreicher zu machen."
                : " Eine spätere, getrennt freizugebende Feedback-Intelligence-Funktion ist nicht Teil dieser V1.1-Auslieferung."}
            </p>
          </section>

          <section>
            <h2 className="font-heading text-xl font-semibold text-foreground mb-2">Rechtsgrundlage (DSGVO)</h2>
            <ul className="space-y-2">
              <li><span className="text-foreground">Art. 6 Abs. 1 lit. b DSGVO — Bereitstellung des Angebots:</span> Konto, Teamzugang, Programmfortschritt, Tageslogik, Check-ins, Assessments und auf Wunsch Erinnerungen. Ohne die jeweils erforderlichen Daten kann die zugehörige Funktion nicht erbracht werden.</li>
              <li><span className="text-foreground">Team- und Organisationsanfragen:</span> Soweit du selbst vorvertragliche Schritte anfragst, erfolgt die Bearbeitung auf Grundlage von Art. 6 Abs. 1 lit. b DSGVO. Soweit du eine Organisation vertrittst, stützen wir die angefragte geschäftliche Kommunikation und die angemessene Vorbereitung auf Art. 6 Abs. 1 lit. f DSGVO. Unser berechtigtes Interesse besteht darin, die von dir initiierte Anfrage sicher und passend zu beantworten. Der technische Missbrauchsschutz und die Prüfung offensichtlicher Fake-/Spam-Anfragen beruhen ebenfalls auf diesem Sicherheitsinteresse.</li>
              <li><span className="text-foreground">Art. 6 Abs. 1 lit. a DSGVO - Einwilligung:</span> Die Nutzung freiwillig freigegebener Pilotdaten für interne Analysen sowie nicht identifizierende Pilotberichte und Präsentationen. {feedbackEnabled ? "Dies gilt außerdem für freiwillige Feedback-Checkpoints. Ein Produktfeedback-Kommentar und seine interne Prüfung zur Produktverbesserung erfordern eine zusätzliche ausdrückliche Einwilligung, die jederzeit ohne Nachteil widerrufbar ist." : "Feedback Intelligence, Feedback-Kommentare und ein Jarvis-Zugriff sind nicht Teil dieser V1.1-Auslieferung."}</li>
              <li><span className="text-foreground">Art. 9 Abs. 2 lit. a DSGVO - ausdrückliche Einwilligung:</span> Soweit psychologisch sensible Angaben verarbeitet werden, ist dafür eine gesonderte, ausdrückliche Einwilligung erforderlich.</li>
              <li><span className="text-foreground">Minderjährige und Länderumfang:</span> RewirePerform ist ab 13 Jahren vorgesehen und wird derzeit ausschließlich für Deutschland angeboten. Von 13 bis einschließlich 15 werden datenabhängige Programmfunktionen erst freigeschaltet, wenn eine sorgeberechtigte Person und der Jugendliche selbst der aktuellen Version zugestimmt haben. Mit 16 oder 17 entscheidet der Jugendliche selbst. Zugriffe aus nicht freigegebenen Ländern bleiben technisch gesperrt. Bei einer späteren internationalen Einführung werden Rechts-, Datenschutz- und Store-Anforderungen erneut für den dann vorgesehenen Umfang geprüft. Der Verein ist an diesem Freigabeprozess nicht beteiligt.</li>
            </ul>
          </section>

          <section className="rounded-2xl border border-primary/20 bg-primary/5 p-5">
            <h2 className="font-heading text-xl font-semibold text-foreground mb-2">Freigabe für Minderjährige</h2>
            <ul className="space-y-2">
              <li>Wir speichern nur die Altersgruppe, kein Geburtsdatum und keine Ausweiskopie.</li>
              <li>Die E-Mail-Adresse der sorgeberechtigten Person wird vom Jugendlichen selbst eingegeben, im Autorisierungssystem verschlüsselt gespeichert und nur für Einladung, Nachweis, Support und Widerruf verwendet.</li>
              <li>Der Einmallink ist 48 Stunden gültig. Einladungs- und Widerrufstoken werden nur als Hash gespeichert und nach den unten genannten Fristen automatisiert entfernt.</li>
              <li>Trainer und Verein sehen weder die E-Mail-Adresse der sorgeberechtigten Person noch ihre Entscheidung oder einen Ablehnungsgrund.</li>
              <li>Die Programmfreigabe und die getrennte Pilot-Auswertung können über den persönlichen Widerrufslink, in der App oder über den Datenschutzkontakt widerrufen werden.</li>
              <li>Die Pilot-Auswertung wird nur aktiviert, wenn die altersgerechten Entscheidungen in der aktuellen Textversion vorliegen: von 13 bis einschließlich 15 durch die sorgeberechtigte Person und den Jugendlichen, mit 16 oder 17 durch den Jugendlichen selbst.</li>
              <li>{feedbackEnabled ? "Bei 13- bis 15-Jährigen öffnet eine aktuelle Guardian-Freigabe nur die Möglichkeit für Produktfeedback-Kommentare. Der Jugendliche entscheidet an jedem Checkpoint zusätzlich selbst; ohne beide Entscheidungen wird kein Kommentar gespeichert oder für die interne Prüfung freigegeben. Auswahlfragen bleiben auch ohne Kommentar nutzbar. Ab 16 entscheidet der Jugendliche selbst." : "Feedback Intelligence mit Checkpoints, Kommentaren oder einem Jarvis-Zugriff ist nicht Teil dieser V1.1-Auslieferung. Dafür wird in V1.1 keine zusätzliche Minderjährigen-Freigabe erhoben oder genutzt."}</li>
              <li>Eine externe wissenschaftliche Studie oder weitergehende Forschungsnutzung würde eine neue, getrennte Information und Entscheidung erfordern.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-heading text-xl font-semibold text-foreground mb-2">Welche Daten konkret verarbeitet werden</h2>
            <ul className="space-y-2">
              <li><span className="text-foreground">Konto:</span> E-Mail, Passwort-Hash, Rolle (Athlet, Trainer oder Administrator) und Sportprofil-Angaben.</li>
              <li><span className="text-foreground">Programmfortschritt:</span> aktueller Tag, erledigte Aufgaben, Serien und Phase.</li>
              <li><span className="text-foreground">Check-ins:</span> Stimmung, Energie und Fokus als Zahlenwerte pro Tag.</li>
              <li><span className="text-foreground">Strukturierte Assessments und Fragebögen:</span> Werte zu Beginn, in der Mitte und am Ende, um beobachtete Veränderungen über die 56 Tage zu dokumentieren. Aussagekraft, Version und Nutzungsrechte jedes Instruments werden getrennt bewertet.</li>
              <li><span className="text-foreground">Strukturierte Transfer-Beobachtungen:</span> An ausgewählten Tagen eine kurze Antwort zu einem konkreten Verhalten in Training oder Wettkampf. Sie ersetzt die optionale freie Reflexion und enthält keinen Freitext.</li>
              <li><span className="text-foreground">Trainer-Beobachtungen:</span> Strukturierte Bewertungen direkt beobachtbaren Sportverhaltens. Sie enthalten keine Diagnose und keinen Pflicht-Freitext.</li>
              <li><span className="text-foreground">Coach-Teamzugänge:</span> Teamzuordnung, Coach-Rolle und ein hochentropischer Teamlink. Der Lead Coach verwaltet diesen Link; jeder Co-Coach verwendet ein eigenes bestätigtes Konto.</li>
              <li><span className="text-foreground">Journale, private Reflexionen und sonstige freie Antworten:</span> werden ausschließlich gespeichert, damit du sie wiederfindest. <span className="text-foreground">Sie werden nicht ausgewertet, nicht durchsucht, nicht von einer KI gelesen, nicht in Gruppenwerte einbezogen und nicht für Personalisierung verwendet.</span></li>
              <li><span className="text-foreground">Feedback Intelligence:</span> {feedbackEnabled ? "An Tag 10, 24, 39 und 55 freiwillige, überspringbare Auswahlantworten. Ein optionaler, klar markierter Produktfeedback-Kommentar wird nur nach getrennter Einwilligung zusammen mit diesen Auswahlantworten und minimierten Aktivitätszahlen ausgewertet. Dein Coach sieht keine Einzelantworten oder Kommentare. Name, E-Mail-Adresse, Journale, private Reflexionen, Supporttexte, Team- und Coach-IDs sind ausgeschlossen." : "Die vorgesehenen Checkpoints an Tag 10, 24, 39 und 55, freiwillige Produktfeedback-Kommentare und ein zugehöriger Analyseexport sind nicht Teil dieser V1.1-Auslieferung. Dafür werden in V1.1 keine Daten erhoben."}</li>
              <li><span className="text-foreground">Team- und Organisationsanfragen:</span> Name, E-Mail-Adresse, Funktion sowie die angegebenen Team-, Organisations-, Sport- und Projektinformationen. Eine Telefonnummer wird nur in der ausführlichen Organisationsstrecke und nur freiwillig beziehungsweise passend zum gewählten Kontaktweg erhoben. Bitte übermittle dabei keine Namen oder persönlichen Daten von Athleten.</li>
              <li><span className="text-foreground">Trainingszeiten und Benachrichtigungseinstellungen:</span> nur, wenn du Erinnerungen aktivierst.</li>
            </ul>
          </section>

          <section className="rounded-2xl border border-primary/20 bg-primary/5 p-5">
            <h2 className="font-heading text-xl font-semibold text-foreground mb-2">Freiwillige Spracheingabe</h2>
            <p>
              In der nativen iPhone- und iPad-App kannst du bestimmte Antworten freiwillig einsprechen.
              Die Funktion wird nur angeboten, wenn das Gerät die deutsche Spracherkennung
              vollständig lokal unterstützt. Die Audiodaten bleiben auf dem Gerät, werden
              nicht zu RewirePerform oder einem Spracherkennungsserver übertragen und nicht als
              Aufnahme gespeichert.
            </p>
            <p className="mt-3">
              Gespeichert wird nur der übernommene und weiterhin bearbeitbare Text - genauso, als hättest du ihn
              getippt. Für Journale und private Reflexionen gelten anschließend unverändert die privaten
              Schutzregeln dieser Erklärung. {feedbackEnabled ? "Für ein klar markiertes Produktfeedback-Kommentarfeld gelten die getrennte Einwilligung und die Feedback-Regeln dieser Erklärung." : "Ein Produktfeedback-Kommentarfeld ist nicht Teil dieser V1.1-Auslieferung."} Unterstützt ein iPhone die lokale Erkennung nicht,
              erfolgt kein automatischer Server-Fallback; Tippen bleibt jederzeit möglich.
            </p>
            <p className="mt-3">
              In der Web-App kann die optionale Spracherkennung technisch durch den verwendeten
              Browser beziehungsweise dessen Anbieter bereitgestellt werden. Der Browser kann
              Audiodaten dafür nach seinen eigenen Datenschutzbedingungen verarbeiten.
              RewirePerform erstellt oder speichert auch dort keine Audioaufnahme.
            </p>
          </section>

          <section className="rounded-2xl border border-primary/20 bg-primary/5 p-5">
            <h2 className="font-heading text-xl font-semibold text-foreground mb-2">Journale & private Reflexionen — die ehrliche Klarstellung</h2>
            <p>
              In früheren Versionen dieser Seite stand sinngemäß, das System könne „wiederkehrende Themen
              vorsichtig erkennen". Das stimmt nicht und wird hiermit korrigiert.
            </p>
            <p className="mt-3 text-foreground">
              Wahrheit: Deine Journale, privaten Reflexionen und sonstigen freien Antworten werden gespeichert, damit du sie selbst wieder lesen kannst.
              Sonst nichts.
            </p>
            <p className="mt-3">
              Konkret bedeutet das: Keine KI verarbeitet sie. Keine Mustererkennung läuft darüber.
              Keine Personalisierung greift auf sie zu. Keine Mitarbeiter lesen sie zur Verbesserung des Produkts.
              Sie fließen nicht in die anonymen Aggregat-Statistiken ein, selbst wenn du deren Nutzung erlaubst.
              Trainer sehen sie nie — auch nicht in Ausschnitten, auch nicht in Stichwörtern, auch nicht gruppiert.
            </p>
            <p className="mt-3">
              {feedbackEnabled
                ? "Die einzige Ausnahme ist ein klar als Produktfeedback markiertes Kommentarfeld an einem Feedback-Checkpoint. Es wird ausschließlich nach der getrennten Freitext-Einwilligung verarbeitet. Diese Ausnahme gilt nie für Journale, private Reflexionen oder sonstige freie Antworten."
                : "In V1.1 gibt es keine als Produktfeedback markierten Felder, Feedback-Checkpoints oder freiwilligen Produktfeedback-Kommentare. Für deine Journale und privaten Reflexionen gibt es damit keine Ausnahme."}
            </p>
            <p className="mt-3">
              Reflexion funktioniert nur, wenn sie ehrlich ist. Ehrlich wird sie nur, wenn sie sicher ist.
              Deshalb diese Linie. Sie bleibt.
            </p>
          </section>

          <section className="rounded-2xl border border-primary/30 bg-primary/10 p-5">
            <h2 className="font-heading text-xl font-semibold text-foreground mb-2">Pilot-Auswertung - hilf anderen Athleten</h2>
            <p>
              Wenn du zustimmst, dürfen ausgewählte strukturierte Fortschritts- und Performancedaten für interne Pilot-Analysen sowie <span className="text-foreground">gruppierte Berichte und Präsentationen ohne direkte Identifikatoren</span> ausgewertet werden. Sie dokumentieren Nutzung, Datenqualität und beobachtete Veränderungen. Sie beweisen für sich allein weder Ursache noch sportliche Leistungssteigerung.
            </p>
            <p className="mt-3 text-foreground">Was konkret in solche Aggregate einfließen darf:</p>
            <ul className="mt-2 space-y-1">
              <li>– Programmfortschritt (Tage, Serien und Abschlussquoten)</li>
              <li>– Veränderungen zwischen Anfang und Ende aus freigegebenen, versionierten Assessments und Fragebögen</li>
              <li>– zeitliche Entwicklungen bei Stimmung, Energie und Fokus</li>
              <li>– strukturierte Transfer-Antworten und Teambeobachtungen von Trainern</li>
            </ul>
            <p className="mt-3 text-foreground">Was niemals einfließt — auch nicht mit deiner Zustimmung:</p>
            <ul className="mt-2 space-y-1">
              <li>– Journaltexte, persönliche Reflexionen und sonstige freie Antworten</li>
              <li>– identifizierbare Einzelantworten oder individuelle Athletenprofile in Berichten und Präsentationen</li>
              <li>– Identifizierende Merkmale (Name, E-Mail, Geburtsdatum, Position, Verein)</li>
              <li>– Werte aus Gruppen mit weniger als fünf freigegebenen Personen</li>
            </ul>
            <p className="mt-3">
              {feedbackEnabled
                ? "Feedback-Auswahlantworten und ausdrücklich freigegebene Produktfeedback-Kommentare dienen der internen Produktverbesserung. Sie erscheinen nie in Coach-Ansichten. Kommentare werden nicht in Client-Analytics, technische Logs oder Standardexporte geschrieben und nicht für Werbung, Personalisierung oder automatisierte Entscheidungen verwendet."
                : "Feedback Intelligence mit strukturierten Checkpoints, Kommentaren oder einem Analyseexport ist nicht Teil dieser V1.1-Auslieferung. Aus diesem späteren Funktionsbereich fließen in V1.1 keine Daten in Gruppenaggregate, Coach-Ansichten, Client-Analytics, Logs oder Standardexporte ein."}
            </p>
            <p className="mt-3">
              Gruppenaggregate werden erst ab mindestens fünf freigegebenen Personen ausgegeben und enthalten keine Namen oder E-Mail-Adressen. Die Einwilligung
              ist freiwillig, jederzeit in den Einstellungen widerrufbar und beeinflusst <span className="text-foreground">in keiner Weise</span>,
              wie die App für dich funktioniert. Nach einem Widerruf werden keine neuen Pilotdaten erhoben, vorhandene personenbezogene
              Transferdaten aus der Pilot-Auswertung entfernt und nicht mehr in neue Auswertungen einbezogen. Bereits gebildete, wirklich anonyme Gruppenaggregate können bestehen bleiben.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-xl font-semibold text-foreground mb-2">Wie das Hintergrundsystem deine Angaben nutzt</h2>
            <p>
              Das System ordnet Check-ins, Aufgaben und Assessments dem richtigen Programmtag zu, berechnet
              Serien und Abschlüsse, entscheidet, welcher Tagesinhalt heute angezeigt wird, und bereitet
              deinen Vergleich zwischen Anfang und Ende auf. Der feste 56-Tage-Inhalt und seine Missionen werden
              nicht von einer KI erzeugt. Kurze, deterministische Einordnungen können den Programmtag, den
              Kalenderkontext und strukturierte Angaben zu Sport, Rolle oder Tageszustand berücksichtigen — <span className="text-foreground">nie
              Journaltexte oder private Reflexionen</span>.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-xl font-semibold text-foreground mb-2">Trainer- und Team-Sicht</h2>
            <p>
              Trainer sehen für ihr zugeordnetes Team operative Programmdaten wie letzte Aktivität, erledigte Tage,
              Abschlussquote, aktuelle Serie, Check-ins der letzten sieben Tage, Journal-<em>Anzahl</em> (nie Inhalt) und
              Inaktivitäts-Hinweis. Sensible Team-Zustandswerte erscheinen erst ab fünf freigegebenen Athleten.
            </p>
            <p className="mt-3">
              Ausdrücklich nicht sichtbar für Trainer: einzelne Werte zu Stimmung, Energie oder Fokus, Journaltexte,
              private Freitextantworten, individuelle Assessment-Ergebnisse oder persönliche Entwicklungsbezeichnungen.
            </p>
            <p className="mt-3">
              Ein Trainer kann zusätzlich eigene strukturierte Team- oder Einzelbeobachtungen zu fünf direkt sichtbaren
              Verhaltensbereichen speichern. Eine Einzelbeobachtung kann nur der eingebende Trainer erneut öffnen. Sie wird
              weder dem Athleten angezeigt noch in Website-, KI- oder externe Auswertungs-Exporte aufgenommen.
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
              Programmdaten bleiben gespeichert, solange dein Konto aktiv ist. Bei der Kontolöschung werden dein
              Zugang und die personenbezogenen Daten direkt aus dem aktiven System entfernt. RewirePerform betreibt derzeit
              keinen regelmäßigen eigenen Datenbank-Backupdienst. Falls für eine freigegebene Migration oder
              Wiederherstellungsprüfung vorübergehend ein eigener verschlüsselter Sicherungsexport erstellt wird, bleibt er
              vom Produktzugriff getrennt und wird spätestens sieben Kalendertage nach seiner Erstellung gelöscht.
              Soweit gelöschte Daten vorübergehend in nicht direkt zugänglichen providerseitigen technischen Sicherungs-
              oder Betriebsdaten enthalten sind, werden sie nicht für Produkt, Support, Analyse oder Evidence genutzt und
              nach den vertraglichen Providerfristen gelöscht. Bei einer Beendigung des Supabase-Vertrags sieht der aktuelle
              Auftragsverarbeitungsvertrag nach einer Rückgabefrist von 30 Tagen die Löschung aller dort verarbeiteten
              personenbezogenen Daten vor. Diese Providerfrist ist von der unmittelbaren Löschung im aktiven System zu
              unterscheiden. Bereits zuvor mit Einwilligung gebildete Gruppenstatistiken können bestehen bleiben, wenn sie
              vollständig aggregiert sind und keinen Rückschluss auf einzelne Personen zulassen.
            </p>
            <ul className="mt-3 space-y-1">
              <li>– Einladungsdaten einschließlich der verschlüsselten Elternadresse: spätestens sieben Tage nach Erstellung der Einladung</li>
              <li>– wiederverwendbarer Co-Coach-Teamlink: bis zur Erneuerung durch den Lead Coach oder bis zur Löschung des zugehörigen Teams; bereits angenommene Coach-Zugänge bleiben davon unberührt</li>
              <li>– gehashter Widerrufslink der sorgeberechtigten Person: bis zu 370 Tage aktiv; nach Nutzung, Widerruf oder Ablauf Löschung innerhalb von sieben Tagen</li>
              <li>– minimierte Einwilligungsnachweise ohne E-Mail-Adresse der sorgeberechtigten Person: bis zu drei Jahre ab der jeweiligen Entscheidung</li>
              <li>– interne technische Fehlerereignisse: höchstens 30 Tage</li>
              <li>– Push-Zustellprotokolle: höchstens 90 Tage nach ihrer Erstellung</li>
              <li>– personenbezogene Pilot-Auswertungsdaten: bis zum dokumentierten Ende des jeweiligen freigegebenen Pilotprotokolls; bei Widerruf werden personenbezogene Transferdaten unmittelbar aus der Pilot-Auswertung entfernt</li>
              <li>– Feedback-Checkpoints, Produktfeedback-Kommentare und personenbeziehbare Analyseableitungen: {feedbackEnabled ? "Produktfeedback-Kommentare und personenbeziehbare Ableitungen höchstens 365 Tage und früher bei Widerruf, Kontolöschung oder Zweckende; Auswahlantworten getrennt nach den für das Konto und die interne Produktverbesserung geltenden Fristen" : "nicht Teil dieser V1.1-Auslieferung; dafür werden in V1.1 keine Daten gespeichert"}</li>
              <li>– abgelehnte, zurückgezogene oder nicht weiterverfolgte Team- und Organisationsanfragen: spätestens zwölf Monate nach Abschluss; bestätigte Fake- oder Spam-Anfragen können sofort vollständig gelöscht werden</li>
              <li>– bei einer Zusammenarbeit: nur die für Organisation, Vertrag und laufende Betreuung erforderlichen Angaben nach den dafür geltenden gesetzlichen und vertraglichen Fristen; die ursprüngliche Anfrage wird nicht unbegrenzt als separater Interessenten-Datensatz weitergeführt</li>
              <li>– vollständig anonyme Aggregate: solange sie keinen Personenbezug mehr besitzen</li>
            </ul>
          </section>

          <section>
            <h2 className="font-heading text-xl font-semibold text-foreground mb-2">Auftragsverarbeiter</h2>
            <ul className="space-y-2">
              <li><span className="text-foreground">Supabase:</span> Authentifizierung, Datenbank und Edge Functions. Das bestätigte Hauptprojekt liegt in Frankfurt (eu-central-1). Technische Betriebs- und Sicherheitsdaten können nach Anbieterbedingungen und Auftragsverarbeitungsvertrag verarbeitet werden.</li>
              <li><span className="text-foreground">Vercel:</span> Auslieferung der Website und Web-App. Dabei fallen technisch notwendige Anfrage- und Sicherheitsmetadaten an. Soweit Daten außerhalb des EWR verarbeitet werden, stützt sich der Anbieter unter anderem auf die vereinbarten Standardvertragsklauseln.</li>
              <li><span className="text-foreground">Cloudflare Turnstile:</span> Missbrauchsschutz für das öffentliche Team- und Organisationsformular. Dabei werden ausschließlich die für die Sicherheitsprüfung notwendigen technischen Anfrage- und Gerätedaten verarbeitet; Turnstile wird nicht für Werbung, Nutzerprofile oder appübergreifendes Tracking eingesetzt.</li>
              <li><span className="text-foreground">Resend:</span> ausschließlich für transaktionale E-Mails an sorgeberechtigte Personen sowie für nach persönlicher Freigabe versendete Coach-Zugänge. Verarbeitet werden Empfängeradresse, Nachrichteninhalt einschließlich eines einmaligen persönlichen Zugangslinks und Zustellmetadaten. Die per E-Mail versendete Coach-Einladung ist an diese E-Mail-Adresse gebunden, einmalig und sieben Tage gültig. Öffnungs- und Link-Tracking werden für diesen Versand nicht genutzt.</li>
              <li><span className="text-foreground">Co-Coach-Teamlink:</span> Der Lead Coach teilt den im geschützten RewirePerform-System geführten Teamlink über einen selbst gewählten Kanal. Er wird nicht über Resend versendet, bleibt bis zu seiner Erneuerung aktiv und kann ein neues, eigenes Coach-Konto nur einmal mit diesem Team verbinden.</li>
              <li><span className="text-foreground">Push-Infrastruktur:</span> Browser- beziehungsweise Betriebssystemanbieter transportieren optionale Benachrichtigungen. Private Journal- oder Antwortinhalte werden nicht in Push-Nachrichten aufgenommen.</li>
            </ul>
            <p className="mt-3">
              {feedbackEnabled
                ? "Ausdrücklich freigegebene Produktfeedback-Kommentare sind ausschließlich in einer geschützten, pseudonymisierten und nur lesenden Admin-Ansicht zugänglich. Jarvis erhält in dieser Auslieferung keine Produktfeedbackdaten. Namen, E-Mail-Adressen, Journale, private Reflexionen, Supporttexte sowie Team- und Coach-IDs bleiben ausgeschlossen."
                : "Feedback Intelligence und ein Jarvis-Zugriff sind nicht Teil dieser V1.1-Auslieferung. Es gibt dafür keinen Produktdatenexport, keinen Reader und keine Verarbeitung von Athletendaten."}
            </p>
            <p className="mt-3">
              {feedbackEnabled
                ? "Kein externer KI-Anbieter erhält Produktfeedback-Kommentare. Eine spätere externe Übermittlung erfordert eine neue konkrete Information, eine neue Empfängerprüfung und, soweit erforderlich, eine neue Einwilligung."
                : "Kein externer KI-Anbieter erhält in V1.1 Produktdaten. Vor einer späteren Änderung werden konkreter Empfänger, Verarbeitungsort, Schutzgrundlage und die notwendige Einwilligungsinformation getrennt benannt und geprüft."}
            </p>
            <p className="mt-3">Es findet keine Weitergabe an Werbenetzwerke oder Datenhändler statt. Sentry ist nicht mehr mit der App verbunden und erhält keine neuen App-Ereignisse.</p>
          </section>

          <section>
            <h2 className="font-heading text-xl font-semibold text-foreground mb-2">Benachrichtigungen</h2>
            <p>
              Push-Benachrichtigungen sind optional. Wenn du sie aktivierst, speichern wir nur eine
              technische Push-Berechtigung und deine gewählten Erinnerungszeiten.
            </p>
            <p className="mt-3">
              Für den zuverlässigen Versand speichern wir außerdem Benachrichtigungstyp, Versanddatum,
              Versandstatus sowie gegebenenfalls Öffnungszeitpunkt und Fehlerzeitpunkt. Diese Angaben dienen
              ausschließlich Zustellung, Fehlerbehebung und der von dir geöffneten Zielseite. Private Journal-
              oder Antwortinhalte werden weder protokolliert noch in Benachrichtigungen aufgenommen.
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
              <a href={SUPPORT_MAILTO} className="text-primary hover:underline">
                {SUPPORT_EMAIL}
              </a>
            </p>
          </section>
        </div>
      </div>
    </main>
  );
};

export default Privacy;
