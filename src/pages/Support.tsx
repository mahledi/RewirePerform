import { Link } from "react-router-dom";
import { ArrowLeft, Mail, ShieldCheck } from "lucide-react";
import { BrandLockup } from "@/components/brand/BrandLogo";
import { SUPPORT_EMAIL, SUPPORT_MAILTO } from "@/config/contact";

const Support = () => {
  return (
    <main className="min-h-screen bg-background text-foreground px-6 py-10">
      <div className="max-w-3xl mx-auto">
        <div className="mb-10 flex items-center justify-between gap-4">
          <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-4 h-4" />
            Zurück
          </Link>
          <BrandLockup symbolSize={24} textClassName="hidden text-sm sm:inline" />
        </div>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <ShieldCheck className="w-5 h-5 text-primary" />
          </div>
          <p className="text-xs uppercase tracking-[0.2em] text-primary font-semibold">Support</p>
        </div>

        <h1 className="font-heading text-3xl md:text-4xl font-bold mb-4">RewirePerform Support</h1>
        <p className="text-muted-foreground mb-8">
          Hilfe für Athleten, Coaches, Teams und App-Store-Review.
        </p>

        <div className="grid gap-4">
          <section className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-center gap-3 mb-2">
              <Mail className="w-5 h-5 text-primary" />
              <h2 className="font-heading text-lg font-semibold">Kontakt</h2>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Bei Login-Problemen, Teamzugang, Datenschutzfragen oder technischem Feedback.
            </p>
            <a
              href={SUPPORT_MAILTO}
              className="inline-flex px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium"
            >
              {SUPPORT_EMAIL}
            </a>
          </section>

          <section className="rounded-xl border border-border bg-card p-5">
            <h2 className="font-heading text-lg font-semibold mb-2">Hinweis für Apple Review</h2>
            <p className="text-sm text-muted-foreground">
              RewirePerform ist ein mentales Performance- und Reflexionssystem für Sportler. Die App ist nicht als
              medizinisches Produkt gedacht und stellt keine Diagnosen. Demo-Zugänge werden in den Review Notes
              bereitgestellt.
            </p>
          </section>
        </div>
      </div>
    </main>
  );
};

export default Support;
