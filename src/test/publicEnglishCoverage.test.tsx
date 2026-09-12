import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { PublicLanguageProvider } from "@/contexts/PublicLanguageContext";
import Privacy from "@/pages/PublicPrivacyPage";
import OrganizationAccess from "@/pages/OrganizationAccess";
import AccountDeletion from "@/pages/AccountDeletion";
import TeamInvite from "@/pages/TeamInvite";

afterEach(() => window.localStorage.removeItem("rewireperform.public-language"));

describe("public English coverage", () => {
  it("does not label the still-German guardian consent route as English", () => {
    window.localStorage.setItem("rewireperform.public-language", "en");
    render(
      <MemoryRouter initialEntries={["/guardian/decision"]}>
        <PublicLanguageProvider><div>Deutsche Einwilligungsversion</div></PublicLanguageProvider>
      </MemoryRouter>,
    );
    expect(document.documentElement.lang).toBe("de");
  });

  it("renders the complete privacy notice in English without German UI fragments", () => {
    window.localStorage.setItem("rewireperform.public-language", "en");
    const { container } = render(
      <MemoryRouter initialEntries={["/privacy"]}>
        <PublicLanguageProvider><Privacy /></PublicLanguageProvider>
      </MemoryRouter>,
    );

    expect(screen.getByRole("heading", { level: 1, name: "RewirePerform Privacy Notice" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Authorization for minors" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Retention periods" })).toBeInTheDocument();
    expect(container.textContent).not.toMatch(/[ÄÖÜäöüß]|\b(?:Zurück|Datenschutz|Einwilligung|Minderjährige|Auftragsverarbeiter|Trainer|Speicherdauer)\b/i);
  });

  it("renders the public organization inquiry in English", () => {
    vi.stubGlobal("scrollTo", vi.fn());
    window.localStorage.setItem("rewireperform.public-language", "en");
    const { container } = render(
      <MemoryRouter initialEntries={["/team-access"]}>
        <PublicLanguageProvider><OrganizationAccess /></PublicLanguageProvider>
      </MemoryRouter>,
    );
    expect(screen.getByRole("heading", { name: "How would you like to introduce RewirePerform?" })).toBeInTheDocument();
    expect(container.textContent).not.toMatch(/[ÄÖÜäöüß]|\b(?:Zurück|Datenschutz|Einwilligung|Organisation|Auswahl|Weiter|Anfrage)\b/i);
    fireEvent.click(screen.getByRole("button", { name: /Start with one team/ }));
    expect(screen.getByRole("heading", { name: "Who is starting with which team?" })).toBeInTheDocument();
    expect(container.textContent).not.toMatch(/[ÄÖÜäöüß]|\b(?:Zurück|Datenschutz|Einwilligung|Organisation|Auswahl|Weiter|Anfrage)\b/i);

    fireEvent.change(screen.getByLabelText("Name"), { target: { value: "Alex Example" } });
    fireEvent.change(screen.getByLabelText("Role / position"), { target: { value: "Coach" } });
    fireEvent.change(screen.getByLabelText("Email for this inquiry"), { target: { value: "alex@example.org" } });
    fireEvent.change(screen.getByLabelText("Club / organization"), { target: { value: "Example FC" } });
    fireEvent.change(screen.getByLabelText("Team / age group"), { target: { value: "U17" } });
    fireEvent.change(screen.getByLabelText("Environment"), { target: { value: "local_club" } });
    fireEvent.change(screen.getByLabelText("Sport(s)"), { target: { value: "Football" } });
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    expect(screen.getByRole("heading", { name: "What does your team need to start?" })).toBeInTheDocument();
    expect(container.textContent).not.toMatch(/[ÄÖÜäöüß]|\b(?:Zurück|Datenschutz|Einwilligung|Organisation|Auswahl|Weiter|Anfrage)\b/i);
    fireEvent.click(screen.getByRole("button", { name: "Build mental routines into daily life" }));
    fireEvent.click(screen.getByRole("button", { name: "Standard access" }));
    expect(screen.getByText("Personal review, not automatic approval")).toBeInTheDocument();
  });

  it("renders account-deletion information and team invitations in English", () => {
    window.localStorage.setItem("rewireperform.public-language", "en");
    const deletion = render(
      <MemoryRouter initialEntries={["/account-deletion"]}>
        <PublicLanguageProvider><AccountDeletion /></PublicLanguageProvider>
      </MemoryRouter>,
    );
    expect(screen.getByRole("heading", { name: "Delete your RewirePerform account" })).toBeInTheDocument();
    expect(deletion.container.textContent).not.toMatch(/[ÄÖÜäöüß]|\b(?:Zurück|Löschung|Datenschutz|Konto)\b/i);
    deletion.unmount();

    const invite = render(
      <MemoryRouter initialEntries={["/join?team=ABC123"]}>
        <PublicLanguageProvider><TeamInvite /></PublicLanguageProvider>
      </MemoryRouter>,
    );
    expect(screen.getByRole("heading", { name: "Your team is waiting for you." })).toBeInTheDocument();
    expect(invite.container.textContent).not.toMatch(/[ÄÖÜäöüß]|\b(?:Zurück|Einladung|Teambeitritt|Datenschutz)\b/i);
  });
});
