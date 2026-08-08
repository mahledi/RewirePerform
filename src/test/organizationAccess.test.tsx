import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import OrganizationAccess from "@/pages/OrganizationAccess";

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { functions: { invoke: vi.fn() } },
}));

describe("organization access inquiry", () => {
  it("guides any sports organization through a focused, budget-free review journey", () => {
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

    expect(screen.getByRole("heading", { name: "Welcher Start passt zu euch?" })).toBeInTheDocument();
    expect(screen.getByText(/keine Namen oder persönlichen Daten von Athleten/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /mentale routinen im alltag verankern/i }));
    fireEvent.click(screen.getByRole("button", { name: "Persönliche Einführung" }));
    fireEvent.click(screen.getByRole("button", { name: /weiter/i }));

    expect(screen.getByRole("heading", { name: "Bereit für den nächsten Schritt." })).toBeInTheDocument();
    expect(screen.getByText("Sportverein Beispiel")).toBeInTheDocument();
    expect(screen.getByText("Mentale Routinen im Alltag verankern")).toBeInTheDocument();
    expect(screen.getByText("Persönliche Einführung")).toBeInTheDocument();
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
