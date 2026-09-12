import { fireEvent, render, screen } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { beforeAll, describe, expect, it, vi } from "vitest";
import WebsiteGoldenPagePreview from "@/pages/WebsiteGoldenPagePreview";
import { MemoryRouter } from "react-router-dom";
import { PublicLanguageProvider } from "@/contexts/PublicLanguageContext";

describe("WebsiteGoldenPagePreview", () => {
  beforeAll(() => {
    class IntersectionObserverMock {
      observe = vi.fn();
      unobserve = vi.fn();
      disconnect = vi.fn();
    }
    vi.stubGlobal("IntersectionObserver", IntersectionObserverMock);
  });

  it("keeps the separate internal preview route behind the existing development evidence gate", () => {
    const appSource = readFileSync(resolve(process.cwd(), "src/App.tsx"), "utf8");

    expect(appSource).toContain("WebsiteGoldenPagePreview = evidencePreviewEnabled");
    expect(appSource).toContain('/internal/website-golden-page-preview');
  });

  it("serves the Golden Page as the public web home without changing native startup routing", () => {
    const indexSource = readFileSync(resolve(process.cwd(), "src/pages/Index.tsx"), "utf8");

    expect(indexSource).toContain('import WebsiteGoldenPagePreview from "@/pages/WebsiteGoldenPagePreview"');
    expect(indexSource).toContain("return <WebsiteGoldenPagePreview />");
    expect(indexSource).toContain('navigate("/start", { replace: true })');
  });

  it("stays presentational and does not introduce auth, storage, or network side effects", () => {
    const source = readFileSync(resolve(process.cwd(), "src/pages/WebsiteGoldenPagePreview.tsx"), "utf8");

    expect(source).not.toMatch(/useNavigate|supabase|localStorage|sessionStorage|fetch\s*\(/);
    expect(source).toMatch(/AthleteFirstRunSceneVisual|CoachFirstRunSceneVisual/);
    expect(source).toContain("Nicht 56 einzelne Tipps.");
    expect(source).toContain("Mentale Fähigkeiten sind trainierbar.");
    expect(source).toContain("Sportpsychologie, Lernforschung und Neurowissenschaft");
    expect(source).toContain("Ein Lernziel in drei Tagesformen");
    expect(source).toContain("Erst selbst erinnern.");
    expect(source).toContain("Dann prüfen.");
    expect(source).not.toContain("FeedbackQuestionnairePreview");
    expect(source).not.toContain("Freies Feedback");
    expect(source).not.toContain("Kurzes Feedback erscheint zu festgelegten Zeitpunkten");
    expect(source).toContain('AthleteShot sceneId="development"');
    expect(source).toContain("APP_STORE_PRODUCT_URL");
    expect(source).not.toMatch(/Werkzeug|wird im Pilot geprüft|Eine Frage nach der anderen/);
    expect(source).not.toMatch(/Stabilisierung von Lernspuren|Zentrale mentale Prinzipien tauchen gezielt erneut auf/);
    expect(source).not.toContain("Jeder Moment hat eine klare Aufgabe.");
    expect(source).not.toContain('border-t border-white/[0.055]');
    expect(source).toContain('tr("die nächste Handlung.", "the next action.")');
    expect(source).toContain('tr("Dann prüfen.", "Then check.")');
    expect(source).toContain('tr("mental ausführen.", "rehearse it mentally.")');
    expect(source).not.toContain('tr("Das System", "The system")');
    expect(source).toContain('<PublicLanguageSwitch />');
    expect(source).not.toContain("Interne Golden-Page-Vorschau");
    expect(source).not.toContain("Interne Vorschau");
    expect(source).toContain("Interaktive Produktvorschau mit gekennzeichneten Beispieldaten.");
    expect(source).not.toMatch(/SystemCoreVisual|LearningNetworkVisual|EvidenceBar/);
    expect(source).toContain("<FirstRunExperiencePreview fitCameraToViewport");
    expect(source).toContain("<CoachFirstRunExperience fitCameraToViewport");
  });

  it("reuses the real athlete and coach introductions from the role cards", async () => {
    render(<WebsiteGoldenPagePreview />);

    expect(screen.getByRole("heading", { name: "Trainiere das System hinter deiner Performance." })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Nicht 56 einzelne Tipps. Ein Lernweg." })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Mentale Fähigkeiten sind trainierbar. Weil dein Gehirn lernt." })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Jeder Moment hat eine klare Aufgabe." })).not.toBeInTheDocument();
    expect(screen.getByLabelText("Echter Daily Flow")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Wettkampf" }));
    expect(await screen.findByText("Im Wettkampf wird es kürzer.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Ruhetag" }));
    expect(await screen.findByText("Am Ruhetag wird die Reaktion visualisiert.")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /^Als Athlet erleben/ }));
    expect(screen.getByTestId("first-run-stage")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Einführung schließen" }));

    fireEvent.click(screen.getByRole("button", { name: /^Als Coach erleben/ }));
    expect(screen.getByTestId("coach-first-run-stage")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Coach-Einführung schließen" }));

    expect(screen.getByRole("heading", { name: "Der Überblick ist klar. Jetzt wird das Produkt persönlich." })).toBeInTheDocument();
    const loginCta = screen.getByTestId("public-login-cta");
    expect(loginCta).toHaveAttribute("href", "/auth?mode=login");
    expect(loginCta).toHaveTextContent("Bereits registriert?Anmelden");
    expect(loginCta).toHaveClass("inline-flex", "shrink-0", "border-primary/35", "bg-primary/[0.10]");
    expect(loginCta).not.toHaveClass("hidden");
    expect(loginCta.closest("header")).toBeNull();
    expect(document.querySelector('header a[href="/auth?mode=login"]')).toBeNull();
    expect(screen.getAllByRole("link", { name: /Als Athlet starten|Jetzt registrieren/ })[0]).toHaveAttribute("href", "/auth?mode=signup&intent=solo");
    expect(screen.getByRole("link", { name: /Zugang anfragen/ })).toHaveAttribute("href", "/team-access");
    expect(screen.getAllByRole("link", { name: "RewirePerform im App Store laden" })[0]).toHaveAttribute(
      "href",
      "https://apps.apple.com/de/app/rewireperform/id6795463263",
    );
    expect(screen.getByRole("link", { name: "Datenschutz" })).toHaveAttribute("href", "/privacy");
    expect(screen.getByRole("link", { name: "Impressum" })).toHaveAttribute("href", "/imprint");
    expect(screen.getByRole("link", { name: "Support" })).toHaveAttribute("href", "/support");
  });

  it("switches the public website and both app flights to English", () => {
    window.localStorage.removeItem("rewireperform.public-language");
    const view = render(
      <MemoryRouter>
        <PublicLanguageProvider><WebsiteGoldenPagePreview /></PublicLanguageProvider>
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Choose English" }));
    expect(document.documentElement.lang).toBe("en");
    expect(screen.getByRole("heading", { level: 1, name: "Train the system behind your performance." })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Explore the system" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Das System" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Explore as an athlete/ }));
    expect(screen.getByRole("heading", { name: "See what is coming up right away." })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Continue/ })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Close introduction" }));

    fireEvent.click(screen.getByRole("button", { name: /Explore as a coach/ }));
    expect(screen.getByRole("heading", { name: "Your team. Clear in one place." })).toBeInTheDocument();
    view.unmount();
    window.localStorage.removeItem("rewireperform.public-language");
  });

  it("keeps every athlete and coach preview scene free of visible German copy in English", () => {
    const germanCopy = /[ÄÖÜäöüß]|\b(?:Heute|Dein|Deine|Schritt|Weiter|Zurück|Anmelden|Spieler|Athleten|Trainer|Ruhetag|Trainingstag|Wettkampf|Einladung|Reflexion|Datenschutz|Stimmung|Fortschritt|Gemeinsam|Vorbereitung)\b/i;
    window.localStorage.removeItem("rewireperform.public-language");
    const view = render(
      <MemoryRouter>
        <PublicLanguageProvider><WebsiteGoldenPagePreview /></PublicLanguageProvider>
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Choose English" }));
    expect(document.body.textContent).not.toMatch(germanCopy);

    fireEvent.click(screen.getByRole("button", { name: /Explore as an athlete/ }));
    for (let scene = 0; scene < 10; scene += 1) {
      expect(screen.getByTestId("first-run-stage").textContent).not.toMatch(germanCopy);
      if (scene < 9) fireEvent.click(screen.getByRole("button", { name: /Continue/ }));
    }
    fireEvent.click(screen.getByRole("button", { name: "Close introduction" }));

    fireEvent.click(screen.getByRole("button", { name: /Explore as a coach/ }));
    for (let scene = 0; scene < 10; scene += 1) {
      expect(screen.getByTestId("coach-first-run-stage").textContent).not.toMatch(germanCopy);
      if (scene < 9) fireEvent.click(screen.getByRole("button", { name: /Continue/ }));
    }

    view.unmount();
    window.localStorage.removeItem("rewireperform.public-language");
  });
});
