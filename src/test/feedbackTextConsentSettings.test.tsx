import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  list: vi.fn(),
  withdraw: vi.fn(),
  enabled: vi.fn(() => true),
  success: vi.fn(),
  error: vi.fn(),
}));

vi.mock("@/lib/feedbackIntelligenceApi", () => ({
  isFeedbackIntelligenceClientEnabled: mocks.enabled,
  listMyFeedbackTextConsents: mocks.list,
  withdrawMyFeedbackText: mocks.withdraw,
}));

vi.mock("sonner", () => ({
  toast: { success: mocks.success, error: mocks.error },
}));

import { FeedbackTextConsentSettings } from "@/components/settings/FeedbackTextConsentSettings";

const receipt = {
  consentReference: "70000000-0000-4000-8000-000000001103",
  campaignReference: "feedback-day-24-v1",
  checkpointDay: 24 as const,
  state: "granted" as const,
  scope: "product-improvement-individual-text-ai-analysis-v1",
  consentVersion: "feedback-text-consent-v1.1.0-draft",
  grantedAt: "2026-08-05T10:00:00.000Z",
  withdrawnAt: null,
};

describe("feedback text consent settings", () => {
  afterEach(() => {
    vi.clearAllMocks();
    mocks.enabled.mockReturnValue(true);
  });

  it("stays hidden and makes no RPC call while the release switch is closed", () => {
    mocks.enabled.mockReturnValue(false);

    const { container } = render(<FeedbackTextConsentSettings />);

    expect(container).toBeEmptyDOMElement();
    expect(mocks.list).not.toHaveBeenCalled();
  });

  it("gates only feedback consent settings and keeps the existing minor status visible", () => {
    const accountSettings = readFileSync(resolve(process.cwd(), "src/pages/AccountSettings.tsx"), "utf8");

    expect(accountSettings).toMatch(
      /\{role === "athlete" && \(\s*<motion\.section[\s\S]*?Alters- und Freigabestatus/u,
    );
    expect(accountSettings).toMatch(
      /\{role === "athlete" && isFeedbackIntelligenceClientEnabled\(\) && \(\s*<motion\.div[\s\S]*?<FeedbackTextConsentSettings \/>/u,
    );
  });

  it("keeps structured answers separate and shows an empty self-service state", async () => {
    mocks.list.mockResolvedValue([]);
    render(<FeedbackTextConsentSettings />);

    expect(await screen.findByText(/keine Feedback-Kommentare/i)).toBeInTheDocument();
    expect(screen.getByText(/Auswahlantworten bleiben unabhängig/i)).toBeInTheDocument();
  });

  it("withdraws one exact checkpoint consent without implying structured deletion", async () => {
    mocks.list.mockResolvedValue([receipt]);
    mocks.withdraw.mockResolvedValue(undefined);
    render(<FeedbackTextConsentSettings />);

    expect(await screen.findByText("Feedback an Tag 24")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Freitext-Einwilligung widerrufen" }));
    expect(screen.getByText(/Auswahlantworten und dein Programm bleiben unverändert/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Jetzt widerrufen" }));

    await waitFor(() => expect(mocks.withdraw).toHaveBeenCalledWith(receipt.consentReference));
    expect(await screen.findByText(/1 frühere Einwilligung wurde widerrufen/i)).toBeInTheDocument();
    expect(mocks.success).toHaveBeenCalledWith("Freitext-Einwilligung widerrufen.");
  });
});
