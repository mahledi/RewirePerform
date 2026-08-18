import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowUpRight,
  Building2,
  CheckCircle2,
  Clipboard,
  Clock3,
  Loader2,
  Mail,
  Phone,
  RefreshCcw,
  ShieldCheck,
  Trash2,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";

export type OrganizationRequest = {
  id: string;
  reference_code: string;
  status: string;
  contact_name: string;
  work_email: string;
  phone: string | null;
  job_title: string;
  preferred_contact: string;
  organization_name: string;
  organization_type: string;
  team_name: string | null;
  country_code: string;
  website: string | null;
  sports: string[];
  athlete_age_groups: string[];
  performance_levels: string[];
  team_count_band: string;
  athlete_count_band: string;
  coach_count_band: string;
  rollout_scope: string;
  desired_start: string;
  goals: string[];
  support_needs: string[];
  context_note: string | null;
  source: string;
  submitted_at: string;
  updated_at: string;
};

const statusLabels: Record<string, string> = {
  submitted: "Neu",
  needs_information: "Rückfrage",
  review_ready: "Entscheidungsbereit",
  call_requested: "Gespräch",
  approved_community: "Community freigegeben",
  approved_partner: "Partner freigegeben",
  approved_enterprise: "Enterprise freigegeben",
  declined: "Abgelehnt",
  withdrawn: "Zurückgezogen",
  activated: "Aktiviert",
};

const organizationTypeLabels: Record<string, string> = {
  local_club: "Verein",
  academy: "Akademie",
  performance_center: "Leistungszentrum / NLZ",
  school: "Schule",
  university: "Universität / Hochschule",
  association: "Verband",
  federation: "Dachverband",
  private_provider: "Privater Sportanbieter",
  other: "Andere Organisation",
};

const scopeLabels: Record<string, string> = {
  single_team: "Ein Team",
  pilot: "Pilot",
  multi_team: "Mehrere Teams",
  organization_wide: "Organisation",
  exploring: "Orientierung",
};

const goalLabels: Record<string, string> = {
  mental_routines: "Mentale Routinen im Alltag",
  coach_transfer: "Transfer zwischen Coaches und Athleten",
  reflection: "Reflexion und Selbststeuerung",
  team_overview: "Aggregierter Teamzustand",
  pilot: "Kontrollierter Pilot",
};

const supportLabels: Record<string, string> = {
  standard: "Standardzugang",
  onboarding: "Persönliche Einführung",
  customization: "Organisationsanpassung",
  reporting: "Reporting und Auswertung",
  integration: "Technische Integration",
};

const bandLabels: Record<string, string> = {
  "1": "1",
  "2_5": "2–5",
  "6_15": "6–15",
  "16_plus": "16+",
  under_25: "unter 25",
  "25_99": "25–99",
  "100_499": "100–499",
  "500_plus": "500+",
  "6_20": "6–20",
  "21_plus": "21+",
  unknown: "noch offen",
};

const startLabels: Record<string, string> = {
  asap: "so bald wie möglich",
  next_4_weeks: "in den nächsten 4 Wochen",
  next_3_months: "in den nächsten 3 Monaten",
  later: "später",
  unknown: "noch offen",
};

const tierLabels = {
  community: "Community",
  partner: "Partner",
  enterprise: "Enterprise",
} as const;

const approvableStatuses = new Set(["submitted", "needs_information", "review_ready", "call_requested"]);

const RequestMetric = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-xl border border-border/60 bg-secondary/25 p-3">
    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
    <p className="mt-1 text-sm font-semibold text-foreground">{value}</p>
  </div>
);

const OrganizationRequestManager = () => {
  const [requests, setRequests] = useState<OrganizationRequest[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [tier, setTier] = useState<"community" | "partner" | "enterprise">("community");
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);

  const selected = useMemo(
    () => requests.find((request) => request.id === selectedId) ?? requests[0] ?? null,
    [requests, selectedId],
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    // Draft RPC is intentionally absent from Production until separately approved.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error: rpcError } = await (supabase as any).rpc("get_admin_organization_access_requests", { _status: null });
    setLoading(false);
    if (rpcError) {
      setError("Partneranfragen sind lokal vorbereitet, aber die draft-only Migration ist noch nicht aktiviert.");
      return;
    }
    const rows = (data ?? []) as OrganizationRequest[];
    setRequests(rows);
    setSelectedId((current) => current && rows.some((row) => row.id === current) ? current : rows[0]?.id ?? null);
  }, []);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    if (!selected) return;
    setNote("");
    setInviteUrl(null);
  }, [selected?.id]);

  const updateStatus = async (status: string) => {
    if (!selected || saving) return;
    setSaving(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: rpcError } = await (supabase as any).rpc("update_organization_access_request", {
      _request_id: selected.id,
      _status: status,
      _internal_note: note.trim() || null,
    });
    setSaving(false);
    if (rpcError) {
      toast.error("Die Entscheidung konnte nicht gespeichert werden.");
      return;
    }
    toast.success("Anfragestatus aktualisiert.");
    await load();
  };

  const approve = async () => {
    if (!selected || saving) return;
    setSaving(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error: rpcError } = await (supabase as any).rpc("approve_organization_access_request", {
      _request_id: selected.id,
      _access_tier: tier,
      _team_name: null,
      _team_sport: null,
    });
    setSaving(false);
    if (rpcError || !data?.invitation_token) {
      toast.error("Organisation und Einladung konnten nicht angelegt werden.");
      return;
    }
    const url = `${window.location.origin}/organization/invite?token=${encodeURIComponent(String(data.invitation_token))}`;
    const { error: emailError } = await supabase.functions.invoke("send-organization-access-invitation", {
      body: {
        recipient_email: selected.work_email,
        invitation_token: String(data.invitation_token),
      },
    });
    if (emailError) {
      toast.error("Freigabe ist vorbereitet, aber die E-Mail konnte nicht gesendet werden. Teile den Link persönlich.");
    } else {
      toast.success("Freigabe vorbereitet und persönliche Einladung per E-Mail gesendet.");
    }
    await load();
    setInviteUrl(url);
  };

  const purgeFakeOrSpam = async () => {
    if (!selected || saving) return;
    setSaving(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: rpcError } = await (supabase as any).rpc("delete_organization_access_request_spam", {
      _request_id: selected.id,
      _confirmation: "DELETE_FAKE_OR_SPAM",
    });
    setSaving(false);
    if (rpcError) {
      toast.error("Die Fake-/Spam-Anfrage konnte nicht sicher gelöscht werden.");
      return;
    }
    toast.success("Fake-/Spam-Anfrage vollständig gelöscht.");
    await load();
  };

  if (loading) {
    return <div className="flex min-h-52 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-heading text-2xl font-semibold">Partneranfragen</h2>
          <p className="mt-1 text-sm text-muted-foreground">Originalangaben, Vorbereitung und deine Entscheidung – klar getrennt.</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => void load()}><RefreshCcw className="h-4 w-4" />Neu laden</Button>
      </div>

      {error && (
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardContent className="flex items-start gap-3 p-5 text-sm text-muted-foreground">
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
            <div><p className="font-semibold text-foreground">Sicher geschlossen</p><p className="mt-1">{error}</p></div>
          </CardContent>
        </Card>
      )}

      {!error && requests.length === 0 && (
        <Card><CardContent className="p-8 text-center"><CheckCircle2 className="mx-auto h-8 w-8 text-primary" /><p className="mt-3 font-semibold">Keine offenen Anfragen.</p><p className="mt-1 text-sm text-muted-foreground">Neue Anfragen erscheinen hier nach sicherer Übermittlung.</p></CardContent></Card>
      )}

      {requests.length > 0 && (
        <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(250px,0.72fr)_minmax(0,1.28fr)]">
          <div className="space-y-2">
            {requests.map((request) => (
              <button
                key={request.id}
                type="button"
                onClick={() => setSelectedId(request.id)}
                className={`w-full rounded-2xl border p-4 text-left transition-colors ${selected?.id === request.id ? "border-primary bg-primary/10" : "border-border/70 bg-card hover:border-primary/40"}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0"><p className="truncate font-semibold">{request.organization_name}</p><p className="mt-1 truncate text-xs text-muted-foreground">{request.contact_name} · {request.job_title}</p></div>
                  <Badge variant={request.status === "submitted" ? "default" : "secondary"}>{statusLabels[request.status] ?? request.status}</Badge>
                </div>
                <div className="mt-3 flex items-center justify-between text-[11px] text-muted-foreground"><span>{request.reference_code}</span><span>{new Date(request.submitted_at).toLocaleDateString("de-DE")}</span></div>
              </button>
            ))}
          </div>

          {selected && (
            <Card className="min-w-0 overflow-hidden">
              <CardHeader className="border-b border-border/60 bg-secondary/15">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0"><CardTitle className="text-xl">{selected.organization_name}</CardTitle><CardDescription className="mt-1">{organizationTypeLabels[selected.organization_type] ?? selected.organization_type} · {selected.country_code}</CardDescription></div>
                  <Badge variant="outline">{selected.reference_code}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-6 p-5 sm:p-6">
                <section>
                  <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-primary">Ansprechpartner</p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <RequestMetric label="Name" value={`${selected.contact_name} · ${selected.job_title}`} />
                    <RequestMetric label="Kontakt" value={selected.work_email} />
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <a href={`mailto:${selected.work_email}`}><Button size="sm" variant="outline"><Mail className="h-4 w-4" />E-Mail</Button></a>
                    {selected.phone && <a href={`tel:${selected.phone}`}><Button size="sm" variant="outline"><Phone className="h-4 w-4" />Anrufen</Button></a>}
                    {selected.website && <a href={selected.website} target="_blank" rel="noreferrer"><Button size="sm" variant="outline"><ArrowUpRight className="h-4 w-4" />Website</Button></a>}
                  </div>
                </section>

                <section>
                  <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-primary">Einsatz</p>
                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    <RequestMetric label="Sport" value={selected.sports.join(", ") || "Offen"} />
                    <RequestMetric label="Umfang" value={scopeLabels[selected.rollout_scope] ?? selected.rollout_scope} />
                    <RequestMetric label="Teams" value={bandLabels[selected.team_count_band] ?? selected.team_count_band} />
                    <RequestMetric label="Athleten" value={bandLabels[selected.athlete_count_band] ?? selected.athlete_count_band} />
                  </div>
                  {selected.team_name && (
                    <div className="mt-3">
                      <RequestMetric label="Team / Altersklasse" value={selected.team_name} />
                    </div>
                  )}
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <RequestMetric label="Gewünschter Start" value={startLabels[selected.desired_start] ?? selected.desired_start} />
                    <RequestMetric label="Coaches" value={bandLabels[selected.coach_count_band] ?? selected.coach_count_band} />
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">{selected.goals.map((goal) => <Badge key={goal} variant="secondary">{goalLabels[goal] ?? goal}</Badge>)}</div>
                  <div className="mt-2 flex flex-wrap gap-2">{selected.support_needs.map((need) => <Badge key={need} variant="outline">{supportLabels[need] ?? need}</Badge>)}</div>
                  {selected.context_note && <p className="mt-4 rounded-xl border border-border/60 bg-secondary/20 p-4 text-sm leading-relaxed text-muted-foreground">{selected.context_note}</p>}
                </section>

                <section className="rounded-2xl border border-dashed border-border bg-secondary/15 p-4">
                  <div className="flex items-start gap-3">
                    <SparklesIcon />
                    <div><p className="font-semibold">Jarvis-Vorrecherche</p><p className="mt-1 text-sm leading-relaxed text-muted-foreground">Noch geschlossen. Später erscheinen hier ausschließlich quellenbasierte öffentliche Organisationsinformationen, Unsicherheiten und Gesprächsfragen – niemals eine automatische Preis- oder Freigabeentscheidung.</p></div>
                  </div>
                </section>

                {approvableStatuses.has(selected.status) && <section className="space-y-4 border-t border-border/60 pt-5">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2"><Label htmlFor="partner-note">Interne Notiz</Label><Textarea id="partner-note" value={note} onChange={(e) => setNote(e.target.value)} maxLength={2400} className="min-h-24" /></div>
                    <div className="space-y-3">
                      <Label>Nächster Schritt</Label>
                      <div className="grid grid-cols-2 gap-2">
                        <Button variant="outline" disabled={saving} onClick={() => void updateStatus("needs_information")}>Rückfrage</Button>
                        <Button variant="outline" disabled={saving} onClick={() => void updateStatus("call_requested")}>Gespräch</Button>
                        <Button variant="outline" disabled={saving} onClick={() => void updateStatus("review_ready")}>Entscheidungsbereit</Button>
                        <Button variant="ghost" disabled={saving} onClick={() => void updateStatus("declined")}>Ablehnen</Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button className="col-span-2" variant="destructive" disabled={saving}><Trash2 className="h-4 w-4" />Fake/Spam löschen</Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Fake-/Spam-Anfrage endgültig löschen?</AlertDialogTitle>
                              <AlertDialogDescription>
                                „{selected.organization_name}“ und sämtliche zugehörigen Anfrageereignisse werden sofort und unwiderruflich gelöscht. Nutze dies ausschließlich für bestätigte Fake- oder Spam-Anfragen. Eine echte Anfrage kannst du stattdessen ablehnen; sie wird spätestens nach zwölf Monaten automatisch gelöscht.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Behalten</AlertDialogCancel>
                              <AlertDialogAction onClick={() => void purgeFakeOrSpam()}>Endgültig als Fake/Spam löschen</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  </div>
                </section>}

                {approvableStatuses.has(selected.status) ? <section className="space-y-4 rounded-2xl border border-primary/20 bg-primary/5 p-4 sm:p-5">
                  <div className="flex items-start gap-3"><ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" /><div><p className="font-semibold">Zugang vorbereiten</p><p className="mt-1 text-sm text-muted-foreground">Erstellt den freigegebenen Organisationszugang und eine einmalige persönliche Einladung. Das erste Team legt der Coach anschließend selbst im Dashboard an.</p></div></div>
                  <div className="max-w-xs space-y-2">
                    <div className="space-y-2"><Label htmlFor="partner-tier">Klasse</Label><select id="partner-tier" value={tier} onChange={(e) => setTier(e.target.value as typeof tier)} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"><option value="community">Community</option><option value="partner">Partner</option><option value="enterprise">Enterprise</option></select></div>
                  </div>
                  <p className="text-xs leading-relaxed text-muted-foreground">Die Klasse beschreibt Umfang, Begleitung, Anpassung und Integrationsbedarf – nicht die vermutete Zahlungsfähigkeit der Organisation.</p>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button disabled={saving}>{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Building2 className="h-4 w-4" />}Persönlich freigeben</Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>{selected.organization_name} verbindlich vorbereiten?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Es werden der Organisationszugang und eine einmalige Einladung für {selected.work_email} als {tierLabels[tier]} angelegt. Die persönliche Zugangs-E-Mail wird anschließend ausschließlich an diese Adresse gesendet. Der Coach erstellt sein erstes Team nach der Anmeldung selbst. Es wird noch keine Zahlung ausgelöst.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Zurück zur Prüfung</AlertDialogCancel>
                        <AlertDialogAction onClick={() => void approve()}>Organisation freigeben</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </section> : (
                  <section className="rounded-2xl border border-border/70 bg-secondary/20 p-5">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Vorgang dokumentiert</p>
                    <p className="mt-2 font-semibold">{statusLabels[selected.status] ?? selected.status}</p>
                    <p className="mt-1 text-sm leading-relaxed text-muted-foreground">Diese Anfrage ist nicht mehr im Entscheidungsmodus. Bestehende Organisationen und Rollen werden separat verwaltet.</p>
                  </section>
                )}
                {inviteUrl && <section className="rounded-2xl border border-border/70 bg-secondary/20 p-4 sm:p-5"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Einmalige Einladung</p><p className="mt-2 text-sm leading-relaxed text-muted-foreground">Die Einladung wurde für {selected.work_email} vorbereitet. Falls der E-Mail-Versand nicht ankommt, kannst du diesen persönlichen Link gezielt weitergeben.</p><div className="mt-3 flex gap-2"><Input readOnly value={inviteUrl} className="font-mono text-xs" /><Button size="icon" variant="outline" aria-label="Einladungslink kopieren" onClick={() => { void navigator.clipboard.writeText(inviteUrl); toast.success("Einladungslink kopiert."); }}><Clipboard className="h-4 w-4" /></Button></div></section>}
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
};

const SparklesIcon = () => (
  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><Clock3 className="h-4 w-4" /></span>
);

export default OrganizationRequestManager;
