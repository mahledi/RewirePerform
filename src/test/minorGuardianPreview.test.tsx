import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { MinorConsentScreen } from "@/components/minor-consent/MinorConsentScreens";
import {
  MINOR_GUARDIAN_DRAFT,
  athleteAssentDraft,
  guardianDecisionDraft,
  guardianNoticeDraft,
  minorGuardianPreviewStates,
  type MinorGuardianPreviewState,
} from "@/content/minorGuardianDraft";

afterEach(cleanup);

const renderState = (state: MinorGuardianPreviewState, onNavigate = vi.fn()) => {
  render(
    <MemoryRouter>
      <MinorConsentScreen state={state} onNavigate={onNavigate} />
    </MemoryRouter>,
  );
  return onNavigate;
};

describe("minor and guardian preview contract", () => {
  it("separates authorized product tracking from research and rollout enforcement", () => {
    expect(MINOR_GUARDIAN_DRAFT.status).toBe("implementation_complete_legal_review_required");
    expect(MINOR_GUARDIAN_DRAFT.productTrackingEnabledAfterAuthorization).toBe(true);
    expect(MINOR_GUARDIAN_DRAFT.enforcementDefaultEnabled).toBe(false);
    expect(MINOR_GUARDIAN_DRAFT.researchEnabled).toBe(false);
    expect(MINOR_GUARDIAN_DRAFT.marketingEmailEnabled).toBe(false);
  });

  it("routes under-16 users to the guardian contact step without requesting a birth date", () => {
    const onNavigate = renderState("age-check");

    expect(screen.getByText(/Ein Geburtsdatum oder Ausweis ist hier nicht nötig/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("radio", { name: /Unter 16/ }));
    fireEvent.click(screen.getByRole("button", { name: /Weiter/ }));

    expect(onNavigate).toHaveBeenCalledWith("guardian-contact");
  });

  it("does not allow a guardian decision without both required confirmations", () => {
    const onNavigate = renderState("guardian-review");
    const authorize = screen.getByRole("button", { name: /Für das Programm erlauben/ });
    const optionalEvaluation = screen.getByLabelText("Optionale interne Auswertung erlauben");

    expect(authorize).toBeDisabled();
    expect(optionalEvaluation).not.toBeChecked();

    fireEvent.click(screen.getByLabelText("Sorgeberechtigung bestätigen"));
    expect(authorize).toBeDisabled();
    fireEvent.click(screen.getByLabelText("Programmnutzung erlauben"));
    expect(authorize).toBeEnabled();

    fireEvent.click(authorize);
    expect(onNavigate).toHaveBeenCalledWith("guardian-complete");
    expect(optionalEvaluation).not.toBeChecked();
  });

  it("requires the athlete's own active assent after guardian authorization", () => {
    const onNavigate = renderState("athlete-assent");
    const accept = screen.getByRole("button", { name: /Zustimmen und starten/ });

    expect(accept).toBeDisabled();
    fireEvent.click(screen.getByLabelText("Eigene freiwillige Zustimmung"));
    expect(accept).toBeEnabled();

    fireEvent.click(accept);
    expect(onNavigate).toHaveBeenCalledWith("authorized");
  });

  it("offers a real no-path without team pressure", () => {
    const onNavigate = renderState("athlete-assent");

    fireEvent.click(screen.getByRole("button", { name: "Nein, nicht teilnehmen" }));
    expect(onNavigate).toHaveBeenCalledWith("athlete-declined");
    expect(athleteAssentDraft.points.join(" ")).toContain("ohne sportlichen Nachteil");
    expect(guardianDecisionDraft.evaluationNoDisadvantage).toContain("keinen Nachteil im Team");
  });

  it("tells the guardian where the address came from and excludes marketing", () => {
    renderState("guardian-email");

    expect(screen.getByText(guardianNoticeDraft.addressSource)).toBeInTheDocument();
    expect(screen.getByText(guardianNoticeDraft.emailPurpose)).toHaveTextContent("Keine Werbung, kein Newsletter");
    expect(screen.getByText(guardianNoticeDraft.noPressure)).toHaveTextContent("freiwillig");
  });

  it("validates the guardian address locally before moving to the pending state", () => {
    const onNavigate = renderState("guardian-contact");
    const send = screen.getByRole("button", { name: /Bestätigungslink senden/ });

    expect(send).toBeDisabled();
    fireEvent.change(screen.getByLabelText("E-Mail der sorgeberechtigten Person"), {
      target: { value: "ungueltig" },
    });
    expect(send).toBeDisabled();
    fireEvent.change(screen.getByLabelText("E-Mail der sorgeberechtigten Person"), {
      target: { value: "elternteil@example.de" },
    });
    expect(send).toBeEnabled();

    fireEvent.click(send);
    expect(onNavigate).toHaveBeenCalledWith("guardian-pending");
  });

  it("keeps guardian refusal, athlete refusal, and revocation as distinct states", () => {
    const guardianNavigate = renderState("guardian-review");
    fireEvent.click(screen.getByRole("button", { name: "Nicht erlauben" }));
    expect(guardianNavigate).toHaveBeenCalledWith("guardian-declined");
    cleanup();

    const settingsNavigate = renderState("settings");
    fireEvent.click(screen.getByRole("button", { name: "Freigabe widerrufen" }));
    expect(settingsNavigate).toHaveBeenCalledWith("revoked");
  });

  it("gives 16-to-17-year-olds their own understandable decision", () => {
    renderState("age-16-17-decision");

    expect(screen.getByRole("heading", { name: "Mit 16 oder 17 entscheidest du selbst" })).toBeInTheDocument();
    expect(screen.getByText(/Ein Kontakt zu einer sorgeberechtigten Person ist in diesem Deutschland-Flow nicht erforderlich/)).toBeInTheDocument();
  });

  it("renders every documented preview state and keeps state identifiers unique", () => {
    const ids = minorGuardianPreviewStates.map((item) => item.id);
    expect(new Set(ids).size).toBe(ids.length);

    for (const state of ids) {
      const { container, unmount } = render(
        <MemoryRouter>
          <MinorConsentScreen state={state} onNavigate={vi.fn()} />
        </MemoryRouter>,
      );
      expect(container.firstElementChild).not.toBeNull();
      unmount();
    }
  });
});
