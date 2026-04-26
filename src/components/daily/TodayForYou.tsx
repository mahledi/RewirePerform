import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import type { MicroAdjustmentOutput } from "@/lib/microAdjustment";

interface TodayForYouProps {
  data: MicroAdjustmentOutput;
  compact?: boolean;
}

/**
 * Kleiner, ruhiger "Heute für dich"-Block.
 * Rahmt den Tag — verändert NIE Tasks/Journal/Science-Bite.
 * Felder mit null werden ausgelassen, keine Platzhalter.
 */
const TodayForYou = ({ data, compact = false }: TodayForYouProps) => {
  // Wähle den stärksten verfügbaren "third line"-Inhalt.
  const thirdLine =
    data.stateEmphasis ?? data.profileEmphasis ?? data.journalPatternEmphasis ?? null;

  // Wähle Sport- vs. Positionsbezug — Position gewinnt, weil spezifischer.
  const secondLine = data.positionExample ?? data.sportExample;

  if (compact) {
    return (
      <div className="rounded-xl bg-primary/5 border border-primary/10 px-4 py-3">
        <p className="text-xs uppercase tracking-[0.18em] text-primary font-semibold mb-1">Heute für dich</p>
        <p className="text-sm text-muted-foreground leading-relaxed">{data.athleteAddressLine}</p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="rounded-2xl bg-gradient-card border-glow p-5 mb-6"
    >
      <div className="flex items-center gap-2 mb-3">
        <div className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center shrink-0">
          <Sparkles className="w-4 h-4 text-primary" />
        </div>
        <p className="text-xs uppercase tracking-[0.18em] text-primary font-semibold">Heute für dich</p>
      </div>

      <div className="space-y-2">
        <p className="text-sm text-foreground leading-relaxed">{data.athleteAddressLine}</p>
        <p className="text-sm text-muted-foreground leading-relaxed">{secondLine}</p>
        {thirdLine && (
          <p className="text-sm text-muted-foreground leading-relaxed">{thirdLine}</p>
        )}
      </div>

      <div className="mt-4 pt-3 border-t border-border/50">
        <p className="text-xs text-muted-foreground">
          <span className="uppercase tracking-[0.14em] font-semibold text-primary mr-2">Cue</span>
          {data.microCue}
        </p>
      </div>
    </motion.div>
  );
};

export default TodayForYou;
