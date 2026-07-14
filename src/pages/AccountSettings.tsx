import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  ChevronRight,
  Database,
  KeyRound,
  Loader2,
  LogOut,
  Mail,
  Shield,
  Trash2,
  User,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { AccountDeletionDialog } from "@/components/settings/AccountDeletionDialog";
import { PasswordChangeDialog } from "@/components/settings/PasswordChangeDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import {
  getPendingDataContributionConsent,
  isConsentSchemaMissingError,
  rememberPendingDataContributionConsent,
  saveDataContributionConsent,
  syncPendingDataContributionConsent,
  type DataContributionConsentState,
} from "@/lib/dataContributionConsent";
import { toast } from "sonner";

const AccountSettings = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [sport, setSport] = useState("");
  const [position, setPosition] = useState("");
  const [profileLoading, setProfileLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [dataContributionConsent, setDataContributionConsent] = useState<DataContributionConsentState>(null);
  const [dataContributionPending, setDataContributionPending] = useState(false);
  const [savingDataContribution, setSavingDataContribution] = useState(false);
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [deletionDialogOpen, setDeletionDialogOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    if (!user) return;
    let active = true;

    const loadProfile = async () => {
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("sport,position,team")
          .eq("id", user.id)
          .maybeSingle();
        if (error) throw error;
        if (!active) return;
        setSport(data?.sport ?? "");
        setPosition(data?.position ?? data?.team ?? "");
      } catch {
        if (active) toast.error("Profildaten konnten nicht geladen werden.");
      }

      const pendingConsent = getPendingDataContributionConsent(user.id);
      if (pendingConsent !== null) {
        try {
          const syncedConsent = await syncPendingDataContributionConsent(user.id);
          if (active) {
            setDataContributionConsent(syncedConsent);
            setDataContributionPending(false);
          }
        } catch (error) {
          if (!active) return;
          setDataContributionConsent(pendingConsent);
          setDataContributionPending(true);
          if (!isConsentSchemaMissingError(error)) {
            toast.error("Der vorgemerkte Datenbeitrag konnte noch nicht synchronisiert werden.");
          }
        }
      } else {
        const { data, error } = await supabase
          .from("profiles")
          .select("data_contribution_consent")
          .eq("id", user.id)
          .maybeSingle();
        if (!active) return;
        if (error && !isConsentSchemaMissingError(error)) {
          toast.error("Die Tracking-Einstellung konnte nicht geladen werden.");
        } else if (!error) {
          setDataContributionConsent(
            typeof data?.data_contribution_consent === "boolean"
              ? data.data_contribution_consent
              : null,
          );
          setDataContributionPending(false);
        }
      }
      if (active) setProfileLoading(false);
    };

    loadProfile();
    return () => {
      active = false;
    };
  }, [user]);

  const saveProfile = async () => {
    if (!user) return;
    setSavingProfile(true);
    const { error } = await supabase
      .from("profiles")
      .update({ sport: sport.trim() || null, position: position.trim() || null })
      .eq("id", user.id);
    setSavingProfile(false);
    if (error) toast.error("Profil konnte nicht gespeichert werden.");
    else toast.success("Profil gespeichert.");
  };

  const updateDataContributionConsent = async (consent: boolean) => {
    if (!user) return;
    setSavingDataContribution(true);
    try {
      await saveDataContributionConsent(user.id, consent);
      setDataContributionConsent(consent);
      setDataContributionPending(false);
      toast.success(consent ? "Datenbeitrag aktiviert." : "Datenbeitrag deaktiviert.");
    } catch (error) {
      if (isConsentSchemaMissingError(error)) {
        rememberPendingDataContributionConsent(user.id, consent);
        setDataContributionConsent(consent);
        setDataContributionPending(true);
        toast.info("Deine Entscheidung wird gespeichert, sobald das System-Update aktiv ist.");
      } else {
        toast.error("Die Entscheidung konnte gerade nicht gespeichert werden.");
      }
    } finally {
      setSavingDataContribution(false);
    }
  };

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      await signOut();
      navigate("/", { replace: true });
    } catch {
      setSigningOut(false);
      toast.error("Abmelden ist gerade nicht möglich. Bitte versuche es erneut.");
    }
  };

  const email = user?.email ?? "Keine E-Mail hinterlegt";

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-30 border-b border-border bg-background/90 px-4 py-3 backdrop-blur-lg">
        <div className="mx-auto flex max-w-2xl items-center gap-3">
          <button
            type="button"
            onClick={() => navigate("/settings")}
            aria-label="Zurück zu den Einstellungen"
            className="-ml-2 flex h-10 w-10 items-center justify-center rounded-lg transition-colors hover:bg-secondary"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="font-heading text-lg font-bold">Konto & Daten</h1>
            <p className="text-xs text-muted-foreground">Account, Profil und Datenschutz</p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-2xl space-y-6 px-4 py-6">
        <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <div className="space-y-1 rounded-xl border border-border bg-card p-2">
            <div className="flex min-w-0 items-center gap-3 px-3 py-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Mail className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs text-muted-foreground">E-Mail-Adresse</p>
                <p className="truncate text-sm font-medium text-foreground">{email}</p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setPasswordDialogOpen(true)}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left transition-colors hover:bg-secondary/70"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-secondary text-foreground">
                <KeyRound className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">Passwort ändern</p>
                <p className="text-xs text-muted-foreground">Aktuelles Passwort erforderlich</p>
              </div>
              <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" />
            </button>

            <button
              type="button"
              onClick={handleSignOut}
              disabled={signingOut}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left transition-colors hover:bg-secondary/70 disabled:opacity-60"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-secondary text-foreground">
                {signingOut ? <Loader2 className="h-5 w-5 animate-spin" /> : <LogOut className="h-5 w-5" />}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">Abmelden</p>
                <p className="text-xs text-muted-foreground">Sitzung auf allen Geräten beenden</p>
              </div>
            </button>
          </div>
        </motion.section>

        <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.04 }}>
          <div className="space-y-4 rounded-xl border border-border bg-card p-5">
            <div className="flex items-center gap-2">
              <User className="h-5 w-5 text-primary" />
              <h2 className="font-heading text-lg font-semibold">Dein Profil</h2>
            </div>
            <p className="text-sm text-muted-foreground">
              Sport und Rolle helfen dabei, Situationen und Aufgaben passend einzuordnen.
            </p>

            {profileLoading ? (
              <div className="flex justify-center py-5"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
            ) : (
              <div className="space-y-3">
                <div>
                  <label htmlFor="account-sport" className="mb-1 block text-xs text-muted-foreground">Sportart</label>
                  <Input
                    id="account-sport"
                    value={sport}
                    onChange={(event) => setSport(event.target.value)}
                    placeholder="z. B. Fußball, Turnen, Boxen"
                  />
                </div>
                <div>
                  <label htmlFor="account-position" className="mb-1 block text-xs text-muted-foreground">Position / Rolle</label>
                  <Input
                    id="account-position"
                    value={position}
                    onChange={(event) => setPosition(event.target.value)}
                    placeholder="z. B. Stürmer, Mehrkampf, Mittelgewicht"
                  />
                </div>
                <Button onClick={saveProfile} disabled={savingProfile} className="w-full">
                  {savingProfile && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Profil speichern
                </Button>
              </div>
            )}
          </div>
        </motion.section>

        <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}>
          <div className="space-y-4 rounded-xl border border-primary/20 bg-card p-5">
            <div className="flex items-center gap-2">
              <Database className="h-5 w-5 text-primary" />
              <h2 className="font-heading text-lg font-semibold">Daten & Tracking</h2>
            </div>

            <div className="flex items-start gap-4">
              <div className="min-w-0 flex-1">
                <label htmlFor="data-contribution" className="text-sm font-medium text-foreground">
                  Freiwilliger Datenbeitrag
                </label>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                  Erlaubt anonymisierte oder aggregierte Nutzungs- und Fortschrittsdaten für Produktverbesserung,
                  Pilotberichte, Studien und Präsentationen.
                </p>
              </div>
              <Switch
                id="data-contribution"
                checked={dataContributionConsent === true}
                onCheckedChange={updateDataContributionConsent}
                disabled={profileLoading || savingDataContribution}
                aria-label="Freiwilligen Datenbeitrag ändern"
              />
            </div>

            <div className="rounded-lg border border-border bg-secondary/30 p-4 text-sm leading-relaxed text-muted-foreground">
              Private Journale, Freitexte und identifizierbare Einzelprofile werden dafür nicht verwendet. Bereits erstellte
              Gruppenstatistiken können nach einer Account-Löschung nur erhalten bleiben, wenn sie keinen Rückschluss auf dich
              zulassen. Gruppenwerte werden erst ab mindestens fünf Personen gebildet.
            </div>

            <p className="text-xs text-muted-foreground">
              {savingDataContribution
                ? "Entscheidung wird gespeichert..."
                : dataContributionPending
                  ? "Auf diesem Gerät vorgemerkt. Der Datenbeitrag ist noch nicht serverseitig aktiv."
                : dataContributionConsent === true
                  ? "Aktiviert. Du kannst die Einwilligung jederzeit widerrufen."
                  : dataContributionConsent === false
                    ? "Deaktiviert. Deine App-Nutzung bleibt unverändert."
                    : "Noch keine freiwillige Einwilligung gespeichert."}
            </p>
          </div>
        </motion.section>

        <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }}>
          <button
            type="button"
            onClick={() => navigate("/privacy")}
            className="flex w-full items-center gap-3 rounded-xl border border-border bg-card p-5 text-left transition-colors hover:bg-secondary/30"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Shield className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="font-heading text-base font-semibold">Datenschutz & deine Rechte</h2>
              <p className="mt-1 text-sm text-muted-foreground">Datenarten, Nutzung, Speicherdauer und Kontakt</p>
            </div>
            <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" />
          </button>
        </motion.section>

        <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.16 }}>
          <div className="space-y-4 rounded-xl border border-destructive/30 bg-card p-5">
            <div className="flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-destructive" />
              <h2 className="font-heading text-lg font-semibold">Account löschen</h2>
            </div>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Löscht deinen Account und alle personenbezogenen Programmdaten dauerhaft. Daten anderer Teammitglieder bleiben geschützt.
            </p>
            <Button variant="destructive" className="w-full" onClick={() => setDeletionDialogOpen(true)}>
              <Trash2 className="mr-2 h-4 w-4" />
              Account löschen
            </Button>
          </div>
        </motion.section>

        <div className="pb-8" />
      </main>

      <PasswordChangeDialog open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen} />
      {user && (
        <AccountDeletionDialog
          open={deletionDialogOpen}
          onOpenChange={setDeletionDialogOpen}
          userId={user.id}
          email={user.email ?? ""}
        />
      )}
    </div>
  );
};

export default AccountSettings;
