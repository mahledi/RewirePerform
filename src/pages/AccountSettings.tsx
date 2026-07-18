import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  BadgeCheck,
  ChevronRight,
  Database,
  FileText,
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useAuth } from "@/contexts/AuthContext";
import { useMinorAuthorization } from "@/hooks/useMinorAuthorization";
import { supabase } from "@/integrations/supabase/client";
import type { DataContributionConsentState } from "@/lib/dataContributionConsent";
import {
  revokeMinorAuthorization,
  saveAuthorizedDataContribution,
} from "@/lib/minorAuthorization";
import { toast } from "sonner";

const ageBandLabels = {
  under_16: "Unter 16",
  age_16_17: "16 oder 17",
  adult: "18 oder älter",
} as const;

const AccountSettings = () => {
  const navigate = useNavigate();
  const { user, role, signOut } = useAuth();
  const {
    status: minorStatus,
    loading: minorStatusLoading,
    setStatus: setMinorStatus,
  } = useMinorAuthorization();
  const [sport, setSport] = useState("");
  const [position, setPosition] = useState("");
  const [profileLoading, setProfileLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [dataContributionConsent, setDataContributionConsent] = useState<DataContributionConsentState>(null);
  const [dataContributionNeedsRenewal, setDataContributionNeedsRenewal] = useState(false);
  const [savingDataContribution, setSavingDataContribution] = useState(false);
  const [authorizationDialogOpen, setAuthorizationDialogOpen] = useState(false);
  const [revokingAuthorization, setRevokingAuthorization] = useState(false);
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

      if (active) setProfileLoading(false);
    };

    loadProfile();
    return () => {
      active = false;
    };
  }, [user]);

  useEffect(() => {
    if (role !== "athlete" || !minorStatus) return;
    setDataContributionConsent(
      minorStatus.data_contribution_status === "authorized"
        ? true
        : minorStatus.data_contribution_status === "not_asked"
          ? null
          : false,
    );
    setDataContributionNeedsRenewal(minorStatus.data_contribution_status === "policy_refresh_required");
  }, [minorStatus, role]);

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
    if (!user || role !== "athlete") return;
    setSavingDataContribution(true);
    try {
      const next = await saveAuthorizedDataContribution(consent);
      setMinorStatus(next);
      setDataContributionConsent(consent);
      setDataContributionNeedsRenewal(false);
      toast.success(consent ? "Datenbeitrag aktiviert." : "Datenbeitrag deaktiviert.");
    } catch (error) {
      const code = error instanceof Error ? error.message : "service_unavailable";
      toast.error(
        code === "authorization_required"
          ? "Diese Änderung braucht zuerst eine aktuelle Freigabe."
          : "Die Entscheidung konnte gerade nicht sicher gespeichert werden.",
      );
    } finally {
      setSavingDataContribution(false);
    }
  };

  const revokeAuthorization = async () => {
    setRevokingAuthorization(true);
    try {
      const next = await revokeMinorAuthorization();
      setMinorStatus(next);
      setDataContributionConsent(false);
      setAuthorizationDialogOpen(false);
      toast.success("Freigabe widerrufen.");
      navigate("/minor-consent", { replace: true });
    } catch {
      toast.error("Die Freigabe konnte gerade nicht widerrufen werden.");
    } finally {
      setRevokingAuthorization(false);
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
  const productAuthorized = minorStatus?.product_status === "authorized";
  const contributionEnableBlocked = minorStatus?.age_band === "under_16"
    && minorStatus.data_contribution_guardian !== true
    && dataContributionConsent !== true;
  const productStatusLabel = productAuthorized
    ? "Freigegeben"
    : minorStatus?.product_status === "pending"
      ? "Entscheidung offen"
      : minorStatus?.product_status === "policy_refresh_required"
        ? "Aktualisierung erforderlich"
        : "Nicht freigegeben";

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
            <p className="text-xs text-muted-foreground">Konto, Profil und Datenschutz</p>
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

        {role === "athlete" && (
          <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}>
            <div className="space-y-4 rounded-xl border border-border bg-card p-5">
              <div className="flex items-center gap-2">
                <BadgeCheck className="h-5 w-5 text-primary" />
                <h2 className="font-heading text-lg font-semibold">Alters- und Freigabestatus</h2>
              </div>

              {minorStatusLoading && !minorStatus ? (
                <div className="flex justify-center py-5"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
              ) : minorStatus ? (
                <div className="space-y-3 text-sm">
                  <div className="flex items-center justify-between gap-4 border-b border-border pb-3">
                    <span className="text-muted-foreground">Altersgruppe</span>
                    <span className="text-right font-medium">
                      {minorStatus.age_band ? ageBandLabels[minorStatus.age_band] : "Noch nicht angegeben"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-4 border-b border-border pb-3">
                    <span className="text-muted-foreground">Programmzugang</span>
                    <span className="text-right font-medium">{productStatusLabel}</span>
                  </div>
                  {minorStatus.age_band === "under_16" && (
                    <div className="flex items-center justify-between gap-4 border-b border-border pb-3">
                      <span className="text-muted-foreground">Sorgeberechtigte Person</span>
                      <span className="text-right font-medium">
                        {minorStatus.guardian_status === "authorized"
                          ? `Bestätigt${minorStatus.guardian_email_mask ? ` (${minorStatus.guardian_email_mask})` : ""}`
                          : minorStatus.guardian_status === "pending"
                            ? "Entscheidung offen"
                            : "Nicht bestätigt"}
                      </span>
                    </div>
                  )}
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    Es wird nur die Altersgruppe gespeichert, kein Geburtsdatum und kein Ausweis. Eine falsche Altersgruppe
                    korrigieren wir sicher über den Support.
                  </p>
                  {!productAuthorized ? (
                    <Button className="w-full" onClick={() => navigate("/minor-consent")}>
                      Freigabe fortsetzen
                      <ChevronRight className="ml-2 h-4 w-4" />
                    </Button>
                  ) : (
                    <Button variant="outline" className="w-full text-destructive hover:text-destructive" onClick={() => setAuthorizationDialogOpen(true)}>
                      Gesamte Freigabe widerrufen
                    </Button>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">Der Freigabestatus konnte gerade nicht sicher geladen werden.</p>
                  <Button variant="outline" className="w-full" onClick={() => navigate("/minor-consent")}>Erneut prüfen</Button>
                </div>
              )}
            </div>
          </motion.section>
        )}

        {role === "athlete" && (
        <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }}>
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
                  Performance-Optimierung, Pilotberichte und Präsentationen.
                </p>
              </div>
              <Switch
                id="data-contribution"
                checked={dataContributionConsent === true}
                onCheckedChange={updateDataContributionConsent}
                disabled={
                  profileLoading
                  || minorStatusLoading
                  || !productAuthorized
                  || savingDataContribution
                  || contributionEnableBlocked
                }
                aria-label="Freiwilligen Datenbeitrag ändern"
              />
            </div>

            <div className="rounded-lg border border-border bg-secondary/30 p-4 text-sm leading-relaxed text-muted-foreground">
              Private Journale, Freitexte und identifizierbare Einzelprofile werden dafür nicht verwendet. Bereits erstellte
              Gruppenstatistiken können nach einer Kontolöschung nur erhalten bleiben, wenn sie keinen Rückschluss auf dich
              zulassen. Gruppenwerte werden erst ab mindestens fünf Personen gebildet.
            </div>

            <p className="text-xs leading-relaxed text-muted-foreground">
              Für Minderjährige startet diese Einstellung keine gesonderte Transfer-Auswertung für Nachweiszwecke. Das
              zusätzliche Nachweisprotokoll bleibt für Minderjährige technisch deaktiviert; das normale Produkttracking bleibt aktiv.
            </p>

            {contributionEnableBlocked && (
              <p className="rounded-lg border border-border bg-secondary/30 px-3 py-2 text-xs text-muted-foreground">
                Die sorgeberechtigte Person hat diese zusätzliche Auswertung nicht erlaubt. Dein normales Programm bleibt vollständig nutzbar.
              </p>
            )}

            {dataContributionNeedsRenewal && (
              <p className="rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-xs text-foreground">
                Der Datenumfang wurde präzisiert. Bitte entscheide auf Grundlage der aktuellen Erklärung erneut.
              </p>
            )}

            <p className="text-xs text-muted-foreground">
              {savingDataContribution
                ? "Entscheidung wird gespeichert..."
                : dataContributionConsent === true
                  ? "Aktiviert. Du kannst die Einwilligung jederzeit widerrufen."
                  : dataContributionConsent === false
                    ? "Deaktiviert. Deine App-Nutzung bleibt unverändert."
                    : "Noch keine freiwillige Einwilligung gespeichert."}
            </p>
          </div>
        </motion.section>
        )}

        <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.16 }}>
          <div className="space-y-1 rounded-xl border border-border bg-card p-2">
            <button
              type="button"
              onClick={() => navigate("/privacy")}
              className="flex w-full items-center gap-3 rounded-lg p-3 text-left transition-colors hover:bg-secondary/30"
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
            <button
              type="button"
              onClick={() => navigate("/imprint")}
              className="flex w-full items-center gap-3 rounded-lg p-3 text-left transition-colors hover:bg-secondary/30"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-secondary text-foreground">
                <FileText className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="font-heading text-base font-semibold">Impressum</h2>
                <p className="mt-1 text-sm text-muted-foreground">Verantwortlicher und Kontakt</p>
              </div>
              <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" />
            </button>
          </div>
        </motion.section>

        <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <div className="space-y-4 rounded-xl border border-destructive/30 bg-card p-5">
            <div className="flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-destructive" />
              <h2 className="font-heading text-lg font-semibold">Konto löschen</h2>
            </div>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Löscht dein Konto und alle personenbezogenen Programmdaten dauerhaft. Daten anderer Teammitglieder bleiben geschützt.
            </p>
            <Button variant="destructive" className="w-full" onClick={() => setDeletionDialogOpen(true)}>
              <Trash2 className="mr-2 h-4 w-4" />
              Konto löschen
            </Button>
          </div>
        </motion.section>

        <div className="pb-8" />
      </main>

      <PasswordChangeDialog open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen} />
      <AlertDialog open={authorizationDialogOpen} onOpenChange={setAuthorizationDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Gesamte Freigabe widerrufen?</AlertDialogTitle>
            <AlertDialogDescription>
              Danach werden neue datenabhängige Programmaktivitäten gesperrt und der freiwillige Datenbeitrag beendet.
              Du kannst den Freigabeablauf später erneut starten.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={revokingAuthorization}>Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              disabled={revokingAuthorization}
              onClick={(event) => {
                event.preventDefault();
                void revokeAuthorization();
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {revokingAuthorization && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Freigabe widerrufen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
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
