import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, RefreshCcw, AlertTriangle, ShieldCheck, LogOut, ArrowLeft, LayoutGrid, CalendarDays, Users as UsersIcon, BarChart3, MessageSquare, HeartPulse, BookOpen, TestTube2, Activity, Shield, Target, CheckCircle2, Building2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import AdminDayBrowser from "@/components/admin/AdminDayBrowser";
import AdminComprehensionInsights from "@/components/admin/AdminComprehensionInsights";
import NlzPilotReadiness from "@/components/admin/NlzPilotReadiness";
import EvidenceParticipationGate from "@/components/admin/EvidenceParticipationGate";
import AdminCommandCenter from "@/components/admin/AdminCommandCenter";
import OrganizationRequestManager from "@/components/admin/OrganizationRequestManager";
import { useIsMobile } from "@/hooks/use-mobile";
import MobileNavCard from "@/components/MobileNavCard";
import { BrandSymbol } from "@/components/brand/BrandLogo";

type Overview = {
  total_users: number; total_athletes: number; total_coaches: number; total_admins: number;
  total_teams: number; active_teams: number; total_completed_days: number;
  total_checkins: number; total_assessments: number; total_comprehension: number;
  avg_adherence: number | null; avg_comprehension_score: number | null;
};

type TeamRow = {
  id: string; name: string; sport: string | null; coach_name: string | null;
  created_by: string | null; program_start_date: string | null;
  member_count: number; athlete_count: number;
  pre_n: number; mid_n: number; post_n: number;
  avg_completion: number | null; avg_days_completed: number | null;
  evidence_status: "not_enough_data" | "pre_partial" | "pre_only" | "mid_available" | "full_pre_post";
};

type Health = {
  users_missing_profile: number; users_missing_role: number;
  athletes_without_program_instance: number; teams_below_min_n: number;
  assessments_missing_instance: number; completions_missing_instance: number;
  checkins_missing_instance: number; teams_without_evidence: number;
};

type OpsStatus = {
  generated_at: string;
  include_test: boolean;
  events_last_24h: number;
  failed_events_24h: number;
  critical_failed_events_24h: number;
  flow_failures_24h: Record<string, number>;
  recent_failed_events: Array<{
    created_at: string;
    event_name: string;
    status: string;
    role: string | null;
    route: string | null;
    error_code: string | null;
    is_test: boolean;
  }>;
  push: {
    sent_7d: number;
    opened_7d: number;
    failed_7d: number;
    expired_subscriptions_7d: number;
  };
  qa_vs_production: Record<string, number>;
  teams_below_min_n: number;
  privacy_level: string;
  privacy_exclusions: string[];
};

type PresentationMetrics = {
  generated_at: string;
  include_test: boolean;
  privacy_level: string;
  consent_scope?: string;
  claim_boundary: string;
  summary: Record<string, number | null>;
  activity: Record<string, number | null>;
  evidence_readiness: Record<string, number | null>;
  presentation_kpis: Array<{ label: string; value: number | null; type: "count" | "rate" }>;
  team_summaries: Array<Record<string, unknown>>;
  export_catalog: string[];
  privacy_exclusions: string[];
};

type StudyOverview = {
  generated_at: string;
  include_test: boolean;
  privacy_level: string;
  consent_scope?: string;
  claim_boundary: string;
  summary: Record<string, number | boolean | null>;
  activation: Record<string, number | null>;
  activity: Record<string, number | null>;
  measurement_readiness: Record<string, number | boolean | null>;
  data_quality: Record<string, number | boolean | null>;
  cohort_summaries: Array<Record<string, unknown>>;
  team_summaries: Array<Record<string, unknown>>;
  measurement_windows: Array<Record<string, unknown>>;
  export_catalog: string[];
  privacy_exclusions: string[];
};

type NlzEvidenceDossier = {
  generated_at: string;
  include_test: boolean;
  cohort_id: string | null;
  privacy_level: string;
  consent_scope?: string;
  claim_boundary: string;
  readiness: { stage: string; next_focus: string };
  summary: Record<string, number | string | boolean | null>;
  usage: Record<string, number | null>;
  adherence: Record<string, number | null>;
  state_28d: Record<string, number | boolean | null>;
  measurement: {
    validated_assessments: Record<string, number | null>;
    development_index: Record<string, number | null>;
    measurement_windows: Array<Record<string, unknown>>;
  };
  outcomes: {
    validated_assessments: Record<string, unknown>;
    development_index: Record<string, unknown>;
  };
  teams: Array<Record<string, unknown>>;
  outcome_definitions: Array<Record<string, unknown>>;
  data_quality: Record<string, number | boolean | null>;
  export_catalog: string[];
  privacy_exclusions: string[];
};

type FeedbackRow = {
  id: string; created_at: string; type: string; message: string;
  user_id: string; status: string; admin_note: string | null; reviewed_at: string | null;
};

const evidenceLabel: Record<TeamRow["evidence_status"], string> = {
  not_enough_data: "Zu wenig Daten",
  pre_partial: "Pre (unvollständig)",
  pre_only: "Pre verfügbar",
  mid_available: "Mid verfügbar",
  full_pre_post: "Pre/Post bereit",
};

const evidenceVariant: Record<TeamRow["evidence_status"], "secondary" | "default" | "outline"> = {
  not_enough_data: "outline",
  pre_partial: "outline",
  pre_only: "secondary",
  mid_available: "secondary",
  full_pre_post: "default",
};

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="text-xs text-muted-foreground uppercase tracking-wide">{label}</div>
        <div className="text-2xl font-semibold mt-1">{value}</div>
      </CardContent>
    </Card>
  );
}

function Row({ label, value }: { label: string; value: string | number | null }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-right">{value ?? "–"}</span>
    </div>
  );
}

function EvidenceMetric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="min-w-0 rounded-lg border border-border/60 bg-secondary/25 p-3">
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground truncate">{label}</p>
      <p className="mt-1 font-heading text-xl font-semibold leading-none truncate">{value}</p>
    </div>
  );
}

const formatPercent = (value: number | null) => {
  if (value == null || !Number.isFinite(value)) return "–";
  return `${Math.round(Math.max(0, Math.min(1, value)) * 100)}%`;
};

const formatCount = (value: number | null | undefined) => {
  if (value == null || !Number.isFinite(value)) return "–";
  return new Intl.NumberFormat("de-DE").format(value);
};

const formatDecimal = (value: number | null | undefined, digits = 1) => {
  if (value == null || !Number.isFinite(value)) return "–";
  return new Intl.NumberFormat("de-DE", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value);
};

const asRecordArray = (value: unknown): Array<Record<string, unknown>> =>
  Array.isArray(value) ? value.filter((row): row is Record<string, unknown> => !!row && typeof row === "object" && !Array.isArray(row)) : [];

type EvidenceStageKey = "early" | "collecting" | "presentable" | "strong";

type EvidenceStage = {
  key: EvidenceStageKey;
  label: string;
  description: string;
  badgeVariant: "secondary" | "default" | "outline";
};

const EVIDENCE_STAGES: Record<EvidenceStageKey, EvidenceStage> = {
  early: {
    key: "early",
    label: "Noch früh",
    description: "Die Datenlage ist noch klein. Fokus: Aktivierung, Day 1 und Pre-Messung sauber machen.",
    badgeVariant: "outline",
  },
  collecting: {
    key: "collecting",
    label: "Pilotdaten sammeln",
    description: "Nutzung und erste Messpunkte sind sichtbar. Jetzt Messfenster und Wiederkehr stabilisieren.",
    badgeVariant: "secondary",
  },
  presentable: {
    key: "presentable",
    label: "Präsentationsfähig",
    description: "Aggregierte Nutzung und Messbereitschaft reichen für ehrliche Pilot- und Vereinsgespräche.",
    badgeVariant: "default",
  },
  strong: {
    key: "strong",
    label: "Starke Datenlage",
    description: "Mehrere Teams oder Kohorten liefern robuste aggregierte Signale über Nutzung und Entwicklung.",
    badgeVariant: "default",
  },
};

const asNumber = (value: unknown) =>
  typeof value === "number" && Number.isFinite(value) ? value : 0;

function getEvidenceStage(
  study: StudyOverview | null,
  presentation: PresentationMetrics | null,
  teams: TeamRow[],
  health: Health | null
): EvidenceStage {
  const athletes = asNumber(study?.summary.athletes_total ?? presentation?.summary.athletes_total);
  const active7d = asNumber(study?.activation.active_7d ?? presentation?.activity.active_users_7d);
  const preN = asNumber(study?.measurement_readiness.validated_assessments_pre_n);
  const postN = asNumber(study?.measurement_readiness.validated_assessments_post_n);
  const developmentPostN = asNumber(study?.measurement_readiness.development_index_post_n);
  const teamsWithMinN = asNumber(presentation?.evidence_readiness.teams_with_min_5_athletes);
  const prePostTeams = asNumber(presentation?.evidence_readiness.teams_with_pre_post_n_5);
  const fullTeams = teams.filter((team) => team.evidence_status === "full_pre_post").length;

  if (athletes >= 20 && active7d >= 10 && preN >= 10 && (postN >= 10 || developmentPostN >= 10) && prePostTeams >= 2) {
    return EVIDENCE_STAGES.strong;
  }

  if (athletes >= 5 && active7d >= 3 && preN >= 5 && (postN >= 5 || developmentPostN >= 5 || prePostTeams >= 1 || fullTeams >= 1)) {
    return EVIDENCE_STAGES.presentable;
  }

  if (athletes >= 3 || active7d > 0 || preN > 0 || teamsWithMinN > 0) {
    return EVIDENCE_STAGES.collecting;
  }

  return EVIDENCE_STAGES.early;
}

function getMissingEvidenceItems(
  study: StudyOverview | null,
  presentation: PresentationMetrics | null,
  health: Health | null
) {
  const items: string[] = [];
  const athletes = asNumber(study?.summary.athletes_total ?? presentation?.summary.athletes_total);
  const active7d = asNumber(study?.activation.active_7d ?? presentation?.activity.active_users_7d);
  const preN = asNumber(study?.measurement_readiness.validated_assessments_pre_n);
  const postN = asNumber(study?.measurement_readiness.validated_assessments_post_n);
  const developmentPostN = asNumber(study?.measurement_readiness.development_index_post_n);
  const prePostTeams = asNumber(presentation?.evidence_readiness.teams_with_pre_post_n_5);

  if (athletes < 5) items.push("Mindestens 5 echte Athleten für sensible Aggregate.");
  if (active7d < 3) items.push("Mehr aktive Nutzung in den letzten 7 Tagen.");
  if (preN < 5) items.push("Mehr vollständige Pre-Messungen.");
  if (postN < 5 && developmentPostN < 5) items.push("Post- oder Development-Index-Re-Tests für Veränderung.");
  if (prePostTeams < 1) items.push("Mindestens ein Team mit Pre/Post n ≥ 5.");
  if (health?.athletes_without_program_instance) items.push("Athleten ohne aktiven Programmlauf bereinigen.");
  if (health?.assessments_missing_instance) items.push("Assessments ohne Programmbezug prüfen.");

  return items.slice(0, 5);
}

const opsSplitLabel: Record<string, string> = {
  production_events_24h: "Production-Incidents 24h",
  qa_events_24h: "QA-Incidents 24h",
  production_failures_24h: "Production-Fehler 24h",
  qa_failures_24h: "QA-Fehler 24h",
};

const Admin = () => {
  const { role, loading: authLoading, user, signOut } = useAuth();
  const navigate = useNavigate();
  const [overview, setOverview] = useState<Overview | null>(null);
  const [teams, setTeams] = useState<TeamRow[]>([]);
  const [health, setHealth] = useState<Health | null>(null);
  const [ops, setOps] = useState<OpsStatus | null>(null);
  const [opsError, setOpsError] = useState<string | null>(null);
  const [presentation, setPresentation] = useState<PresentationMetrics | null>(null);
  const [study, setStudy] = useState<StudyOverview | null>(null);
  const [nlzDossier, setNlzDossier] = useState<NlzEvidenceDossier | null>(null);
  const [feedback, setFeedback] = useState<FeedbackRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [studyIncludeTest, setStudyIncludeTest] = useState(false);
  const [noteDraft, setNoteDraft] = useState<Record<string, string>>({});
  const isMobile = useIsMobile();
  const [tab, setTab] = useState<string>("command");
  const [evidenceView, setEvidenceView] = useState<"overview" | "portfolio" | "team" | "solo" | "comprehension">("overview");
  const [didInitDevice, setDidInitDevice] = useState(false);
  useEffect(() => {
    if (didInitDevice) return;
    setTab(isMobile ? "home" : "command");
    setDidInitDevice(true);
  }, [isMobile, didInitDevice]);

  const ADMIN_SECTIONS: Array<{ id: string; title: string; description: string; icon: typeof UsersIcon }> = [
    { id: "command", title: "Zentrale", description: "Entscheidungen, Partneranfragen und nächste operative Schritte.", icon: LayoutGrid },
    { id: "access", title: "Partneranfragen", description: "Organisationen prüfen, vorbereiten und persönlich freigeben.", icon: Building2 },
    { id: "teams", title: "Teams", description: "Teams, Coaches und Programmstart verwalten.", icon: UsersIcon },
    { id: "pilot", title: "Pilotsteuerung", description: "Programmläufe, Zuordnung und operative Startbereitschaft.", icon: ShieldCheck },
    { id: "evidence", title: "Daten & Exporte", description: "Ergebnisse, Exporte und internes Programmverständnis.", icon: BarChart3 },
    { id: "days", title: "Tage", description: "Athleten-Vorschau jedes Programmtags.", icon: CalendarDays },
    { id: "feedback", title: "Feedback", description: "Nutzerfeedback prüfen und beantworten.", icon: MessageSquare },
    { id: "health", title: "Datenqualität & System", description: "Operative Vollständigkeit, Systemgesundheit und Launch-Ops.", icon: HeartPulse },
  ];
  const activeAdminSection = ADMIN_SECTIONS.find((s) => s.id === tab);
  const primaryAdminSections = ADMIN_SECTIONS.filter((section) =>
    ["command", "access", "teams", "pilot", "evidence"].includes(section.id),
  );
  const specialistAdminSections = ADMIN_SECTIONS.filter((section) =>
    ["days", "feedback", "health"].includes(section.id),
  );
  const showMobileHome = isMobile && tab === "home";
  const showMobileBack = isMobile && tab !== "home";

  const isAdmin = role === "admin";
  const openEvidence = (view: typeof evidenceView) => {
    setEvidenceView(view);
    setTab("evidence");
  };

  const loadAll = useCallback(async () => {
    setLoading(true);
    setOpsError(null);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = supabase as any;
    const [ov, ts, hl, pm, st, nlz, op, fb] = await Promise.all([
      sb.rpc("get_admin_overview_stats", { include_test: false }),
      sb.rpc("get_admin_teams_summary", { include_test: false }),
      sb.rpc("get_admin_system_health"),
      sb.rpc("get_admin_presentation_metrics", { include_test: false }),
      sb.rpc("get_admin_study_overview", { include_test: studyIncludeTest }),
      sb.rpc("get_admin_nlz_evidence_dossier", { include_test: studyIncludeTest, cohort_id: null }),
      sb.rpc("get_admin_ops_status", { include_test: studyIncludeTest }),
      sb.from("feedback").select("*").order("created_at", { ascending: false }),
    ]);
    if (ov.data) setOverview(ov.data as Overview);
    if (ts.data) setTeams(ts.data as TeamRow[]);
    if (hl.data) setHealth(hl.data as Health);
    if (pm.data) setPresentation(pm.data as PresentationMetrics);
    if (st.data) setStudy(st.data as StudyOverview);
    if (nlz.data) setNlzDossier(nlz.data as NlzEvidenceDossier);
    if (op.error) {
      setOps(null);
      setOpsError(op.error.message || "Launch-Ops konnte nicht geladen werden.");
    } else if (op.data) {
      setOps(op.data as OpsStatus);
    }
    if (!fb.error && fb.data) setFeedback(fb.data as FeedbackRow[]);
    setLoading(false);
  }, [studyIncludeTest]);

  const loadTeamsOnly = useCallback(async () => {
    setLoading(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any).rpc("get_admin_teams_summary", { include_test: false });
    if (!error && data) setTeams(data as TeamRow[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!authLoading && isAdmin && !["command", "home", "days", "pilot", "access", "teams"].includes(tab)) loadAll();
    else if (!authLoading) setLoading(false);
  }, [authLoading, isAdmin, loadAll, tab]);

  useEffect(() => {
    if (!authLoading && isAdmin && tab === "teams") void loadTeamsOnly();
  }, [authLoading, isAdmin, loadTeamsOnly, tab]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!user || !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle>Kein Zugriff</CardTitle>
            <CardDescription>
              Diese Seite ist nur für Admin-Konten verfügbar.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const updateFeedback = async (id: string, status: string) => {
    const note = noteDraft[id];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any).rpc("update_feedback_status", {
      feedback_id: id, new_status: status, new_note: note ?? null,
    });
    if (error) {
      toast({ title: "Fehler", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Aktualisiert" });
    loadAll();
  };

  const evidenceStage = getEvidenceStage(study, presentation, teams, health);
  const missingEvidenceItems = getMissingEvidenceItems(study, presentation, health);
  const generatedAt = study?.generated_at ?? presentation?.generated_at ?? ops?.generated_at ?? null;
  const claimBoundary = study?.claim_boundary ?? presentation?.claim_boundary ?? "Interne Programmevaluation; beobachtete Entwicklung; keine Diagnose; keine medizinische Wirkung; keine Kausalaussage ohne Kontrollgruppe.";
  const nlzValidatedPrePost = asRecordArray(nlzDossier?.outcomes.validated_assessments?.pre_post);
  const nlzValidatedPreMid = asRecordArray(nlzDossier?.outcomes.validated_assessments?.pre_mid);
  const nlzDevelopmentSubscores = asRecordArray(nlzDossier?.outcomes.development_index?.subscores);

  return (
    <div className="min-h-screen overflow-x-hidden bg-background p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <BrandSymbol size={40} className="mt-0.5" />
            <div className="min-w-0">
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-primary">RewirePerform</p>
              <h1 className="text-2xl md:text-3xl font-bold leading-tight">
                {isMobile ? "Admin" : "Founder Command Center"}
              </h1>
              <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
                {isMobile
                  ? "Entscheidungen und Organisation."
                  : "Organisation steuern, Entscheidungen treffen und Daten gezielt öffnen."}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {!isMobile && (
              <>
                <a href="/admin/content">
                  <Button variant="outline" size="sm">📚 Content offline</Button>
                </a>
                <a href="/admin/qa">
                  <Button variant="outline" size="sm">🧪 QA Test Lab</Button>
                </a>
                <Button variant="outline" size="sm" onClick={loadAll} disabled={loading}>
                  <RefreshCcw className="w-4 h-4 mr-2" />Neu laden
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    await signOut();
                    navigate("/", { replace: true });
                  }}
                >
                  <LogOut className="w-4 h-4 mr-2" />Abmelden
                </Button>
              </>
            )}
            {isMobile && (
              <>
                <button
                  onClick={loadAll}
                  disabled={loading}
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-border/70 bg-card text-muted-foreground transition-colors hover:bg-secondary/70 hover:text-foreground disabled:opacity-50"
                  title="Neu laden"
                >
                  <RefreshCcw className="w-4 h-4" />
                </button>
                <button
                  onClick={async () => {
                    await signOut();
                    navigate("/", { replace: true });
                  }}
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-border/70 bg-card text-muted-foreground transition-colors hover:bg-secondary/70 hover:text-foreground"
                  title="Abmelden"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </>
            )}
          </div>
        </div>

        {/* Mobile back + section header */}
        {showMobileBack && activeAdminSection && (
          <div className="min-w-0">
            <button
              onClick={() => setTab("home")}
              className="mb-3 inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 -ml-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-secondary/60 hover:text-foreground active:scale-95"
            >
              <ArrowLeft className="w-4 h-4" />
              Dashboard
            </button>
            <h2 className="font-heading text-xl font-semibold leading-tight text-foreground">
              {activeAdminSection.title}
            </h2>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              {activeAdminSection.description}
            </p>
          </div>
        )}

        {/* Mobile home: vertical card nav */}
        {showMobileHome ? (
          <div className="w-full min-w-0 space-y-3">
            {primaryAdminSections.map((s) => (
              <MobileNavCard
                key={s.id}
                icon={s.icon}
                title={s.title}
                description={s.description}
                onClick={() => setTab(s.id)}
              />
            ))}
            <details className="group rounded-2xl border border-border/70 bg-card">
              <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between px-4 text-sm font-semibold text-muted-foreground">Fachbereiche und interne Werkzeuge <span className="text-primary transition-transform group-open:rotate-45">+</span></summary>
              <div className="space-y-2 border-t border-border/60 p-3">
                {specialistAdminSections.map((s) => (
                  <button key={s.id} type="button" onClick={() => setTab(s.id)} className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-left text-sm text-muted-foreground hover:bg-secondary/60 hover:text-foreground"><s.icon className="h-4 w-4 text-primary" />{s.title}</button>
                ))}
                <button type="button" onClick={() => navigate("/admin/content")} className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-left text-sm text-muted-foreground hover:bg-secondary/60 hover:text-foreground"><BookOpen className="h-4 w-4 text-primary" />Content offline</button>
                <button type="button" onClick={() => navigate("/admin/qa")} className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-left text-sm text-muted-foreground hover:bg-secondary/60 hover:text-foreground"><TestTube2 className="h-4 w-4 text-primary" />QA Test Lab</button>
              </div>
            </details>
          </div>
        ) : (
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className={`${isMobile ? "hidden" : ""} grid h-auto min-h-10 grid-cols-5 w-full gap-1`}>
            <TabsTrigger value="command">Zentrale</TabsTrigger>
            <TabsTrigger value="access">Partner</TabsTrigger>
            <TabsTrigger value="teams">Teams</TabsTrigger>
            <TabsTrigger value="pilot">Pilot</TabsTrigger>
            <TabsTrigger value="evidence">Daten & Exporte</TabsTrigger>
          </TabsList>

          <TabsContent value="command" className="mt-4">
            <AdminCommandCenter onNavigate={setTab} />
          </TabsContent>


          {/* OVERVIEW */}
          <TabsContent value="overview" className="space-y-4 mt-4">
            {loading || !overview || !presentation || !study ? (
              <Loader2 className="w-5 h-5 animate-spin text-primary" />
            ) : (
              <>
                <Card className="border-primary/20 bg-primary/5">
                  <CardContent className="p-5 md:p-6">
                    <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                      <div className="max-w-3xl">
                        <div className="mb-3 flex flex-wrap items-center gap-2">
                          <Badge variant={evidenceStage.badgeVariant}>{evidenceStage.label}</Badge>
                          <Badge variant="outline">Production ohne QA</Badge>
                          {generatedAt && (
                            <span className="text-xs text-muted-foreground">
                              Datenstand {new Date(generatedAt).toLocaleString("de-DE")}
                            </span>
                          )}
                        </div>
                        <h2 className="font-heading text-2xl font-semibold leading-tight md:text-3xl">
                          Wirkungsstand
                        </h2>
                        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                          {evidenceStage.description}
                        </p>
                        <p className="mt-3 max-w-2xl text-xs leading-relaxed text-muted-foreground">
                          {claimBoundary}
                        </p>
                      </div>
                      <div className="grid grid-cols-2 gap-2 sm:min-w-[280px]">
                        <div className="rounded-lg border border-border/60 bg-background/50 p-3">
                          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Athleten</p>
                          <p className="mt-1 font-heading text-2xl font-semibold">{formatCount(study.summary.athletes_total as number)}</p>
                        </div>
                        <div className="rounded-lg border border-border/60 bg-background/50 p-3">
                          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Teams n ≥ 5</p>
                          <p className="mt-1 font-heading text-2xl font-semibold">{formatCount(presentation.evidence_readiness.teams_with_min_5_athletes)}</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <div className="grid gap-3 md:grid-cols-3">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="flex items-center gap-2 text-sm">
                        <Activity className="h-4 w-4 text-primary" />
                        Nutzung
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-2 gap-3">
                      <EvidenceMetric label="7d aktiv" value={formatPercent(study.activation.active_7d_rate)} />
                      <EvidenceMetric label="28d aktiv" value={formatPercent(study.activation.active_28d_rate)} />
                      <EvidenceMetric label="Check-ins" value={formatCount(presentation.activity.checkins_total)} />
                      <EvidenceMetric label="Journals" value={formatCount(presentation.activity.journal_entries_total)} />
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="flex items-center gap-2 text-sm">
                        <Target className="h-4 w-4 text-primary" />
                        Adherence
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-2 gap-3">
                      <EvidenceMetric label="Tage erledigt" value={formatCount(study.activity.completed_days_total as number)} />
                      <EvidenceMetric label="Ø Completion" value={formatPercent(study.activity.avg_completion_rate)} />
                      <EvidenceMetric label="Ø Streak" value={formatCount(presentation.activity.avg_current_streak)} />
                      <EvidenceMetric label="Day 56" value={formatPercent(study.activation.day_56_completion_rate)} />
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="flex items-center gap-2 text-sm">
                        <Shield className="h-4 w-4 text-primary" />
                        Präsentationsreife
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="rounded-lg bg-secondary/40 p-3">
                        <p className="text-xs text-muted-foreground">Aktueller Status</p>
                        <p className="mt-1 font-heading text-xl font-semibold">{evidenceStage.label}</p>
                      </div>
                      <div className="text-xs leading-relaxed text-muted-foreground">
                        Aggregate ab n ≥ 5. Keine Einzelprofile, keine Journaltexte, keine freien Reflexionen.
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <div className="grid gap-3 lg:grid-cols-[1.25fr_1fr]">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Messbereitschaft</CardTitle>
                      <CardDescription>Welche Messfenster bereits genug Substanz für ehrliche Auswertung haben.</CardDescription>
                    </CardHeader>
                    <CardContent className="grid grid-cols-2 gap-3 md:grid-cols-4">
                      <EvidenceMetric label="Validated Pre n" value={formatCount(study.measurement_readiness.validated_assessments_pre_n as number)} />
                      <EvidenceMetric label="Validated Mid n" value={formatCount(study.measurement_readiness.validated_assessments_mid_n as number)} />
                      <EvidenceMetric label="Validated Post n" value={formatCount(study.measurement_readiness.validated_assessments_post_n as number)} />
                      <EvidenceMetric label="Pre/Post Teams" value={formatCount(presentation.evidence_readiness.teams_with_pre_post_n_5)} />
                      <EvidenceMetric label="DI Pre n" value={formatCount(study.measurement_readiness.development_index_pre_n as number)} />
                      <EvidenceMetric label="DI Post n" value={formatCount(study.measurement_readiness.development_index_post_n as number)} />
                      <EvidenceMetric label="Teams mit Daten" value={formatCount(teams.filter(t => t.evidence_status === "full_pre_post" || t.evidence_status === "mid_available").length)} />
                      <EvidenceMetric label="Assessments" value={formatCount(overview.total_assessments)} />
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Was noch fehlt</CardTitle>
                      <CardDescription>Konkrete Lücken vor stärkeren Vereinsgesprächen.</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {missingEvidenceItems.length ? (
                        <div className="space-y-2">
                          {missingEvidenceItems.map((item) => (
                            <div key={item} className="flex items-start gap-2 rounded-lg border border-border/60 p-3 text-sm">
                              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                              <span className="leading-relaxed text-muted-foreground">{item}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="flex items-start gap-2 rounded-lg border border-primary/30 bg-primary/10 p-3 text-sm">
                          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                          <span className="leading-relaxed text-primary">Die wichtigsten Datenlücken für V1 sind geschlossen.</span>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>

                <div className="grid gap-3 md:grid-cols-3">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Datenqualität</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm">
                      <Row label="Ohne Programmlauf" value={study.data_quality.athletes_without_program_instance as number} />
                      <Row label="Ohne Day 1" value={study.data_quality.athletes_without_day_1 as number} />
                      <Row label="Ohne Pre" value={study.data_quality.athletes_without_pre_assessment as number} />
                      <Row label="Low Confidence" value={study.data_quality.low_confidence ? "ja" : "nein"} />
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Claim Boundary</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <Badge variant="outline">{study.privacy_level}</Badge>
                      <p className="text-xs leading-relaxed text-muted-foreground">
                        Beobachtete Entwicklung und Programmevaluation. Keine Diagnose, keine medizinische Wirkung, keine Kausalbehauptung ohne Kontrollgruppe.
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Nächste Bereiche</CardTitle>
                    </CardHeader>
                    <CardContent className="grid gap-2">
                      <Button variant="outline" className="justify-start" onClick={() => openEvidence("overview")}>Ergebnisse öffnen</Button>
                      <Button variant="outline" className="justify-start" onClick={() => openEvidence("portfolio")}>Gesamtdaten öffnen</Button>
                      <Button variant="outline" className="justify-start" onClick={() => openEvidence("team")}>Team-Export öffnen</Button>
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Programm-Sammlung</CardTitle>
                    <CardDescription>Was RewirePerform aktuell für deine Beweisführung sammelt.</CardDescription>
                  </CardHeader>
                  <CardContent className="grid gap-3 md:grid-cols-4">
                    <EvidenceMetric label="Athleten" value={formatCount(overview.total_athletes)} />
                    <EvidenceMetric label="Coaches" value={formatCount(overview.total_coaches)} />
                    <EvidenceMetric label="Teams" value={formatCount(overview.total_teams)} />
                    <EvidenceMetric label="Aktive Teams" value={formatCount(overview.active_teams)} />
                    <EvidenceMetric label="Comprehension" value={formatCount(overview.total_comprehension)} />
                    <EvidenceMetric label="Ø Verständnis" value={formatPercent(overview.avg_comprehension_score)} />
                    <EvidenceMetric label="Ø Adherence" value={formatPercent(overview.avg_adherence)} />
                    <EvidenceMetric label="Nutzer gesamt" value={formatCount(overview.total_users)} />
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>

          {/* DAYS — Athleten-Vorschau jedes Programmtags */}
          <TabsContent value="days" className="mt-4">
            <AdminDayBrowser />
          </TabsContent>

          {/* TEAMS */}
          <TabsContent value="teams" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Teams</CardTitle>
                <CardDescription>Aggregierte Teamdaten – keine individuellen Athlet:innen-Daten.</CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Team</TableHead>
                          <TableHead>Sport</TableHead>
                          <TableHead>Coach</TableHead>
                          <TableHead className="text-right">Mitglieder</TableHead>
                          <TableHead className="text-right">Athleten</TableHead>
                          <TableHead className="text-right">Pre/Mid/Post</TableHead>
                          <TableHead className="text-right">Ø Adherence</TableHead>
                          <TableHead>Datenlage</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {teams.map((t) => (
                          <TableRow key={t.id}>
                            <TableCell className="font-medium">{t.name}</TableCell>
                            <TableCell>{t.sport ?? "–"}</TableCell>
                            <TableCell>{t.coach_name ?? "–"}</TableCell>
                            <TableCell className="text-right">{t.member_count}</TableCell>
                            <TableCell className="text-right">{t.athlete_count}</TableCell>
                            <TableCell className="text-right">{t.pre_n}/{t.mid_n}/{t.post_n}</TableCell>
                            <TableCell className="text-right">
                              {t.avg_completion != null ? `${Math.round(t.avg_completion * 100)}%` : "–"}
                            </TableCell>
                            <TableCell>
                              <Badge variant={evidenceVariant[t.evidence_status]}>
                                {evidenceLabel[t.evidence_status]}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                        {!teams.length && (
                          <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-6">Keine Teams.</TableCell></TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* COACH ACCESS */}
          <TabsContent value="access" className="mt-4">
            <OrganizationRequestManager />
          </TabsContent>

          {/* PILOT CONTROL */}
          <TabsContent value="pilot" className="mt-4">
            <NlzPilotReadiness view="operations" />
          </TabsContent>

          {/* DATA & EXPORTS */}
          <TabsContent value="evidence" className="space-y-4 mt-4">
            <div className="border-b border-border pb-3">
              <div className="flex gap-1 overflow-x-auto" role="group" aria-label="Daten und Exporte">
                {[
                  { id: "overview" as const, label: "Ergebnisse" },
                  { id: "portfolio" as const, label: "Gesamtdaten" },
                  { id: "team" as const, label: "Team-Export" },
                  { id: "solo" as const, label: "Solo-Export" },
                  { id: "comprehension" as const, label: "Programmverständnis" },
                ].map((item) => (
                  <Button
                    key={item.id}
                    variant={evidenceView === item.id ? "secondary" : "ghost"}
                    size="sm"
                    onClick={() => setEvidenceView(item.id)}
                    aria-pressed={evidenceView === item.id}
                    className="shrink-0"
                  >
                    {item.label}
                  </Button>
                ))}
              </div>
            </div>

            {evidenceView === "team" ? <NlzPilotReadiness view="evidence" /> : null}
            {evidenceView === "solo" ? <EvidenceParticipationGate /> : null}
            {evidenceView === "comprehension" ? <AdminComprehensionInsights /> : null}

            {evidenceView === "overview" ? (
              loading || !nlzDossier ? (
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 text-sm text-muted-foreground">
                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                    NLZ Evidence Dossier wird geladen.
                  </div>
                </CardContent>
              </Card>
            ) : (
              <>
                <Card className="border-primary/20 bg-primary/5">
                  <CardContent className="p-5 md:p-6">
                    <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                      <div className="max-w-3xl">
                        <div className="mb-3 flex flex-wrap items-center gap-2">
                          <Badge variant="default">{nlzDossier.readiness.stage}</Badge>
                          <Badge variant="outline">{nlzDossier.include_test ? "QA eingeschlossen" : "Production ohne QA"}</Badge>
                          <Badge variant="secondary">Consent-aware</Badge>
                          <span className="text-xs text-muted-foreground">
                            Datenstand {new Date(nlzDossier.generated_at).toLocaleString("de-DE")}
                          </span>
                        </div>
                        <h2 className="font-heading text-2xl font-semibold leading-tight md:text-3xl">
                          NLZ Evidence Dossier
                        </h2>
                        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                          Studienorientierte Übersicht für Vereins- und NLZ-Gespräche: Nutzung, Adherence, Zustand,
                          Development Index, validierte Skalen und Messqualität in einer Claim-sicheren Struktur.
                        </p>
                        <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
                          {nlzDossier.claim_boundary}
                        </p>
                      </div>
                      <div className="grid grid-cols-2 gap-2 sm:min-w-[320px]">
                        <div className="rounded-lg border border-border/60 bg-background/50 p-3">
                          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Consented Athleten</p>
                          <p className="mt-1 font-heading text-2xl font-semibold">{formatCount(nlzDossier.summary.consented_athletes as number)}</p>
                        </div>
                        <div className="rounded-lg border border-border/60 bg-background/50 p-3">
                          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Consent Rate</p>
                          <p className="mt-1 font-heading text-2xl font-semibold">{formatPercent(nlzDossier.summary.consent_rate as number | null)}</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <div className="grid gap-3 md:grid-cols-3">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Readiness</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="rounded-lg bg-secondary/40 p-3">
                        <p className="text-xs text-muted-foreground">Aktuelle Stufe</p>
                        <p className="mt-1 font-heading text-xl font-semibold">{nlzDossier.readiness.stage}</p>
                      </div>
                      <p className="text-xs leading-relaxed text-muted-foreground">{nlzDossier.readiness.next_focus}</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Nutzung</CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-2 gap-3">
                      <EvidenceMetric label="7d aktiv" value={formatCount(nlzDossier.summary.active_7d as number)} />
                      <EvidenceMetric label="28d aktiv" value={formatCount(nlzDossier.summary.active_28d as number)} />
                      <EvidenceMetric label="Day 1" value={formatCount(nlzDossier.summary.day_1_completed as number)} />
                      <EvidenceMetric label="Day 56" value={formatCount(nlzDossier.summary.day_56_completed as number)} />
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Adherence</CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-2 gap-3">
                      <EvidenceMetric label="Ø Completion" value={formatPercent(nlzDossier.adherence.avg_completion_rate)} />
                      <EvidenceMetric label="Ø Tage" value={formatDecimal(nlzDossier.adherence.avg_days_completed)} />
                      <EvidenceMetric label="Ø Streak" value={formatDecimal(nlzDossier.adherence.avg_current_streak)} />
                      <EvidenceMetric label="Ø Verständnis" value={formatPercent(nlzDossier.adherence.avg_comprehension)} />
                    </CardContent>
                  </Card>
                </div>

                <div className="grid gap-3 lg:grid-cols-[1fr_1.2fr]">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Messprotokoll</CardTitle>
                      <CardDescription>Pre/Mid/Post-Stand für validierte Skalen und Development Index.</CardDescription>
                    </CardHeader>
                    <CardContent className="grid grid-cols-2 gap-3 md:grid-cols-3">
                      <EvidenceMetric label="Validated Pre n" value={formatCount(nlzDossier.measurement.validated_assessments.pre_n)} />
                      <EvidenceMetric label="Validated Mid n" value={formatCount(nlzDossier.measurement.validated_assessments.mid_n)} />
                      <EvidenceMetric label="Validated Post n" value={formatCount(nlzDossier.measurement.validated_assessments.post_n)} />
                      <EvidenceMetric label="DI Pre n" value={formatCount(nlzDossier.measurement.development_index.pre_n)} />
                      <EvidenceMetric label="DI Mid n" value={formatCount(nlzDossier.measurement.development_index.mid_n)} />
                      <EvidenceMetric label="DI Post n" value={formatCount(nlzDossier.measurement.development_index.post_n)} />
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Teamzustand 28 Tage</CardTitle>
                      <CardDescription>Aggregierte Check-in-Werte; psychologische Werte erst ab n ≥ 5.</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {nlzDossier.state_28d.sufficient_data ? (
                        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                          <EvidenceMetric label="Stimmung" value={`${formatDecimal(nlzDossier.state_28d.mood as number | null)}/10`} />
                          <EvidenceMetric label="Energie" value={`${formatDecimal(nlzDossier.state_28d.energy as number | null)}/10`} />
                          <EvidenceMetric label="Fokus" value={`${formatDecimal(nlzDossier.state_28d.focus as number | null)}/10`} />
                          <EvidenceMetric label="Stress" value={`${formatDecimal(nlzDossier.state_28d.stress as number | null)}/10`} />
                          <EvidenceMetric label="Erholung" value={`${formatDecimal(nlzDossier.state_28d.recovery as number | null)}/10`} />
                          <EvidenceMetric label="Druck" value={`${formatDecimal(nlzDossier.state_28d.pressure as number | null)}/10`} />
                          <EvidenceMetric label="Verbundenheit" value={`${formatDecimal(nlzDossier.state_28d.team_connection as number | null)}/10`} />
                          <EvidenceMetric label="Schlaf" value={`${formatDecimal(nlzDossier.state_28d.sleep as number | null)}/10`} />
                        </div>
                      ) : (
                        <div className="rounded-lg border border-border/60 bg-secondary/25 p-4 text-sm text-muted-foreground">
                          Noch zu wenig freigegebene Check-in-Daten für aggregierte Zustandswerte.
                          Sichtbar: n={formatCount(nlzDossier.state_28d.n_users as number)} / 5.
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>

                <div className="grid gap-3 lg:grid-cols-2">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Development Index Outcomes</CardTitle>
                      <CardDescription>Pre/Post-Paare aus dem RewirePerform Development Index.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="rounded-lg border border-border/60 bg-secondary/25 p-3">
                        <div className="flex items-center justify-between gap-3 text-sm">
                          <span className="text-muted-foreground">Overall Pre → Post</span>
                          <span className="font-medium">
                            {formatCount((nlzDossier.outcomes.development_index.overall as Record<string, number | boolean | null> | undefined)?.n_pre_post as number)}
                            {" "}Paare
                          </span>
                        </div>
                      </div>
                      {nlzDevelopmentSubscores.length ? (
                        <div className="space-y-2">
                          {nlzDevelopmentSubscores.slice(0, 6).map((row) => (
                            <div key={String(row.metric)} className="flex items-center justify-between gap-3 rounded-lg border border-border/60 p-3 text-sm">
                              <span className="min-w-0 truncate text-muted-foreground">{String(row.metric)}</span>
                              <span className="font-medium">
                                {formatDecimal(row.avg_pre as number | null)} → {formatDecimal(row.avg_post as number | null)}
                                {" · "}
                                {Number(row.abs_change ?? 0) >= 0 ? "+" : ""}{formatDecimal(row.abs_change as number | null)}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="rounded-lg bg-secondary/25 p-3 text-sm text-muted-foreground">
                          Noch keine ausreichenden Development-Index-Paare.
                        </p>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Validierte Skalen</CardTitle>
                      <CardDescription>CSAI-2R, SMTQ und Flow als gepaarte Pre/Mid/Post-Werte.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {[...nlzValidatedPrePost, ...nlzValidatedPreMid].slice(0, 7).map((row, index) => (
                        <div key={`${String(row.assessment_type)}-${String(row.subscale)}-${index}`} className="rounded-lg border border-border/60 p-3 text-sm">
                          <div className="flex items-center justify-between gap-3">
                            <span className="min-w-0 truncate font-medium">{String(row.assessment_type)} · {String(row.subscale)}</span>
                            <Badge variant={row.sufficient_data ? "default" : "outline"}>n={formatCount(row.n_pairs as number)}</Badge>
                          </div>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {formatDecimal(row.avg_pre as number | null)} → {formatDecimal((row.avg_post ?? row.avg_mid) as number | null)}
                            {" · Veränderung "}
                            {Number(row.abs_change ?? 0) >= 0 ? "+" : ""}{formatDecimal(row.abs_change as number | null)}
                            {row.effect_size_d != null ? ` · d=${formatDecimal(row.effect_size_d as number, 2)}` : ""}
                          </p>
                        </div>
                      ))}
                      {nlzValidatedPrePost.length === 0 && nlzValidatedPreMid.length === 0 && (
                        <p className="rounded-lg bg-secondary/25 p-3 text-sm text-muted-foreground">
                          Noch keine ausreichenden Paare aus validierten Skalen.
                        </p>
                      )}
                    </CardContent>
                  </Card>
                </div>

                <div className="grid gap-3 lg:grid-cols-[1fr_1fr_1.1fr]">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Datenqualität</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm">
                      <Row label="Ohne Consent" value={nlzDossier.data_quality.athletes_without_consent as number} />
                      <Row label="Ohne Programmlauf" value={nlzDossier.data_quality.athletes_without_program_instance as number} />
                      <Row label="Ohne Day 1" value={nlzDossier.data_quality.athletes_without_day_1 as number} />
                      <Row label="Ohne Pre-Messung" value={nlzDossier.data_quality.athletes_without_pre_measurement as number} />
                      <Row label="Post fällig offen" value={nlzDossier.data_quality.post_due_missing as number} />
                      <Row label="Teams n < 5" value={nlzDossier.data_quality.teams_below_min_n as number} />
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Outcome-Landkarte</CardTitle>
                      <CardDescription>Feste Struktur für spätere NLZ-Gespräche.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {nlzDossier.outcome_definitions.slice(0, 6).map((definition) => (
                        <div key={String(definition.id)} className="rounded-lg border border-border/60 p-3 text-sm">
                          <p className="font-medium">{String(definition.label)}</p>
                          <p className="text-xs text-muted-foreground">{String(definition.domain)} · n ≥ {String(definition.min_aggregate_n)}</p>
                        </div>
                      ))}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Freigegebener NLZ-Export</CardTitle>
                      <CardDescription>Live-Daten dienen nur der internen Prüfung.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <p className="text-xs leading-relaxed text-muted-foreground">
                        Externe Dateien werden ausschließlich in der Pilotzentrale als unveränderlicher Data Lock mit
                        Schema-Version, Analysemanifest und SHA-256-Prüfsumme erstellt.
                      </p>
                      <Button onClick={() => setEvidenceView("team")} className="justify-start">
                        <ShieldCheck className="mr-2 h-4 w-4" />Team-Export öffnen
                      </Button>
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Team-Readiness</CardTitle>
                    <CardDescription>Aggregierte Teamfähigkeit für NLZ-Gespräche, ohne Einzelprofile.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Team</TableHead>
                            <TableHead className="text-right">n</TableHead>
                            <TableHead className="text-right">Pre</TableHead>
                            <TableHead className="text-right">Post</TableHead>
                            <TableHead className="text-right">DI Post</TableHead>
                            <TableHead className="text-right">Ø Completion</TableHead>
                            <TableHead>Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {nlzDossier.teams.map((team) => (
                            <TableRow key={String(team.team_id ?? team.team)}>
                              <TableCell className="font-medium">{String(team.team ?? "–")}</TableCell>
                              <TableCell className="text-right">{formatCount(team.athlete_count as number)}</TableCell>
                              <TableCell className="text-right">{formatCount(team.pre_n as number)}</TableCell>
                              <TableCell className="text-right">{formatCount(team.post_n as number)}</TableCell>
                              <TableCell className="text-right">{formatCount(team.development_post_n as number)}</TableCell>
                              <TableCell className="text-right">{formatPercent(team.avg_completion_rate as number | null)}</TableCell>
                              <TableCell>
                                <Badge variant={team.evidence_ready ? "default" : team.aggregate_visible ? "secondary" : "outline"}>
                                  {team.evidence_ready ? "Pre/Post bereit" : team.aggregate_visible ? "n ≥ 5" : "n < 5"}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          ))}
                          {!nlzDossier.teams.length && (
                            <TableRow>
                              <TableCell colSpan={7} className="py-6 text-center text-muted-foreground">
                                Noch keine Team-Readiness verfügbar.
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                    <p className="mt-3 text-xs text-muted-foreground">
                      Ausgeschlossen: {nlzDossier.privacy_exclusions.join(", ")}.
                    </p>
                  </CardContent>
                </Card>
              </>
              )
            ) : null}

            {/* PORTFOLIO DATA */}
            {evidenceView === "portfolio" ? (
              <div className="space-y-4">
                <Card>
              <CardHeader>
                <CardTitle>Präsentationsdaten</CardTitle>
                <CardDescription>
                  Aggregierte Nutzungs- und Fortschrittsdaten für interne Evaluation, Vereinspräsentationen und Launch-Review.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                {loading || !presentation ? (
                  <Loader2 className="w-5 h-5 animate-spin text-primary" />
                ) : (
                  <>
                    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
                      {presentation.presentation_kpis.map((kpi) => (
                        <StatCard
                          key={kpi.label}
                          label={kpi.label}
                          value={kpi.type === "rate" && typeof kpi.value === "number" ? formatPercent(kpi.value) : kpi.value ?? "–"}
                        />
                      ))}
                    </div>

                    <div className="grid md:grid-cols-3 gap-3">
                      <div className="rounded-lg border border-border/60 p-4">
                        <h3 className="text-sm font-medium mb-3">Activity</h3>
                        <div className="space-y-2 text-sm">
                          <Row label="Aktive Nutzer 7 Tage" value={presentation.activity.active_users_7d} />
                          <Row label="Journals (nur Anzahl)" value={presentation.activity.journal_entries_total} />
                          <Row label="Ø Streak" value={presentation.activity.avg_current_streak} />
                          <Row label="Ø Verständnis" value={formatPercent(presentation.activity.avg_comprehension)} />
                        </div>
                      </div>
                      <div className="rounded-lg border border-border/60 p-4">
                        <h3 className="text-sm font-medium mb-3">Evidence Readiness</h3>
                        <div className="space-y-2 text-sm">
                          <Row label="Teams n ≥ 5" value={presentation.evidence_readiness.teams_with_min_5_athletes} />
                          <Row label="Pre n ≥ 5" value={presentation.evidence_readiness.teams_with_pre_n_5} />
                          <Row label="Mid n ≥ 5" value={presentation.evidence_readiness.teams_with_mid_n_5} />
                          <Row label="Pre/Post n ≥ 5" value={presentation.evidence_readiness.teams_with_pre_post_n_5} />
                        </div>
                      </div>
                      <div className="rounded-lg border border-border/60 p-4">
                        <h3 className="text-sm font-medium mb-3">Privacy Boundary</h3>
                        <div className="space-y-2">
                          <Badge variant="outline">{presentation.privacy_level}</Badge>
                          {presentation.consent_scope && (
                            <p className="text-xs text-primary leading-relaxed">
                              Consent-Scope: {presentation.consent_scope}
                            </p>
                          )}
                          <p className="text-xs text-muted-foreground leading-relaxed">
                            {presentation.claim_boundary}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col items-start gap-3 border-l-2 border-primary pl-3">
                      <p className="text-xs leading-relaxed text-muted-foreground">
                        Diese Live-Kennzahlen sind internes Monitoring. Freigegebene Exporte entstehen nur aus einem
                        unveränderlichen Data Lock in der Pilotzentrale.
                      </p>
                      <Button variant="outline" onClick={() => setEvidenceView("team")}>
                        <ShieldCheck className="mr-2 h-4 w-4" />Zu den Data Locks
                      </Button>
                    </div>

                    <p className="text-xs text-muted-foreground">
                      Ausgeschlossen: {presentation.privacy_exclusions.join(", ")}.
                    </p>
                  </>
                )}
              </CardContent>
                </Card>

                {/* STUDY / EVIDENCE */}
                <Card>
              <CardHeader>
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <CardTitle>Study / Evidence</CardTitle>
                    <CardDescription>
                      Interne Programmevaluation mit Kohorten-, Nutzungs- und Entwicklungsaggregaten. Keine Diagnose, keine Kausalaussage ohne Kontrollgruppe.
                    </CardDescription>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <div className="inline-flex rounded-lg border border-border/70 bg-muted/50 p-1">
                      <button
                        type="button"
                        onClick={() => setStudyIncludeTest(false)}
                        className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                          !studyIncludeTest ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        Production
                      </button>
                      <button
                        type="button"
                        onClick={() => setStudyIncludeTest(true)}
                        className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                          studyIncludeTest ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        QA anzeigen
                      </button>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-5">
                {loading || !study ? (
                  <Loader2 className="w-5 h-5 animate-spin text-primary" />
                ) : (
                  <>
                    {study.include_test && (
                      <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
                        QA-Ansicht aktiv: Testdaten werden nur hier eingeblendet. Production-Metriken und Präsentationsexporte bleiben standardmäßig ohne QA-Daten.
                      </div>
                    )}

                    <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-6 gap-3">
                      <StatCard label="Athleten" value={study.summary.athletes_total as number ?? 0} />
                      <StatCard label="Aktivierung" value={formatPercent(study.activation.activation_rate)} />
                      <StatCard label="Day 1" value={formatPercent(study.activation.day_1_rate)} />
                      <StatCard label="7d aktiv" value={formatPercent(study.activation.active_7d_rate)} />
                      <StatCard label="28d aktiv" value={formatPercent(study.activation.active_28d_rate)} />
                      <StatCard label="56 Tage" value={formatPercent(study.activation.day_56_completion_rate)} />
                    </div>

                    <div className="grid md:grid-cols-3 gap-3">
                      <div className="rounded-lg border border-border/60 p-4">
                        <h3 className="text-sm font-medium mb-3">Programmaktivität</h3>
                        <div className="space-y-2 text-sm">
                          <Row label="Abgeschlossene Tage" value={study.activity.completed_days_total} />
                          <Row label="Check-ins" value={study.activity.checkins_total} />
                          <Row label="Verständnis-Checks" value={study.activity.comprehension_checks_total} />
                          <Row label="Journals (nur Anzahl)" value={study.activity.journal_entries_count_only} />
                          <Row label="Ø Completion" value={formatPercent(study.activity.avg_completion_rate)} />
                        </div>
                      </div>
                      <div className="rounded-lg border border-border/60 p-4">
                        <h3 className="text-sm font-medium mb-3">Messfenster-Readiness</h3>
                        <div className="space-y-2 text-sm">
                          <Row label="Validated Pre n" value={study.measurement_readiness.validated_assessments_pre_n as number} />
                          <Row label="Validated Mid n" value={study.measurement_readiness.validated_assessments_mid_n as number} />
                          <Row label="Validated Post n" value={study.measurement_readiness.validated_assessments_post_n as number} />
                          <Row label="Development Index Pre n" value={study.measurement_readiness.development_index_pre_n as number} />
                          <Row label="Development Index Post n" value={study.measurement_readiness.development_index_post_n as number} />
                        </div>
                      </div>
                      <div className="rounded-lg border border-border/60 p-4">
                        <h3 className="text-sm font-medium mb-3">Datenqualität & Privacy</h3>
                        <div className="space-y-2 text-sm">
                          <Row label="Ohne Programmlauf" value={study.data_quality.athletes_without_program_instance as number} />
                          <Row label="Ohne Day 1" value={study.data_quality.athletes_without_day_1 as number} />
                          <Row label="Ohne Pre" value={study.data_quality.athletes_without_pre_assessment as number} />
                          <Row label="Low confidence" value={study.data_quality.low_confidence ? "ja" : "nein"} />
                        </div>
                      </div>
                    </div>

                    <div className="rounded-lg border border-border/60 p-4 space-y-3">
                      <div className="flex items-center justify-between gap-3 flex-wrap">
                        <div>
                          <h3 className="text-sm font-medium">Kohorten</h3>
                          <p className="text-xs text-muted-foreground">QA, Demo, Pilot und Production bleiben getrennt. Sensible Aggregate erst ab n ≥ 5.</p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="outline">{study.privacy_level}</Badge>
                          {study.consent_scope && (
                            <Badge variant="secondary" className="text-[10px]">
                              Consent-aware
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Kohorte</TableHead>
                              <TableHead>Typ</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead className="text-right">n</TableHead>
                              <TableHead>Aggregate</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {study.cohort_summaries.map((cohort, index) => (
                              <TableRow key={String(cohort.id ?? index)}>
                                <TableCell className="font-medium">{String(cohort.name ?? "–")}</TableCell>
                                <TableCell>{String(cohort.cohort_type ?? "–")}</TableCell>
                                <TableCell>{String(cohort.status ?? "–")}</TableCell>
                                <TableCell className="text-right">{String(cohort.participant_count ?? 0)}</TableCell>
                                <TableCell>
                                  <Badge variant={cohort.aggregate_visible ? "default" : "outline"}>
                                    {cohort.aggregate_visible ? "sichtbar" : "n < 5"}
                                  </Badge>
                                </TableCell>
                              </TableRow>
                            ))}
                            {!study.cohort_summaries.length && (
                              <TableRow>
                                <TableCell colSpan={5} className="text-center text-muted-foreground py-6">
                                  Noch keine expliziten Study-Kohorten angelegt. Die Live-Produktionsmetriken oben bleiben trotzdem auswertbar.
                                </TableCell>
                              </TableRow>
                            )}
                          </TableBody>
                        </Table>
                      </div>
                    </div>

                    <div className="flex flex-col items-start gap-3 border-l-2 border-primary pl-3">
                      <p className="text-xs leading-relaxed text-muted-foreground">
                        Dieser Bereich zeigt den aktuellen Evaluationsstatus. Für Analysen außerhalb des Adminbereichs
                        muss zuerst ein versionierter Data Lock erstellt werden.
                      </p>
                      <Button variant="outline" onClick={() => setEvidenceView("team")}>
                        <ShieldCheck className="mr-2 h-4 w-4" />Zu den Data Locks
                      </Button>
                    </div>

                    <div className="rounded-lg border border-border/60 p-4">
                      <h3 className="text-sm font-medium mb-2">Claim Boundary</h3>
                      {study.consent_scope && (
                        <p className="mb-2 text-xs text-primary leading-relaxed">
                          Consent-Scope: {study.consent_scope}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground leading-relaxed">{study.claim_boundary}</p>
                      <p className="text-xs text-muted-foreground mt-2">
                        Ausgeschlossen: {study.privacy_exclusions.join(", ")}.
                      </p>
                    </div>
                  </>
                )}
              </CardContent>
                </Card>
              </div>
            ) : null}
          </TabsContent>

          {/* FEEDBACK */}
          <TabsContent value="feedback" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Feedback / Support</CardTitle>
                <CardDescription>Eingereichte Nachrichten von Nutzern.</CardDescription>
              </CardHeader>
              <CardContent>
                {feedback.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4">Kein Feedback vorhanden.</p>
                ) : (
                  <div className="space-y-3">
                    {feedback.map((f) => (
                      <div key={f.id} className="border rounded-lg p-3 space-y-2">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">{f.type}</Badge>
                            <Badge variant={f.status === "resolved" ? "default" : f.status === "reviewed" ? "secondary" : "outline"}>
                              {f.status}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {new Date(f.created_at).toLocaleString("de-DE")}
                            </span>
                          </div>
                        </div>
                        <p className="text-sm whitespace-pre-wrap">{f.message}</p>
                        <Textarea
                          placeholder="Interne Admin-Notiz…"
                          defaultValue={f.admin_note ?? ""}
                          onChange={(e) => setNoteDraft((d) => ({ ...d, [f.id]: e.target.value }))}
                          className="text-xs"
                          rows={2}
                        />
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" onClick={() => updateFeedback(f.id, "reviewed")}>
                            Als gesichtet
                          </Button>
                          <Button size="sm" onClick={() => updateFeedback(f.id, "resolved")}>
                            Erledigt
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* HEALTH */}
          <TabsContent value="health" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Datenqualität & Systemstatus</CardTitle>
                <CardDescription>Operative Vollständigkeit, technische Gesundheit und Launch-Ops.</CardDescription>
              </CardHeader>
              <CardContent>
                {loading || !health ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <StatCard label="Nutzer ohne Profil" value={health.users_missing_profile} />
                    <StatCard label="Nutzer ohne Rolle" value={health.users_missing_role} />
                    <StatCard label="Athleten ohne aktiven Programmlauf" value={health.athletes_without_program_instance} />
                    <StatCard label="Teams < 5 Athleten" value={health.teams_below_min_n} />
                    <StatCard label="Assessments ohne Programmbezug" value={health.assessments_missing_instance} />
                    <StatCard label="Tagesabschlüsse ohne Programmbezug" value={health.completions_missing_instance} />
                    <StatCard label="Check-ins ohne Programmbezug" value={health.checkins_missing_instance} />
                    <StatCard label="Teams ohne Entwicklungsdaten" value={health.teams_without_evidence} />
                  </div>
                )}
                <div className="mt-4 flex items-start gap-2 text-xs text-muted-foreground">
                  <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" />
                  <span>Werte &gt; 0 deuten auf Inkonsistenzen hin, die vor einer Vereinspräsentation behoben werden sollten.</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Launch-Ops</CardTitle>
                <CardDescription>
                  Incident-Log für technische Fehler und Push-Zustellung. Keine Klickhistorie, keine normalen Abschlüsse, keine privaten Antworten, keine Journale, keine E-Mails.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : opsError ? (
                  <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0 text-destructive" />
                      <div>
                        <p className="font-medium text-destructive">Launch-Ops konnte nicht geladen werden.</p>
                        <p className="mt-1 text-muted-foreground">
                          Die App läuft weiter. Prüfe die Backend-Migration oder den Schema-Reload, wenn dieser Hinweis bleibt.
                        </p>
                        <p className="mt-2 font-mono text-xs text-muted-foreground">{opsError}</p>
                      </div>
                    </div>
                  </div>
                ) : !ops ? (
                  <div className="rounded-lg border border-border/60 p-4 text-sm text-muted-foreground">
                    Noch keine Launch-Ops-Daten verfügbar.
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <StatCard label="Incident-Einträge 24h" value={ops.events_last_24h} />
                      <StatCard label="Fehler 24h" value={ops.failed_events_24h} />
                      <StatCard label="Kritische Fehler 24h" value={ops.critical_failed_events_24h} />
                      <StatCard label="Teams < 5" value={ops.teams_below_min_n} />
                      <StatCard label="Push sent 7d" value={ops.push.sent_7d} />
                      <StatCard label="Push opened 7d" value={ops.push.opened_7d} />
                      <StatCard label="Push failed 7d" value={ops.push.failed_7d} />
                      <StatCard label="Abgelaufene Push Subs" value={ops.push.expired_subscriptions_7d} />
                    </div>

                    <div className="grid md:grid-cols-2 gap-3">
                      <div className="rounded-lg border border-border/60 p-4">
                        <h3 className="text-sm font-medium mb-3">Fehler nach Flow (24h)</h3>
                        <div className="space-y-2 text-sm">
                          {Object.entries(ops.flow_failures_24h).length ? (
                            Object.entries(ops.flow_failures_24h).map(([flow, count]) => (
                              <Row key={flow} label={flow} value={count} />
                            ))
                          ) : (
                            <p className="text-sm text-muted-foreground">Keine fehlgeschlagenen Flow-Events in den letzten 24 Stunden.</p>
                          )}
                        </div>
                      </div>
                      <div className="rounded-lg border border-border/60 p-4">
                        <h3 className="text-sm font-medium mb-3">QA vs Production</h3>
                        <div className="space-y-2 text-sm">
                          {Object.entries(ops.qa_vs_production).map(([label, value]) => (
                            <Row key={label} label={opsSplitLabel[label] ?? label} value={value} />
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="rounded-lg border border-border/60 p-4">
                      <h3 className="text-sm font-medium mb-3">Letzte fehlgeschlagene Events</h3>
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Zeit</TableHead>
                              <TableHead>Flow</TableHead>
                              <TableHead>Rolle</TableHead>
                              <TableHead>Route</TableHead>
                              <TableHead>Error</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {ops.recent_failed_events.map((event, index) => (
                              <TableRow key={`${event.created_at}-${event.event_name}-${index}`}>
                                <TableCell className="whitespace-nowrap text-xs">
                                  {new Date(event.created_at).toLocaleString("de-DE")}
                                </TableCell>
                                <TableCell>{event.event_name}</TableCell>
                                <TableCell>{event.role ?? "–"}</TableCell>
                                <TableCell>{event.route ?? "–"}</TableCell>
                                <TableCell>{event.error_code ?? "–"}</TableCell>
                              </TableRow>
                            ))}
                            {!ops.recent_failed_events.length && (
                              <TableRow>
                                <TableCell colSpan={5} className="text-center text-muted-foreground py-6">
                                  Keine fehlgeschlagenen Events gespeichert.
                                </TableCell>
                              </TableRow>
                            )}
                          </TableBody>
                        </Table>
                      </div>
                    </div>

                    <p className="text-xs text-muted-foreground">
                      Privacy Boundary: {ops.privacy_level}. Ausgeschlossen: {ops.privacy_exclusions.join(", ")}.
                    </p>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
        )}
      </div>
    </div>
  );
};

export default Admin;
