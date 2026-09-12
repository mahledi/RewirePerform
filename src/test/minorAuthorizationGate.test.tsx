import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import MinorAuthorizationGate from "@/components/minor-consent/MinorAuthorizationGate";
import { traceAccessRecovery } from "@/lib/accessRecovery";

const state = vi.hoisted(() => ({
  role: "athlete" as "athlete" | "coach",
  roleVerified: true,
  authLoading: false,
  status: {
    product_status: "authorized",
  } as { product_status: string } | null,
  loading: false,
  phase: "ready" as "idle" | "checking_role" | "checking_authorization" | "ready" | "failed",
  error: null as string | null,
  refresh: vi.fn(async () => null),
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ role: state.role, roleVerified: state.roleVerified, loading: state.authLoading }),
}));

vi.mock("@/hooks/useMinorAuthorization", () => ({
  useMinorAuthorization: () => ({
    status: state.status,
    loading: state.loading,
    phase: state.phase,
    error: state.error,
    refresh: state.refresh,
  }),
}));

const LocationProbe = () => {
  const location = useLocation();
  return <div>{`${location.pathname}${location.search}`}</div>;
};

const renderGate = (initialEntry = "/dashboard") => render(
  <MemoryRouter initialEntries={[initialEntry]}>
    <Routes>
      <Route
        path="/dashboard"
        element={<MinorAuthorizationGate><div>Geschützter Inhalt</div></MinorAuthorizationGate>}
      />
      <Route path="/minor-consent" element={<LocationProbe />} />
    </Routes>
  </MemoryRouter>,
);

describe("minor authorization production gate", () => {
  beforeEach(() => {
    state.role = "athlete";
    state.roleVerified = true;
    state.authLoading = false;
    state.status = { product_status: "authorized" };
    state.loading = false;
    state.phase = "ready";
    state.error = null;
    state.refresh.mockClear();
  });

  afterEach(cleanup);

  it("shows athlete data only after current product authorization", () => {
    renderGate();
    expect(screen.getByText("Geschützter Inhalt")).toBeInTheDocument();
  });

  it("keeps authorized content visible during a background access refresh", () => {
    state.loading = true;
    state.phase = "checking_authorization";

    const { container } = renderGate();

    expect(screen.getByText("Geschützter Inhalt")).toBeInTheDocument();
    expect(container.querySelector('[data-app-loading-shell="true"]')).not.toBeInTheDocument();
  });

  it("preserves the intended route while redirecting an unauthorized athlete", () => {
    state.status = { product_status: "pending" };
    renderGate("/dashboard?tab=progress");

    const location = screen.getByText(/^\/minor-consent\?/).textContent ?? "";
    const params = new URLSearchParams(location.split("?")[1]);
    expect(params.get("next")).toBe("/dashboard?tab=progress");
    expect(screen.queryByText("Geschützter Inhalt")).not.toBeInTheDocument();
  });

  it("fails closed when the authorization service cannot be reached", () => {
    state.status = null;
    state.phase = "failed";
    state.error = "service_unavailable";
    renderGate();

    expect(screen.getByRole("heading", { name: "Zugang konnte nicht geprüft werden" })).toBeInTheDocument();
    expect(screen.queryByText("Geschützter Inhalt")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Erneut prüfen" }));
    expect(state.refresh).toHaveBeenCalledOnce();
  });

  it("keeps access checks visually quiet while preserving an accessible status", () => {
    state.status = null;
    state.loading = true;
    state.phase = "checking_authorization";

    const { container } = renderGate();

    expect(screen.getByRole("status")).toHaveTextContent("Zugang wird geprüft");
    expect(screen.queryByRole("heading", { name: "Zugang wird geprüft" }))
      .not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Erneut prüfen" }))
      .not.toBeInTheDocument();
    expect(screen.getByRole("main"))
      .toHaveAttribute("data-app-loading-shell", "true");
    expect(container.querySelector('[data-startup-brand-mark="true"] img'))
      .toHaveAttribute("width", "192");
  });

  it("does not expose internal diagnostics in the access error UI", () => {
    traceAccessRecovery({
      cycle: 42,
      phase: "checking_authorization",
      event: "failure",
      failure: "fetch_error",
    });
    state.status = null;
    state.phase = "failed";
    state.error = "fetch_error";

    renderGate();

    expect(screen.queryByText(/Vorgang 42/)).not.toBeInTheDocument();
    expect(screen.queryByText(/checking_authorization/)).not.toBeInTheDocument();
  });

  it("does not apply the athlete consent gate to coaches", () => {
    state.role = "coach";
    state.status = null;
    state.phase = "failed";
    state.error = "service_unavailable";
    renderGate();

    expect(screen.getByText("Geschützter Inhalt")).toBeInTheDocument();
  });

  it("does not trust an unverified cached coach role", () => {
    state.role = "coach";
    state.roleVerified = false;
    state.status = null;
    state.phase = "failed";
    renderGate();

    expect(screen.getByRole("heading", { name: "Rolle konnte nicht sicher geprüft werden" })).toBeInTheDocument();
    expect(screen.queryByText("Geschützter Inhalt")).not.toBeInTheDocument();
  });
});
