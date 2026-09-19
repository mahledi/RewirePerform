import { ArrowLeft, Clock3, Loader2, Mail, MailCheck, RefreshCw } from "lucide-react";
import { AuthStatusLayout, StatusAction } from "@/components/auth/AuthStatusLayout";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const GuardianPendingStatus = ({
  guardianEmail,
  checkingStatus,
  resending,
  disabled,
  onCheckStatus,
  onResend,
  onChangeEmail,
  onBackToSettings,
}: {
  guardianEmail: string;
  checkingStatus: boolean;
  resending: boolean;
  disabled: boolean;
  onCheckStatus: () => void;
  onResend: () => void;
  onChangeEmail: () => void;
  onBackToSettings: () => void;
}) => (
  <AuthStatusLayout
    icon={<MailCheck className="h-7 w-7" aria-hidden="true" />}
    title="Entscheidung noch offen"
    description={(
      <>
        <p>
          Wir haben den persönlichen Link an
          <br />
          <strong className="break-all text-foreground">{guardianEmail}</strong> gesendet.
        </p>
        <p className="mt-3">
          Sobald die sorgeberechtigte Person entschieden hat, kannst du hier selbst zustimmen.
        </p>
      </>
    )}
  >
    <div className="mt-7 border-t border-border/60 pt-6">
      <p className="text-sm font-medium text-foreground">Freigabestatus</p>
      <div className="mt-3 flex items-center justify-center gap-2 text-sm text-amber-500">
        <Clock3 className="h-4 w-4" aria-hidden="true" />
        Noch nicht entschieden
      </div>
    </div>
    <StatusAction
      variant="primary"
      className="mt-4"
      disabled={disabled || checkingStatus}
      onClick={onCheckStatus}
    >
      {checkingStatus ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
      Status prüfen
    </StatusAction>
    <StatusAction
      variant="secondary"
      className="mt-4"
      disabled={disabled}
      onClick={onResend}
    >
      {resending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
      E-Mail erneut senden
    </StatusAction>
    <StatusAction
      variant="link"
      className="mt-3"
      disabled={disabled || checkingStatus}
      onClick={onChangeEmail}
    >
      E-Mail-Adresse ändern
    </StatusAction>
    <StatusAction
      variant="quiet"
      className="mt-1"
      disabled={disabled}
      onClick={onBackToSettings}
    >
      <ArrowLeft className="h-4 w-4" aria-hidden="true" />
      Zurück zu den Einstellungen
    </StatusAction>
  </AuthStatusLayout>
);

export const GuardianEmailChangeStatus = ({
  value,
  invalid,
  errorMessage,
  submitting,
  disabled,
  onChange,
  onSubmit,
  onCancel,
}: {
  value: string;
  invalid: boolean;
  errorMessage?: string;
  submitting: boolean;
  disabled: boolean;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
}) => (
  <AuthStatusLayout
    icon={<Mail className="h-7 w-7" aria-hidden="true" />}
    title="E-Mail-Adresse ändern."
    description={(
      <>
        <p>
          Trage eine andere E-Mail-Adresse der sorgeberechtigten Person ein.
        </p>
        <p className="mt-3">
          Der bisherige Link wird erst ungültig, sobald der neue Link sicher erstellt wurde.
        </p>
      </>
    )}
  >
    <div className="mt-7 border-t border-border/60 pt-6 text-left">
      <Label htmlFor="replacement-guardian-email" className="mb-2 block">
        E-Mail der sorgeberechtigten Person
      </Label>
      <Input
        id="replacement-guardian-email"
        type="email"
        inputMode="email"
        autoComplete="email"
        autoFocus
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="elternteil@beispiel.de"
        className="h-12 rounded-xl border-border/50 bg-secondary/50"
        aria-invalid={invalid}
        aria-describedby={invalid && errorMessage ? "replacement-guardian-email-error" : undefined}
      />
      {invalid && errorMessage && (
        <p
          id="replacement-guardian-email-error"
          role="alert"
          className="mt-2 text-sm leading-5 text-destructive"
        >
          {errorMessage}
        </p>
      )}
    </div>
    <StatusAction
      variant="primary"
      className="mt-4"
      disabled={disabled}
      onClick={onSubmit}
    >
      {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
      Neuen Link senden
    </StatusAction>
    <StatusAction
      variant="secondary"
      className="mt-4"
      disabled={submitting}
      onClick={onCancel}
    >
      Abbrechen
    </StatusAction>
  </AuthStatusLayout>
);
