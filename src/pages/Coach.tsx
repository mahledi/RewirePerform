import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronDown, Users } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import TeamOverview from "@/components/coach/TeamOverview";
import TeamManagement from "@/components/coach/TeamManagement";
import TeamMentalState from "@/components/coach/TeamMentalState";
import TeamEvidence from "@/components/coach/TeamEvidence";
import CoachToolkit from "@/components/coach/CoachToolkit";
import CoachEvidenceReviewPanel from "@/components/coach/CoachEvidenceReviewPanel";
import {
  CoachAppHeader,
  CoachBottomNavigation,
  CoachPageIntro,
  coachAppBackground,
  coachAppViewport,
  type CoachAppSection,
} from "@/components/coach/CoachAppChrome";
import { getAthleteGreeting } from "@/lib/athleteGreeting";

interface Team {
  id: string;
  name: string;
  sport: string | null;
  access_code: string;
  program_start_date: string | null;
  program_activated_at: string | null;
}

interface SectionMeta {
  id: CoachAppSection;
  eyebrow: string;
  title: string;
  description: string;
  requiresTeam: boolean;
}

const coachTeamsCache = new Map<string, { teams: Team[]; selectedTeam: string | null }>();

const SECTIONS: SectionMeta[] = [
  {
    id: "overview",
    eyebrow: "Coach Dashboard",
    title: "Dein Team. Klar an einem Ort.",
    description: "Teilnahme, Aktivität und die nächsten Schritte – ohne private Inhalte zu öffnen.",
    requiresTeam: true,
  },
  {
    id: "mental",
    eyebrow: "Aggregierter Teamzustand",
    title: "Was braucht dein Team heute?",
    description: "Neutrale Teamwerte als Orientierung. Keine Einzelantworten und keine Bewertung von Athleten.",
    requiresTeam: true,
  },
  {
    id: "evidence",
    eyebrow: "Beobachtete Entwicklung",
    title: "Verlauf statt Momentaufnahme.",
    description: "Messfenster, Nutzung und strukturierte Beobachtungen bleiben sauber voneinander getrennt.",
    requiresTeam: true,
  },
  {
    id: "toolkit",
    eyebrow: "Coach Toolkit",
    title: "Der Tagesfokus wird praktisch.",
    description: "Du kennst die heutige Linie des Programms und kannst sie im Training klar verstärken.",
    requiresTeam: true,
  },
  {
    id: "manage",
    eyebrow: "Teams und Zugänge",
    title: "Alles, was dein Team verbindet.",
    description: "Einladungen, Programmstart, Kalender und Co-Coaches an einem geschützten Ort.",
    requiresTeam: false,
  },
];

const EvidenceSection = ({ teamId }: { teamId: string }) => (
  <div className="min-w-0 space-y-6">
    <CoachEvidenceReviewPanel teamId={teamId} />
    <TeamEvidence teamId={teamId} />
  </div>
);

const Coach = () => {
  const { user, role, signOut } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<CoachAppSection>("overview");
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [visitedTabs, setVisitedTabs] = useState<Set<CoachAppSection>>(new Set(["overview"]));

  const fetchTeams = async () => {
    if (!user) return;
    const cached = coachTeamsCache.get(user.id);
    if (cached) {
      setTeams(cached.teams);
      setSelectedTeamId((current) => current ?? cached.selectedTeam);
      setLoading(false);
    }

    const { data: memberships } = await supabase
      .from("team_members")
      .select("team_id")
      .eq("user_id", user.id);
    const memberTeamIds = (memberships ?? []).map((membership) => membership.team_id);

    let query = supabase
      .from("teams")
      .select("id, name, sport, access_code, program_start_date, program_activated_at");

    if (memberTeamIds.length > 0) {
      query = query.or(`created_by.eq.${user.id},id.in.(${memberTeamIds.join(",")})`);
    } else {
      query = query.eq("created_by", user.id);
    }

    const { data } = await query;
    const teamList = (data ?? []) as Team[];
    const nextSelectedTeam =
      selectedTeamId && teamList.some((team) => team.id === selectedTeamId)
        ? selectedTeamId
        : teamList[0]?.id ?? null;

    setTeams(teamList);
    setSelectedTeamId(nextSelectedTeam);
    coachTeamsCache.set(user.id, { teams: teamList, selectedTeam: nextSelectedTeam });
    setLoading(false);
  };

  useEffect(() => {
    void fetchTeams();
  }, [user]);

  useEffect(() => {
    if (!loading && role && role !== "coach") {
      navigate(role === "admin" ? "/admin" : "/dashboard");
    }
  }, [role, loading, navigate]);

  const selectedTeam = useMemo(
    () => teams.find((team) => team.id === selectedTeamId) ?? null,
    [teams, selectedTeamId],
  );
  const activeSection = SECTIONS.find((section) => section.id === tab) ?? SECTIONS[0];

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const openTab = (nextTab: CoachAppSection) => {
    setVisitedTabs((current) => new Set(current).add(nextTab));
    setTab(nextTab);
    window.scrollTo({ top: 0, behavior: "auto" });
  };

  const selectTeam = (teamId: string) => {
    setSelectedTeamId(teamId);
    if (user) coachTeamsCache.set(user.id, { teams, selectedTeam: teamId });
  };

  const renderEmptyTeam = () => (
    <section className="relative overflow-hidden rounded-[26px] border border-white/[0.075] bg-[linear-gradient(145deg,rgba(28,31,36,0.96),rgba(15,17,21,0.98))] px-5 py-10 text-center sm:px-8">
      <div className="pointer-events-none absolute -right-16 -top-20 h-52 w-52 rounded-full bg-primary/[0.09] blur-3xl" />
      <span className="relative mx-auto flex h-12 w-12 items-center justify-center rounded-[17px] border border-primary/20 bg-primary/[0.10] text-primary">
        <Users className="h-5 w-5" />
      </span>
      <h2 className="relative mt-5 text-xl font-semibold tracking-[-0.03em]">Deine Coach Console ist bereit.</h2>
      <p className="relative mx-auto mt-2 max-w-md text-sm leading-6 text-white/44">
        Erstelle oder verbinde zuerst ein Team. Danach erscheinen hier ausschließlich echte Teamdaten.
      </p>
      <button
        type="button"
        onClick={() => openTab("manage")}
        className="relative mt-6 min-h-11 rounded-[15px] bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-[0_15px_35px_-20px_rgba(46,173,137,0.75)] active:scale-[0.985]"
      >
        Team verbinden
      </button>
    </section>
  );

  const renderSection = () => {
    if (loading) {
      return (
        <div className="space-y-3" aria-label="Coach-Dashboard wird geladen">
          <div className="h-44 animate-pulse rounded-[26px] border border-white/[0.065] bg-white/[0.025]" />
          <div className="grid grid-cols-2 gap-3">
            <div className="h-28 animate-pulse rounded-[20px] border border-white/[0.06] bg-white/[0.025]" />
            <div className="h-28 animate-pulse rounded-[20px] border border-white/[0.06] bg-white/[0.025]" />
          </div>
        </div>
      );
    }

    if (tab === "manage") return <TeamManagement teams={teams} onTeamCreated={fetchTeams} />;
    if (!selectedTeam) return renderEmptyTeam();

    return (
      <div className="min-w-0">
        {visitedTabs.has("overview") && (
          <div className={tab === "overview" ? "block" : "hidden"}>
            <TeamOverview
              key={`overview-${selectedTeam.id}`}
              teamId={selectedTeam.id}
              teamName={selectedTeam.name}
              programStartDate={selectedTeam.program_start_date}
            />
          </div>
        )}
        {visitedTabs.has("mental") && (
          <div className={tab === "mental" ? "block" : "hidden"}>
            <TeamMentalState key={`mental-${selectedTeam.id}`} teamId={selectedTeam.id} />
          </div>
        )}
        {visitedTabs.has("evidence") && (
          <div className={tab === "evidence" ? "block" : "hidden"}>
            <EvidenceSection key={`evidence-${selectedTeam.id}`} teamId={selectedTeam.id} />
          </div>
        )}
        {visitedTabs.has("toolkit") && (
          <div className={tab === "toolkit" ? "block" : "hidden"}>
            <CoachToolkit key={`toolkit-${selectedTeam.id}`} teamId={selectedTeam.id} />
          </div>
        )}
      </div>
    );
  };

  const pageTitle = tab === "overview"
    ? getAthleteGreeting(user?.user_metadata?.full_name)
    : activeSection.title;

  return (
    <div className={coachAppBackground}>
      <div className="pointer-events-none fixed inset-x-0 top-0 h-[28rem] bg-[radial-gradient(circle_at_50%_-18%,rgba(46,173,137,0.13),transparent_56%)]" />
      <CoachAppHeader onSignOut={handleSignOut} />
      <main className={coachAppViewport}>
        <CoachPageIntro
          eyebrow={activeSection.eyebrow}
          title={pageTitle}
          description={tab === "overview" ? activeSection.title : activeSection.description}
          trailing={teams.length > 1 ? (
            <label className="relative block min-w-[12rem]">
              <span className="sr-only">Team auswählen</span>
              <select
                value={selectedTeamId ?? ""}
                onChange={(event) => selectTeam(event.target.value)}
                className="min-h-11 w-full appearance-none rounded-[15px] border border-white/[0.08] bg-white/[0.035] py-2 pl-4 pr-10 text-sm font-medium text-[#EEF0F2] focus:outline-none focus:ring-2 focus:ring-primary"
              >
                {teams.map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/42" />
            </label>
          ) : undefined}
        />

        {selectedTeam && teams.length === 1 && tab !== "manage" && (
          <p className="mt-5 inline-flex rounded-full border border-white/[0.07] bg-white/[0.025] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/45">
            {selectedTeam.name}
          </p>
        )}

        <div className="mt-6 md:mt-8">{renderSection()}</div>
      </main>
      <CoachBottomNavigation active={tab} onSelect={openTab} />
    </div>
  );
};

export default Coach;
