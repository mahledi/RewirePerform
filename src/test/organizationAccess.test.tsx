import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import OrganizationAccess from "@/pages/OrganizationAccess";

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { functions: { invoke: vi.fn() } },
}));

const scrollIntoViewMock = vi.fn();

describe("organization access inquiry", () => {
  beforeEach(() => {
    scrollIntoViewMock.mockReset();
    Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
      configurable: true,
      value: scrollIntoViewMock,
    });
  });

  it("guides any sports organization through a focused, budget-free review journey", async () => {
    render(<MemoryRouter><OrganizationAccess /></MemoryRouter>);

    expect(screen.getByRole("heading", { name: "Mentales Training wird Teil eures Systems." })).toBeInTheDocument();
    expect(screen.getByText("Jede Freigabe wird persönlich geprüft.", { exact: false })).toBeInTheDocument();
    expect(screen.queryByText(/budget|umsatz|zahlungsfähigkeit/i)).not.toBeInTheDocument();

    const next = screen.getByRole("button", { name: /weiter/i });
    expect(next).toBeDisabled();

    fireEvent.change(screen.getByLabelText("Name"), { target: { value: "Alex Beispiel" } });
    fireEvent.change(screen.getByLabelText("Funktion / Position"), { target: { value: "Sportliche Leitung" } });
    fireEvent.change(screen.getByLabelText("Geschäftliche E-Mail"), { target: { value: "alex@verein.de" } });
    fireEvent.change(screen.getByLabelText("Organisation"), { target: { value: "Sportverein Beispiel" } });
    fireEvent.click(screen.getByRole("button", { name: "Verein" }));
    fireEvent.change(screen.getByLabelText("Sportart(en)"), { target: { value: "Volleyball" } });
    expect(next).toBeEnabled();
    fireEvent.click(next);

    const secondStepHeading = screen.getByRole("heading", { name: "Welcher Start passt zu euch?" });
    expect(secondStepHeading).toBeInTheDocument();
    await waitFor(() => expect(secondStepHeading).toHaveFocus());
    expect(scrollIntoViewMock).toHaveBeenLastCalledWith({ behavior: "auto", block: "start" });
    expect(screen.getByText(/keine Namen oder persönlichen Daten von Athleten/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /mentale routinen im alltag verankern/i }));
    fireEvent.click(screen.getByRole("button", { name: "Persönliche Einführung" }));
    fireEvent.click(screen.getByRole("button", { name: /weiter/i }));

    expect(screen.getByRole("heading", { name: "Bereit für den nächsten Schritt." })).toBeInTheDocument();
    expect(screen.getByText("Sportverein Beispiel")).toBeInTheDocument();
    expect(screen.getByText("Mentale Routinen im Alltag verankern")).toBeInTheDocument();
    expect(screen.getByText("Persönliche Einführung")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Datenschutz zur Anfrage ansehen" }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Datenschutz bei eurer Anfrage" })).toBeInTheDocument();
    expect(screen.getByText(/bitte trage keine namen oder persönlichen daten von athleten ein/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Verstanden" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    expect(screen.getByText(/teststand: die sichere übermittlung ist noch nicht aktiviert/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Anfrage absenden" })).toBeDisabled();
  });

  it("requires a phone number only when telephone is selected", () => {
    render(<MemoryRouter><OrganizationAccess /></MemoryRouter>);

    fireEvent.change(screen.getByLabelText("Name"), { target: { value: "Alex Beispiel" } });
    fireEvent.change(screen.getByLabelText("Funktion / Position"), { target: { value: "Vorstand" } });
    fireEvent.change(screen.getByLabelText("Geschäftliche E-Mail"), { target: { value: "alex@verein.de" } });
    fireEvent.change(screen.getByLabelText("Organisation"), { target: { value: "Sportverein Beispiel" } });
    fireEvent.click(screen.getByRole("button", { name: "Verein" }));
    fireEvent.change(screen.getByLabelText("Sportart(en)"), { target: { value: "Schwimmen" } });
    fireEvent.click(screen.getByRole("button", { name: "Telefon" }));

    expect(screen.getByRole("button", { name: /weiter/i })).toBeDisabled();
    fireEvent.change(screen.getByLabelText("Telefon"), { target: { value: "+49 212 123456" } });
    expect(screen.getByRole("button", { name: /weiter/i })).toBeEnabled();
  });
});
