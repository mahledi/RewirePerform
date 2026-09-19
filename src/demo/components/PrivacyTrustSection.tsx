import { CheckCircle2, XCircle } from "lucide-react";
import { coachDoesNotSee, coachSees } from "../data/demoData";

export const PrivacyTrustSection = () => (
  <section id="privacy-demo" className="py-20 scroll-mt-24">
    <div className="container mx-auto px-6">
      <div className="mx-auto max-w-3xl text-center">
        <p className="mb-4 text-sm font-semibold uppercase tracking-[0.25em] text-primary">Datenschutz im Produkt</p>
        <h2 className="font-heading text-3xl font-bold md:text-5xl">Was Coaches sehen — und was bewusst nicht.</h2>
        <p className="mt-5 text-lg leading-relaxed text-muted-foreground">
          RewirePerform soll Coaches handlungsfähig machen, ohne private Reflexion der Athleten zu verletzen.
          Diese Grenze ist Teil des Produkts.
        </p>
      </div>

      <div className="mt-10 grid gap-6 lg:grid-cols-2">
        <div className="rounded-3xl border border-primary/25 bg-primary/10 p-6">
          <h3 className="font-heading text-2xl font-bold">Coaches sehen</h3>
          <div className="mt-5 space-y-3">
            {coachSees.map((item) => (
              <div key={item} className="flex items-start gap-3 rounded-2xl border border-primary/20 bg-background/60 p-4">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                <span className="text-sm">{item}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-3xl border border-border bg-card/70 p-6">
          <h3 className="font-heading text-2xl font-bold">Coaches sehen nicht</h3>
          <div className="mt-5 space-y-3">
            {coachDoesNotSee.map((item) => (
              <div key={item} className="flex items-start gap-3 rounded-2xl border border-border bg-background/60 p-4">
                <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  </section>
);

