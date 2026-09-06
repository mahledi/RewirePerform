import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import Support from "@/pages/Support";

describe("public support surface", () => {
  it("shows user-facing support without internal App Store review language", () => {
    render(
      <MemoryRouter>
        <Support />
      </MemoryRouter>,
    );

    expect(screen.getByRole("heading", { name: "RewirePerform Support" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Hinweis zum Angebot" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /Team- oder Organisationszugang/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Zugang anfragen/ })).not.toBeInTheDocument();
    expect(screen.queryByText(/App-Store-Review/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Review Notes/i)).not.toBeInTheDocument();
  });
});
