import { act, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NativeNotificationRouter } from "@/components/notifications/NativeNotificationRouter";

const mocks = vi.hoisted(() => ({
  actionHandler: null as ((action: unknown) => void) | null,
  detach: vi.fn(),
  listen: vi.fn(),
  refresh: vi.fn(),
  remove: vi.fn(),
  toastError: vi.fn(),
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: { id: "athlete-1" }, loading: false }),
}));

vi.mock("@/lib/nativeNotifications", () => ({
  detachNativeRemindersFromInactiveUser: mocks.detach,
  isNativeNotificationsAvailable: () => true,
  listenForNativeReminderActions: mocks.listen,
}));

vi.mock("@/lib/nativeReminderPlan", () => ({
  refreshEnabledNativeReminders: mocks.refresh,
}));

vi.mock("sonner", () => ({
  toast: { error: mocks.toastError },
}));

const LocationProbe = () => {
  const location = useLocation();
  return (
    <output data-testid="location">
      {JSON.stringify({ pathname: location.pathname, state: location.state })}
    </output>
  );
};

describe("native rest visualization routing", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.actionHandler = null;
    mocks.detach.mockResolvedValue(undefined);
    mocks.refresh.mockResolvedValue(undefined);
    mocks.listen.mockImplementation(async (handler: (action: unknown) => void) => {
      mocks.actionHandler = handler;
      return { remove: mocks.remove };
    });
  });

  it("carries the validated rest intent into the protected dashboard", async () => {
    render(
      <MemoryRouter initialEntries={["/settings"]}>
        <NativeNotificationRouter />
        <Routes>
          <Route path="*" element={<LocationProbe />} />
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() => expect(mocks.actionHandler).toBeTypeOf("function"));
    act(() => {
      mocks.actionHandler?.({
        actionId: "tap",
        notification: {
          extra: {
            userId: "athlete-1",
            route: "/dashboard",
            kind: "rest_visualization",
            scheduledDate: "2026-08-06",
          },
        },
      });
    });

    expect(screen.getByTestId("location")).toHaveTextContent('"pathname":"/dashboard"');
    expect(screen.getByTestId("location")).toHaveTextContent('"kind":"rest_visualization"');
    expect(screen.getByTestId("location")).toHaveTextContent('"scheduledDate":"2026-08-06"');
  });

  it("keeps another account's reminder closed", async () => {
    render(
      <MemoryRouter initialEntries={["/settings"]}>
        <NativeNotificationRouter />
        <Routes>
          <Route path="*" element={<LocationProbe />} />
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() => expect(mocks.actionHandler).toBeTypeOf("function"));
    act(() => {
      mocks.actionHandler?.({
        actionId: "tap",
        notification: {
          extra: {
            userId: "athlete-2",
            route: "/dashboard",
            kind: "rest_visualization",
            scheduledDate: "2026-08-06",
          },
        },
      });
    });

    expect(screen.getByTestId("location")).toHaveTextContent('"pathname":"/settings"');
    expect(mocks.toastError).toHaveBeenCalledWith("Diese Erinnerung gehört zu einem anderen Account.");
  });
});
