import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import GuardianDecision from "@/pages/GuardianDecision";

const api = vi.hoisted(() => ({
  inspectGuardianDecision: vi.fn(),
  inspectGuardianManagement: vi.fn(),
  revokeGuardianAuthorization: vi.fn(),
  submitGuardianDecision: vi.fn(),
  withdrawGuardianDataContribution: vi.fn(),
}));

vi.mock("@/lib/minorAuthorization", async (importOriginal) => ({
  ...await importOriginal<typeof import("@/lib/minorAuthorization")>(),
  ...api,
}));

const renderDecision = (entry = "/guardian/decision#token=secure-decision-token") => render(
  <MemoryRouter initialEntries={[entry]}>
    <GuardianDecision />
  </MemoryRouter>,
);

describe("guardian decision production flow", () => {
  beforeEach(() => {
    for (const mock of Object.values(api)) mock.mockReset();
    api.inspectGuardianDecision.mockResolvedValue({
      state: "pending",
      policy_key: "de_minor_product_v1_2026_07",
    });
  });

  afterEach(cleanup);

  it("requires separate guardian and product confirmations before approval", async () => {
    api.submitGuardianDecision.mockResolvedValue({
      state: "approved",
      receiptDelivery: "failed",
      manageUrl: "https://rewireperform.com/guardian/decision#manage=secure-management-token",
    });
    renderDecision();

    const allow = await screen.findByRole("button", { name: "Zugang erlauben" });
    expect(allow).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Verantwortung und Speicherdauer" }));
    expect(screen.getByText(/bis zu 370 Tage aktiv/)).toBeInTheDocument();
    expect(screen.getByText(/Mahle Herzog, handelnd unter RewirePerform/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("checkbox", { name: /Ich bestätige, dass ich.*sorgeberechtigt/ }));
    expect(allow).toBeDisabled();
    fireEvent.click(screen.getByRole("checkbox", { name: /Nutzung des RewirePerform-Programms erlauben/ }));
    expect(allow).toBeEnabled();
    fireEvent.click(allow);

    await waitFor(() => expect(api.submitGuardianDecision).toHaveBeenCalledWith(
      "secure-decision-token",
      true,
      false,
    ));
    expect(await screen.findByRole("heading", { name: "Entscheidung gespeichert" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Freigabe verwalten" })).toHaveAttribute(
      "href",
      "https://rewireperform.com/guardian/decision#manage=secure-management-token",
    );
  });

  it("allows an informed guardian to decline without accepting the product", async () => {
    api.submitGuardianDecision.mockResolvedValue({
      state: "declined",
      receiptDelivery: "not_required",
      manageUrl: null,
    });
    renderDecision();

    const decline = await screen.findByRole("button", { name: "Nicht erlauben" });
    expect(decline).toBeDisabled();
    fireEvent.click(screen.getByRole("checkbox", { name: /Ich bestätige, dass ich.*sorgeberechtigt/ }));
    expect(decline).toBeEnabled();
    fireEvent.click(decline);

    await waitFor(() => expect(api.submitGuardianDecision).toHaveBeenCalledWith(
      "secure-decision-token",
      false,
      false,
    ));
    expect(await screen.findByRole("heading", { name: "Freigabe nicht erteilt" })).toBeInTheDocument();
  });

  it("withdraws only the optional contribution while preserving product access", async () => {
    api.inspectGuardianManagement.mockResolvedValue({
      state: "active",
      product_status: "authorized",
      data_contribution_status: "authorized",
      data_contribution_guardian: true,
    });
    api.withdrawGuardianDataContribution.mockResolvedValue({
      state: "active",
      product_status: "authorized",
      data_contribution_status: "declined",
      data_contribution_guardian: false,
    });
    renderDecision("/guardian/decision#manage=secure-management-token");

    fireEvent.click(await screen.findByRole("button", { name: "Nur optionale Auswertung beenden" }));
    fireEvent.click(screen.getByRole("button", { name: "Optionale Auswertung beenden" }));

    await waitFor(() => expect(api.withdrawGuardianDataContribution).toHaveBeenCalledWith("secure-management-token"));
    expect(await screen.findByRole("status")).toHaveTextContent("Der normale Programmzugang bleibt aktiv");
    expect(screen.getByText("Die optionale gruppierte Auswertung ist nicht freigegeben.")).toBeInTheDocument();
  });
});
