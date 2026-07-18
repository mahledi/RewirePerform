import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import MinorAuthorizationGate from "@/components/minor-consent/MinorAuthorizationGate";

const state = vi.hoisted(() => ({
  role: "athlete" as "athlete" | "coach",
  roleVerified: true,
  authLoading: false,
  status: {
    product_status: "authorized",
  } as { product_status: string } | null,
  loading: false,
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
    state.error = null;
    state.refresh.mockClear();
  });

  afterEach(cleanup);

  it("shows athlete data only after current product authorization", () => {
    renderGate();
    expect(screen.getByText("Geschützter Inhalt")).toBeInTheDocument();
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
    state.error = "service_unavailable";
    renderGate();

    expect(screen.getByRole("heading", { name: "Zugang konnte nicht geprüft werden" })).toBeInTheDocument();
    expect(screen.queryByText("Geschützter Inhalt")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Erneut prüfen" }));
    expect(state.refresh).toHaveBeenCalledOnce();
  });

  it("does not apply the athlete consent gate to coaches", () => {
    state.role = "coach";
    state.status = null;
    state.error = "service_unavailable";
    renderGate();

    expect(screen.getByText("Geschützter Inhalt")).toBeInTheDocument();
  });

  it("does not trust an unverified cached coach role", () => {
    state.role = "coach";
    state.roleVerified = false;
    state.status = null;
    renderGate();

    expect(screen.getByRole("heading", { name: "Rolle konnte nicht sicher geprüft werden" })).toBeInTheDocument();
    expect(screen.queryByText("Geschützter Inhalt")).not.toBeInTheDocument();
  });
});
