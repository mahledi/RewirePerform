import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import AccountDeletion from "@/pages/AccountDeletion";
import { SUPPORT_EMAIL } from "@/config/contact";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("public account deletion page", () => {
  it("provides a public deletion path, scope and retention information", () => {
    render(
      <MemoryRouter initialEntries={["/account-deletion"]}>
        <AccountDeletion />
      </MemoryRouter>,
    );

    expect(screen.getByRole("heading", { name: "RewirePerform-Konto löschen" })).toBeInTheDocument();
    expect(screen.getByText("Öffne Einstellungen → Konto & Daten.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Löschung per E-Mail anfordern" })).toHaveAttribute(
      "href",
      expect.stringContaining(`mailto:${SUPPORT_EMAIL}`),
    );
    expect(screen.getByRole("heading", { name: "Was gelöscht wird" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Was bestehen bleiben kann" })).toBeInTheDocument();
    expect(screen.getByText(/höchstens sieben Kalendertage/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Datenschutzerklärung" })).toHaveAttribute("href", "/privacy");
  });

  it("is registered as an unprotected public route", () => {
    const app = readFileSync(resolve(process.cwd(), "src/App.tsx"), "utf8");
    const publicRouteCheck = readFileSync(
      resolve(process.cwd(), "scripts/verify-app-store-public-routes.mjs"),
      "utf8",
    );
    expect(app).toContain('const AccountDeletion = lazy(() => import("./pages/AccountDeletion.tsx"));');
    expect(app).toContain('<Route path="/account-deletion" element={<AccountDeletion />} />');
    expect(app).not.toMatch(/path="\/account-deletion"[^\n]*ProtectedRoute/);
    expect(publicRouteCheck).toContain('{ path: "/account-deletion", heading: "RewirePerform-Konto löschen" }');
  });

  it("does not turn the own seven-day export limit into a provider promise", () => {
    const page = readFileSync(resolve(process.cwd(), "src/pages/AccountDeletion.tsx"), "utf8");
    expect(page).toContain("Ein eigener verschlüsselter Sicherungsexport darf höchstens sieben Kalendertage");
    expect(page).toContain("innerhalb der vertraglichen Providerfristen");
    expect(page).not.toMatch(/Providerseitige[\s\S]{0,180}höchstens sieben Kalendertage/i);
  });
});
