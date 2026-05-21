import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { resolveDay } from "@/lib/getDayContent";
import { getCurrentProgramDay } from "@/lib/getCurrentProgramDay";
import {
  COACH_JOURNAL_QUESTIONS,
  TEAM_STANDARDS,
  getCoachDayGuidance,
  getWeeklyScienceBite,
} from "@/content/coachToolkit";
import { BookOpen, Sparkles, ShieldCheck, NotebookPen, Loader2, Save } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface Props {
  teamId: string;
}

interface TeamRow {
  id: string;
  name: string;
  program_start_date: string | null;
}

type CoachJournalKey =
  | "gratitude"
  | "reflection_1"
  | "reflection_2"
  | "reflection_3"
  | "action_commitment";

const Section = ({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) => (
  <div className="bg-secondary/40 border border-border/50 rounded-2xl p-5 space-y-4">
    <div className="flex items-center gap-2">
      {icon}
      <h3 className="font-heading text-base font-semibold">{title}</h3>
    </div>
    {children}
  </div>
);

const CoachToolkit = ({ teamId }: Props) => {
  const { user } = useAuth();
  const [team, setTeam] = useState<TeamRow | null>(null);
  const [loading, setLoading] = useState(true);

  // Journal state
  const [weekNumber, setWeekNumber] = useState(1);
  const [journal, setJournal] = useState({
    gratitude: "",
    reflection_1: "",
    reflection_2: "",
    reflection_3: "",
    action_commitment: "",
  });
  const [savingJournal, setSavingJournal] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    supabase
      .from("teams")
      .select("id, name, program_start_date")
      .eq("id", teamId)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return;
        setTeam(data as TeamRow | null);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [teamId]);

  const dayInfo = team?.program_start_date
    ? getCurrentProgramDay(team.program_start_date)
    : null;
  const resolved = dayInfo
    ? resolveDay(dayInfo.dayNumber, new Date(), "training")
    : null;

  // Calc current program week (1..8) for journal prefill
  useEffect(() => {
    if (dayInfo?.dayNumber) {
      setWeekNumber(Math.min(8, Math.max(1, Math.ceil(dayInfo.dayNumber / 7))));
    }
  }, [dayInfo?.dayNumber]);

  // Load journal for selected week
  useEffect(() => {
    if (!user || !teamId || !weekNumber) return;
    let cancelled = false;
    supabase
      .from("coach_journals")
      .select("gratitude, reflection_1, reflection_2, reflection_3, action_commitment")
      .eq("coach_id", user.id)
      .eq("team_id", teamId)
      .eq("week_number", weekNumber)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return;
        setJournal({
          gratitude: data?.gratitude ?? "",
          reflection_1: data?.reflection_1 ?? "",
          reflection_2: data?.reflection_2 ?? "",
          reflection_3: data?.reflection_3 ?? "",
          action_commitment: data?.action_commitment ?? "",
        });
      });
    return () => {
      cancelled = true;
    };
  }, [user, teamId, weekNumber]);

  const saveJournal = async () => {
    if (!user) return;
    setSavingJournal(true);
    const { error } = await supabase.from("coach_journals").upsert(
      {
        coach_id: user.id,
        team_id: teamId,
        week_number: weekNumber,
        ...journal,
      },
      { onConflict: "coach_id,team_id,week_number" }
    );
    setSavingJournal(false);
    if (error) {
      toast({ title: "Speichern fehlgeschlagen", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Gespeichert", description: `Coach Journal Woche ${weekNumber}` });
    }
  };

  const scienceBite = getWeeklyScienceBite();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* SECTION 1 — HEUTE IM SPIELERPROGRAMM */}
      <Section
        icon={<BookOpen className="w-5 h-5 text-primary" />}
        title="Heute im Spielerprogramm"
      >
        {!team?.program_start_date ? (
          <p className="text-sm text-muted-foreground">
            Noch kein Programmstart für dieses Team festgelegt.
          </p>
        ) : !dayInfo || !resolved ? (
          <p className="text-sm text-muted-foreground">
            Außerhalb des 56-Tage-Fensters.
          </p>
        ) : (
          (() => {
            const guidance = getCoachDayGuidance(
              resolved.matrix.primaryMechanism,
              resolved.matrix.lens
            );
            return (
              <div className="space-y-4 text-sm">
                <div>
                  <div className="text-xs text-muted-foreground uppercase tracking-wide">
                    Tag {resolved.matrix.dayNumber}
                  </div>
                  <div className="font-heading text-lg font-semibold mt-1">
                    {resolved.content.coreShift || resolved.matrix.lens}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Linie: {resolved.matrix.lens} · Phase {resolved.matrix.phase} · Woche {resolved.matrix.week}
                  </div>
                </div>

                <div>
                  <div className="text-xs font-medium text-muted-foreground mb-1">
                    Heute lernen die Spieler
                  </div>
                  <p className="text-foreground/90">
                    {resolved.matrix.practiceFocus}
                  </p>
                </div>

                <div>
                  <div className="text-xs font-medium text-muted-foreground mb-1">
                    Heute üben die Spieler
                  </div>
                  <ol className="list-decimal list-inside space-y-1 text-foreground/90">
                    {resolved.content.tasks.map((t) => (
                      <li key={t.id}>{t.title}</li>
                    ))}
                  </ol>
                </div>

                <div className="bg-primary/5 border border-primary/20 rounded-xl p-3">
                  <div className="text-xs font-medium text-primary mb-1">
                    Als Coach unterstützen
                  </div>
                  <p className="text-foreground/90">{guidance.support}</p>
                </div>

                <div className="bg-secondary/60 border border-border/50 rounded-xl p-3">
                  <div className="text-xs font-medium text-muted-foreground mb-1">
                    Heute vermeiden
                  </div>
                  <p className="text-foreground/90">{guidance.avoid}</p>
                </div>

                <div className="bg-secondary/60 border border-border/50 rounded-xl p-3">
                  <div className="text-xs font-medium text-muted-foreground mb-1">
                    60 Sekunden Integration
                  </div>
                  <p className="text-foreground/90">{guidance.integration60s}</p>
                </div>
              </div>
            );
          })()
        )}
      </Section>

      {/* SECTION 2 — SCIENCE BITE */}
      <Section
        icon={<Sparkles className="w-5 h-5 text-primary" />}
        title="Science Bite für Coaches"
      >
        <div className="space-y-3 text-sm">
          <div className="font-heading text-base font-semibold">{scienceBite.title}</div>
          <p className="text-foreground/90">{scienceBite.explanation}</p>
          <div className="bg-primary/5 border border-primary/20 rounded-xl p-3">
            <div className="text-xs font-medium text-primary mb-1">
              Was bedeutet das für dich als Coach?
            </div>
            <p className="text-foreground/90">{scienceBite.coachAngle}</p>
          </div>
        </div>
      </Section>

      {/* SECTION 3 — TEAM STANDARDS */}
      <Section
        icon={<ShieldCheck className="w-5 h-5 text-primary" />}
        title="Team Standards"
      >
        <ul className="space-y-3 text-sm">
          {TEAM_STANDARDS.map((s) => (
            <li
              key={s.id}
              className="bg-background/40 border border-border/40 rounded-xl p-3"
            >
              <div className="font-medium">{s.title}</div>
              <p className="text-muted-foreground text-xs mt-1">{s.explanation}</p>
              <p className="text-foreground/90 text-xs mt-2">
                <span className="text-primary font-medium">Coach-Verhalten:</span>{" "}
                {s.coachBehavior}
              </p>
            </li>
          ))}
        </ul>
      </Section>

      {/* SECTION 4 — COACH JOURNAL */}
      <Section
        icon={<NotebookPen className="w-5 h-5 text-primary" />}
        title="Coach Journal"
      >
        <div className="space-y-4 text-sm">
          <div className="flex items-center justify-between gap-3">
            <label className="text-xs text-muted-foreground">Woche</label>
            <select
              value={weekNumber}
              onChange={(e) => setWeekNumber(Number(e.target.value))}
              className="bg-secondary/60 border border-border/50 rounded-lg px-3 py-1.5 text-sm"
            >
              {Array.from({ length: 8 }).map((_, i) => (
                <option key={i + 1} value={i + 1}>
                  Woche {i + 1}
                </option>
              ))}
            </select>
          </div>

          {([
            { key: "gratitude", label: COACH_JOURNAL_QUESTIONS.gratitude },
            { key: "reflection_1", label: COACH_JOURNAL_QUESTIONS.reflection_1 },
            { key: "reflection_2", label: COACH_JOURNAL_QUESTIONS.reflection_2 },
            { key: "reflection_3", label: COACH_JOURNAL_QUESTIONS.reflection_3 },
            { key: "action_commitment", label: COACH_JOURNAL_QUESTIONS.action_commitment },
          ] satisfies { key: CoachJournalKey; label: string }[]).map((q) => (
            <div key={q.key}>
              <label className="text-xs font-medium text-muted-foreground block mb-1">
                {q.label}
              </label>
              <textarea
                value={journal[q.key]}
                onChange={(e) =>
                  setJournal((prev) => ({ ...prev, [q.key]: e.target.value }))
                }
                rows={2}
                className="w-full bg-background/40 border border-border/50 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder="Privat — nur für dich sichtbar"
              />
            </div>
          ))}

          <button
            onClick={saveJournal}
            disabled={savingJournal}
            className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground rounded-xl py-2.5 text-sm font-medium disabled:opacity-50"
          >
            {savingJournal ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            Speichern
          </button>
          <p className="text-[11px] text-muted-foreground text-center">
            Privat. Nur du siehst deine Einträge.
          </p>
        </div>
      </Section>
    </div>
  );
};

export default CoachToolkit;
