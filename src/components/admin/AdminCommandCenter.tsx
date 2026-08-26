import { useCallback, useEffect, useState } from "react";
import { ArrowRight, Building2, Database, ShieldCheck, Sparkles, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import type { OrganizationRequest } from "@/components/admin/OrganizationRequestManager";

const ActionCard = ({ icon: Icon, eyebrow, title, description, onClick, badge }: {
  icon: typeof Building2;
  eyebrow: string;
  title: string;
  description: string;
  onClick: () => void;
  badge?: string;
}) => (
  <button type="button" onClick={onClick} className="group min-h-48 rounded-2xl border border-border/70 bg-card p-5 text-left transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-xl hover:shadow-black/10">
    <div className="flex items-start justify-between gap-3"><span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary"><Icon className="h-5 w-5" /></span>{badge && <Badge>{badge}</Badge>}</div>
    <p className="mt-5 text-[10px] font-semibold uppercase tracking-[0.2em] text-primary">{eyebrow}</p>
    <h3 className="mt-2 font-heading text-xl font-semibold">{title}</h3>
    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{description}</p>
    <span className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-primary">Öffnen <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" /></span>
  </button>
);

const AdminCommandCenter = ({ onNavigate }: { onNavigate: (section: string) => void }) => {
  const navigate = useNavigate();
  const [newRequests, setNewRequests] = useState<number | null>(null);

  const loadRequests = useCallback(async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any).rpc("get_admin_organization_access_requests", { _status: null });
    if (error) { setNewRequests(null); return; }
    setNewRequests(((data ?? []) as OrganizationRequest[]).filter((item) => item.status === "submitted").length);
  }, []);

  useEffect(() => { void loadRequests(); }, [loadRequests]);

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/10 via-card to-card p-6 sm:p-8">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-background/50 px-3 py-1.5 text-xs font-semibold text-primary"><Sparkles className="h-3.5 w-3.5" />Founder Command Center</div>
          <h2 className="mt-5 font-heading text-3xl font-bold leading-tight sm:text-4xl">Was braucht heute deine Entscheidung?</h2>
          <p className="mt-4 max-w-2xl leading-relaxed text-muted-foreground">Anfragen, Teams und operative Freigaben stehen vorne. Tiefe Daten und Exporte bleiben verfügbar, blockieren aber nicht mehr deinen Arbeitsbereich.</p>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <ActionCard icon={Building2} eyebrow="Wachstum" title="Partneranfragen" description="Organisationen prüfen, Gespräche vorbereiten und Zugänge persönlich freigeben." badge={newRequests == null ? undefined : `${newRequests} neu`} onClick={() => onNavigate("access")} />
        <ActionCard icon={Users} eyebrow="Organisation" title="Teams steuern" description="Teams, Coaches, Programmstart und Einladungen an einem Ort verwalten." onClick={() => onNavigate("teams")} />
        <ActionCard icon={ShieldCheck} eyebrow="Pilot" title="Startbereitschaft" description="Nur die operativen Gates öffnen, die vor dem nächsten Pilot wirklich relevant sind." onClick={() => onNavigate("pilot")} />
      </div>

      <Card className="border-border/70 bg-card/70">
        <CardContent className="grid gap-4 p-5 sm:grid-cols-[1fr_auto] sm:items-center sm:p-6">
          <div className="flex items-start gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-secondary text-muted-foreground"><Database className="h-5 w-5" /></span><div><p className="font-semibold">Daten, Exporte und Systemdiagnose</p><p className="mt-1 text-sm leading-relaxed text-muted-foreground">Sekundärer Fachbereich für gezielte Analyse und KI-Exporte. Er lädt erst, wenn du ihn öffnest.</p></div></div>
          <button type="button" onClick={() => onNavigate("evidence")} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-border px-4 text-sm font-semibold hover:bg-secondary">Datenarchiv <ArrowRight className="h-4 w-4" /></button>
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-2" aria-label="Weitere Fachbereiche">
        {[ ["overview", "Programmstatus"], ["days", "Programmtage"], ["feedback", "Feedback"], ["health", "Systemdiagnose"] ].map(([section, label]) => (
          <button key={section} type="button" onClick={() => onNavigate(section)} className="min-h-10 rounded-xl border border-border/70 bg-card px-4 text-sm text-muted-foreground hover:border-primary/40 hover:text-foreground">{label}</button>
        ))}
      </div>

      <button type="button" onClick={() => navigate("/admin/jarvis")} className="flex w-full items-center justify-between gap-4 rounded-2xl border border-primary/30 bg-primary/5 p-4 text-left text-sm transition-colors hover:bg-primary/10"><span><span className="font-semibold text-foreground">Jarvis Intelligence:</span> Admin-Daten read-only strukturieren, verbinden und in einfachen Worten abrufen. Kein Freitext, keine automatischen Freigaben.</span><ArrowRight className="h-4 w-4 shrink-0 text-primary" /></button>
    </div>
  );
};

export default AdminCommandCenter;
