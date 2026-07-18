import { useMemo, useState } from "react";
import { Monitor, Smartphone } from "lucide-react";
import { BrandSymbol } from "@/components/brand/BrandLogo";
import confirmationTemplate from "../../supabase/templates/auth/confirmation.html?raw";
import recoveryTemplate from "../../supabase/templates/auth/recovery.html?raw";
import passwordChangedTemplate from "../../supabase/templates/auth/password_changed_notification.html?raw";

const templates = {
  confirmation: { label: "E-Mail bestätigen", html: confirmationTemplate },
  recovery: { label: "Passwort zurücksetzen", html: recoveryTemplate },
  passwordChanged: { label: "Passwort geändert", html: passwordChangedTemplate },
} as const;

type TemplateId = keyof typeof templates;
type PreviewWidth = "mobile" | "desktop";

const hydratePreview = (html: string) => html
  .replaceAll("{{ .SiteURL }}", window.location.origin)
  .replaceAll("{{ .ConfirmationURL }}", `${window.location.origin}/auth?preview=1`)
  .replaceAll("{{ .Token }}", "482917");

const EmailPreview = () => {
  const [templateId, setTemplateId] = useState<TemplateId>("confirmation");
  const [previewWidth, setPreviewWidth] = useState<PreviewWidth>("desktop");
  const previewHtml = useMemo(() => hydratePreview(templates[templateId].html), [templateId]);

  return (
    <main className="min-h-dvh bg-background text-foreground">
      <header className="border-b border-border/60 bg-background/90 px-4 py-4 backdrop-blur-xl sm:px-6">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-md border border-primary/25 bg-primary/10 text-primary">
              <BrandSymbol size={28} />
            </span>
            <div>
              <p className="text-xs font-medium text-muted-foreground">RewirePerform · Interne Vorschau</p>
              <h1 className="text-base font-semibold">Auth-E-Mails</h1>
            </div>
          </div>

          <div className="flex min-w-0 flex-wrap items-center gap-3">
            <label htmlFor="email-template" className="sr-only">E-Mail-Typ</label>
            <select
              id="email-template"
              value={templateId}
              onChange={(event) => setTemplateId(event.target.value as TemplateId)}
              className="h-10 min-w-0 rounded-md border border-border bg-secondary px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary sm:min-w-56"
            >
              {Object.entries(templates).map(([id, template]) => (
                <option key={id} value={id}>{template.label}</option>
              ))}
            </select>
            <div className="flex h-10 items-center rounded-md border border-border bg-secondary p-1" aria-label="Vorschaugröße">
              <button
                type="button"
                aria-label="Desktop-Vorschau"
                title="Desktop-Vorschau"
                onClick={() => setPreviewWidth("desktop")}
                className={`flex h-8 w-9 items-center justify-center rounded-sm ${previewWidth === "desktop" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
              >
                <Monitor className="h-4 w-4" aria-hidden="true" />
              </button>
              <button
                type="button"
                aria-label="Mobile Vorschau"
                title="Mobile Vorschau"
                onClick={() => setPreviewWidth("mobile")}
                className={`flex h-8 w-9 items-center justify-center rounded-sm ${previewWidth === "mobile" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
              >
                <Smartphone className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <section className="mx-auto flex max-w-6xl justify-center px-3 py-5 sm:px-6 sm:py-8">
        <div className={`w-full overflow-hidden rounded-md border border-border bg-white shadow-card transition-[max-width] ${previewWidth === "mobile" ? "max-w-[390px]" : "max-w-[720px]"}`}>
          <iframe
            key={`${templateId}-${previewWidth}`}
            title={`${templates[templateId].label} Vorschau`}
            srcDoc={previewHtml}
            sandbox=""
            className="h-[780px] w-full border-0 bg-white"
          />
        </div>
      </section>
    </main>
  );
};

export default EmailPreview;
