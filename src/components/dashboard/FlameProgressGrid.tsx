import { cn } from "@/lib/utils";

interface FlameProgressGridProps {
  completedDayNumbers: number[];
  programDay: number | null;
  daysAvailable: number;
  totalDays?: number;
}

/**
 * 56-day consistency grid.
 *  - completed day → filled primary
 *  - today → ring outline
 *  - past available but not completed → muted
 *  - future / locked → very dim
 *
 * No red. No shame.
 */
const FlameProgressGrid = ({
  completedDayNumbers,
  programDay,
  daysAvailable,
  totalDays = 56,
}: FlameProgressGridProps) => {
  const completed = new Set(completedDayNumbers);
  const cells = Array.from({ length: totalDays }, (_, i) => i + 1);

  return (
    <div>
      <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-heading mb-2">
        56-Tage Konsistenz
      </p>
      <div className="grid grid-cols-14 gap-1" style={{ gridTemplateColumns: "repeat(14, minmax(0, 1fr))" }}>
        {cells.map((day) => {
          const isCompleted = completed.has(day);
          const isToday = programDay === day;
          const isAvailable = day <= daysAvailable;
          return (
            <div
              key={day}
              title={`Tag ${day}`}
              className={cn(
                "aspect-square rounded-[3px] transition-colors",
                isCompleted &&
                  "bg-primary shadow-[0_0_6px_hsl(var(--primary)/0.6)]",
                !isCompleted && isAvailable && "bg-muted-foreground/15",
                !isCompleted && !isAvailable && "bg-muted/40",
                isToday && !isCompleted && "ring-1 ring-primary/70",
                isToday && isCompleted && "ring-1 ring-primary"
              )}
            />
          );
        })}
      </div>
    </div>
  );
};

export default FlameProgressGrid;
