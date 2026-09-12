import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, useNavigate } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import AppScrollReset from "@/components/app/AppScrollReset";

const NavigationProbe = () => {
  const navigate = useNavigate();
  return (
    <>
      <button type="button" onClick={() => navigate("/settings")}>Mehr öffnen</button>
      <button type="button" onClick={() => navigate("/settings#faq")}>FAQ öffnen</button>
    </>
  );
};

describe("app scroll reset", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("starts each distinct app view at the top but preserves same-page anchors", () => {
    const windowScroll = vi.spyOn(window, "scrollTo").mockImplementation(() => undefined);
    const documentScroll = vi.fn();
    const scrollingElement = document.scrollingElement;
    Object.defineProperty(document, "scrollingElement", {
      configurable: true,
      value: { scrollTo: documentScroll },
    });

    try {
      render(
        <MemoryRouter initialEntries={["/dashboard"]}>
          <AppScrollReset />
          <NavigationProbe />
        </MemoryRouter>,
      );

      fireEvent.click(screen.getByRole("button", { name: "Mehr öffnen" }));
      expect(windowScroll).toHaveBeenCalledWith({ top: 0, left: 0, behavior: "auto" });
      expect(documentScroll).toHaveBeenCalledWith({ top: 0, left: 0, behavior: "auto" });

      windowScroll.mockClear();
      documentScroll.mockClear();
      fireEvent.click(screen.getByRole("button", { name: "FAQ öffnen" }));
      expect(windowScroll).not.toHaveBeenCalled();
      expect(documentScroll).not.toHaveBeenCalled();
    } finally {
      Object.defineProperty(document, "scrollingElement", {
        configurable: true,
        value: scrollingElement,
      });
    }
  });
});
