import { useEffect, useMemo, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { MATRIX_DAYS } from "@/content/matrixDays";
import { getDailyContent } from "@/content/dailyContent";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Download, FileJson, FileText, Wifi, WifiOff, Loader2 } from "lucide-react";
import DayContentDetail from "@/components/admin/DayContentDetail";
import {
  downloadFile,
  exportAsJson,
  exportAsMarkdown,
  getAllNotes,
} from "@/lib/adminNotes";

const phaseColor: Record<number, string> = {
  1: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  2: "bg-purple-500/15 text-purple-400 border-purple-500/30",
  3: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  4: "bg-primary/15 text-primary border-primary/30",
};

const CACHED_ROLE_KEY = "cached_user_role";

const AdminContent = () => {
  const { user, role, loading } = useAuth();
  const [search, setSearch] = useState("");
  const [openDay, setOpenDay] = useState<number | null>(null);
  const [online, setOnline] = useState(typeof navigator !== "undefined" ? navigator.onLine : true);
  const [noteCount, setNoteCount] = useState(0);

  // Online/offline indicator
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  // Refresh note count whenever we open/close a day
  useEffect(() => {
    setNoteCount(Object.keys(getAllNotes()).length);
  }, [openDay]);

  // Offline-fähiger Rollen-Check: nutzt gecachte Rolle wenn DB nicht erreichbar
  const cachedRole = typeof window !== "undefined" ? window.localStorage.getItem(CACHED_ROLE_KEY) : null;
  const effectiveRole = role ?? cachedRole;

  if (loading && !cachedRole) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;
  if (effectiveRole !== "admin") return <Navigate to="/" replace />;

  const grouped = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filtered = MATRIX_DAYS.filter((m) => {
      if (!q) return true;
      return (
        m.lens.toLowerCase().includes(q) ||
        m.primaryMechanism.toLowerCase().includes(q) ||
        String(m.dayNumber) === q
      );
    });
    const map = new Map<number, typeof filtered>();
    filtered.forEach((d) => {
      if (!map.has(d.week)) map.set(d.week, []);
      map.get(d.week)!.push(d);
    });
    return Array.from(map.entries()).sort((a, b) => a[0] - b[0]);
  }, [search]);

  const handleExportJson = () => {
    downloadFile(`admin-notes-${new Date().toISOString().slice(0, 10)}.json`, exportAsJson(), "application/json");
  };
  const handleExportMd = () => {
    downloadFile(`admin-notes-${new Date().toISOString().slice(0, 10)}.md`, exportAsMarkdown(), "text/markdown");
  };

  // Detail-Ansicht
  if (openDay !== null) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-4xl mx-auto p-4 space-y-4">
          <Button variant="ghost" size="sm" onClick={() => setOpenDay(null)}>
            <ArrowLeft className="w-4 h-4 mr-1.5" />
            Zurück zur Übersicht
          </Button>
          <DayContentDetail
            dayNumber={openDay}
            onPrev={() => setOpenDay((d) => (d && d > 1 ? d - 1 : d))}
            onNext={() =>
              setOpenDay((d) => (d && d < MATRIX_DAYS.length ? d + 1 : d))
            }
            hasPrev={openDay > 1}
            hasNext={openDay < MATRIX_DAYS.length}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto p-4 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <Link to="/admin">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="w-4 h-4 mr-1.5" />
                Admin
              </Button>
            </Link>
            <h1 className="text-xl font-bold">Content Browser</h1>
          </div>
          <div className="flex items-center gap-1.5 text-xs">
            {online ? (
              <>
                <Wifi className="w-3.5 h-3.5 text-primary" />
                <span className="text-muted-foreground">Online</span>
              </>
            ) : (
              <>
                <WifiOff className="w-3.5 h-3.5 text-amber-500" />
                <span className="text-amber-500 font-medium">Offline</span>
              </>
            )}
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Alle 56 Programmtage – Offline-Review</CardTitle>
            <CardDescription>
              Komplett offline nutzbar. Inhalte (Tasks, Science Bites, Comprehension) kommen aus dem Bundle —
              keine Datenbank-Calls. Notizen werden lokal im Browser gespeichert.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2 flex-wrap items-center">
              <Input
                placeholder="Suche: Tagesnummer, Lens, Mechanismus…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="flex-1 min-w-[200px]"
              />
              <Button size="sm" variant="outline" onClick={handleExportMd} disabled={noteCount === 0}>
                <FileText className="w-3.5 h-3.5 mr-1.5" />
                MD ({noteCount})
              </Button>
              <Button size="sm" variant="outline" onClick={handleExportJson} disabled={noteCount === 0}>
                <FileJson className="w-3.5 h-3.5 mr-1.5" />
                JSON
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Days grouped by week */}
        <div className="space-y-6">
          {grouped.map(([week, items]) => (
            <div key={week}>
              <h3 className="text-xs uppercase tracking-widest text-muted-foreground mb-2">
                Woche {week}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
                {items.map((m) => {
                  const has = !!getDailyContent(m.dayNumber);
                  return (
                    <button
                      key={m.dayNumber}
                      onClick={() => setOpenDay(m.dayNumber)}
                      className="text-left rounded-lg border border-border bg-card hover:bg-muted/40 transition-colors p-3"
                    >
                      <div className="flex items-center gap-1.5 mb-2">
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                          Tag {m.dayNumber}
                        </Badge>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded border ${phaseColor[m.phase]}`}>
                          P{m.phase}
                        </span>
                        {!has && (
                          <span className="text-[10px] text-amber-500">leer</span>
                        )}
                      </div>
                      <p className="text-sm font-medium leading-snug line-clamp-2">{m.lens}</p>
                      <p className="text-[11px] text-muted-foreground mt-1 line-clamp-1">
                        {m.primaryMechanism}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AdminContent;
