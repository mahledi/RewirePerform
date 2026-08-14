import { fireEvent, render, screen } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { beforeAll, describe, expect, it, vi } from "vitest";
import WebsiteGoldenPagePreview from "@/pages/WebsiteGoldenPagePreview";

describe("WebsiteGoldenPagePreview", () => {
  beforeAll(() => {
    class IntersectionObserverMock {
      observe = vi.fn();
      unobserve = vi.fn();
      disconnect = vi.fn();
    }
    vi.stubGlobal("IntersectionObserver", IntersectionObserverMock);
  });

  it("keeps the Golden Page behind the existing development evidence gate", () => {
    const appSource = readFileSync(resolve(process.cwd(), "src/App.tsx"), "utf8");

    expect(appSource).toContain("WebsiteGoldenPagePreview = evidencePreviewEnabled");
    expect(appSource).toContain('/internal/website-golden-page-preview');
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
    expect(source).toContain('initialScreen="invitation"');
    expect(source).toContain("APP_STORE_PRODUCT_URL");
    expect(source).not.toMatch(/Werkzeug|wird im Pilot geprüft|Eine Frage nach der anderen/);
    expect(source).not.toMatch(/Stabilisierung von Lernspuren|Zentrale mentale Prinzipien tauchen gezielt erneut auf/);
    expect(source).not.toContain("Jeder Moment hat eine klare Aufgabe.");
    expect(source).not.toContain('border-t border-white/[0.055]');
    expect(source).toContain('<span className="text-primary">die nächste Handlung.</span>');
    expect(source).toContain('<span className="text-primary">Dann prüfen.</span>');
    expect(source).toContain('<span className="text-primary">mental ausführen.</span>');
    expect(source).not.toMatch(/SystemCoreVisual|LearningNetworkVisual|EvidenceBar/);
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
    expect(screen.getAllByRole("link", { name: "Anmelden" })[0]).toHaveAttribute("href", "/auth");
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
});
