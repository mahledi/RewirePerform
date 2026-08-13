import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import OrganizationAccess from "@/pages/OrganizationAccess";

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { functions: { invoke: vi.fn() } },
}));

const scrollIntoViewMock = vi.fn();

const renderInquiry = (entry = "/team-access") => render(
  <MemoryRouter initialEntries={[entry]}>
    <OrganizationAccess />
  </MemoryRouter>,
);

const fillCommonContact = () => {
  fireEvent.change(screen.getByLabelText("Name"), { target: { value: "Alex Beispiel" } });
  fireEvent.change(screen.getByLabelText("Funktion / Position"), { target: { value: "Sportliche Leitung" } });
  fireEvent.change(screen.getByLabelText(/E-Mail/), { target: { value: "alex@verein.de" } });
  fireEvent.change(screen.getByLabelText(/Organisation$/), { target: { value: "Sportverein Beispiel" } });
  fireEvent.change(screen.getByLabelText("Sportart(en)"), { target: { value: "Volleyball" } });
};

describe("team and organization access inquiry", () => {
  beforeEach(() => {
    scrollIntoViewMock.mockReset();
    Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
      configurable: true,
      value: scrollIntoViewMock,
    });
  });

  it("starts with two truthful paths instead of hiding acquisition inside support", () => {
    renderInquiry();

    expect(screen.getByRole("heading", { name: "Wie möchtet ihr RewirePerform einführen?" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Ein Team starten/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Verein oder Organisation einführen/ })).toBeInTheDocument();
    expect(screen.queryByText(/Support/)).not.toBeInTheDocument();
  });

  it("guides an organization through the full budget-free review journey", async () => {
    renderInquiry("/team-access?scope=organization");

    expect(screen.getByRole("heading", { name: "Mentales Training wird Teil eures Systems." })).toBeInTheDocument();
    expect(screen.getByText("Organisationsstart")).toBeInTheDocument();
    expect(screen.queryByText(/budget|umsatz|zahlungsfähigkeit/i)).not.toBeInTheDocument();

    fillCommonContact();
    fireEvent.click(screen.getByRole("button", { name: "Verein" }));
    fireEvent.click(screen.getByRole("button", { name: "Weiter" }));

    const secondStepHeading = screen.getByRole("heading", { name: "Welcher Start passt zu euch?" });
    await waitFor(() => expect(secondStepHeading).toHaveFocus());
    expect(scrollIntoViewMock).toHaveBeenLastCalledWith({ behavior: "auto", block: "start" });
    expect(screen.getByText(/keine Namen oder persönlichen Daten von Athleten/i)).toBeInTheDocument();

    const scopeSelect = screen.getByLabelText("Geplanter Umfang");
    expect(scopeSelect).toHaveClass("appearance-none");
    expect(scopeSelect.parentElement?.querySelector("svg")).toHaveClass("text-primary");

    fireEvent.click(screen.getByRole("button", { name: /mentale routinen im alltag verankern/i }));
    fireEvent.click(screen.getByRole("button", { name: "Persönliche Einführung" }));
    fireEvent.click(screen.getByRole("button", { name: "Weiter" }));

    expect(screen.getByRole("heading", { name: "Bereit für den nächsten Schritt." })).toBeInTheDocument();
    expect(screen.getByText("Sportverein Beispiel")).toBeInTheDocument();
    expect(screen.getByText("Mentale Routinen im Alltag verankern")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Datenschutz zur Anfrage ansehen" })).toBeEnabled();
    expect(screen.queryByText(/Teststand:/i)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Anfrage absenden" })).toBeDisabled();
  });

  it("keeps a single-team request to two focused steps and requires a team name", async () => {
    renderInquiry("/team-access?scope=single_team&source=ios");

    expect(screen.getByRole("heading", { name: "Bringt RewirePerform in euer Team." })).toBeInTheDocument();
    expect(screen.getByText("Teamstart")).toBeInTheDocument();
    expect(screen.getByText("Schritt 1 von 2")).toBeInTheDocument();

    fillCommonContact();
    fireEvent.change(screen.getByLabelText("Umfeld"), { target: { value: "local_club" } });
    expect(screen.getByRole("button", { name: "Weiter" })).toBeDisabled();
    fireEvent.change(screen.getByLabelText("Team / Altersklasse"), { target: { value: "U17" } });
    expect(screen.getByRole("button", { name: "Weiter" })).toBeEnabled();
    fireEvent.click(screen.getByRole("button", { name: "Weiter" }));

    expect(screen.getByText("Schritt 2 von 2")).toBeInTheDocument();
    expect(screen.queryByLabelText("Geplanter Umfang")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Anpassung an die Organisation" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Reporting und Auswertung" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /mentale routinen im alltag verankern/i }));
    fireEvent.click(screen.getByRole("button", { name: "Persönliche Einführung" }));
    expect(screen.getByText("U17 · Volleyball")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Anfrage absenden" })).toBeDisabled();
  });

  it("requires a phone number only when telephone is selected", () => {
    renderInquiry("/team-access?scope=organization");
    fillCommonContact();
    fireEvent.click(screen.getByRole("button", { name: "Verein" }));
    fireEvent.click(screen.getByRole("button", { name: "Telefon" }));

    expect(screen.getByRole("button", { name: "Weiter" })).toBeDisabled();
    fireEvent.change(screen.getByLabelText("Telefon"), { target: { value: "+49 212 123456" } });
    expect(screen.getByRole("button", { name: "Weiter" })).toBeEnabled();
  });
});
