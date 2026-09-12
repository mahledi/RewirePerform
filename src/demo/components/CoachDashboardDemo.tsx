import { useState } from "react";
import type { ReactNode } from "react";
import { CalendarDays, Copy, Lock, MessageSquare, ShieldCheck, TrendingUp } from "lucide-react";
import { coachTabs, evidenceBars, overviewMetrics } from "../data/demoData";
import type { DemoCoachTabId } from "../types";

export const CoachDashboardDemo = () => {
  const [activeTab, setActiveTab] = useState<DemoCoachTabId>("overview");

  return (
    <section id="coach-demo" className="py-20 scroll-mt-24">
      <div className="container mx-auto px-6">
        <div className="mx-auto max-w-3xl text-center">
          <p className="mb-4 text-sm font-semibold uppercase tracking-[0.25em] text-primary">Coach-Ansicht</p>
          <h2 className="font-heading text-3xl font-bold md:text-5xl">Orientierung, ohne private Reflexion zu öffnen.</h2>
          <p className="mt-5 text-lg leading-relaxed text-muted-foreground">
            Die Demo zeigt beispielhaft Teamzustand, Aktivität, Programmverlauf und Coaching-Impulse.
            Alle Werte sind statisch.
          </p>
        </div>

        <div className="mt-10 overflow-x-auto pb-2">
          <div className="flex min-w-max gap-2 md:justify-center">
            {coachTabs.map(({ id, label, Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => setActiveTab(id)}
                className={`inline-flex items-center gap-2 rounded-full border px-4 py-3 text-sm font-semibold transition-all ${
                  activeTab === id ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card hover:bg-secondary"
                }`}
              >
                <Icon className="h-4 w-4" />
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-8 rounded-3xl border border-border bg-card/70 p-5 md:p-8">
          {activeTab === "overview" && <OverviewPanel />}
          {activeTab === "readiness" && <ReadinessPanel />}
          {activeTab === "evidence" && <EvidencePanel />}
          {activeTab === "toolkit" && <ToolkitPanel />}
          {activeTab === "teams" && <TeamsPanel />}
        </div>
      </div>
    </section>
  );
};

const OverviewPanel = () => (
  <div className="space-y-6">
    <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
      <div>
        <p className="text-sm text-muted-foreground">Demo Team</p>
        <h3 className="font-heading text-3xl font-bold">Multi-Sport Team · Beispielwoche</h3>
      </div>
      <div className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-4 py-2 text-sm text-primary">
        <CalendarDays className="h-4 w-4" />
        Training heute · 17:30
      </div>
    </div>
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {overviewMetrics.map((metric) => (
        <div key={metric.label} className="rounded-2xl border border-border bg-background/70 p-5">
          <p className="text-sm text-muted-foreground">{metric.label}</p>
          <p className="mt-2 font-heading text-3xl font-bold">{metric.value}</p>
          <p className="mt-2 text-xs text-muted-foreground">{metric.detail}</p>
        </div>
      ))}
    </div>
    <div className="rounded-2xl border border-border bg-background/70 p-5">
      <p className="font-heading text-lg font-semibold">Aktivität heute</p>
      <div className="mt-4 grid gap-3 md:grid-cols-3">
        {["Check-in geöffnet", "Aufgabe verstanden", "Journal abgeschlossen"].map((item, index) => (
          <div key={item} className="rounded-xl border border-border bg-card p-4">
            <p className="text-sm text-muted-foreground">{item}</p>
            <p className="mt-2 font-heading text-2xl font-bold">{[14, 12, 9][index]}/18</p>
          </div>
        ))}
      </div>
    </div>
  </div>
);

const ReadinessPanel = () => (
  <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
    <div>
      <p className="text-sm text-muted-foreground">Aggregierter Teamzustand</p>
      <h3 className="mt-2 font-heading text-3xl font-bold">Fokus stabil, Druck erhöht.</h3>
      <p className="mt-4 leading-relaxed text-muted-foreground">
        Der Coach sieht Muster, keine privaten Einzeljournale. Die Tageslinse hilft, Training und Ansprache passend zu setzen.
      </p>
      <div className="mt-5 flex items-start gap-3 rounded-2xl border border-primary/25 bg-primary/10 p-4 text-sm">
        <Lock className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
        <span>Nur aggregiert dargestellt. Keine privaten Freitexte einzelner Athleten.</span>
      </div>
    </div>
    <div className="grid gap-4 sm:grid-cols-2">
      {[
        ["Energie", "mittel", "62%"],
        ["Fokus", "stabil", "71%"],
        ["Druck", "erhöht", "68%"],
        ["Tageslinie", "Urteil zu Information", "Tag 12"],
      ].map(([label, value, detail]) => (
        <div key={label} className="rounded-2xl border border-border bg-background/70 p-5">
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="mt-2 font-heading text-2xl font-bold">{value}</p>
          <p className="mt-2 text-xs text-primary">{detail}</p>
        </div>
      ))}
    </div>
  </div>
);

const EvidencePanel = () => (
  <div className="space-y-6">
    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
      <div>
        <p className="text-sm text-muted-foreground">Demo-Werte · Beispielhafte Darstellung</p>
        <h3 className="mt-2 font-heading text-3xl font-bold">Programmverlauf sichtbar machen, ohne Rohinhalte zu zeigen.</h3>
      </div>
      <div className="rounded-2xl border border-border bg-background/70 p-4 text-sm text-muted-foreground md:max-w-xs">
        Keine Wirkungswertung. Die Ansicht zeigt nur Nutzung, Teilnahme und Programmfortschritt.
      </div>
    </div>
    <div className="space-y-5">
      {evidenceBars.map((bar) => (
        <div key={bar.label} className="rounded-2xl border border-border bg-background/70 p-5">
          <div className="mb-4 flex items-center justify-between gap-4">
            <p className="font-heading font-semibold">{bar.label}</p>
            <p className="text-sm text-muted-foreground">{bar.value}/{bar.max}</p>
          </div>
          <div className="h-2 rounded-full bg-muted">
            <div className="h-2 rounded-full bg-primary" style={{ width: `${Math.round((bar.value / bar.max) * 100)}%` }} />
          </div>
          <p className="mt-3 text-xs text-muted-foreground">{bar.detail}</p>
        </div>
      ))}
    </div>
  </div>
);

const ToolkitPanel = () => (
  <div className="grid gap-4 md:grid-cols-2">
    {[
      ["Heutiger Coaching-Impuls", "Nach Fehlern heute erst die nächste Aktion benennen lassen, dann korrigieren."],
      ["Gesprächsfrage", "Was hat dir geholfen, nach einem Fehler wieder in die Aufgabe zurückzukommen?"],
      ["60-Sekunden-Team-Reminder", "Fehler sind Informationen. Die nächste Aktion ist der Trainingsreiz."],
      ["Was heute nicht tun", "Keine langen Fehleranalysen direkt im emotionalen Moment."],
    ].map(([title, text]) => (
      <div key={title} className="rounded-2xl border border-border bg-background/70 p-5">
        <MessageSquare className="mb-4 h-5 w-5 text-primary" />
        <p className="font-heading text-lg font-semibold">{title}</p>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{text}</p>
      </div>
    ))}
  </div>
);

const TeamsPanel = () => (
  <div className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
    <div>
      <p className="text-sm text-muted-foreground">Demo Teamverwaltung</p>
      <h3 className="mt-2 font-heading text-3xl font-bold">Einladung, Programmstart und Teamkalender.</h3>
      <p className="mt-4 leading-relaxed text-muted-foreground">
        In der echten App verwaltet der Coach Athleteneinladungen, persönliche Co-Coach-Einladungen, Programmstart und Teamkalender. Diese Vorschau ist nur ein Mockup.
      </p>
    </div>
    <div className="rounded-2xl border border-border bg-background/70 p-5">
      <div className="flex items-center justify-between gap-4 rounded-2xl border border-primary/25 bg-primary/10 p-4">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-primary">Athleteneinladung</p>
          <p className="mt-1 font-heading text-2xl font-bold">RW-DEMO</p>
        </div>
        <Copy className="h-5 w-5 text-primary" />
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <InfoPill icon={<ShieldCheck className="h-4 w-4" />} text="Co-Coach persönlich einladen" />
        <InfoPill icon={<TrendingUp className="h-4 w-4" />} text="Programmfortschritt" />
      </div>
    </div>
  </div>
);

const InfoPill = ({ icon, text }: { icon: ReactNode; text: string }) => (
  <div className="flex items-center gap-2 rounded-xl border border-border bg-card p-3 text-sm">
    <span className="text-primary">{icon}</span>
    {text}
  </div>
);
