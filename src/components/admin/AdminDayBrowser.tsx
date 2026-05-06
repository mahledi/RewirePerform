import { useMemo, useState } from "react";
import { MATRIX_DAYS } from "@/content/matrixDays";
import { getDailyContent } from "@/content/dailyContent";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent,
} from "@/components/ui/dialog";
import { Search, ChevronRight, AlertCircle, ChevronLeft, Dumbbell, Moon, Trophy, X, Eye } from "lucide-react";
import DailyCheckin from "@/components/dashboard/DailyCheckin";
import type { CalendarEventType } from "@/content/matrixDayTypes";

const phaseColor: Record<number, string> = {
  1: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  2: "bg-purple-500/15 text-purple-400 border-purple-500/30",
  3: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  4: "bg-primary/15 text-primary border-primary/30",
};

const phaseStarts: { phase: number; day: number; label: string }[] = [
  { phase: 1, day: 1, label: "Phase 1 · Tag 1" },
  { phase: 2, day: 15, label: "Phase 2 · Tag 15" },
  { phase: 3, day: 29, label: "Phase 3 · Tag 29" },
  { phase: 4, day: 43, label: "Phase 4 · Tag 43" },
];

const eventTypes: { id: CalendarEventType; label: string; icon: typeof Dumbbell }[] = [
  { id: "training", label: "Training", icon: Dumbbell },
  { id: "rest", label: "Ruhetag", icon: Moon },
  { id: "competition", label: "Wettkampf", icon: Trophy },
];

const AdminDayBrowser = () => {
  const [search, setSearch] = useState("");
  const [phaseFilter, setPhaseFilter] = useState<number | null>(null);
  const [openDay, setOpenDay] = useState<number | null>(null);
  const [eventType, setEventType] = useState<CalendarEventType>("training");
  const [jumpInput, setJumpInput] = useState("");

  const days = useMemo(() => {
    return MATRIX_DAYS.map((m) => {
      const content = getDailyContent(m.dayNumber);
      return { matrix: m, hasContent: !!content };
    });
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return days.filter(({ matrix }) => {
      if (phaseFilter && matrix.phase !== phaseFilter) return false;
      if (!q) return true;
      return (
        matrix.lens.toLowerCase().includes(q) ||
        matrix.primaryMechanism.toLowerCase().includes(q) ||
        String(matrix.dayNumber) === q
      );
    });
  }, [days, search, phaseFilter]);

  const grouped = useMemo(() => {
    const byWeek = new Map<number, typeof filtered>();
    filtered.forEach((d) => {
      const w = d.matrix.week;
      if (!byWeek.has(w)) byWeek.set(w, []);
      byWeek.get(w)!.push(d);
    });
    return Array.from(byWeek.entries()).sort((a, b) => a[0] - b[0]);
  }, [filtered]);

  const currentMatrix = openDay ? MATRIX_DAYS.find((m) => m.dayNumber === openDay) : null;

  const handleJump = () => {
    const n = parseInt(jumpInput, 10);
    if (!isNaN(n) && n >= 1 && n <= MATRIX_DAYS.length) {
      setOpenDay(n);
      setJumpInput("");
    }
  };

  const goPrev = () => {
    if (openDay && openDay > 1) setOpenDay(openDay - 1);
  };
  const goNext = () => {
    if (openDay && openDay < MATRIX_DAYS.length) setOpenDay(openDay + 1);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Programmtage 1–{MATRIX_DAYS.length} · Spieler-Simulator</CardTitle>
        <CardDescription>
          Klicke einen Tag an, um den vollständigen Spieler-Check-in 1:1 durchzugehen — gleiche Komponente, Schritt für Schritt,
          inklusive Slider, Tasks, Journal-Fragen und Comprehension Check. <strong>Read-only — nichts wird gespeichert.</strong>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Sprung-Leiste */}
        <div className="flex gap-2 flex-wrap items-center p-3 rounded-lg bg-muted/30 border border-border/40">
          <span className="text-xs uppercase tracking-widest text-muted-foreground">Springe zu</span>
          <div className="flex items-center gap-1.5">
            <Input
              type="number"
              min={1}
              max={MATRIX_DAYS.length}
              placeholder="Tag…"
              value={jumpInput}
              onChange={(e) => setJumpInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleJump()}
              className="w-24 h-8 text-sm"
            />
            <Button size="sm" variant="outline" onClick={handleJump} className="h-8">
              <Eye className="w-3.5 h-3.5 mr-1" />
              Öffnen
            </Button>
          </div>
          <div className="h-5 w-px bg-border mx-1" />
          {phaseStarts.map((p) => (
            <Button
              key={p.phase}
              size="sm"
              variant="outline"
              className="h-8"
              onClick={() => setOpenDay(p.day)}
            >
              {p.label}
            </Button>
          ))}
        </div>

        {/* Filters */}
        <div className="flex gap-2 flex-wrap items-center">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Tagesnummer, Lens oder Mechanismus…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex gap-1">
            <Button
              size="sm"
              variant={phaseFilter === null ? "default" : "outline"}
              onClick={() => setPhaseFilter(null)}
            >
              Alle
            </Button>
            {[1, 2, 3, 4].map((p) => (
              <Button
                key={p}
                size="sm"
                variant={phaseFilter === p ? "default" : "outline"}
                onClick={() => setPhaseFilter(p)}
              >
                Phase {p}
              </Button>
            ))}
          </div>
        </div>

        {/* Days grouped by week */}
        <div className="space-y-6">
          {grouped.map(([week, items]) => (
            <div key={week}>
              <h3 className="text-xs uppercase tracking-widest text-muted-foreground mb-2">
                Woche {week}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
                {items.map(({ matrix, hasContent }) => (
                  <button
                    key={matrix.dayNumber}
                    onClick={() => setOpenDay(matrix.dayNumber)}
                    className="text-left rounded-lg border border-border bg-card hover:bg-muted/40 transition-colors p-3 group"
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-1.5">
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                          Tag {matrix.dayNumber}
                        </Badge>
                        <span
                          className={`text-[10px] px-1.5 py-0.5 rounded border ${phaseColor[matrix.phase]}`}
                        >
                          P{matrix.phase}
                        </span>
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
                    </div>
                    <p className="text-sm font-medium leading-snug line-clamp-2">{matrix.lens}</p>
                    <p className="text-[11px] text-muted-foreground mt-1 line-clamp-1">
                      {matrix.primaryMechanism}
                    </p>
                    {!hasContent && (
                      <div className="flex items-center gap-1 mt-2 text-[10px] text-amber-500">
                        <AlertCircle className="w-3 h-3" />
                        <span>Kein Spieler-Content</span>
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          ))}
          {!filtered.length && (
            <p className="text-sm text-muted-foreground text-center py-8">
              Keine Tage entsprechen dem Filter.
            </p>
          )}
        </div>
      </CardContent>

      {/* Vollbild-Spieler-Simulator */}
      <Dialog open={openDay !== null} onOpenChange={(o) => !o && setOpenDay(null)}>
        <DialogContent className="max-w-none w-screen h-screen sm:rounded-none p-0 gap-0 flex flex-col [&>button]:hidden">
          {/* Admin-Toolbar oberhalb der Spieler-UI */}
          <div className="shrink-0 border-b border-border bg-muted/40 px-4 py-2 flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="default" className="text-[10px] uppercase tracking-widest">Preview</Badge>
              <span className="text-xs text-muted-foreground">Nichts wird gespeichert</span>
              {currentMatrix && (
                <>
                  <span className="text-xs">·</span>
                  <span className="text-xs font-semibold">
                    Tag {currentMatrix.dayNumber} · Phase {currentMatrix.phase} · Woche {currentMatrix.week}
                  </span>
                  <span className="text-xs text-muted-foreground hidden md:inline">— {currentMatrix.lens}</span>
                </>
              )}
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {/* Kontext-Toggle */}
              <div className="flex gap-1">
                {eventTypes.map(({ id, label, icon: Icon }) => (
                  <Button
                    key={id}
                    size="sm"
                    variant={eventType === id ? "default" : "outline"}
                    onClick={() => setEventType(id)}
                    className="h-7 text-xs"
                  >
                    <Icon className="w-3 h-3 mr-1" />
                    {label}
                  </Button>
                ))}
              </div>
              <div className="h-5 w-px bg-border" />
              <Button size="sm" variant="outline" onClick={goPrev} disabled={!openDay || openDay <= 1} className="h-7">
                <ChevronLeft className="w-3.5 h-3.5" />
              </Button>
              <Button size="sm" variant="outline" onClick={goNext} disabled={!openDay || openDay >= MATRIX_DAYS.length} className="h-7">
                <ChevronRight className="w-3.5 h-3.5" />
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setOpenDay(null)} className="h-7">
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Echte Spieler-Komponente, im Preview-Mode */}
          <div className="flex-1 overflow-y-auto">
            {openDay !== null && (
              <DailyCheckin
                key={`${openDay}-${eventType}`}
                eventType={eventType}
                date={new Date()}
                onClose={() => setOpenDay(null)}
                previewMode
                previewDayNumber={openDay}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default AdminDayBrowser;
