import { useState } from "react";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { changeAccountPassword } from "@/lib/accountManagement";
import { toast } from "sonner";

interface PasswordChangeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface PasswordFieldProps {
  id: string;
  label: string;
  value: string;
  autoComplete: "current-password" | "new-password";
  onChange: (value: string) => void;
}

const PasswordField = ({ id, label, value, autoComplete, onChange }: PasswordFieldProps) => {
  const [visible, setVisible] = useState(false);

  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-sm font-medium text-foreground">{label}</label>
      <div className="relative">
        <Input
          id={id}
          name={id}
          type={visible ? "text" : "password"}
          autoComplete={autoComplete}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="pr-11"
          required
        />
        <button
          type="button"
          onClick={() => setVisible((current) => !current)}
          aria-label={visible ? `${label} ausblenden` : `${label} anzeigen`}
          className="absolute right-1 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
        >
          {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
};

export const PasswordChangeDialog = ({ open, onOpenChange }: PasswordChangeDialogProps) => {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const reset = () => {
    setCurrentPassword("");
    setNewPassword("");
    setConfirmation("");
    setError(null);
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (saving) return;
    if (!nextOpen) reset();
    onOpenChange(nextOpen);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    if (newPassword.length < 8) {
      setError("Das neue Passwort muss mindestens 8 Zeichen haben.");
      return;
    }
    if (newPassword !== confirmation) {
      setError("Die neuen Passwörter stimmen nicht überein.");
      return;
    }
    if (currentPassword === newPassword) {
      setError("Das neue Passwort muss sich vom aktuellen Passwort unterscheiden.");
      return;
    }

    setSaving(true);
    try {
      await changeAccountPassword(currentPassword, newPassword);
      toast.success("Passwort geändert.");
      reset();
      onOpenChange(false);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Das Passwort konnte nicht geändert werden.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Passwort ändern</DialogTitle>
          <DialogDescription>
            Bestätige zuerst dein aktuelles Passwort. Andere aktive Sitzungen können aus Sicherheitsgründen beendet werden.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <PasswordField
            id="current-password"
            label="Aktuelles Passwort"
            autoComplete="current-password"
            value={currentPassword}
            onChange={setCurrentPassword}
          />
          <PasswordField
            id="new-password"
            label="Neues Passwort"
            autoComplete="new-password"
            value={newPassword}
            onChange={setNewPassword}
          />
          <PasswordField
            id="new-password-confirmation"
            label="Neues Passwort wiederholen"
            autoComplete="new-password"
            value={confirmation}
            onChange={setConfirmation}
          />

          <p className="text-xs leading-relaxed text-muted-foreground">
            Verwende mindestens 8 Zeichen und kein Passwort, das du bereits für andere Dienste nutzt.
          </p>

          {error && (
            <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)} disabled={saving}>
              Abbrechen
            </Button>
            <Button type="submit" disabled={saving || !currentPassword || !newPassword || !confirmation}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Passwort ändern
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
