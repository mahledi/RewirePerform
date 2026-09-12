import { Link } from "react-router-dom";
import { ArrowLeft, Mail, ShieldCheck } from "lucide-react";
import { BrandLockup } from "@/components/brand/BrandLogo";
import { SUPPORT_EMAIL, SUPPORT_MAILTO } from "@/config/contact";
import { usePublicLanguage } from "@/contexts/PublicLanguageContext";
import { PublicLanguageSwitch } from "@/components/public/PublicLanguageSwitch";

const Support = () => {
  const { tr } = usePublicLanguage();
  return (
    <main className="min-h-screen bg-background text-foreground px-6 py-10">
      <div className="max-w-3xl mx-auto">
        <div className="mb-10 flex items-center justify-between gap-4">
          <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-4 h-4" />
            {tr("Zurück", "Back")}
          </Link>
          <div className="flex items-center gap-3"><BrandLockup symbolSize={24} textClassName="hidden text-sm sm:inline" /><PublicLanguageSwitch /></div>
        </div>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <ShieldCheck className="w-5 h-5 text-primary" />
          </div>
          <p className="text-xs uppercase tracking-[0.2em] text-primary font-semibold">Support</p>
        </div>

        <h1 className="font-heading text-3xl md:text-4xl font-bold mb-4">RewirePerform Support</h1>
        <p className="text-muted-foreground mb-8">
          {tr("Hilfe für Athleten, Coaches und Teams.", "Help for athletes, coaches and teams.")}
        </p>

        <div className="grid gap-4">
          <section className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-center gap-3 mb-2">
              <Mail className="w-5 h-5 text-primary" />
              <h2 className="font-heading text-lg font-semibold">{tr("Kontakt", "Contact")}</h2>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              {tr("Bei Login-Problemen, fehlerhaften Einladungen, Datenschutzfragen oder technischem Feedback.", "For login issues, broken invitations, privacy questions or technical feedback.")}
            </p>
            <a
              href={SUPPORT_MAILTO}
              className="inline-flex px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium"
            >
              {SUPPORT_EMAIL}
            </a>
          </section>

          <section className="rounded-xl border border-border bg-card p-5">
            <h2 className="font-heading text-lg font-semibold mb-2">{tr("Hinweis zum Angebot", "About this service")}</h2>
            <p className="text-sm text-muted-foreground">
              {tr("RewirePerform ist ein mentales Performance- und Reflexionssystem für Sportler. Die App ist nicht als medizinisches Produkt gedacht, stellt keine Diagnosen und ersetzt keine medizinische oder psychotherapeutische Behandlung.", "RewirePerform is a mental performance and reflection system for athletes. The app is not intended as a medical product, does not provide diagnoses and does not replace medical or psychotherapeutic treatment.")}
            </p>
          </section>
        </div>
      </div>
    </main>
  );
};

export default Support;
