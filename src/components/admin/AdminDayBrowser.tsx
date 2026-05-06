import { useMemo, useState } from "react";
import { MATRIX_DAYS } from "@/content/matrixDays";
import { getDailyContent } from "@/content/dailyContent";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, ChevronRight, AlertCircle } from "lucide-react";
import AdminDayPreview from "./AdminDayPreview";

const phaseColor: Record<number, string> = {
  1: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  2: "bg-purple-500/15 text-purple-400 border-purple-500/30",
  3: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  4: "bg-primary/15 text-primary border-primary/30",
};

const AdminDayBrowser = () => {
  const [search, setSearch] = useState("");
  const [phaseFilter, setPhaseFilter] = useState<number | null>(null);
  const [openDay, setOpenDay] = useState<number | null>(null);

  const days = useMemo(() => {
    return MATRIX_DAYS.map((m) => {
      const content = getDailyContent(m.dayNumber);
      return { matrix: m, hasContent: !!content, content };
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

  return (
    <Card>
      <CardHeader>
        <CardTitle>Programmtage 1–{MATRIX_DAYS.length}</CardTitle>
        <CardDescription>
          Klicke einen Tag an, um ihn exakt so zu sehen wie ein Spieler — inkl. Tasks, Journal-Fragen und Comprehension-Pool.
          Read-only, keine Spielerdaten.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
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

      {/* Day Detail Dialog */}
      <Dialog open={openDay !== null} onOpenChange={(o) => !o && setOpenDay(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] p-0 flex flex-col">
          <DialogHeader className="p-6 pb-3 border-b shrink-0">
            <DialogTitle>Spieler-Vorschau · Tag {openDay}</DialogTitle>
            <DialogDescription>
              Identische Darstellung wie im Spieler-Check-in. Read-only.
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="flex-1 p-6">
            {openDay !== null && <AdminDayPreview dayNumber={openDay} />}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default AdminDayBrowser;
