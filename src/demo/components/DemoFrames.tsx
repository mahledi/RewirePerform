import { Brain, Clock, Lightbulb, Lock, Target, Trophy } from "lucide-react";

export const MockPhoneFrame = () => (
  <div className="mx-auto w-full max-w-[340px] rounded-[2rem] border border-white/15 bg-black/60 p-3 shadow-2xl">
    <div className="rounded-[1.55rem] border border-border bg-background p-4">
      <div className="mx-auto mb-4 h-1 w-16 rounded-full bg-muted" />
      <div className="space-y-4">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-primary">Tag 12</p>
          <h3 className="mt-1 font-heading text-2xl font-bold">Urteil zu Information</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Science Bite, Tagesrahmen, Check-in und Denkaufgabe.
          </p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 text-primary">
            <Brain className="h-4 w-4" />
            <span className="text-sm font-semibold">Science Bite</span>
          </div>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            Ein Fehler ist zuerst Information, nicht Identität.
          </p>
        </div>
        <div className="rounded-2xl border border-primary/25 bg-primary/10 p-4">
          <div className="flex items-center gap-2 text-primary">
            <Target className="h-4 w-4" />
            <span className="text-sm font-semibold">Heute für dich</span>
          </div>
          <p className="mt-3 text-sm leading-relaxed">
            Suche heute nach der nächsten nutzbaren Information.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {[
            ["Energie", "6/10"],
            ["Fokus", "7/10"],
            ["Druck", "6/10"],
            ["Bereit", "6/10"],
          ].map(([label, value]) => (
            <div key={label} className="rounded-xl border border-border bg-card p-3">
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className="mt-1 font-heading text-sm font-semibold">{value}</p>
            </div>
          ))}
        </div>
        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="flex items-center gap-2">
            <Lightbulb className="h-4 w-4 text-primary" />
            <p className="font-heading font-semibold">Denkaufgabe</p>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            Warum heute · Wann aktiv · Reframing · Self-Talk
          </p>
        </div>
      </div>
    </div>
  </div>
);

export const MockDesktopFrame = () => (
  <div className="rounded-3xl border border-white/15 bg-black/50 p-3 shadow-2xl">
    <div className="rounded-2xl border border-border bg-background">
      <div className="flex items-center gap-2 border-b border-border px-5 py-3">
        <span className="h-3 w-3 rounded-full bg-red-400/70" />
        <span className="h-3 w-3 rounded-full bg-yellow-400/70" />
        <span className="h-3 w-3 rounded-full bg-primary/70" />
        <span className="ml-3 text-xs text-muted-foreground">Coach Dashboard · Demo Team</span>
      </div>
      <div className="grid gap-4 p-5 md:grid-cols-[1.15fr_0.85fr]">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            {[
              ["Aktiv heute", "14/18"],
              ["Flow abgeschlossen", "78%"],
              ["Teamzustand", "stabil"],
              ["Termin", "17:30"],
            ].map(([label, value]) => (
              <div key={label} className="rounded-2xl border border-border bg-card p-4">
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="mt-2 font-heading text-2xl font-bold">{value}</p>
              </div>
            ))}
          </div>
          <div className="rounded-2xl border border-border bg-card p-4">
            <div className="flex items-center gap-2 text-primary">
              <Trophy className="h-4 w-4" />
              <p className="font-heading font-semibold">Wirkung · Demo-Werte</p>
            </div>
            <div className="mt-4 space-y-3">
              {["Fehlererholung", "Prozessfokus", "Druckregulation"].map((label, index) => (
                <div key={label}>
                  <div className="mb-1 flex justify-between text-xs text-muted-foreground">
                    <span>{label}</span>
                    <span>{62 + index * 4}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted">
                    <div className="h-2 rounded-full bg-primary" style={{ width: `${62 + index * 4}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="rounded-2xl border border-primary/20 bg-primary/10 p-4">
          <div className="flex items-center gap-2 text-primary">
            <Clock className="h-4 w-4" />
            <p className="font-heading font-semibold">Heutiger Coach-Impuls</p>
          </div>
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
            Nach Fehlern heute erst fragen: Welche Information war nutzbar? Dann die nächste Aktion benennen lassen.
          </p>
          <div className="mt-4 flex items-start gap-2 rounded-xl border border-border bg-background/70 p-3 text-sm">
            <Lock className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <span>Private Journaltexte bleiben außerhalb der Coach-Ansicht.</span>
          </div>
        </div>
      </div>
    </div>
  </div>
);
