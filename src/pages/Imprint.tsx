import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, AtSign, MapPin, Scale } from "lucide-react";
import { SUPPORT_EMAIL, SUPPORT_MAILTO } from "@/config/contact";

const Imprint = () => {
  const navigate = useNavigate();
  const goBack = () => window.history.length > 1 ? navigate(-1) : navigate("/", { replace: true });

  return (
    <main className="min-h-screen bg-background px-6 py-10 text-foreground">
      <div className="mx-auto max-w-3xl">
        <button type="button" onClick={goBack} className="mb-10 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Zurück
        </button>

        <div className="mb-4 flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary"><Scale className="h-5 w-5" /></span>
          <p className="text-xs font-semibold uppercase text-primary">Anbieterkennzeichnung</p>
        </div>
        <h1 className="font-heading text-3xl font-bold md:text-4xl">Impressum</h1>
        <p className="mt-3 text-sm text-muted-foreground">Angaben gemäß § 5 Digitale-Dienste-Gesetz (DDG)</p>

        <div className="mt-9 space-y-7 text-sm leading-7 text-muted-foreground">
          <section>
            <h2 className="font-heading text-lg font-semibold text-foreground">Diensteanbieter und Verantwortlicher</h2>
            <p className="mt-2 text-foreground">Mahle Herzog</p>
            <p>handelnd unter RewirePerform</p>
          </section>

          <section className="grid gap-4 sm:grid-cols-2">
            <div className="flex gap-3">
              <MapPin className="mt-1 h-4 w-4 shrink-0 text-primary" />
              <address className="not-italic">Wiefeldick 16<br />42699 Solingen<br />Deutschland</address>
            </div>
            <div className="flex gap-3">
              <AtSign className="mt-1 h-4 w-4 shrink-0 text-primary" />
              <div><p>E-Mail</p><a className="text-primary hover:underline" href={SUPPORT_MAILTO}>{SUPPORT_EMAIL}</a></div>
            </div>
          </section>

          <section>
            <h2 className="font-heading text-lg font-semibold text-foreground">Inhaltlich verantwortlich</h2>
            <p className="mt-2">Mahle Herzog, Anschrift wie oben.</p>
          </section>

          <section>
            <h2 className="font-heading text-lg font-semibold text-foreground">Hinweis zum Angebot</h2>
            <p className="mt-2">RewirePerform ist ein sportliches Performance- und Reflexionssystem. Es ist kein Medizinprodukt, stellt keine Diagnose und ersetzt keine medizinische oder psychotherapeutische Behandlung.</p>
          </section>

          <nav aria-label="Weitere rechtliche Informationen" className="flex flex-wrap gap-4 border-t border-border pt-5 text-xs">
            <Link to="/privacy" className="text-primary hover:underline">Datenschutz</Link>
            <Link to="/support" className="text-primary hover:underline">Support</Link>
          </nav>
        </div>
      </div>
    </main>
  );
};

export default Imprint;
