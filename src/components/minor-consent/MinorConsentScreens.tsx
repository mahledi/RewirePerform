import { useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowLeft,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock3,
  FileText,
  Info,
  LockKeyhole,
  Mail,
  RefreshCw,
  ShieldCheck,
  UserRoundCheck,
  XCircle,
} from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  athleteAssentDraft,
  guardianDecisionDraft,
  guardianNoticeDraft,
  guardianProductPurposeDraft,
  minorGuardianAgeBands,
  type MinorGuardianAgeBand,
  type MinorGuardianPreviewState,
} from "@/content/minorGuardianDraft";
import { cn } from "@/lib/utils";

type Navigate = (state: MinorGuardianPreviewState) => void;

interface MinorConsentScreenProps {
  state: MinorGuardianPreviewState;
  onNavigate: Navigate;
}

const previewGuardianEmail = "e••••••@beispiel.de";

const StatusPill = ({ children, tone = "neutral" }: { children: React.ReactNode; tone?: "neutral" | "success" | "warning" }) => (
  <span
    className={cn(
      "inline-flex min-h-7 items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium",
      tone === "success" && "border-emerald-400/30 bg-emerald-400/10 text-emerald-200",
      tone === "warning" && "border-amber-400/30 bg-amber-400/10 text-amber-100",
      tone === "neutral" && "border-border bg-secondary text-muted-foreground",
    )}
  >
    {children}
  </span>
);

const FlowHeader = ({ step, onBack }: { step?: string; onBack?: () => void }) => (
  <header className="border-b border-border/70 px-5 py-4 sm:px-7">
    <div className="flex min-h-10 items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        {onBack ? (
          <Button type="button" variant="ghost" size="icon" aria-label="Zurück" onClick={onBack}>
            <ArrowLeft aria-hidden="true" />
          </Button>
        ) : (
          <span className="flex h-10 w-10 items-center justify-center rounded-md border border-primary/25 bg-primary/10 text-primary">
            <ShieldCheck className="h-5 w-5" aria-hidden="true" />
          </span>
        )}
        <div>
          <p className="text-sm font-semibold text-foreground">RewirePerform</p>
          <p className="text-xs text-muted-foreground">Sicherer Zugang</p>
        </div>
      </div>
      {step && <span className="text-xs font-medium text-muted-foreground">{step}</span>}
    </div>
  </header>
);

const FlowLayout = ({
  children,
  step,
  onBack,
}: {
  children: React.ReactNode;
  step?: string;
  onBack?: () => void;
}) => (
  <div className="min-h-[720px] bg-card text-foreground">
    <FlowHeader step={step} onBack={onBack} />
    <div className="mx-auto w-full max-w-xl px-5 py-8 sm:px-8 sm:py-10">{children}</div>
  </div>
);

const Intro = ({ icon: Icon, eyebrow, title, body }: {
  icon: typeof ShieldCheck;
  eyebrow: string;
  title: string;
  body: string;
}) => (
  <div className="mb-7">
    <span className="mb-4 flex h-11 w-11 items-center justify-center rounded-md border border-primary/25 bg-primary/10 text-primary">
      <Icon className="h-5 w-5" aria-hidden="true" />
    </span>
    <p className="mb-2 text-xs font-semibold uppercase text-primary">{eyebrow}</p>
    <h1 className="text-2xl font-semibold leading-tight sm:text-3xl">{title}</h1>
    <p className="mt-3 text-sm leading-6 text-muted-foreground sm:text-base">{body}</p>
  </div>
);

const Notice = ({ children, tone = "neutral" }: { children: React.ReactNode; tone?: "neutral" | "warning" | "success" }) => (
  <div
    className={cn(
      "flex gap-3 rounded-md border p-4 text-left text-sm leading-6",
      tone === "neutral" && "border-border bg-secondary/50 text-muted-foreground",
      tone === "warning" && "border-amber-400/25 bg-amber-400/10 text-amber-50",
      tone === "success" && "border-emerald-400/25 bg-emerald-400/10 text-emerald-50",
    )}
  >
    <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
    <div>{children}</div>
  </div>
);

const AgeCheckScreen = ({ onNavigate }: { onNavigate: Navigate }) => {
  const [ageBand, setAgeBand] = useState<MinorGuardianAgeBand | "">("");

  const continueToNextStep = () => {
    if (ageBand === "under_16") onNavigate("guardian-contact");
    if (ageBand === "age_16_17") onNavigate("age-16-17-decision");
    if (ageBand === "adult") onNavigate("adult-ready");
  };

  return (
    <FlowLayout step="Schritt 1 von 3">
      <Intro
        icon={UserRoundCheck}
        eyebrow="Dein Zugang"
        title="Welche Altersgruppe trifft auf dich zu?"
        body="Wir fragen nur nach der Altersgruppe, damit für dich die richtige Zustimmung gilt. Ein Geburtsdatum oder Ausweis ist hier nicht nötig."
      />

      <RadioGroup value={ageBand} onValueChange={(value) => setAgeBand(value as MinorGuardianAgeBand)} className="gap-3">
        {minorGuardianAgeBands.map((option) => (
          <Label
            key={option.id}
            htmlFor={`age-${option.id}`}
            className={cn(
              "flex cursor-pointer items-start gap-3 rounded-md border bg-background/50 p-4 transition-colors",
              ageBand === option.id ? "border-primary bg-primary/5" : "border-border hover:border-border/80",
            )}
          >
            <RadioGroupItem id={`age-${option.id}`} value={option.id} className="mt-0.5" />
            <span className="min-w-0">
              <span className="block text-sm font-semibold text-foreground">{option.label}</span>
              <span className="mt-1 block text-sm font-normal leading-5 text-muted-foreground">{option.detail}</span>
            </span>
          </Label>
        ))}
      </RadioGroup>

      <Button type="button" className="mt-7 w-full" size="lg" disabled={!ageBand} onClick={continueToNextStep}>
        Weiter
        <ChevronRight aria-hidden="true" />
      </Button>
    </FlowLayout>
  );
};

const GuardianContactScreen = ({ onNavigate }: { onNavigate: Navigate }) => {
  const [email, setEmail] = useState("");
  const emailLooksValid = /^\S+@\S+\.\S+$/.test(email);

  return (
    <FlowLayout step="Schritt 2 von 3" onBack={() => onNavigate("age-check")}>
      <Intro
        icon={Mail}
        eyebrow="Sorgeberechtigte Person"
        title="An wen dürfen wir die Information senden?"
        body="Bitte trage die E-Mail-Adresse eines Elternteils oder einer anderen sorgeberechtigten Person ein. Die Person entscheidet über einen eigenen, sicheren Link."
      />

      <div className="mb-5 space-y-2">
        <Label htmlFor="guardian-email">E-Mail der sorgeberechtigten Person</Label>
        <Input
          id="guardian-email"
          type="email"
          autoComplete="email"
          inputMode="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="elternteil@beispiel.de"
          className="h-12"
        />
      </div>

      <Notice>
        Die Adresse wird nicht für Werbung verwendet und nicht an deinen Verein weitergegeben. Trainer können die Adresse nicht sehen und nicht für deine Eltern bestätigen.
      </Notice>

      <Button type="button" className="mt-7 w-full" size="lg" disabled={!emailLooksValid} onClick={() => onNavigate("guardian-pending")}>
        Bestätigungslink senden
        <Mail aria-hidden="true" />
      </Button>
    </FlowLayout>
  );
};

const GuardianPendingScreen = ({ onNavigate }: { onNavigate: Navigate }) => (
  <FlowLayout step="Schritt 2 von 3" onBack={() => onNavigate("guardian-contact")}>
    <Intro
      icon={Clock3}
      eyebrow="Bestätigung offen"
      title="Wir warten auf die Entscheidung"
      body={`Der persönliche Link wurde an ${previewGuardianEmail} gesendet. Du kannst weitermachen, sobald die sorgeberechtigte Person zugestimmt hat.`}
    />

    <div className="mb-6 rounded-md border border-border bg-background/50 p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium">Freigabe durch eine sorgeberechtigte Person</p>
          <p className="mt-1 text-xs text-muted-foreground">Noch nicht entschieden</p>
        </div>
        <StatusPill tone="warning">
          <Clock3 className="h-3.5 w-3.5" aria-hidden="true" />
          Offen
        </StatusPill>
      </div>
    </div>

    <Notice>
      Deine Trainer sehen nur, dass dein Zugang noch nicht abgeschlossen ist. Sie sehen weder die E-Mail-Adresse noch den Grund für eine mögliche Ablehnung.
    </Notice>

    <div className="mt-7 grid gap-3 sm:grid-cols-2">
      <Button type="button" variant="outline" onClick={() => onNavigate("guardian-contact")}>
        E-Mail ändern
      </Button>
      <Button type="button" variant="secondary">
        <RefreshCw aria-hidden="true" />
        Erneut senden
      </Button>
    </div>
  </FlowLayout>
);

const GuardianEmailScreen = ({ onNavigate }: { onNavigate: Navigate }) => (
  <div className="min-h-[720px] bg-[#f2f4f7] px-4 py-8 text-[#18212f] sm:px-8 sm:py-12">
    <article className="mx-auto max-w-[620px] overflow-hidden rounded-md border border-[#d7dde5] bg-white shadow-sm">
      <div className="border-b border-[#e3e7ed] px-6 py-5 sm:px-8">
        <p className="text-sm font-semibold text-[#18212f]">RewirePerform</p>
        <p className="mt-1 text-xs text-[#667085]">Information für Sorgeberechtigte</p>
      </div>
      <div className="px-6 py-8 sm:px-8 sm:py-10">
        <span className="mb-5 flex h-11 w-11 items-center justify-center rounded-md bg-[#e9f7f2] text-[#177a5f]">
          <Mail className="h-5 w-5" aria-hidden="true" />
        </span>
        <p className="text-sm text-[#475467]">Hallo,</p>
        <h1 className="mt-2 text-2xl font-semibold leading-8 text-[#18212f]">{guardianNoticeDraft.subject}</h1>
        <p className="mt-5 text-sm leading-6 text-[#475467]">{guardianNoticeDraft.invitation}</p>
        <p className="mt-4 rounded-md border border-[#d7dde5] bg-[#f8fafc] p-4 text-sm leading-6 text-[#344054]">
          {guardianNoticeDraft.addressSource}
        </p>
        <p className="mt-4 text-sm leading-6 text-[#475467]">{guardianNoticeDraft.noPressure}</p>
        <Button type="button" className="mt-7 w-full sm:w-auto" onClick={() => onNavigate("guardian-review")}>
          Information prüfen und entscheiden
          <ChevronRight aria-hidden="true" />
        </Button>
        <p className="mt-5 text-xs leading-5 text-[#667085]">{guardianNoticeDraft.noAccount}</p>
        <p className="mt-2 text-xs leading-5 text-[#667085]">{guardianNoticeDraft.emailPurpose}</p>
      </div>
      <footer className="border-t border-[#e3e7ed] bg-[#f8fafc] px-6 py-5 text-xs leading-5 text-[#667085] sm:px-8">
        <p>{guardianNoticeDraft.contact}</p>
        <p className="mt-1">Der Link ist im finalen System nur einmal nutzbar und zeitlich begrenzt.</p>
      </footer>
    </article>
  </div>
);

const GuardianReviewScreen = ({ onNavigate }: { onNavigate: Navigate }) => {
  const [isGuardian, setIsGuardian] = useState(false);
  const [productAuthorized, setProductAuthorized] = useState(false);
  const [evaluationAuthorized, setEvaluationAuthorized] = useState(false);
  const canAuthorize = isGuardian && productAuthorized;

  return (
    <FlowLayout>
      <Intro
        icon={ShieldCheck}
        eyebrow="Information für Sorgeberechtigte"
        title="In Ruhe prüfen und entscheiden"
        body={guardianProductPurposeDraft.summary}
      />

      <Notice>{guardianNoticeDraft.addressSource}</Notice>

      <Accordion type="multiple" defaultValue={["data", "visibility"]} className="mt-6 border-t border-border">
        <AccordionItem value="data">
          <AccordionTrigger className="text-left text-sm">Welche Daten werden genutzt?</AccordionTrigger>
          <AccordionContent>
            <ul className="space-y-2 text-sm leading-6 text-muted-foreground">
              {guardianProductPurposeDraft.dataGroups.map((item) => <li key={item}>• {item}</li>)}
            </ul>
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="visibility">
          <AccordionTrigger className="text-left text-sm">Was sehen Trainer?</AccordionTrigger>
          <AccordionContent>
            <ul className="space-y-2 text-sm leading-6 text-muted-foreground">
              {guardianProductPurposeDraft.visibility.map((item) => <li key={item}>• {item}</li>)}
            </ul>
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="rights">
          <AccordionTrigger className="text-left text-sm">Welche Rechte habt ihr?</AccordionTrigger>
          <AccordionContent>
            <ul className="space-y-2 text-sm leading-6 text-muted-foreground">
              {guardianProductPurposeDraft.rights.map((item) => <li key={item}>• {item}</li>)}
            </ul>
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="support">
          <AccordionTrigger className="text-left text-sm">Wie kannst du dein Kind unterstützen?</AccordionTrigger>
          <AccordionContent>
            <ul className="space-y-2 text-sm leading-6 text-muted-foreground">
              {guardianProductPurposeDraft.support.map((item) => <li key={item}>• {item}</li>)}
            </ul>
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="legal-review">
          <AccordionTrigger className="text-left text-sm">Verantwortung und Speicherdauer</AccordionTrigger>
          <AccordionContent>
            <div className="rounded-md border border-amber-400/25 bg-amber-400/10 p-3 text-sm leading-6 text-amber-50">
              Verantwortlicher ist Mahle Herzog, Wiefeldick 16, 42699 Solingen. Die technischen Löschfristen sind im Implementierungsvertrag festgelegt; ihre rechtliche Angemessenheit und die Provider-Backup-Frist bleiben vor Aktivierung fachlich zu bestätigen.
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      <div className="mt-7 space-y-4">
        <label className="flex cursor-pointer items-start gap-3 rounded-md border border-border bg-background/40 p-4">
          <Checkbox checked={isGuardian} onCheckedChange={(checked) => setIsGuardian(checked === true)} aria-label="Sorgeberechtigung bestätigen" />
          <span className="text-sm leading-6 text-foreground">{guardianDecisionDraft.guardianAttestation}</span>
        </label>
        <label className="flex cursor-pointer items-start gap-3 rounded-md border border-border bg-background/40 p-4">
          <Checkbox checked={productAuthorized} onCheckedChange={(checked) => setProductAuthorized(checked === true)} aria-label="Programmnutzung erlauben" />
          <span className="text-sm leading-6 text-foreground">{guardianDecisionDraft.productAuthorization}</span>
        </label>
        <label className="flex cursor-pointer items-start gap-3 rounded-md border border-border bg-background/40 p-4">
          <Checkbox checked={evaluationAuthorized} onCheckedChange={(checked) => setEvaluationAuthorized(checked === true)} aria-label="Optionale interne Auswertung erlauben" />
          <span>
            <span className="block text-sm leading-6 text-foreground">{guardianDecisionDraft.internalEvaluation}</span>
            <span className="mt-1 block text-xs leading-5 text-muted-foreground">{guardianDecisionDraft.evaluationNoDisadvantage}</span>
          </span>
        </label>
      </div>

      <div className="mt-5">
        <Notice tone="neutral"><span>{guardianDecisionDraft.researchUnavailable}</span></Notice>
      </div>

      <div className="mt-7 grid gap-3 sm:grid-cols-2">
        <Button type="button" variant="outline" onClick={() => onNavigate("guardian-declined")}>
          Nicht erlauben
        </Button>
        <Button
          type="button"
          disabled={!canAuthorize}
          className="disabled:bg-secondary disabled:text-muted-foreground disabled:opacity-100"
          onClick={() => onNavigate("guardian-complete")}
        >
          Für das Programm erlauben
          <Check aria-hidden="true" />
        </Button>
      </div>
      <p className="mt-4 text-center text-xs leading-5 text-muted-foreground">
        Die Entscheidung gilt nur für die oben genannte Textversion. Änderungen erfordern eine neue Information.
      </p>
    </FlowLayout>
  );
};

const GuardianCompleteScreen = () => (
  <FlowLayout>
    <div className="py-12 text-center">
      <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-emerald-400/30 bg-emerald-400/10 text-emerald-300">
        <CheckCircle2 className="h-7 w-7" aria-hidden="true" />
      </span>
      <h1 className="mt-5 text-2xl font-semibold">Deine Entscheidung ist erfasst</h1>
      <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-muted-foreground">
        Jetzt entscheidet dein Kind noch einmal selbst. Erst danach kann der Zugang zu den freigegebenen Programmfunktionen beginnen.
      </p>
      <div className="mt-6">
        <Notice>
          Bitte leite den persönlichen Link nicht weiter. Ein Widerruf ist später ohne Begründung über den sicheren Kontaktweg möglich.
        </Notice>
      </div>
      <p className="mt-6 text-sm text-muted-foreground">Du kannst dieses Fenster jetzt schließen.</p>
    </div>
  </FlowLayout>
);

const AthleteAssentScreen = ({ onNavigate }: { onNavigate: Navigate }) => {
  const [assented, setAssented] = useState(false);

  return (
    <FlowLayout step="Schritt 3 von 3">
      <Intro icon={UserRoundCheck} eyebrow="Deine Entscheidung" title={athleteAssentDraft.title} body={athleteAssentDraft.intro} />

      <ul className="space-y-3">
        {athleteAssentDraft.points.map((point) => (
          <li key={point} className="flex gap-3 rounded-md border border-border bg-background/40 p-4 text-sm leading-6 text-muted-foreground">
            <CheckCircle2 className="mt-0.5 h-4 w-4 text-primary" aria-hidden="true" />
            <span>{point}</span>
          </li>
        ))}
      </ul>

      <label className="mt-6 flex cursor-pointer items-start gap-3 rounded-md border border-primary/25 bg-primary/5 p-4">
        <Checkbox checked={assented} onCheckedChange={(checked) => setAssented(checked === true)} aria-label="Eigene freiwillige Zustimmung" />
        <span className="text-sm leading-6 text-foreground">{athleteAssentDraft.assent}</span>
      </label>

      <div className="mt-7 grid gap-3 sm:grid-cols-2">
        <Button type="button" variant="outline" onClick={() => onNavigate("athlete-declined")}>
          Nein, nicht teilnehmen
        </Button>
        <Button
          type="button"
          disabled={!assented}
          className="disabled:bg-secondary disabled:text-muted-foreground disabled:opacity-100"
          onClick={() => onNavigate("authorized")}
        >
          Zustimmen und starten
          <Check aria-hidden="true" />
        </Button>
      </div>
    </FlowLayout>
  );
};

const AuthorizedScreen = ({ onNavigate }: { onNavigate: Navigate }) => (
  <FlowLayout>
    <div className="py-10 text-center">
      <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-emerald-400/30 bg-emerald-400/10 text-emerald-300">
        <ShieldCheck className="h-7 w-7" aria-hidden="true" />
      </span>
      <div className="mt-5">
        <StatusPill tone="success"><CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" /> Freigegeben</StatusPill>
      </div>
      <h1 className="mt-5 text-2xl font-semibold">Alles ist vollständig</h1>
      <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-muted-foreground">
        Die Entscheidung der sorgeberechtigten Person und deine eigene Zustimmung liegen für dieselbe Version vor. Du kannst jetzt mit dem freigegebenen Programm beginnen.
      </p>
      <Button type="button" className="mt-7" onClick={() => onNavigate("settings")}>
        Zum Programm
        <ChevronRight aria-hidden="true" />
      </Button>
    </div>
  </FlowLayout>
);

const GuardianDeclinedScreen = () => (
  <FlowLayout>
    <div className="py-10 text-center">
      <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-border bg-secondary text-muted-foreground">
        <XCircle className="h-7 w-7" aria-hidden="true" />
      </span>
      <h1 className="mt-5 text-2xl font-semibold">Entscheidung gespeichert</h1>
      <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-muted-foreground">
        Die betroffenen Programmfunktionen bleiben für dein Kind gesperrt. Daraus entsteht kein sportlicher oder vereinsinterner Nachteil und Trainer sehen den genauen Grund nicht.
      </p>
      <div className="mt-6">
        <Notice>
          Eine neue Entscheidung ist später möglich. Dafür wird ein neuer, sicherer Ablauf gestartet; dein Nein wird nicht still überschrieben.
        </Notice>
      </div>
      <p className="mt-6 text-sm text-muted-foreground">Du kannst dieses Fenster jetzt schließen.</p>
    </div>
  </FlowLayout>
);

const AthleteDeclinedScreen = ({ onNavigate }: { onNavigate: Navigate }) => (
  <FlowLayout>
    <div className="py-10 text-center">
      <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-border bg-secondary text-muted-foreground">
        <XCircle className="h-7 w-7" aria-hidden="true" />
      </span>
      <h1 className="mt-5 text-2xl font-semibold">Deine Entscheidung ist gespeichert</h1>
      <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-muted-foreground">
        Du nimmst aktuell nicht an den betroffenen Programmfunktionen teil. Das hat keinen sportlichen oder vereinsinternen Nachteil und Trainer sehen den genauen Grund nicht.
      </p>
      <div className="mt-6">
        <Notice>
          Eine neue Entscheidung ist später möglich. Dafür wird ein neuer, sicherer Ablauf gestartet; dein Nein wird nicht still überschrieben.
        </Notice>
      </div>
      <Button type="button" variant="outline" className="mt-7" onClick={() => onNavigate("age-check")}>
        Zurück zum Zugang
      </Button>
    </div>
  </FlowLayout>
);

const RevokedScreen = ({ onNavigate }: { onNavigate: Navigate }) => (
  <FlowLayout>
    <div className="py-10 text-center">
      <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-border bg-secondary text-muted-foreground">
        <LockKeyhole className="h-7 w-7" aria-hidden="true" />
      </span>
      <h1 className="mt-5 text-2xl font-semibold">Freigabe widerrufen</h1>
      <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-muted-foreground">
        Neue Erhebung für den widerrufenen Zweck ist gesperrt. Der Widerruf hat keinen sportlichen oder vereinsinternen Nachteil.
      </p>
      <div className="mt-6">
        <Notice>
          Die konkrete Wirkung auf vorhandene Daten, Exporte und Sicherungskopien muss vor dem Pilot verbindlich in der Datenschutzerklärung festgelegt sein.
        </Notice>
      </div>
      <Button type="button" variant="outline" className="mt-7" onClick={() => onNavigate("settings")}>
        Zur Statusübersicht
      </Button>
    </div>
  </FlowLayout>
);

const ExpiredScreen = ({ onNavigate }: { onNavigate: Navigate }) => (
  <FlowLayout>
    <div className="py-10 text-center">
      <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-amber-400/30 bg-amber-400/10 text-amber-200">
        <AlertCircle className="h-7 w-7" aria-hidden="true" />
      </span>
      <h1 className="mt-5 text-2xl font-semibold">Dieser Link ist nicht mehr gültig</h1>
      <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-muted-foreground">
        Der Link ist abgelaufen, wurde bereits verwendet oder zurückgezogen. Aus Sicherheitsgründen zeigen wir keine weiteren Kontodetails.
      </p>
      <div className="mt-6">
        <Notice>
          Dein Kind kann in der App einen neuen Link anfordern. Bei Fragen hilft hello@rewireperform.com.
        </Notice>
      </div>
      <Button type="button" variant="outline" className="mt-7" onClick={() => onNavigate("guardian-email")}>
        Zur E-Mail-Vorschau
      </Button>
    </div>
  </FlowLayout>
);

const Age16DecisionScreen = ({ onNavigate }: { onNavigate: Navigate }) => (
  <FlowLayout onBack={() => onNavigate("age-check")}>
    <Intro
      icon={UserRoundCheck}
      eyebrow="Deine eigene Entscheidung"
      title="Mit 16 oder 17 entscheidest du selbst"
      body="Du erhältst dieselben verständlichen Informationen über Programmdaten, Privatsphäre und Trainer-Sicht. Ein Kontakt zu einer sorgeberechtigten Person ist in diesem Deutschland-Flow nicht erforderlich."
    />
    <Notice>
      Das normale Programm und der freiwillige Datenbeitrag bleiben getrennte Entscheidungen. Ein Nein zum Datenbeitrag ändert nichts an deiner Programmnutzung.
    </Notice>
    <Button type="button" className="mt-7 w-full" onClick={() => onNavigate("athlete-assent")}>
      Informationen ansehen
      <ChevronRight aria-hidden="true" />
    </Button>
  </FlowLayout>
);

const AdultReadyScreen = () => (
  <FlowLayout>
    <Intro
      icon={CheckCircle2}
      eyebrow="Volljähriger Zugang"
      title="Keine zusätzliche Freigabe nötig"
      body="Du erhältst für das normale Programm und optionale Datennutzungen jeweils eigene Informationen und Auswahlmöglichkeiten und triffst deine Entscheidungen selbst."
    />
    <Notice>Die Erwachsenenfreigabe bleibt ein eigener Ablauf und wird nicht mit dem Minderjährigen-Flow vermischt.</Notice>
  </FlowLayout>
);

const SettingsScreen = ({ onNavigate }: { onNavigate: Navigate }) => {
  const rows = useMemo(() => [
    { label: "Normales Programm", value: "Freigegeben", tone: "success" as const },
    { label: "Eigene Zustimmung", value: "Erteilt", tone: "success" as const },
    { label: "Interne Evaluation", value: "Nicht erlaubt", tone: "neutral" as const },
    { label: "Forschung", value: "Nicht aktiviert", tone: "neutral" as const },
  ], []);

  return (
    <FlowLayout onBack={() => onNavigate("authorized")}>
      <Intro
        icon={FileText}
        eyebrow="Konto und Daten"
        title="Zustimmungen und Freigaben"
        body="Hier siehst du, welche Entscheidungen aktuell gelten. Optionale Datennutzungen lassen sich getrennt ändern."
      />

      <section aria-labelledby="authorization-status" className="overflow-hidden rounded-md border border-border">
        <div className="border-b border-border bg-background/50 p-4">
          <h2 id="authorization-status" className="text-sm font-semibold">Aktueller Status</h2>
          <p className="mt-1 text-xs text-muted-foreground">Version: 18.07.2026</p>
        </div>
        <div className="divide-y divide-border">
          {rows.map((row) => (
            <div key={row.label} className="flex min-h-14 items-center justify-between gap-3 px-4 py-3">
              <span className="text-sm text-muted-foreground">{row.label}</span>
              <StatusPill tone={row.tone}>{row.value}</StatusPill>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-5 rounded-md border border-border bg-background/40 p-4">
        <div className="flex items-start gap-3">
          <Mail className="mt-0.5 h-4 w-4 text-primary" aria-hidden="true" />
          <div>
            <h2 className="text-sm font-semibold">Sorgeberechtigte Person</h2>
            <p className="mt-1 text-sm text-muted-foreground">{previewGuardianEmail}</p>
            <p className="mt-2 text-xs leading-5 text-muted-foreground">Die vollständige Adresse ist für Trainer und andere Teammitglieder nicht sichtbar.</p>
          </div>
        </div>
      </section>

      <div className="mt-7 grid gap-3 sm:grid-cols-2">
        <Button type="button" variant="outline">Entscheidung ansehen</Button>
        <Button type="button" variant="destructive" onClick={() => onNavigate("revoked")}>Freigabe widerrufen</Button>
      </div>
    </FlowLayout>
  );
};

export const MinorConsentScreen = ({ state, onNavigate }: MinorConsentScreenProps) => {
  switch (state) {
    case "age-check": return <AgeCheckScreen onNavigate={onNavigate} />;
    case "guardian-contact": return <GuardianContactScreen onNavigate={onNavigate} />;
    case "guardian-pending": return <GuardianPendingScreen onNavigate={onNavigate} />;
    case "guardian-email": return <GuardianEmailScreen onNavigate={onNavigate} />;
    case "guardian-review": return <GuardianReviewScreen onNavigate={onNavigate} />;
    case "guardian-complete": return <GuardianCompleteScreen />;
    case "athlete-assent": return <AthleteAssentScreen onNavigate={onNavigate} />;
    case "authorized": return <AuthorizedScreen onNavigate={onNavigate} />;
    case "guardian-declined": return <GuardianDeclinedScreen />;
    case "athlete-declined": return <AthleteDeclinedScreen onNavigate={onNavigate} />;
    case "revoked": return <RevokedScreen onNavigate={onNavigate} />;
    case "expired": return <ExpiredScreen onNavigate={onNavigate} />;
    case "age-16-17-decision": return <Age16DecisionScreen onNavigate={onNavigate} />;
    case "adult-ready": return <AdultReadyScreen />;
    case "settings": return <SettingsScreen onNavigate={onNavigate} />;
  }
};
