import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Flame, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  type FlameStats,
  type FlameLevel,
  levelDescription,
} from "@/lib/flameStats";
import FlameProgressGrid from "./FlameProgressGrid";

interface FlameCardProps {
  stats: FlameStats;
}

const MILESTONE_COPY: Record<number, string> = {
  3: "Funke wird Flamme.",
  7: "Momentum aufgebaut.",
  14: "Commitment sichtbar.",
  28: "Identität durch Wiederholung.",
};

const LEVEL_GLOW: Record<FlameLevel, string> = {
  ember: "drop-shadow(0 0 6px hsl(var(--primary) / 0.25))",
  spark: "drop-shadow(0 0 8px hsl(var(--primary) / 0.45))",
  flame: "drop-shadow(0 0 10px hsl(var(--primary) / 0.55))",
  momentum: "drop-shadow(0 0 14px hsl(var(--primary) / 0.65))",
  commitment: "drop-shadow(0 0 18px hsl(var(--primary) / 0.75))",
  identity: "drop-shadow(0 0 22px hsl(var(--primary) / 0.9))",
};

const FlameCard = ({ stats }: FlameCardProps) => {
  const [showGrid, setShowGrid] = useState(false);
  const lastCompletedRef = useRef<boolean | null>(null);
  const lastStreakRef = useRef<number | null>(null);

  // Celebrate today flip + milestones (session-scoped)
  useEffect(() => {
    if (lastCompletedRef.current === null) {
      lastCompletedRef.current = stats.completedToday;
      lastStreakRef.current = stats.currentStreak;
      return;
    }
    if (!lastCompletedRef.current && stats.completedToday) {
      toast.success("Flamme gesichert. Eine weitere Wiederholung im System.");
    }
    if (
      lastStreakRef.current !== null &&
      stats.currentStreak > lastStreakRef.current &&
      MILESTONE_COPY[stats.currentStreak]
    ) {
      toast(MILESTONE_COPY[stats.currentStreak]);
    }
    lastCompletedRef.current = stats.completedToday;
    lastStreakRef.current = stats.currentStreak;
  }, [stats.completedToday, stats.currentStreak]);

  const completionPct = Math.round(stats.completionRate * 100);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-6 p-5 rounded-2xl bg-gradient-card border-glow relative overflow-hidden"
    >
      {/* Subtle ambient flame glow */}
      <div
        aria-hidden
        className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-primary/10 blur-3xl pointer-events-none"
      />

      <div className="relative flex items-start justify-between mb-5">
        <div className="flex items-center gap-3">
          <motion.div
            animate={
              stats.completedToday
                ? { scale: [1, 1.08, 1] }
                : { scale: 1 }
            }
            transition={{
              duration: 2.4,
              repeat: stats.completedToday ? Infinity : 0,
              ease: "easeInOut",
            }}
            style={{ filter: LEVEL_GLOW[stats.flameLevel] }}
          >
            <Flame
              className={cn(
                "w-8 h-8",
                stats.flameLevel === "ember"
                  ? "text-muted-foreground"
                  : "text-primary"
              )}
              strokeWidth={1.6}
            />
          </motion.div>
          <div>
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-heading">
              Deine Flamme
            </p>
            <p className="font-heading font-semibold text-sm">
              {stats.levelLabel}
            </p>
          </div>
        </div>
        {stats.completedToday && (
          <span className="text-[10px] font-heading uppercase tracking-wider px-2 py-1 rounded-full bg-primary/15 text-primary border border-primary/30">
            Heute gesichert
          </span>
        )}
      </div>

      <div className="relative flex items-end gap-4 mb-4">
        <div>
          <p className="font-heading text-4xl font-bold leading-none">
            {stats.currentStreak}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {stats.currentStreak === 1 ? "Tag in Folge" : "Tage in Folge"}
          </p>
        </div>
        <div className="flex-1 grid grid-cols-3 gap-2 text-center">
          <Stat label="Längste" value={`${stats.longestStreak}`} />
          <Stat
            label="Erledigt"
            value={`${stats.totalCompletedDays}${
              stats.daysAvailable > 0 ? `/${stats.daysAvailable}` : ""
            }`}
          />
          <Stat label="Quote" value={`${completionPct}%`} />
        </div>
      </div>

      <p className="relative text-sm text-foreground/90 leading-relaxed mb-4">
        {stats.message}
      </p>
      <p className="relative text-xs text-muted-foreground leading-relaxed mb-4">
        {levelDescription(stats.flameLevel)}
      </p>

      <button
        onClick={() => setShowGrid((v) => !v)}
        className="relative w-full flex items-center justify-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors py-2 rounded-lg hover:bg-secondary/40"
      >
        {showGrid ? (
          <>
            Weniger anzeigen <ChevronUp className="w-3.5 h-3.5" />
          </>
        ) : (
          <>
            56-Tage Konsistenz anzeigen <ChevronDown className="w-3.5 h-3.5" />
          </>
        )}
      </button>

      <AnimatePresence>
        {showGrid && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="relative overflow-hidden"
          >
            <div className="pt-4">
              <FlameProgressGrid
                completedDayNumbers={stats.completedDayNumbers}
                programDay={stats.programDay}
                daysAvailable={stats.daysAvailable}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

const Stat = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-lg bg-secondary/40 px-2 py-2">
    <p className="font-heading text-base font-semibold leading-none">{value}</p>
    <p className="text-[10px] text-muted-foreground mt-1 uppercase tracking-wider">
      {label}
    </p>
  </div>
);

export default FlameCard;
