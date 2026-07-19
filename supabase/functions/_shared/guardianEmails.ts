import {
  brandedEmailButton,
  brandedEmailNote,
  brandedEmailShell,
  safeEmailHtml,
  SUPPORT_EMAIL,
} from "./rewireEmail.ts";

const athleteReference = (firstName: string | null | undefined) =>
  firstName ?? "die minderjährige Person";

export const buildGuardianInvitationEmail = (
  appUrl: string,
  token: string,
  firstName?: string | null,
) => {
  const decisionUrl = `${appUrl}/guardian/decision#token=${encodeURIComponent(token)}`;
  const privacyUrl = `${appUrl}/privacy`;
  const athlete = athleteReference(firstName);
  const title = firstName
    ? `${firstName} möchte RewirePerform nutzen.`
    : "Eine Teilnahme wartet auf deine Entscheidung.";
  const subject = firstName
    ? `Entscheidung für ${firstName}: RewirePerform-Zugang`
    : "RewirePerform-Zugang sicher prüfen";
  const athleteHtml = safeEmailHtml(athlete);

  return {
    subject,
    text: [
      "Hallo,",
      `${athlete} hat deine E-Mail-Adresse als Kontakt einer sorgeberechtigten Person angegeben.`,
      "RewirePerform ist ein 56-Tage-Performance- und Reflexionsprogramm für Athletinnen und Athleten. Bevor der Zugang vollständig genutzt werden kann, brauchen wir deine persönliche Entscheidung.",
      "Über den sicheren Link siehst du kompakt, welche Programmdaten verarbeitet werden, was Trainer sehen und was privat bleibt. Du brauchst kein Elternkonto.",
      decisionUrl,
      "Sicherheitsinformation: RewirePerform fragt in dieser E-Mail weder nach einem Passwort noch nach Zahlungsdaten. Der Link führt ausschließlich zu rewireperform.com, ist 48 Stunden gültig und nur einmal nutzbar.",
      `Du kennst ${athlete} nicht oder hast diese Nachricht nicht erwartet? Dann ignoriere sie und kontaktiere ${SUPPORT_EMAIL}.`,
      `Datenschutz: ${privacyUrl}`,
      `Fragen oder Widerruf: ${SUPPORT_EMAIL}`,
      "Verantwortlich: Mahle Herzog, Wiefeldick 16, 42699 Solingen, Deutschland",
    ].join("\n\n"),
    html: brandedEmailShell({
      appUrl,
      preheader: firstName
        ? `${firstName} möchte RewirePerform nutzen. Prüfe die Teilnahme über den sicheren Link.`
        : "Prüfe die RewirePerform-Teilnahme über den sicheren Link.",
      eyebrow: "Sichere Elternfreigabe",
      title,
      body: [
        "<p style=\"margin:0;\">Hallo,</p>",
        `<p style="margin:16px 0 0;"><strong>${athleteHtml}</strong> hat deine E-Mail-Adresse als Kontakt einer sorgeberechtigten Person angegeben.</p>`,
        "<p style=\"margin:16px 0 0;\">RewirePerform ist ein 56-Tage-Performance- und Reflexionsprogramm für Athletinnen und Athleten. Bevor der Zugang vollständig genutzt werden kann, brauchen wir deine persönliche Entscheidung.</p>",
        "<p style=\"margin:16px 0 0;\">Auf der nächsten Seite siehst du kompakt, welche Programmdaten verarbeitet werden, was Trainer sehen und was privat bleibt. Du brauchst kein Elternkonto.</p>",
      ].join(""),
      action: brandedEmailButton(
        firstName ? `Teilnahme für ${firstName} prüfen` : "Teilnahme prüfen",
        decisionUrl,
      ),
      note: brandedEmailNote([
        "<p style=\"margin:0;font-weight:700;color:inherit;\">Woran du diese Nachricht erkennst</p>",
        "<p style=\"margin:8px 0 0;\">Wir fragen weder nach einem Passwort noch nach Zahlungsdaten. Der Link führt ausschließlich zu <strong>rewireperform.com</strong>, ist 48 Stunden gültig und nur einmal nutzbar.</p>",
        `<p style="margin:8px 0 0;">Du kennst ${athleteHtml} nicht oder hast diese Nachricht nicht erwartet? Dann ignoriere sie und kontaktiere <a class="email-link" style="color:#218a6a;text-decoration:underline;" href="mailto:${SUPPORT_EMAIL}">${SUPPORT_EMAIL}</a>.</p>`,
      ].join("")),
    }),
  };
};

export const buildGuardianReceiptEmail = (
  appUrl: string,
  managementToken: string,
  firstName?: string | null,
) => {
  const manageUrl = `${appUrl}/guardian/decision#manage=${encodeURIComponent(managementToken)}`;
  const privacyUrl = `${appUrl}/privacy`;
  const athlete = athleteReference(firstName);
  const title = firstName
    ? `Freigabe für ${firstName} gespeichert.`
    : "Deine Entscheidung wurde gespeichert.";
  const athleteHtml = safeEmailHtml(athlete);

  return {
    subject: firstName
      ? `Freigabe für ${firstName} gespeichert`
      : "RewirePerform-Entscheidung gespeichert",
    manageUrl,
    text: [
      `Deine Entscheidung für ${athlete} wurde gespeichert.`,
      `${athlete} muss nun zusätzlich selbst zustimmen, bevor der Zugang vollständig freigeschaltet wird.`,
      "Über diesen persönlichen Link kannst du die Freigabe widerrufen:",
      manageUrl,
      "Der Link bleibt bis zu 370 Tage aktiv. Du kannst dich unabhängig davon jederzeit direkt an uns wenden.",
      `Datenschutz: ${privacyUrl}`,
      `Alternativ erreichst du uns unter ${SUPPORT_EMAIL}.`,
      "Verantwortlich: Mahle Herzog, Wiefeldick 16, 42699 Solingen, Deutschland",
    ].join("\n\n"),
    html: brandedEmailShell({
      appUrl,
      preheader: firstName
        ? `Deine RewirePerform-Entscheidung für ${firstName} wurde gespeichert.`
        : "Deine RewirePerform-Entscheidung wurde gespeichert.",
      eyebrow: "Bestätigung",
      title,
      body: [
        `<p style="margin:0;">Deine Entscheidung für <strong>${athleteHtml}</strong> wurde sicher gespeichert.</p>`,
        `<p style="margin:16px 0 0;">${athleteHtml} muss nun zusätzlich selbst zustimmen, bevor der Zugang vollständig freigeschaltet wird.</p>`,
      ].join(""),
      action: brandedEmailButton("Freigabe verwalten oder widerrufen", manageUrl),
      note: brandedEmailNote([
        "<p style=\"margin:0;\">Bewahre diesen persönlichen Verwaltungslink sicher auf. Er bleibt bis zu 370 Tage aktiv und kann für einen Widerruf verwendet werden.</p>",
        `<p style="margin:8px 0 0;">Fragen beantwortet <a class="email-link" style="color:#218a6a;text-decoration:underline;" href="mailto:${SUPPORT_EMAIL}">${SUPPORT_EMAIL}</a>. Die <a class="email-link" style="color:#218a6a;text-decoration:underline;" href="${safeEmailHtml(privacyUrl)}">Datenschutzerklärung</a> bleibt jederzeit erreichbar.</p>`,
      ].join("")),
    }),
  };
};
