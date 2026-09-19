import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AccountDeletionDialog } from "@/components/settings/AccountDeletionDialog";
import { PasswordChangeDialog } from "@/components/settings/PasswordChangeDialog";
import AccountDeleted from "@/pages/AccountDeleted";

const mocks = vi.hoisted(() => ({
  changeAccountPassword: vi.fn(),
  clearDeletedAccountFromDevice: vi.fn(),
  deleteCurrentAccount: vi.fn(),
  loadAccountDeletionPreview: vi.fn(),
  toastSuccess: vi.fn(),
}));

vi.mock("@/lib/accountManagement", () => ({
  changeAccountPassword: mocks.changeAccountPassword,
  clearDeletedAccountFromDevice: mocks.clearDeletedAccountFromDevice,
  deleteCurrentAccount: mocks.deleteCurrentAccount,
  loadAccountDeletionPreview: mocks.loadAccountDeletionPreview,
}));

vi.mock("sonner", () => ({
  toast: { success: mocks.toastSuccess },
}));

describe("account settings dialogs", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.changeAccountPassword.mockResolvedValue(undefined);
    mocks.clearDeletedAccountFromDevice.mockResolvedValue(undefined);
    mocks.deleteCurrentAccount.mockResolvedValue(undefined);
    mocks.loadAccountDeletionPreview.mockResolvedValue({
      ownedTeams: [],
      programInstanceIds: ["instance-1"],
    });
  });

  it("deletes only after preview, password confirmation, and server success", async () => {
    render(
      <MemoryRouter
        initialEntries={["/account"]}
      >
        <Routes>
          <Route
            path="/account"
            element={
              <AccountDeletionDialog
                open
                onOpenChange={vi.fn()}
                userId="user-1"
                email="athlete@example.com"
              />
            }
          />
          <Route path="/account-deleted" element={<AccountDeleted />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByRole("button", { name: "Schließen" })).toBeEnabled();
    await waitFor(() => expect(screen.getByRole("button", { name: "Weiter" })).toBeEnabled());
    fireEvent.click(screen.getByRole("button", { name: "Weiter" }));
    fireEvent.change(screen.getByLabelText("Aktuelles Passwort"), {
      target: { value: "secret-password" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Account endgültig löschen" }));

    await waitFor(() => {
      expect(mocks.deleteCurrentAccount).toHaveBeenCalledWith(
        "athlete@example.com",
        "secret-password",
        {},
      );
      expect(mocks.clearDeletedAccountFromDevice).toHaveBeenCalledWith("user-1", ["instance-1"]);
      expect(screen.getByRole("heading", { name: "Dein Account wurde gelöscht." })).toBeInTheDocument();
    });
  });

  it("does not show a false success message when the route is opened directly", () => {
    render(
      <MemoryRouter
        initialEntries={["/account-deleted"]}
      >
        <Routes>
          <Route path="/" element={<div>Startseite</div>} />
          <Route path="/account-deleted" element={<AccountDeleted />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText("Startseite")).toBeInTheDocument();
    expect(screen.queryByText("Dein Account wurde gelöscht.")).not.toBeInTheDocument();
  });

  it("blocks a coach-owned team until another coach can take over", async () => {
    mocks.loadAccountDeletionPreview.mockResolvedValue({
      ownedTeams: [
        {
          id: "team-1",
          name: "Leistungsteam",
          archived: false,
          candidates: [],
        },
      ],
      programInstanceIds: [],
    });

    render(
      <MemoryRouter>
        <AccountDeletionDialog
          open
          onOpenChange={vi.fn()}
          userId="coach-1"
          email="coach@example.com"
        />
      </MemoryRouter>,
    );

    await waitFor(() => expect(screen.getByRole("button", { name: "Weiter" })).toBeEnabled());
    fireEvent.click(screen.getByRole("button", { name: "Weiter" }));

    expect(screen.getByText("Für dieses Team ist noch kein weiterer Coach hinterlegt.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Account endgültig löschen" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Teamverwaltung öffnen" })).toBeEnabled();
    expect(mocks.deleteCurrentAccount).not.toHaveBeenCalled();
  });

  it("validates a new password before calling Auth", async () => {
    const onOpenChange = vi.fn();
    render(
      <PasswordChangeDialog open onOpenChange={onOpenChange} />,
    );

    fireEvent.change(screen.getByLabelText("Aktuelles Passwort"), {
      target: { value: "old-password" },
    });
    fireEvent.change(screen.getByLabelText("Neues Passwort"), {
      target: { value: "short" },
    });
    fireEvent.change(screen.getByLabelText("Neues Passwort wiederholen"), {
      target: { value: "short" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Passwort ändern" }));

    expect(screen.getByRole("alert")).toHaveTextContent("mindestens 8 Zeichen");
    expect(mocks.changeAccountPassword).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText("Neues Passwort"), {
      target: { value: "new-password" },
    });
    fireEvent.change(screen.getByLabelText("Neues Passwort wiederholen"), {
      target: { value: "new-password" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Passwort ändern" }));

    await waitFor(() => {
      expect(mocks.changeAccountPassword).toHaveBeenCalledWith("old-password", "new-password");
      expect(onOpenChange).toHaveBeenCalledWith(false);
      expect(mocks.toastSuccess).toHaveBeenCalledWith("Passwort geändert.");
    });
  });
});
