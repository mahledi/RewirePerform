import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, LayoutGroup, motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Maximize2, Minimize2, NotebookPen, ScrollText, X } from "lucide-react";
import { SLIDES } from "@/presentation/slides";
import { BrandLockup } from "@/components/brand/BrandLogo";

const Presentation = () => {
  const [index, setIndex] = useState(0);
  const [showNotes, setShowNotes] = useState(false);
  const [scrollMode, setScrollMode] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const total = SLIDES.length;
  const go = useCallback((next: number) => setIndex(Math.max(0, Math.min(total - 1, next))), [total]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (scrollMode) return;
      if (e.key === "ArrowRight" || e.key === " " || e.key === "PageDown") { e.preventDefault(); go(index + 1); }
      else if (e.key === "ArrowLeft" || e.key === "PageUp") { e.preventDefault(); go(index - 1); }
      else if (e.key === "Home") go(0);
      else if (e.key === "End") go(total - 1);
      else if (e.key.toLowerCase() === "n") setShowNotes((s) => !s);
      else if (e.key.toLowerCase() === "s") setScrollMode((s) => !s);
      else if (e.key.toLowerCase() === "f") toggleFs();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [index, total, scrollMode, go]);

  useEffect(() => {
    const onFs = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);

  const toggleFs = () => {
    if (!document.fullscreenElement) document.documentElement.requestFullscreen?.();
    else document.exitFullscreen?.();
  };

  const current = SLIDES[index];

  return (
    <div className="relative min-h-screen overflow-hidden bg-background text-foreground">
      {/* Background atmosphere */}
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,hsl(var(--primary)/0.08),transparent_45%),radial-gradient(circle_at_80%_70%,hsl(var(--primary)/0.06),transparent_50%)]" />
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              "linear-gradient(hsl(var(--foreground)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--foreground)) 1px, transparent 1px)",
            backgroundSize: "64px 64px",
          }}
        />
      </div>

      {/* Top bar */}
      <header className="fixed inset-x-0 top-0 z-30 flex items-center justify-between px-6 py-4 text-xs">
        <div className="flex items-center gap-3">
          <BrandLockup symbolSize={22} textClassName="text-xs font-semibold" />
          <span className="text-muted-foreground">· Coach Pitch</span>
        </div>
        <div className="flex items-center gap-2">
          <IconBtn onClick={() => setScrollMode((s) => !s)} label={scrollMode ? "Slide-Modus" : "Scroll-Modus"}>
            <ScrollText className="h-4 w-4" />
          </IconBtn>
          <IconBtn onClick={() => setShowNotes((s) => !s)} label="Notes (N)">
            <NotebookPen className="h-4 w-4" />
          </IconBtn>
          <IconBtn onClick={toggleFs} label="Fullscreen (F)">
            {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </IconBtn>
        </div>
      </header>

      {/* Slides */}
      {scrollMode ? (
        <main className="space-y-24 py-20">
          <LayoutGroup>
            {SLIDES.map((s, i) => (
              <section key={s.id} className="min-h-[80vh]">
                <s.Component />
                <p className="mt-4 text-center text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
                  {String(i + 1).padStart(2, "0")} / {String(total).padStart(2, "0")} · {s.title}
                </p>
              </section>
            ))}
          </LayoutGroup>
        </main>
      ) : (
        <main className="relative flex min-h-screen items-center justify-center">
          <LayoutGroup>
            <AnimatePresence mode="wait">
              <motion.div
                key={current.id}
                initial={{ opacity: 0, scale: 0.985 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.01 }}
                transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                className="h-screen w-full"
              >
                <current.Component />
              </motion.div>
            </AnimatePresence>
          </LayoutGroup>

          {/* Bottom controls */}
          <div className="pointer-events-none fixed inset-x-0 bottom-0 z-20 flex items-end justify-between px-6 pb-6">
            <div className="pointer-events-auto flex items-center gap-3">
              <IconBtn onClick={() => go(index - 1)} label="Zurück" disabled={index === 0}>
                <ChevronLeft className="h-4 w-4" />
              </IconBtn>
              <IconBtn onClick={() => go(index + 1)} label="Weiter" disabled={index === total - 1}>
                <ChevronRight className="h-4 w-4" />
              </IconBtn>
            </div>
            <div className="pointer-events-auto flex items-center gap-3 text-[11px] text-muted-foreground">
              <span className="font-mono">
                {String(index + 1).padStart(2, "0")} / {String(total).padStart(2, "0")}
              </span>
              <div className="h-px w-40 bg-border/60">
                <div className="h-full bg-primary transition-all" style={{ width: `${((index + 1) / total) * 100}%` }} />
              </div>
              <span className="hidden tracking-[0.2em] uppercase md:inline">{current.title}</span>
            </div>
          </div>

          {/* Slide jumper (dots) */}
          <div className="pointer-events-none fixed left-1/2 top-12 z-20 flex -translate-x-1/2 gap-1">
            {SLIDES.map((s, i) => (
              <button
                key={s.id}
                aria-label={`Slide ${i + 1}`}
                onClick={() => go(i)}
                className={`pointer-events-auto h-1 rounded-full transition-all ${i === index ? "w-6 bg-primary" : "w-3 bg-border hover:bg-muted-foreground/60"}`}
              />
            ))}
          </div>
        </main>
      )}

      {/* Speaker notes overlay */}
      <AnimatePresence>
        {showNotes && (
          <motion.aside
            initial={{ x: 360, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 360, opacity: 0 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="fixed right-0 top-0 z-40 flex h-full w-[340px] flex-col border-l border-border/60 bg-card/95 p-6 backdrop-blur-xl"
          >
            <div className="flex items-center justify-between">
              <p className="text-xs uppercase tracking-[0.3em] text-primary">Speaker Notes</p>
              <button onClick={() => setShowNotes(false)} aria-label="Schließen">
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>
            <p className="mt-6 text-sm font-semibold">{current.title}</p>
            <p className="mt-1 text-[11px] text-muted-foreground">
              Slide {index + 1} / {total}
            </p>
            <ul className="mt-6 space-y-3">
              {current.notes.map((n, i) => (
                <li key={i} className="flex gap-3 text-sm leading-relaxed text-muted-foreground">
                  <span className="mt-2 h-1 w-3 shrink-0 bg-primary/60" />
                  {n}
                </li>
              ))}
            </ul>
            <p className="mt-auto pt-6 text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
              ← → navigieren · N Notes · F Fullscreen · S Scroll
            </p>
          </motion.aside>
        )}
      </AnimatePresence>
    </div>
  );
};

const IconBtn = ({
  children, onClick, label, disabled,
}: { children: React.ReactNode; onClick: () => void; label: string; disabled?: boolean }) => (
  <button
    onClick={onClick}
    aria-label={label}
    title={label}
    disabled={disabled}
    className="flex h-9 w-9 items-center justify-center rounded-full border border-border/60 bg-card/70 text-muted-foreground backdrop-blur transition-colors hover:bg-secondary hover:text-foreground disabled:opacity-40"
  >
    {children}
  </button>
);

export default Presentation;
