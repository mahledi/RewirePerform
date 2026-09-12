import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import AppLoadingShell from "@/components/AppLoadingShell";
import AccessStatusScreen from "@/components/access/AccessStatusScreen";
import AthleteRouteLoadingShell from "@/components/app/AthleteRouteLoadingShell";
import { MemoryRouter } from "react-router-dom";

describe("AppLoadingShell", () => {
  it("keeps the native logo transition clean without a visible loading indicator", () => {
    const { container } = render(<AppLoadingShell subtitle="Stelle deine Sitzung wieder her" />);

    expect(screen.getByRole("main", { name: "Stelle deine Sitzung wieder her" }))
      .toHaveAttribute("data-app-loading-shell", "true");
    expect(container.querySelector(".animate-spin")).not.toBeInTheDocument();
    expect(container.querySelector(".animate-pulse")).not.toBeInTheDocument();
    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
    expect(container.querySelector('img[src="/brand/rewireperform-symbol-dark.svg"]'))
      .toHaveAttribute("width", "192");
  });

  it("keeps the same brand mark size when a retry is required", () => {
    const { container } = render(
      <AccessStatusScreen
        title="Dashboard konnte nicht geladen werden"
        message="Bitte versuche es erneut."
        onRetry={() => undefined}
      />,
    );

    expect(screen.getByRole("heading", { name: "Dashboard konnte nicht geladen werden" }))
      .toBeInTheDocument();
    expect(container.querySelector('[data-startup-brand-mark="true"] img'))
      .toHaveAttribute("width", "192");
    expect(container.querySelector(".animate-spin")).not.toBeInTheDocument();
  });

  it("uses the stable athlete chrome instead of the startup mark during route changes", () => {
    const { container } = render(
      <MemoryRouter initialEntries={["/dashboard"]}>
        <AthleteRouteLoadingShell active="today" />
      </MemoryRouter>,
    );

    expect(container.querySelector('[data-startup-brand-mark="true"]')).not.toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "App-Navigation" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "RewirePerform Dashboard" })).toBeInTheDocument();
  });
});
