import { useState } from "react";
import { Monitor, ShieldCheck, Smartphone } from "lucide-react";
import { MinorConsentScreen } from "@/components/minor-consent/MinorConsentScreens";
import {
  MINOR_GUARDIAN_DRAFT,
  minorGuardianPreviewStates,
  type MinorGuardianPreviewState,
} from "@/content/minorGuardianDraft";
import { cn } from "@/lib/utils";

type PreviewWidth = "mobile" | "desktop";

const MinorConsentPreview = () => {
  const [state, setState] = useState<MinorGuardianPreviewState>("age-check");
  const [previewWidth, setPreviewWidth] = useState<PreviewWidth>("desktop");

  return (
    <main className="min-h-dvh bg-background text-foreground">
      <header className="sticky top-0 z-20 border-b border-border/70 bg-background/95 px-4 py-3 backdrop-blur-xl sm:px-6">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-md border border-primary/25 bg-primary/10 text-primary">
              <ShieldCheck className="h-4 w-4" aria-hidden="true" />
            </span>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-sm font-semibold sm:text-base">Minderjährigen- und Elternflow</h1>
                <span className="rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">Interne Review-Vorschau</span>
              </div>
              <p className="text-xs text-muted-foreground">Keine Speicherung, kein Versand, keine Produktfreischaltung</p>
            </div>
          </div>

          <div className="flex min-w-0 flex-1 flex-wrap items-center justify-end gap-3 sm:flex-none">
            <label htmlFor="minor-preview-state" className="sr-only">Vorschauzustand</label>
            <select
              id="minor-preview-state"
              value={state}
              onChange={(event) => setState(event.target.value as MinorGuardianPreviewState)}
              className="h-10 min-w-0 flex-1 rounded-md border border-border bg-secondary px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary sm:min-w-64 sm:flex-none"
            >
              {minorGuardianPreviewStates.map((item) => (
                <option key={item.id} value={item.id}>{item.label} · {item.audience}</option>
              ))}
            </select>
            <div className="flex h-10 items-center rounded-md border border-border bg-secondary p-1" aria-label="Vorschaugröße">
              <button
                type="button"
                aria-label="Desktop-Vorschau"
                title="Desktop-Vorschau"
                onClick={() => setPreviewWidth("desktop")}
                className={cn("flex h-8 w-9 items-center justify-center rounded-sm", previewWidth === "desktop" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}
              >
                <Monitor className="h-4 w-4" aria-hidden="true" />
              </button>
              <button
                type="button"
                aria-label="Mobile Vorschau"
                title="Mobile Vorschau"
                onClick={() => setPreviewWidth("mobile")}
                className={cn("flex h-8 w-9 items-center justify-center rounded-sm", previewWidth === "mobile" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}
              >
                <Smartphone className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <section className="mx-auto flex max-w-7xl justify-center px-3 py-5 sm:px-6 sm:py-8">
        <div
          className={cn(
            "w-full overflow-hidden rounded-md border border-border bg-card shadow-card transition-[max-width]",
            previewWidth === "mobile" ? "max-w-[390px]" : "max-w-[920px]",
          )}
        >
          <MinorConsentScreen state={state} onNavigate={setState} />
        </div>
      </section>

      <footer className="mx-auto max-w-7xl px-4 pb-8 text-center text-xs text-muted-foreground">
        Interne Textversion {MINOR_GUARDIAN_DRAFT.policyVersion}. Aktivierung bleibt bis zur dokumentierten Fachfreigabe gesperrt.
      </footer>
    </main>
  );
};

export default MinorConsentPreview;
