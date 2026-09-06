import { ArrowLeft, CheckCircle2, Database, Mail, ShieldCheck, Trash2 } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { BrandLockup } from "@/components/brand/BrandLogo";
import { SUPPORT_EMAIL } from "@/config/contact";

const deletionRequestMailto = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent("Kontolöschung RewirePerform")}`;

const AccountDeletion = () => {
  const navigate = useNavigate();
  const goBack = () => window.history.length > 1 ? navigate(-1) : navigate("/", { replace: true });

  return (
    <main className="min-h-screen bg-background px-5 py-8 text-foreground sm:px-6 sm:py-10">
      <div className="mx-auto max-w-3xl">
        <div className="mb-10 flex items-center justify-between gap-4">
          <button
            type="button"
            onClick={goBack}
            className="inline-flex min-h-11 items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Zurück
          </button>
          <BrandLockup symbolSize={24} textClassName="hidden text-sm sm:inline" />
        </div>

        <div className="mb-4 flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
            <Trash2 className="h-5 w-5" aria-hidden="true" />
          </span>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Konto & Daten</p>
        </div>

        <h1 className="font-heading text-3xl font-bold md:text-4xl">RewirePerform-Konto löschen</h1>
        <p className="mt-4 max-w-2xl leading-relaxed text-muted-foreground">
          Du kannst dein RewirePerform-Konto und die zugehörigen personenbezogenen Daten jederzeit löschen. Der
          direkte Weg befindet sich in der App. Wenn du keinen Zugriff mehr auf die App hast, kannst du die Löschung
          auch über den Support anfordern.
        </p>

        <div className="mt-9 space-y-5">
          <section className="rounded-2xl border border-border bg-card p-5 sm:p-6">
            <div className="flex items-center gap-3">
              <ShieldCheck className="h-5 w-5 text-primary" aria-hidden="true" />
              <h2 className="font-heading text-xl font-semibold">Direkt in der App löschen</h2>
            </div>
            <ol className="mt-5 space-y-4 text-sm leading-relaxed text-muted-foreground">
              {[
                "Melde dich in RewirePerform an.",
                "Öffne Einstellungen → Konto & Daten.",
                "Wähle Konto löschen und bestätige deine Identität mit deinem aktuellen Passwort.",
                "Falls du ein Team verantwortest, überträgst du es zuerst an einen vorhandenen Co-Coach.",
                "Prüfe die Zusammenfassung und bestätige die endgültige Löschung.",
              ].map((step, index) => (
                <li key={step} className="flex gap-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 font-semibold text-primary">
                    {index + 1}
                  </span>
                  <span className="pt-0.5">{step}</span>
                </li>
              ))}
            </ol>
            <p className="mt-5 rounded-xl border border-border/70 bg-background/60 px-4 py-3 text-sm text-muted-foreground">
              Die Löschung ist dauerhaft und kann nicht rückgängig gemacht werden. Andere Teammitglieder und deren
              Daten werden dabei nicht gelöscht.
            </p>
          </section>

          <section className="rounded-2xl border border-border bg-card p-5 sm:p-6">
            <div className="flex items-center gap-3">
              <Mail className="h-5 w-5 text-primary" aria-hidden="true" />
              <h2 className="font-heading text-xl font-semibold">Kein Zugriff auf die App?</h2>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              Sende deine Löschanfrage möglichst von der E-Mail-Adresse, die mit deinem RewirePerform-Konto verbunden
              ist. Wir melden uns mit den notwendigen Schritten zur Identitätsprüfung. Sende uns niemals dein Passwort.
            </p>
            <a
              href={deletionRequestMailto}
              className="mt-5 inline-flex min-h-11 items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Löschung per E-Mail anfordern
            </a>
            <p className="mt-3 text-xs text-muted-foreground">Kontakt: {SUPPORT_EMAIL}</p>
          </section>

          <section className="rounded-2xl border border-border bg-card p-5 sm:p-6">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 text-primary" aria-hidden="true" />
              <h2 className="font-heading text-xl font-semibold">Was gelöscht wird</h2>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              Nach abgeschlossener Löschung werden dein Zugang und deine personenbezogenen Daten unmittelbar aus dem
              aktiven RewirePerform-System entfernt. Dazu gehören insbesondere:
            </p>
            <ul className="mt-4 grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
              {[
                "Account, E-Mail-Adresse, Profil und Rollen",
                "Teammitgliedschaften und persönliche Einladungen",
                "Programmstand, Aufgaben und Check-ins",
                "Journale und private Reflexionen",
                "Assessments und Fragebogenantworten",
                "Kalender- und Trainingsplanung",
                "Reminder, Push-Abonnements und Zustellbezug",
                "Persönliches Feedback und technische Produktereignisse",
              ].map((item) => (
                <li key={item} className="flex gap-2">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" aria-hidden="true" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </section>

          <section className="rounded-2xl border border-border bg-card p-5 sm:p-6">
            <div className="flex items-center gap-3">
              <Database className="h-5 w-5 text-primary" aria-hidden="true" />
              <h2 className="font-heading text-xl font-semibold">Was bestehen bleiben kann</h2>
            </div>
            <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground">
              <div>
                <h3 className="font-semibold text-foreground">Vollständig anonyme Gruppenstatistiken</h3>
                <p className="mt-1">
                  Bereits gebildete Gruppenaggregate können bestehen bleiben, wenn sie keinen Nutzerbezug, keine
                  Rohtexte und keine individuellen Verläufe enthalten und keinen Rückschluss auf einzelne Personen
                  zulassen. Für solche vollständig anonymen Daten gilt keine personenbezogene Aufbewahrungsfrist.
                </p>
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Vorübergehende technische Sicherungen</h3>
                <p className="mt-1">
                  Ein eigener verschlüsselter Sicherungsexport darf höchstens sieben Kalendertage ab seiner Erstellung
                  bestehen. Er bleibt vom Produktzugriff getrennt und darf nicht für Produkt, Support, Analyse oder
                  Evidence verwendet werden. Providerseitige Sicherheits- oder Betriebsdaten werden ausschließlich
                  innerhalb der vertraglichen Providerfristen aufbewahrt und ebenfalls nicht für diese Zwecke genutzt.
                </p>
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Teamdaten anderer Personen</h3>
                <p className="mt-1">
                  Daten anderer Teammitglieder bleiben geschützt. Teamverantwortung wird, soweit erforderlich, vor der
                  Löschung übertragen; direkte Verweise auf das gelöschte Konto werden entfernt oder neutralisiert.
                </p>
              </div>
            </div>
          </section>
        </div>

        <nav aria-label="Weitere Informationen" className="mt-8 flex flex-wrap gap-5 border-t border-border pt-6 text-sm">
          <Link to="/privacy" className="text-primary hover:underline">Datenschutzerklärung</Link>
          <Link to="/support" className="text-primary hover:underline">Support</Link>
          <Link to="/imprint" className="text-primary hover:underline">Impressum</Link>
        </nav>
      </div>
    </main>
  );
};

export default AccountDeletion;
