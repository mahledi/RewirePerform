import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import {
  LogOut,
  Users,
  Settings,
  Activity,
  BarChart3,
  Sparkles,
  ChevronRight,
  ArrowLeft,
} from "lucide-react";
import { BrandSymbol } from "@/components/brand/BrandLogo";
import TeamOverview from "@/components/coach/TeamOverview";
import TeamManagement from "@/components/coach/TeamManagement";
import TeamMentalState from "@/components/coach/TeamMentalState";
import TeamEvidence from "@/components/coach/TeamEvidence";
import CoachToolkit from "@/components/coach/CoachToolkit";
import CoachEvidenceReviewPanel from "@/components/coach/CoachEvidenceReviewPanel";
import { useIsMobile } from "@/hooks/use-mobile";
import MobileNavCard from "@/components/MobileNavCard";

type Tab = "home" | "overview" | "mental" | "evidence" | "toolkit" | "manage";

interface Team {
  id: string;
  name: string;
  sport: string | null;
  access_code: string;
  coach_access_code: string;
  program_start_date: string | null;
  program_activated_at: string | null;
}

interface SectionMeta {
  id: Exclude<Tab, "home">;
  title: string;
  description: string;
  icon: typeof Users;
  requiresTeam: boolean;
}

const coachTeamsCache = new Map<string, { teams: Team[]; selectedTeam: string | null }>();

const SECTIONS: SectionMeta[] = [
  {
    id: "overview",
    title: "Übersicht",
    description: "Teilnahme, Aktivität und Mitglieder im Überblick.",
    icon: Users,
    requiresTeam: true,
  },
  {
    id: "mental",
    title: "Teamzustand",
    description: "Aggregierte Tageswerte, Deltas und Programmlinse.",
    icon: Activity,
    requiresTeam: true,
  },
  {
    id: "evidence",
    title: "Wirksamkeit",
    description: "Pre/Mid/Post-Veränderungen und Adherence.",
    icon: BarChart3,
    requiresTeam: true,
  },
  {
    id: "toolkit",
    title: "Coach Toolkit",
    description: "Heutige Praxis, Standards und privates Journal.",
    icon: Sparkles,
    requiresTeam: true,
  },
  {
    id: "manage",
    title: "Team",
    description: "Team erstellen, einladen und Programm starten.",
    icon: Settings,
    requiresTeam: false,
  },
];

const TabButton = ({
  active,
  onClick,
  icon: Icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: typeof Users;
  label: string;
}) => (
  <button
    onClick={onClick}
    className={`premium-press flex min-w-0 items-center justify-center gap-1.5 rounded-lg px-3 py-2.5 text-xs font-medium transition-all ${
      active
        ? "bg-card text-foreground shadow-[inset_0_1px_0_hsl(0_0%_100%/0.05)]"
        : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
    }`}
  >
    <Icon className="w-3.5 h-3.5" />
    {label}
  </button>
);

const EvidenceSection = ({ teamId }: { teamId: string }) => (
  <div className="min-w-0 space-y-6">
    <CoachEvidenceReviewPanel teamId={teamId} />
    <TeamEvidence teamId={teamId} />
  </div>
);


const Coach = () => {
  const { user, role, signOut } = useAuth();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [tab, setTab] = useState<Tab>("overview");
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [visitedTabs, setVisitedTabs] = useState<Set<Tab>>(new Set(["overview"]));

  const fetchTeams = async () => {
    if (!user) return;
    const cached = coachTeamsCache.get(user.id);
    if (cached) {
      setTeams(cached.teams);
      setSelectedTeam((current) => current ?? cached.selectedTeam);
      setLoading(false);
    }

    const { data: memberships } = await supabase
      .from("team_members")
      .select("team_id")
      .eq("user_id", user.id);
    const memberTeamIds = (memberships ?? []).map((m) => m.team_id);

    let query = supabase
      .from("teams")
      .select("id, name, sport, access_code, coach_access_code, program_start_date, program_activated_at");

    if (memberTeamIds.length > 0) {
      query = query.or(`created_by.eq.${user.id},id.in.(${memberTeamIds.join(",")})`);
    } else {
      query = query.eq("created_by", user.id);
    }

    const { data } = await query;
    const teamList = (data ?? []) as Team[];
    setTeams(teamList);
    const nextSelectedTeam =
      selectedTeam && teamList.some((team) => team.id === selectedTeam)
        ? selectedTeam
        : teamList[0]?.id ?? null;
    setSelectedTeam(nextSelectedTeam);
    coachTeamsCache.set(user.id, { teams: teamList, selectedTeam: nextSelectedTeam });
    setLoading(false);
  };

  useEffect(() => {
    fetchTeams();
  }, [user]);

  useEffect(() => {
    if (!loading && role && role !== "coach") {
      navigate(role === "admin" ? "/admin" : "/dashboard");
    }
  }, [role, loading, navigate]);

  // Default to home view on mobile, overview on desktop.
  // Only normalize when crossing the boundary so user choice is preserved.
  const [didInitDevice, setDidInitDevice] = useState(false);
  useEffect(() => {
    if (didInitDevice) return;
    setTab(isMobile ? "home" : "overview");
    setDidInitDevice(true);
  }, [isMobile, didInitDevice]);

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const openTab = (nextTab: Tab) => {
    setVisitedTabs((current) => new Set(current).add(nextTab));
    setTab(nextTab);
  };

  const selectTeam = (teamId: string) => {
    setSelectedTeam(teamId);
    if (user) {
      coachTeamsCache.set(user.id, { teams, selectedTeam: teamId });
    }
  };

  const activeSection = SECTIONS.find((s) => s.id === tab);
  const showMobileHome = isMobile && tab === "home";
  const showMobileBack = isMobile && tab !== "home";
  const showTeamSelector =
    teams.length > 1 &&
    (tab === "overview" || tab === "mental" || tab === "evidence" || tab === "toolkit");

  const renderSection = () => {
    if (loading) {
      return (
        <div className="space-y-4">
          <div className="rounded-2xl border border-border/50 bg-card p-5">
            <div className="mb-4 h-5 w-40 rounded-full bg-secondary/70" />
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="h-24 animate-pulse rounded-xl bg-secondary/50" />
              <div className="h-24 animate-pulse rounded-xl bg-secondary/50" />
            </div>
          </div>
          <div className="h-36 animate-pulse rounded-2xl border border-border/50 bg-card" />
        </div>
      );
    }

    if (tab === "manage") {
      return <TeamManagement teams={teams} onTeamCreated={fetchTeams} />;
    }

    if (!selectedTeam) {
      const meta = SECTIONS.find((s) => s.id === tab);
      const Icon = meta?.icon ?? Users;
      return (
        <div className="text-center py-12">
          <Icon className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">Erstelle zuerst ein Team unter „Team".</p>
        </div>
      );
    }

    switch (tab) {
      case "overview":
        return <TeamOverview teamId={selectedTeam} />;
      case "mental":
        return <TeamMentalState teamId={selectedTeam} />;
      case "evidence":
        return <EvidenceSection teamId={selectedTeam} />;
      case "toolkit":
        return <CoachToolkit teamId={selectedTeam} />;
      default:
        return null;
    }
  };

  const renderCachedTeamSections = () => {
    if (loading || tab === "manage" || !selectedTeam) return renderSection();

    return (
      <div className="min-w-0">
        {visitedTabs.has("overview") && (
          <div className={tab === "overview" ? "block" : "hidden"}>
            <TeamOverview key={`overview-${selectedTeam}`} teamId={selectedTeam} />
          </div>
        )}
        {visitedTabs.has("mental") && (
          <div className={tab === "mental" ? "block" : "hidden"}>
            <TeamMentalState key={`mental-${selectedTeam}`} teamId={selectedTeam} />
          </div>
        )}
        {visitedTabs.has("evidence") && (
          <div className={tab === "evidence" ? "block" : "hidden"}>
            <EvidenceSection key={`evidence-${selectedTeam}`} teamId={selectedTeam} />
          </div>
        )}
        {visitedTabs.has("toolkit") && (
          <div className={tab === "toolkit" ? "block" : "hidden"}>
            <CoachToolkit key={`toolkit-${selectedTeam}`} teamId={selectedTeam} />
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen overflow-x-hidden bg-background">
      {/* Header */}
      <div className="sticky top-0 z-40 border-b border-border/60 bg-background/86 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-3 px-4 py-4 sm:px-5 md:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-border/70 bg-card premium-hairline">
              <BrandSymbol size={28} />
            </div>
            <div className="min-w-0">
              <span className="font-heading text-base font-semibold leading-none">RewirePerform</span>
              <p className="mt-1 truncate text-[10px] uppercase tracking-wider text-muted-foreground">
                Coach Console
              </p>
            </div>
          </div>
          <button
            onClick={handleSignOut}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary/70 hover:text-foreground"
            title="Abmelden"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Desktop tabs */}
      {!isMobile && (
        <div className="mx-auto w-full max-w-5xl px-4 pt-5 sm:px-5 md:px-6">
          <div className="grid grid-cols-5 gap-1 rounded-xl border border-border/70 bg-muted/50 p-1 shadow-card">
            <TabButton active={tab === "overview"} onClick={() => openTab("overview")} icon={Users} label="Übersicht" />
            <TabButton active={tab === "mental"} onClick={() => openTab("mental")} icon={Activity} label="Zustand" />
            <TabButton active={tab === "evidence"} onClick={() => openTab("evidence")} icon={BarChart3} label="Wirksamkeit" />
            <TabButton active={tab === "toolkit"} onClick={() => openTab("toolkit")} icon={Sparkles} label="Toolkit" />
            <TabButton active={tab === "manage"} onClick={() => openTab("manage")} icon={Settings} label="Team" />
          </div>
        </div>
      )}

      {/* Mobile section sub-header with back button */}
      {showMobileBack && activeSection && (
        <div className="mx-auto w-full max-w-5xl px-4 pt-4 sm:px-5">
          <button
            onClick={() => openTab("home")}
            className="mb-3 inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 -ml-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-secondary/60 hover:text-foreground active:scale-95"
          >
            <ArrowLeft className="w-4 h-4" />
            Dashboard
          </button>
          <div className="min-w-0">
            <h1 className="font-heading text-xl font-semibold leading-tight text-foreground">
              {activeSection.title}
            </h1>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              {activeSection.description}
            </p>
          </div>
        </div>
      )}

      {/* Team selector */}
      {showTeamSelector && (
        <div className="mx-auto w-full max-w-5xl px-4 pt-4 sm:px-5 md:px-6">
          <select
            value={selectedTeam ?? ""}
            onChange={(e) => selectTeam(e.target.value)}
            className="w-full px-4 py-3 rounded-xl bg-card border border-border/70 text-foreground text-sm shadow-card focus:outline-none focus:ring-1 focus:ring-primary"
          >
            {teams.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </div>
      )}

      {/* Content */}
      <div className="mx-auto w-full min-w-0 max-w-5xl px-4 py-6 sm:px-5 md:px-6 md:pb-12">
        {showMobileHome ? (
          <div className="w-full min-w-0 space-y-6">
            {/* Hero */}
            <div className="space-y-2">
              <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-primary/80">
                Trainer Dashboard
              </p>
              <h1 className="font-heading text-2xl font-semibold leading-tight text-foreground">
                {teams.length === 0
                  ? "Willkommen, Coach"
                  : selectedTeam && teams.find((t) => t.id === selectedTeam)
                    ? teams.find((t) => t.id === selectedTeam)!.name
                    : "Dein Team"}
              </h1>
              <p className="text-sm leading-relaxed text-muted-foreground">
                Aggregierter Teamzustand, Wirksamkeit und Coaching-Material — privat, ruhig, fokussiert.
              </p>
            </div>

            {/* Team selector on home (mobile) when multiple teams exist */}
            {teams.length > 1 && (
              <select
                value={selectedTeam ?? ""}
                onChange={(e) => selectTeam(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-card border border-border/70 text-foreground text-sm shadow-card focus:outline-none focus:ring-1 focus:ring-primary"
              >
                {teams.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            )}

            {/* Nav cards */}
            <div className="space-y-3">
              {SECTIONS.map((s) => (
                <MobileNavCard
                  key={s.id}
                  icon={s.icon}
                  title={s.title}
                  description={s.description}
                  onClick={() => openTab(s.id)}
                />
              ))}
            </div>
          </div>
        ) : (
          renderCachedTeamSections()
        )}
      </div>
    </div>
  );
};

export default Coach;
