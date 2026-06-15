import { motion } from "framer-motion";
import {
  Brain, Eye, Gauge, Heart, Target, Users, Activity,
  ShieldCheck, Lock, Compass, Zap, RefreshCcw, Trophy,
} from "lucide-react";
import { ReactNode } from "react";

/* ------------------------------------------------------------------ */
/* Shared primitives                                                   */
/* ------------------------------------------------------------------ */

const fadeUp = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
};

export const SlideFrame = ({
  children,
  kicker,
  className = "",
}: {
  children: ReactNode;
  kicker?: string;
  className?: string;
}) => (
  <div
    className={`relative mx-auto flex h-full w-full max-w-[1400px] flex-col justify-center px-8 py-16 md:px-16 ${className}`}
  >
    {kicker && (
      <motion.p
        {...fadeUp}
        transition={{ duration: 0.5 }}
        className="mb-8 text-[11px] font-semibold uppercase tracking-[0.3em] text-primary/80"
      >
        {kicker}
      </motion.p>
    )}
    {children}
  </div>
);

const GlowOrb = ({ className = "" }: { className?: string }) => (
  <div
    aria-hidden
    className={`pointer-events-none absolute rounded-full blur-3xl ${className}`}
  />
);

const HairCard = ({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) => (
  <div
    className={`rounded-2xl border border-border/60 bg-card/60 backdrop-blur-sm ${className}`}
    style={{ boxShadow: "inset 0 1px 0 hsl(0 0% 100% / 0.04)" }}
  >
    {children}
  </div>
);

/* ------------------------------------------------------------------ */
/* The recurring Athlete-with-Layers object (morphs across slides)     */
/* ------------------------------------------------------------------ */

const AthleteLayers = ({
  variant = "chaos",
  size = 320,
}: {
  variant?: "chaos" | "ordered" | "minimal";
  size?: number;
}) => {
  const layers = [
    "Aufmerksamkeit", "Bewertung", "Fehlerreaktion", "Selbstbild",
    "Druck", "Kontrolle", "Team", "Bedeutung",
  ];
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <div
        className="absolute inset-0 rounded-full"
        style={{
          background:
            "radial-gradient(circle at 50% 45%, hsl(var(--primary) / 0.18), transparent 65%)",
        }}
      />
      {layers.map((label, i) => {
        const angle = (i / layers.length) * Math.PI * 2;
        const radius = size * (variant === "ordered" ? 0.42 : variant === "minimal" ? 0.38 : 0.36 + (i % 3) * 0.04);
        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * radius;
        return (
          <motion.div
            key={label}
            layoutId={`layer-${label}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: variant === "minimal" ? 0.35 : 1 }}
            transition={{ delay: 0.1 + i * 0.08, duration: 0.6 }}
            className="absolute left-1/2 top-1/2 text-[10px] uppercase tracking-[0.2em] text-muted-foreground"
            style={{ transform: `translate(${x}px, ${y}px) translate(-50%, -50%)` }}
          >
            <span
              className={
                variant === "ordered"
                  ? "rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-primary"
                  : "rounded-full border border-border/60 bg-background/60 px-3 py-1"
              }
            >
              {label}
            </span>
          </motion.div>
        );
      })}
      {/* Athlete silhouette */}
      <motion.div
        layoutId="athlete-core"
        className="absolute left-1/2 top-1/2 flex h-28 w-28 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-primary/50 bg-background/80"
        style={{ boxShadow: "0 0 60px hsl(var(--primary) / 0.35)" }}
      >
        <Brain className="h-10 w-10 text-primary" />
      </motion.div>
      {/* Connection lines */}
      <svg className="absolute inset-0 h-full w-full" aria-hidden>
        {variant !== "minimal" &&
          layers.map((_, i) => {
            const angle = (i / layers.length) * Math.PI * 2;
            const r = size * 0.36;
            const x = size / 2 + Math.cos(angle) * r;
            const y = size / 2 + Math.sin(angle) * r;
            return (
              <motion.line
                key={i}
                x1={size / 2}
                y1={size / 2}
                x2={x}
                y2={y}
                stroke="hsl(var(--primary))"
                strokeOpacity={variant === "ordered" ? 0.5 : 0.2}
                strokeWidth={variant === "ordered" ? 1 : 0.6}
                strokeDasharray={variant === "ordered" ? "0" : "2 4"}
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ delay: 0.2 + i * 0.06, duration: 0.8 }}
              />
            );
          })}
      </svg>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Individual slides                                                   */
/* ------------------------------------------------------------------ */

const Slide01 = () => (
  <SlideFrame>
    <GlowOrb className="-left-32 top-1/4 h-96 w-96 bg-primary/20" />
    <GlowOrb className="-right-40 bottom-0 h-[28rem] w-[28rem] bg-primary/10" />
    <div className="grid items-center gap-12 md:grid-cols-[1.05fr_0.95fr]">
      <div>
        <motion.p {...fadeUp} transition={{ duration: 0.5 }} className="mb-6 text-[11px] font-semibold uppercase tracking-[0.3em] text-primary/80">
          RewirePerform
        </motion.p>
        <motion.h1 {...fadeUp} transition={{ delay: 0.1, duration: 0.6 }} className="text-5xl font-semibold leading-[1.05] tracking-tight md:text-7xl">
          Train the system <br />
          <span className="text-primary">behind performance.</span>
        </motion.h1>
        <motion.p {...fadeUp} transition={{ delay: 0.3, duration: 0.6 }} className="mt-8 max-w-xl text-lg leading-relaxed text-muted-foreground">
          Ein 56-Tage-System, das Wahrnehmung, Bewertung und Verhalten unter Druck systematisch trainiert — nicht motiviert.
        </motion.p>
      </div>
      <div className="flex justify-center">
        <AthleteLayers variant="chaos" size={420} />
      </div>
    </div>
  </SlideFrame>
);

const Slide02 = () => (
  <SlideFrame kicker="These 01">
    <div className="grid items-center gap-12 md:grid-cols-[1fr_1fr]">
      <div className="flex justify-center">
        <AthleteLayers variant="chaos" size={380} />
      </div>
      <div>
        <h2 className="text-4xl font-semibold leading-tight tracking-tight md:text-6xl">
          Performance bricht selten <br />
          <span className="text-primary">am Körper zuerst.</span>
        </h2>
        <p className="mt-8 max-w-md text-lg leading-relaxed text-muted-foreground">
          Sie bricht dort, wo Wahrnehmung, Bewertung, Druck, Fehler, Selbstbild und Aufmerksamkeit zusammenkommen.
        </p>
      </div>
    </div>
  </SlideFrame>
);

const Slide03 = () => {
  const items = [
    { icon: Brain, label: "Motivation" },
    { icon: Eye, label: "Aufmerksamkeit" },
    { icon: Gauge, label: "Druck" },
    { icon: Heart, label: "Selbstbild" },
    { icon: Target, label: "Fehler" },
    { icon: Users, label: "Team" },
  ];
  return (
    <SlideFrame kicker="These 02">
      <h2 className="max-w-3xl text-4xl font-semibold leading-tight tracking-tight md:text-5xl">
        Wir trainieren nicht Motivation. <br />
        <span className="text-muted-foreground">Wir trainieren das System darunter.</span>
      </h2>
      <div className="mt-12 grid grid-cols-2 gap-4 md:grid-cols-6">
        {items.map(({ icon: Icon, label }, i) => (
          <motion.div
            key={label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08, duration: 0.5 }}
          >
            <HairCard className="flex flex-col items-center gap-3 p-5">
              <Icon className={`h-5 w-5 ${label === "Motivation" ? "text-muted-foreground/50 line-through" : "text-primary"}`} />
              <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{label}</span>
            </HairCard>
          </motion.div>
        ))}
      </div>
    </SlideFrame>
  );
};

const Slide04 = () => (
  <SlideFrame kicker="Problem">
    <h2 className="text-4xl font-semibold tracking-tight md:text-5xl">
      Klassisches Mentaltraining ist oft <span className="text-primary">zu punktuell.</span>
    </h2>
    <div className="mt-12 grid gap-6 md:grid-cols-2">
      <HairCard className="p-8">
        <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Klassisch</p>
        <div className="mt-6 flex h-40 items-center justify-center gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-4 w-4 rounded-full bg-muted-foreground/40" />
          ))}
        </div>
        <ul className="mt-6 space-y-1 text-sm text-muted-foreground">
          <li>· isolierte Impulse</li>
          <li>· selten, abstrakt, motivierend</li>
          <li>· wenig Transfer, wenig Messbarkeit</li>
        </ul>
      </HairCard>
      <HairCard className="border-primary/40 bg-primary/5 p-8">
        <p className="text-xs uppercase tracking-[0.25em] text-primary">RewirePerform</p>
        <div className="mt-6 flex h-40 items-center justify-center">
          <svg viewBox="0 0 240 80" className="w-full">
            {Array.from({ length: 14 }).map((_, i) => (
              <motion.circle
                key={i}
                cx={10 + i * 16}
                cy={40}
                r={3}
                fill="hsl(var(--primary))"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.05 }}
              />
            ))}
            <motion.path
              d="M10 40 Q120 10 230 40"
              stroke="hsl(var(--primary))"
              strokeOpacity={0.5}
              fill="none"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 1.2 }}
            />
          </svg>
        </div>
        <ul className="mt-6 space-y-1 text-sm text-muted-foreground">
          <li>· täglich, kontextnah, vernetzt</li>
          <li>· verhaltensbasiert & messbar</li>
          <li>· Transfer in Training und Alltag</li>
        </ul>
      </HairCard>
    </div>
    <p className="mt-10 max-w-2xl text-base italic text-muted-foreground">
      „Ein einzelner Workshop verändert kein Nervensystem. Wiederholte, kontextnahe Handlung kann es.“
    </p>
  </SlideFrame>
);

const Slide05 = () => (
  <SlideFrame kicker="Lösung">
    <div className="grid items-center gap-12 md:grid-cols-[0.9fr_1.1fr]">
      <div>
        <h2 className="text-4xl font-semibold leading-tight tracking-tight md:text-5xl">
          Eine einfache Oberfläche. <br />
          <span className="text-primary">Eine komplexe Architektur dahinter.</span>
        </h2>
        <p className="mt-6 max-w-md text-muted-foreground">
          Der Spieler folgt einem ruhigen täglichen Flow. Im Hintergrund läuft das System.
        </p>
      </div>
      <div className="relative">
        {/* Layered system behind phone */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 0.6, y: 0 }}
          transition={{ duration: 0.8 }}
          className="absolute inset-0"
        >
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="absolute inset-x-8 rounded-3xl border border-primary/20 bg-primary/[0.04]"
              style={{ top: 12 + i * 14, bottom: 12 - i * 14, transform: `scale(${1 - i * 0.04})` }}
            />
          ))}
        </motion.div>
        <div className="relative mx-auto w-[260px] rounded-[2rem] border border-border bg-background p-3 shadow-2xl">
          <div className="rounded-[1.6rem] border border-border bg-card p-5">
            <p className="text-[10px] uppercase tracking-[0.2em] text-primary">Tag 12</p>
            <h3 className="mt-1 text-lg font-semibold">Urteil zu Information</h3>
            <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
              Ein Fehler ist zuerst Information, nicht Identität.
            </p>
            <div className="mt-4 space-y-2">
              {["Science Bite", "Aufgabe · Reframing", "Journal", "Dankbarkeit"].map((t) => (
                <div key={t} className="rounded-lg border border-border/60 bg-background/60 px-3 py-2 text-xs">
                  {t}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  </SlideFrame>
);

const Slide06 = () => {
  const axes = [
    ["Presence", "Outcome"],
    ["Growth", "Winning"],
    ["Love", "Fear"],
    ["Inner Excellence", "Ego"],
    ["Learning", "Judgement"],
    ["Confidence", "Self-Doubt"],
    ["Process", "Result"],
    ["Non-Control", "Control"],
    ["Gratitude", "Anxiety"],
    ["Identity", "Performance"],
  ];
  return (
    <SlideFrame kicker="10 Transformationsachsen">
      <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">
        Verschiebung in Richtung leistungsfähigerer Muster.
      </h2>
      <div className="mt-10 space-y-2">
        {axes.map(([right, left], i) => (
          <motion.div
            key={right}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05 }}
            className="grid grid-cols-[1fr_2fr_1fr] items-center gap-4 text-sm"
          >
            <span className="text-right text-muted-foreground/70">{left}</span>
            <div className="relative h-1.5 rounded-full bg-muted/40">
              <motion.div
                initial={{ width: "20%" }}
                animate={{ width: "78%" }}
                transition={{ delay: 0.3 + i * 0.05, duration: 0.9 }}
                className="absolute left-0 top-0 h-full rounded-full bg-gradient-to-r from-muted to-primary"
              />
              <div className="absolute right-[22%] top-1/2 h-3 w-3 -translate-y-1/2 rounded-full border border-primary bg-background" />
            </div>
            <span className="text-primary">{right}</span>
          </motion.div>
        ))}
      </div>
    </SlideFrame>
  );
};

const Slide07 = () => {
  const mechs = [
    { icon: Eye, name: "Attentional Control", sub: "Zurück zur Aufgabe" },
    { icon: Brain, name: "Metacognitive Defusion", sub: "Gedanken ≠ Wahrheit" },
    { icon: RefreshCcw, name: "Reappraisal", sub: "Bedrohung → Herausforderung" },
    { icon: ShieldCheck, name: "Acceptance", sub: "Energie nicht ans Unkontrollierbare" },
    { icon: Compass, name: "Exploration", sub: "Unsicherheit als Lernreiz" },
    { icon: Activity, name: "Identity Encoding", sub: "Verhalten beweist Selbstbild" },
    { icon: Heart, name: "Meaning", sub: "Ego → Beitrag & Exzellenz" },
    { icon: Zap, name: "Affective State", sub: "Zustände mitformen" },
  ];
  return (
    <SlideFrame kicker="8 Mechanismen">
      <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">Die Engine unter der Oberfläche.</h2>
      <div className="relative mt-10 grid grid-cols-2 gap-4 md:grid-cols-4">
        {mechs.map(({ icon: Icon, name, sub }, i) => (
          <motion.div
            key={name}
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.06 }}
          >
            <HairCard className="h-full p-5">
              <Icon className="h-4 w-4 text-primary" />
              <p className="mt-3 text-sm font-semibold">{name}</p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{sub}</p>
            </HairCard>
          </motion.div>
        ))}
      </div>
      <p className="mt-8 text-sm text-muted-foreground">
        Im Zentrum: <span className="text-foreground">Daily Practice</span> — die tägliche Schleife, in der diese Mechanismen wiederholt aktiviert werden.
      </p>
    </SlideFrame>
  );
};

const Slide08 = () => {
  const phases = [
    { range: "Tag 1–14", title: "Orientierung & Bewusstwerden", body: "Autopilot sichtbar machen." },
    { range: "Tag 15–28", title: "Umschreiben & Neu-Codieren", body: "Neue Reaktionen aufbauen." },
    { range: "Tag 29–42", title: "Transfer & Belastung", body: "Unter Druck stabilisieren." },
    { range: "Tag 43–56", title: "Verkörperung & Integration", body: "Vom Anwenden zum Verkörpern." },
  ];
  return (
    <SlideFrame kicker="56 Tage · 4 Phasen">
      <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">
        Vom Erkennen zum Verkörpern.
      </h2>
      <div className="mt-12">
        <div className="relative h-1 w-full rounded-full bg-muted/40">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: "100%" }}
            transition={{ duration: 1.4 }}
            className="absolute left-0 top-0 h-full rounded-full bg-gradient-to-r from-primary/40 via-primary to-primary/40"
          />
        </div>
        <div className="mt-8 grid gap-4 md:grid-cols-4">
          {phases.map((p, i) => (
            <motion.div
              key={p.title}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + i * 0.12 }}
            >
              <HairCard className="h-full p-5">
                <p className="text-[10px] uppercase tracking-[0.25em] text-primary">{p.range}</p>
                <p className="mt-3 text-base font-semibold">{p.title}</p>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{p.body}</p>
              </HairCard>
            </motion.div>
          ))}
        </div>
      </div>
    </SlideFrame>
  );
};

const Slide09 = () => {
  const steps = [
    { label: "Science Bite", note: "verstehen" },
    { label: "Aufgabe 1 · Haupthebel", note: "anwenden" },
    { label: "Aufgabe 2 · Verstärkung", note: "anwenden" },
    { label: "Aufgabe 3 · Reibung & Transfer", note: "anwenden" },
    { label: "Abend-Journal", note: "reflektieren" },
    { label: "Dankbarkeit · 5 Zeilen", note: "konsolidieren" },
    { label: "Check-in", note: "wiederholen" },
  ];
  return (
    <SlideFrame kicker="Daily Flow">
      <div className="grid items-center gap-12 md:grid-cols-[0.95fr_1.05fr]">
        <div>
          <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">
            Für den Spieler bleibt es einfach.
          </h2>
          <p className="mt-6 max-w-md text-muted-foreground">
            Er muss die Architektur nicht verstehen. Er muss ihr nur täglich folgen.
          </p>
        </div>
        <div className="space-y-2">
          {steps.map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.07 }}
              className="flex items-center justify-between rounded-xl border border-border/60 bg-card/60 px-4 py-3"
            >
              <div className="flex items-center gap-3">
                <span className="flex h-7 w-7 items-center justify-center rounded-full border border-primary/40 bg-primary/10 text-xs text-primary">
                  {i + 1}
                </span>
                <span className="text-sm">{s.label}</span>
              </div>
              <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">{s.note}</span>
            </motion.div>
          ))}
        </div>
      </div>
    </SlideFrame>
  );
};

const Slide10 = () => {
  const cols = 14, rows = 4;
  return (
    <SlideFrame kicker="Inhaltsmatrix">
      <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">
        Keine Wiederholung. <span className="text-primary">Stufenweise Veränderung.</span>
      </h2>
      <p className="mt-4 max-w-2xl text-sm text-muted-foreground">
        Themen kehren mit neuer Funktion zurück: erkennen · neu lesen · im Wettkampfkontext · unter Reibung · als Stärke.
      </p>
      <div className="mt-10 overflow-hidden rounded-2xl border border-border/60 bg-card/40 p-6">
        <svg viewBox={`0 0 ${cols * 38} ${rows * 60 + 30}`} className="w-full">
          {/* dots */}
          {Array.from({ length: rows }).map((_, r) =>
            Array.from({ length: cols }).map((__, c) => {
              const idx = r * cols + c;
              return (
                <motion.circle
                  key={`d-${idx}`}
                  cx={c * 38 + 19}
                  cy={r * 60 + 30}
                  r={3.5}
                  fill="hsl(var(--primary))"
                  initial={{ opacity: 0.2 }}
                  animate={{ opacity: 0.85 }}
                  transition={{ delay: idx * 0.01 }}
                />
              );
            })
          )}
          {/* theme curves */}
          {[
            { color: "hsl(var(--primary))", points: [[2, 0], [9, 1], [16, 0], [25, 2], [38, 3]] },
            { color: "hsl(166 42% 60%)", points: [[5, 1], [12, 2], [22, 1], [33, 3], [44, 2]] },
            { color: "hsl(190 60% 60%)", points: [[1, 2], [10, 0], [20, 3], [30, 1], [50, 0]] },
          ].map((line, li) => {
            const d = line.points
              .map(([x, y], i) => `${i === 0 ? "M" : "L"} ${x * 10 + 19} ${y * 60 + 30}`)
              .join(" ");
            return (
              <motion.path
                key={li}
                d={d}
                stroke={line.color}
                strokeWidth={1.2}
                strokeOpacity={0.7}
                fill="none"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ delay: 0.4 + li * 0.3, duration: 1.4 }}
              />
            );
          })}
        </svg>
        <div className="mt-4 grid grid-cols-2 gap-3 text-xs text-muted-foreground md:grid-cols-5">
          {["Presence", "Learning", "Control", "Growth", "Confidence"].map((t) => (
            <div key={t} className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-primary" />
              {t}
            </div>
          ))}
        </div>
      </div>
    </SlideFrame>
  );
};

const Slide11 = () => (
  <SlideFrame kicker="Neuroplastizität">
    <div className="grid items-center gap-12 md:grid-cols-[1fr_1fr]">
      <div>
        <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">
          Veränderung durch wiederholte, <span className="text-primary">bedeutsame</span> Nutzung.
        </h2>
        <ul className="mt-8 space-y-2 text-sm text-muted-foreground">
          {["Wiederholung", "Aufmerksamkeit", "Emotionale Relevanz", "Handlung", "Reflexion", "Steigende Reibung", "Identitätsbezug"].map((x) => (
            <li key={x} className="flex items-center gap-2">
              <span className="h-1 w-6 bg-primary/60" /> {x}
            </li>
          ))}
        </ul>
        <p className="mt-8 text-xs italic text-muted-foreground">
          Formulierung bewusst vorsichtig: „unterstützt“, „kann fördern“, „ist konsistent mit“ — keine Heilungs- oder Garantieversprechen.
        </p>
      </div>
      <div className="relative h-80">
        <svg viewBox="0 0 400 320" className="h-full w-full">
          {Array.from({ length: 24 }).map((_, i) => {
            const x = 40 + (i % 6) * 60;
            const y = 40 + Math.floor(i / 6) * 70;
            return <circle key={i} cx={x} cy={y} r={4} fill="hsl(var(--primary))" opacity={0.7} />;
          })}
          {Array.from({ length: 40 }).map((_, i) => {
            const a = Math.floor(Math.random() * 24);
            const b = Math.floor(Math.random() * 24);
            const x1 = 40 + (a % 6) * 60, y1 = 40 + Math.floor(a / 6) * 70;
            const x2 = 40 + (b % 6) * 60, y2 = 40 + Math.floor(b / 6) * 70;
            return (
              <motion.line
                key={i}
                x1={x1} y1={y1} x2={x2} y2={y2}
                stroke="hsl(var(--primary))"
                strokeOpacity={0.15 + (i % 5) * 0.1}
                strokeWidth={i % 6 === 0 ? 1.6 : 0.6}
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ delay: i * 0.04, duration: 1 }}
              />
            );
          })}
        </svg>
      </div>
    </div>
  </SlideFrame>
);

const Slide12 = () => (
  <SlideFrame kicker="Dankbarkeit & Journal">
    <h2 className="max-w-3xl text-3xl font-semibold tracking-tight md:text-4xl">
      Nicht weich. <span className="text-primary">Aufmerksamkeitslenkung.</span>
    </h2>
    <div className="mt-10 grid gap-6 md:grid-cols-2">
      <HairCard className="p-6">
        <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Ohne Training</p>
        <p className="mt-4 font-mono text-sm text-muted-foreground">
          Fehler → Bewertung → Selbstzweifel → Enge
        </p>
      </HairCard>
      <HairCard className="border-primary/40 p-6">
        <p className="text-xs uppercase tracking-[0.25em] text-primary">Mit RewirePerform</p>
        <p className="mt-4 font-mono text-sm">
          Fehler → <span className="text-primary">Wahrnehmen</span> → Benennen → <span className="text-primary">Reframe</span> → Handlung → Journal → Lernen
        </p>
      </HairCard>
    </div>
    <p className="mt-8 max-w-3xl text-sm leading-relaxed text-muted-foreground">
      Das Gehirn bemerkt Bedrohung schneller als Stabilität. Dankbarkeit trainiert, Aufmerksamkeit zurück auf Ressourcen, Beziehung und Fortschritt zu lenken.
    </p>
  </SlideFrame>
);

const Slide13 = () => (
  <SlideFrame kicker="Coach-Dashboard">
    <div className="grid items-center gap-10 md:grid-cols-[1fr_1.1fr]">
      <div>
        <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">
          Verständnis statt Kontrolle.
        </h2>
        <p className="mt-6 max-w-md text-muted-foreground">
          Coaches sehen aggregierte Team-Signale — keine privaten Reflexionen.
        </p>
        <div className="mt-6 flex items-start gap-2 rounded-xl border border-primary/30 bg-primary/5 p-4 text-sm">
          <Lock className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <span>Persönliche Inhalte bleiben geschützt. Teamdaten anonymisiert und aggregiert.</span>
        </div>
      </div>
      <HairCard className="p-5">
        <div className="flex items-center justify-between border-b border-border/60 pb-3 text-xs text-muted-foreground">
          <span>Coach Dashboard</span>
          <span>Team U17</span>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3">
          {[
            ["Aktiv heute", "14/18"],
            ["Flow abgeschlossen", "78%"],
            ["Teamzustand", "stabil"],
            ["Reflexion", "↑ 12%"],
          ].map(([k, v]) => (
            <div key={k} className="rounded-xl border border-border/60 bg-background/50 p-3">
              <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">{k}</p>
              <p className="mt-1 text-lg font-semibold">{v}</p>
            </div>
          ))}
        </div>
        <div className="mt-4 space-y-2">
          {["Fehlererholung", "Prozessfokus", "Druckregulation"].map((l, i) => (
            <div key={l}>
              <div className="mb-1 flex justify-between text-[10px] text-muted-foreground">
                <span>{l}</span><span>{62 + i * 5}%</span>
              </div>
              <div className="h-1.5 rounded-full bg-muted/40">
                <div className="h-full rounded-full bg-primary" style={{ width: `${62 + i * 5}%` }} />
              </div>
            </div>
          ))}
        </div>
      </HairCard>
    </div>
  </SlideFrame>
);

const Slide14 = () => {
  const tiers = [
    {
      icon: Activity, title: "Spieler",
      bullets: ["Bessere Selbststeuerung", "Stabilerer Umgang mit Fehlern", "Confidence durch Handlung"],
    },
    {
      icon: Users, title: "Coaches",
      bullets: ["Frühere Signale", "Mentale Entwicklung sichtbar", "Teamkultur gezielter führen"],
    },
    {
      icon: Trophy, title: "Vereine",
      bullets: ["Moderne Entwicklungskultur", "Messbares mentales Training", "Skalierbares System"],
    },
  ];
  return (
    <SlideFrame kicker="Relevanz">
      <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">Drei Ebenen. Ein System.</h2>
      <div className="mt-12 grid gap-6 md:grid-cols-3">
        {tiers.map(({ icon: Icon, title, bullets }, i) => (
          <motion.div key={title} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
            <HairCard className="h-full p-6">
              <Icon className="h-5 w-5 text-primary" />
              <p className="mt-4 text-lg font-semibold">{title}</p>
              <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
                {bullets.map((b) => (
                  <li key={b} className="flex items-start gap-2">
                    <span className="mt-2 h-1 w-3 bg-primary/60" /> {b}
                  </li>
                ))}
              </ul>
            </HairCard>
          </motion.div>
        ))}
      </div>
    </SlideFrame>
  );
};

const Slide15 = () => (
  <SlideFrame kicker="Demo-Sequenz">
    <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">
      Ein Tag. <span className="text-primary">Zwei Perspektiven.</span>
    </h2>
    <div className="mt-10 grid gap-6 md:grid-cols-3">
      {[
        { tag: "Morgens", title: "Spieler-Dashboard", body: "Science Bite, 3 Aufgaben, Check-in." },
        { tag: "Abends", title: "Journal & Dankbarkeit", body: "Reflexion. Konsolidierung. Mustererkennung." },
        { tag: "Über Zeit", title: "Coach Dashboard", body: "Entwicklung sichtbar, Vertrauen intakt." },
      ].map((c) => (
        <HairCard key={c.title} className="p-6">
          <p className="text-[10px] uppercase tracking-[0.25em] text-primary">{c.tag}</p>
          <p className="mt-3 font-semibold">{c.title}</p>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{c.body}</p>
        </HairCard>
      ))}
    </div>
    <p className="mt-8 text-sm text-muted-foreground">
      Eine interaktive Demo-Strecke ist unter <span className="text-foreground">/demo</span> verfügbar.
    </p>
  </SlideFrame>
);

const Slide16 = () => (
  <SlideFrame kicker="Wissenschaftliche Glaubwürdigkeit">
    <h2 className="max-w-3xl text-4xl font-semibold tracking-tight md:text-5xl">
      Stark, weil es <span className="text-primary">sauber bleibt.</span>
    </h2>
    <div className="mt-10 grid gap-4 md:grid-cols-2">
      {[
        "Kein medizinisches Produkt. Kein Therapieersatz.",
        "Keine garantierten Leistungsversprechen.",
        "Basiert auf plausiblen Mechanismen aus Sport- & Kognitionswissenschaft, Lern- und Verhaltensforschung.",
        "Integriert validierte Skalen (CSAI-2R, SMTQ, Flow).",
      ].map((t) => (
        <HairCard key={t} className="p-5 text-sm leading-relaxed text-muted-foreground">
          {t}
        </HairCard>
      ))}
    </div>
  </SlideFrame>
);

const Slide17 = () => (
  <SlideFrame>
    <GlowOrb className="left-1/2 top-1/3 h-[32rem] w-[32rem] -translate-x-1/2 bg-primary/15" />
    <div className="grid items-center gap-12 md:grid-cols-[1.05fr_0.95fr]">
      <div>
        <motion.h2 {...fadeUp} transition={{ duration: 0.6 }} className="text-5xl font-semibold leading-[1.05] tracking-tight md:text-7xl">
          Trainiere das System <br />
          <span className="text-primary">hinter Performance.</span>
        </motion.h2>
        <p className="mt-8 max-w-xl text-lg leading-relaxed text-muted-foreground">
          Der Körper führt aus. Das System entscheidet, wie ein Spieler Fehler liest, Druck trägt und wächst.
        </p>
      </div>
      <div className="flex justify-center">
        <AthleteLayers variant="ordered" size={420} />
      </div>
    </div>
  </SlideFrame>
);

const Slide18 = () => (
  <SlideFrame kicker="Nächster Schritt">
    <h2 className="text-4xl font-semibold tracking-tight md:text-5xl">
      Mit Ihrem Team starten.
    </h2>
    <p className="mt-6 max-w-2xl text-muted-foreground">
      Pilotphase, Demo-Zugang oder vollständige Implementierung im Verein.
    </p>
    <div className="mt-10 grid gap-4 md:grid-cols-3">
      {[
        { title: "Pilotphase", body: "8 Wochen mit einem Team. Begleitete Einführung.", cta: "Pilot anfragen" },
        { title: "Demo-Zugang", body: "Sandbox mit Demo-Daten. Sofort erlebbar.", cta: "Demo öffnen" },
        { title: "Vereinsimplementierung", body: "Mehrere Teams, Coach-Onboarding, Datenschutz.", cta: "Gespräch buchen" },
      ].map((c, i) => (
        <motion.div key={c.title} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
          <HairCard className={`h-full p-6 ${i === 1 ? "border-primary/40 bg-primary/5" : ""}`}>
            <p className="text-base font-semibold">{c.title}</p>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{c.body}</p>
            <p className="mt-6 text-xs uppercase tracking-[0.2em] text-primary">{c.cta} →</p>
          </HairCard>
        </motion.div>
      ))}
    </div>
  </SlideFrame>
);

/* ------------------------------------------------------------------ */
/* Slide list with speaker notes                                       */
/* ------------------------------------------------------------------ */

export type Slide = {
  id: string;
  title: string;
  Component: () => JSX.Element;
  notes: string[];
};

export const SLIDES: Slide[] = [
  { id: "intro", title: "Train the system behind performance", Component: Slide01, notes: ["Mit ruhiger Stimme öffnen.", "Nicht erklären — die Layers wirken lassen.", "These ankündigen: das System hinter Verhalten."] },
  { id: "these-1", title: "Performance bricht selten am Körper zuerst", Component: Slide02, notes: ["Pause nach der These.", "Layer benennen, nicht erklären.", "Auf die Wahrnehmungsfrage hinarbeiten."] },
  { id: "these-2", title: "Wir trainieren nicht Motivation", Component: Slide03, notes: ["Motivation explizit ausschließen.", "System darunter betonen."] },
  { id: "problem", title: "Klassisches Mentaltraining ist oft zu punktuell", Component: Slide04, notes: ["Sachlich, nicht abwertend.", "Wiederholung & Kontext als Schlüssel."] },
  { id: "loesung", title: "Einfache Oberfläche, komplexe Architektur", Component: Slide05, notes: ["Phone ist die Spieler-Sicht.", "Layers dahinter sind das System."] },
  { id: "achsen", title: "10 Transformationsachsen", Component: Slide06, notes: ["Verschiebung, nicht Transformation.", "Drei Achsen exemplarisch nennen."] },
  { id: "mechanismen", title: "8 Mechanismen", Component: Slide07, notes: ["Engine-Metapher nutzen.", "Attentional Control + Reappraisal als Beispiele."] },
  { id: "phasen", title: "56 Tage in 4 Phasen", Component: Slide08, notes: ["Phasenlogik kurz erklären.", "Vom Erkennen zum Verkörpern."] },
  { id: "daily", title: "Daily Flow", Component: Slide09, notes: ["Einfachheit für Spieler betonen.", "Architektur bleibt im Hintergrund."] },
  { id: "matrix", title: "Inhaltsmatrix", Component: Slide10, notes: ["Themen kehren mit neuer Funktion zurück.", "Beispiel Control über Tage 4 → 48."] },
  { id: "neuro", title: "Neuroplastizität", Component: Slide11, notes: ["Vorsichtige Formulierung betonen.", "Keine Garantien — Mechanismen-konsistent."] },
  { id: "journal", title: "Dankbarkeit & Journal", Component: Slide12, notes: ["Nicht Wellness, sondern Aufmerksamkeitslenkung.", "Sequenz Fehler → Lernen vorlesen."] },
  { id: "coach", title: "Coach-Dashboard", Component: Slide13, notes: ["Datenschutz früh ansprechen.", "Verständnis statt Kontrolle."] },
  { id: "relevanz", title: "Drei Ebenen", Component: Slide14, notes: ["Spieler, Coach, Verein nacheinander.", "Konkret bleiben."] },
  { id: "demo", title: "Demo-Sequenz", Component: Slide15, notes: ["Auf /demo verweisen.", "Storymodus, nicht Klickdemo."] },
  { id: "credibility", title: "Wissenschaftliche Glaubwürdigkeit", Component: Slide16, notes: ["Defensive vermeiden, Seriosität zeigen.", "Validierte Skalen erwähnen."] },
  { id: "closing", title: "Trainiere das System hinter Performance", Component: Slide17, notes: ["Pause vor der finalen Aussage.", "Layers sind geordnet — Bezug zum Anfang."] },
  { id: "cta", title: "Nächster Schritt", Component: Slide18, notes: ["Klare Optionen anbieten.", "Pilot als bevorzugten Einstieg nennen."] },
];
