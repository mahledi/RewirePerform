// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { BrandLockup, BrandSymbol } from "@/components/brand/BrandLogo";

describe("RewirePerform brand components", () => {
  it("renders the locked dark-surface symbol and full product name", () => {
    const { container } = render(<BrandLockup symbolSize={30} />);
    const symbol = container.querySelector("img");

    expect(screen.getByText("RewirePerform")).toBeInTheDocument();
    expect(symbol).toHaveAttribute("src", "/brand/rewireperform-symbol-dark.svg");
    expect(symbol).toHaveAttribute("width", "30");
    expect(symbol).toHaveAttribute("height", "30");
    expect(symbol).toHaveAttribute("alt", "");
  });

  it("uses the light-surface source and an accessible label when requested", () => {
    render(
      <BrandSymbol
        decorative={false}
        label="RewirePerform Logo"
        size={48}
        surface="light"
      />,
    );

    const symbol = screen.getByRole("img", { name: "RewirePerform Logo" });
    expect(symbol).toHaveAttribute("src", "/brand/rewireperform-symbol-light.svg");
    expect(symbol).toHaveAttribute("width", "48");
    expect(symbol).toHaveAttribute("height", "48");
  });
});
