import { ArrowLeft, CheckCircle2, Database, Mail, ShieldCheck, Trash2 } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { BrandLockup } from "@/components/brand/BrandLogo";
import { SUPPORT_EMAIL } from "@/config/contact";
import { usePublicLanguage } from "@/contexts/PublicLanguageContext";
import { PublicLanguageSwitch } from "@/components/public/PublicLanguageSwitch";

const AccountDeletion = () => {
  const { tr } = usePublicLanguage();
  const deletionRequestMailto = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(tr("Kontolöschung RewirePerform", "RewirePerform account deletion"))}`;
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
            {tr("Zurück", "Back")}
          </button>
          <div className="flex items-center gap-3">
            <BrandLockup className="hidden sm:inline-flex" symbolSize={24} textClassName="text-sm" />
            <PublicLanguageSwitch />
          </div>
        </div>

        <div className="mb-4 flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
            <Trash2 className="h-5 w-5" aria-hidden="true" />
          </span>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">{tr("Konto & Daten", "Account & Data")}</p>
        </div>

        <h1 className="font-heading text-3xl font-bold md:text-4xl">{tr("RewirePerform-Konto löschen", "Delete your RewirePerform account")}</h1>
        <p className="mt-4 max-w-2xl leading-relaxed text-muted-foreground">
          {tr("Du kannst dein RewirePerform-Konto und die zugehörigen personenbezogenen Daten jederzeit löschen. Der direkte Weg befindet sich in der App. Wenn du keinen Zugriff mehr auf die App hast, kannst du die Löschung auch über den Support anfordern.", "You can delete your RewirePerform account and associated personal data at any time. The direct option is in the app. If you no longer have access to the app, you can also request deletion through support.")}
        </p>

        <div className="mt-9 space-y-5">
          <section className="rounded-2xl border border-border bg-card p-5 sm:p-6">
            <div className="flex items-center gap-3">
              <ShieldCheck className="h-5 w-5 text-primary" aria-hidden="true" />
              <h2 className="font-heading text-xl font-semibold">{tr("Direkt in der App löschen", "Delete directly in the app")}</h2>
            </div>
            <ol className="mt-5 space-y-4 text-sm leading-relaxed text-muted-foreground">
              {[
                tr("Melde dich in RewirePerform an.", "Sign in to RewirePerform."),
                tr("Öffne Einstellungen → Konto & Daten.", "Open Settings → Account & Data."),
                tr("Wähle Konto löschen und bestätige deine Identität mit deinem aktuellen Passwort.", "Choose Delete account and confirm your identity with your current password."),
                tr("Falls du ein Team verantwortest, überträgst du es zuerst an einen vorhandenen Co-Coach.", "If you are responsible for a team, transfer it to an existing co-coach first."),
                tr("Prüfe die Zusammenfassung und bestätige die endgültige Löschung.", "Review the summary and confirm permanent deletion."),
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
              {tr("Die Löschung ist dauerhaft und kann nicht rückgängig gemacht werden. Andere Teammitglieder und deren Daten werden dabei nicht gelöscht.", "Deletion is permanent and cannot be undone. Other team members and their data are not deleted.")}
            </p>
          </section>

          <section className="rounded-2xl border border-border bg-card p-5 sm:p-6">
            <div className="flex items-center gap-3">
              <Mail className="h-5 w-5 text-primary" aria-hidden="true" />
              <h2 className="font-heading text-xl font-semibold">{tr("Kein Zugriff auf die App?", "No access to the app?")}</h2>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              {tr("Sende deine Löschanfrage möglichst von der E-Mail-Adresse, die mit deinem RewirePerform-Konto verbunden ist. Wir melden uns mit den notwendigen Schritten zur Identitätsprüfung. Sende uns niemals dein Passwort.", "If possible, send your deletion request from the email address linked to your RewirePerform account. We will reply with the steps needed to verify your identity. Never send us your password.")}
            </p>
            <a
              href={deletionRequestMailto}
              className="mt-5 inline-flex min-h-11 items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
            >
              {tr("Löschung per E-Mail anfordern", "Request deletion by email")}
            </a>
            <p className="mt-3 text-xs text-muted-foreground">{tr("Kontakt:", "Contact:")} {SUPPORT_EMAIL}</p>
          </section>

          <section className="rounded-2xl border border-border bg-card p-5 sm:p-6">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 text-primary" aria-hidden="true" />
              <h2 className="font-heading text-xl font-semibold">{tr("Was gelöscht wird", "What is deleted")}</h2>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              {tr("Nach abgeschlossener Löschung werden dein Zugang und deine personenbezogenen Daten unmittelbar aus dem aktiven RewirePerform-System entfernt. Dazu gehören insbesondere:", "Once deletion is complete, your access and personal data are removed immediately from the active RewirePerform system. This includes in particular:")}
            </p>
            <ul className="mt-4 grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
              {[
                tr("Account, E-Mail-Adresse, Profil und Rollen", "Account, email address, profile and roles"),
                tr("Teammitgliedschaften und persönliche Einladungen", "Team memberships and personal invitations"),
                tr("Programmstand, Aufgaben und Check-ins", "Program progress, tasks and check-ins"),
                tr("Journale und private Reflexionen", "Journals and private reflections"),
                tr("Assessments und Fragebogenantworten", "Assessments and questionnaire answers"),
                tr("Kalender- und Trainingsplanung", "Calendar and training planning"),
                tr("Reminder, Push-Abonnements und Zustellbezug", "Reminders, push subscriptions and delivery references"),
                tr("Persönliches Feedback und technische Produktereignisse", "Personal feedback and technical product events"),
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
              <h2 className="font-heading text-xl font-semibold">{tr("Was bestehen bleiben kann", "What may remain")}</h2>
            </div>
            <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground">
              <div>
                <h3 className="font-semibold text-foreground">{tr("Vollständig anonyme Gruppenstatistiken", "Fully anonymous group statistics")}</h3>
                <p className="mt-1">
                  {tr("Bereits gebildete Gruppenaggregate können bestehen bleiben, wenn sie keinen Nutzerbezug, keine Rohtexte und keine individuellen Verläufe enthalten und keinen Rückschluss auf einzelne Personen zulassen. Für solche vollständig anonymen Daten gilt keine personenbezogene Aufbewahrungsfrist.", "Previously created group aggregates may remain if they have no link to users, contain no raw text or individual histories, and cannot be used to identify a person. No personal-data retention period applies to such fully anonymous data.")}
                </p>
              </div>
              <div>
                <h3 className="font-semibold text-foreground">{tr("Vorübergehende technische Sicherungen", "Temporary technical backups")}</h3>
                <p className="mt-1">
                  {tr("Ein eigener verschlüsselter Sicherungsexport darf höchstens sieben Kalendertage ab seiner Erstellung bestehen. Er bleibt vom Produktzugriff getrennt und darf nicht für Produkt, Support, Analyse oder Evidence verwendet werden. Providerseitige Sicherheits- oder Betriebsdaten werden ausschließlich innerhalb der vertraglichen Providerfristen aufbewahrt und ebenfalls nicht für diese Zwecke genutzt.", "An encrypted backup export created by RewirePerform may be kept for no more than seven calendar days after creation. It remains separate from product access and must not be used for the product, support, analysis or evidence. Provider-side security or operational data is retained only within contractual provider periods and is not used for these purposes either.")}
                </p>
              </div>
              <div>
                <h3 className="font-semibold text-foreground">{tr("Teamdaten anderer Personen", "Other people's team data")}</h3>
                <p className="mt-1">
                  {tr("Daten anderer Teammitglieder bleiben geschützt. Teamverantwortung wird, soweit erforderlich, vor der Löschung übertragen; direkte Verweise auf das gelöschte Konto werden entfernt oder neutralisiert.", "Other team members' data remains protected. Where necessary, team responsibility is transferred before deletion; direct references to the deleted account are removed or neutralized.")}
                </p>
              </div>
            </div>
          </section>
        </div>

        <nav aria-label={tr("Weitere Informationen", "Further information")} className="mt-8 flex flex-wrap gap-5 border-t border-border pt-6 text-sm">
          <Link to="/privacy" className="text-primary hover:underline">{tr("Datenschutzerklärung", "Privacy notice")}</Link>
          <Link to="/support" className="text-primary hover:underline">Support</Link>
          <Link to="/imprint" className="text-primary hover:underline">{tr("Impressum", "Legal notice")}</Link>
        </nav>
      </div>
    </main>
  );
};

export default AccountDeletion;
