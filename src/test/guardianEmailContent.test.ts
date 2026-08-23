import { describe, expect, it } from "vitest";
import {
  buildGuardianInvitationEmail,
  buildGuardianReceiptEmail,
} from "../../supabase/functions/_shared/guardianEmails";

describe("guardian transactional email content", () => {
  it("personalizes the invitation and keeps secrets in the URL fragment", () => {
    const email = buildGuardianInvitationEmail(
      "https://rewireperform.com",
      "secure-token",
      "Luka",
    );

    expect(email.subject).toBe("Entscheidung für Luka: RewirePerform-Zugang");
    expect(email.text).toContain("Luka hat deine E-Mail-Adresse");
    expect(email.html).toContain("Teilnahme für Luka prüfen");
    expect(email.html).toContain("https://www.rewireperform.com/guardian/decision#token=secure-token");
    expect(email.html).not.toContain("/guardian/decision?token=");
    expect(email.html).toContain("support@rewireperform.com");
    expect(email.html).toContain("weder nach einem Passwort noch nach Zahlungsdaten");
  });

  it("escapes untrusted display content in HTML", () => {
    const email = buildGuardianInvitationEmail(
      "https://rewireperform.com",
      "secure-token",
      "<Luka&Co>",
    );

    expect(email.html).not.toContain("<Luka&Co>");
    expect(email.html).toContain("&lt;Luka&amp;Co&gt;");
  });

  it("creates a personalized receipt with a reusable management fragment", () => {
    const email = buildGuardianReceiptEmail(
      "https://rewireperform.com",
      "manage-token",
      "Luka",
    );

    expect(email.subject).toBe("Freigabe für Luka gespeichert");
    expect(email.manageUrl).toBe("https://www.rewireperform.com/guardian/decision#manage=manage-token");
    expect(email.text).toContain("Luka muss nun zusätzlich selbst zustimmen");
    expect(email.html).toContain("bis zu 370 Tage aktiv");
  });
});
