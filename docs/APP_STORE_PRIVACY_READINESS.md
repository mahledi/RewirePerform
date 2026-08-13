# App Store Privacy Readiness

RewirePerform collects product-critical account, training, progress, questionnaire,
and diagnostic data. This is not advertising tracking and must not be turned into
cross-app or third-party marketing tracking.

## Hard Boundaries

- No IDFA, no advertising SDKs, no data brokers, no marketing pixels.
- No journal text, free reflections, ordinary raw questionnaire answers,
  individual mood history, or individual psychological scores in coach views,
  standard exports, client analytics, or incident logs. The only planned text
  exception is a separately consented, explicitly marked product-feedback
  comment through a versioned read-only contract; it remains disabled until all
  Feedback Intelligence privacy, minor, provider, retention, and Store gates pass.
- Sentry is not part of the shipped app. The retained external project is
  disconnected unless a new privacy and product review explicitly approves it.
- `app_event_log` stays incident-only. Normal product activity belongs in domain
  tables such as check-ins, journals, completions, assessments, questionnaire
  responses, snapshots, and notification logs.

## Data Linked To User

For App Store Connect privacy labels, assume these are linked to the user because
they are tied to the account:

- Name, email address, and user ID needed for account access, roles, and team
  membership.
- Health and fitness information entered in check-ins and questionnaires for
  app functionality, personalization, and the separately consented analytics
  purposes represented by the final data flow.
- Product interaction data: program progress, completions, check-in completion,
  comprehension completion, notification delivery/open/failure status.
- User content: journal/reflection/questionnaire answers exist in the product,
  but must remain private to the athlete and excluded from coach/admin exports.
  Separately consented product-feedback comments are linked `Other User Content`
  for Product Improvement until withdrawal, deletion, or real anonymization.
- Customer support content submitted through the support flow.
- Team- und Organisationsanfragen: Name, E-Mail, optional Telefonnummer,
  Funktion, Team-/Organisationskontext und freiwilliger Hinweis. Diese Angaben
  werden nur zur persoenlichen Pruefung, Vorbereitung und Kontaktaufnahme
  verwendet; nicht fuer Werbung, Tracking oder automatische Preis-, Vertrags-
  oder Zugangsentscheidungen. Abgelehnte, zurueckgezogene oder nicht
  weiterverfolgte Anfragen werden spaetestens 365 Tage nach Abschluss
  automatisch geloescht. Bestaetigte Fake-/Spam-Anfragen koennen durch einen
  Admin nach exakter Bestaetigung sofort dauerhaft geloescht werden.
- Diagnostics: incident-only system events with normalized error codes and
  allow-listed technical metadata.

The final RC does not contain a crash collector and therefore must not declare
`Crash Data`. It declares linked `Other Diagnostic Data` for the minimized
incident events above. Tracking remains `false`.

## Coach Visibility

Coach-visible individual data is operational only:

- last activity,
- completed days,
- completion rate,
- current streak,
- check-ins in the last 7 days,
- journal entry count only,
- inactive-risk flag.

Coach-hidden data:

- mood values and wellbeing history,
- journal text and free reflection,
- raw questionnaire answers,
- individual psychological scores,
- private development labels.

## iOS/WebView Submit Checklist

- Verify `PrivacyInfo.xcprivacy` for the native wrapper and every embedded SDK.
- Confirm App Store Connect privacy answers match actual collection.
- Provide Privacy Policy URL and User Privacy Choices URL.
- Confirm the Xcode Privacy Report contains no Sentry SDK, DSN, crash capture, or
  undeclared required-reason API.
- Recheck Apple requirements before submission; Apple can update SDK privacy
  manifest and required-reason API rules.

## V1.1 Team-/Organisationsanfrage

Die native App sammelt die Anfrage nicht in einem zweiten App-Formular. Sie
oeffnet den zentralen HTTPS-Webweg ueber Capacitor Browser. Apple nimmt Daten
aus, die beim Navigieren im offenen Web erhoben werden; weil dieser Webweg aber
direkt zum RewirePerform-Angebot gehoert und die Kontaktarten teilweise ohnehin
bereits im App-Label vorkommen, wird vor V1.1 konservativ gegen den echten
Release Candidate geprueft, ob insbesondere `Phone Number` zusaetzlich als
verknuepfte Kontaktinformation fuer `App Functionality` angegeben wird.

Die Anfrage fuehrt nicht zu Apple-Tracking: Es gibt keine Werbeverknuepfung,
keinen Datenbroker und keine geruebergreifende Werbemessung. Cloudflare
Turnstile dient ausschliesslich dem Missbrauchsschutz und muss in der
Datenschutzerklaerung als technischer Dienst benannt werden, bevor die
oeffentliche Annahme aktiviert wird.

Der Release-Entwurf trennt vorvertragliche Schritte der betroffenen Person
(Art. 6 Abs. 1 lit. b DSGVO) von Anfragen eines Organisationsvertreters und dem
Missbrauchsschutz (geplantes berechtigtes Interesse nach Art. 6 Abs. 1 lit. f).
Vor oeffentlicher Aktivierung bleibt eine dokumentierte Interessenabwaegung und
externe rechtliche Gegenpruefung erforderlich; lokales CI ist keine anwaltliche
Freigabe.

Fuer App Store Connect konservativ final pruefen:

- `Contact Info`: Name, Email Address und bei der ausfuehrlichen Anfrage
  optional Phone Number;
- `Other User Content`: freiwilliger Projekt-/Kontexthinweis;
- Zwecke: ausschliesslich `App Functionality` beziehungsweise Bearbeitung der
  angeforderten Team-/Organisationsleistung;
- linked to user: `true`, sofern Apple den zentralen, aus der App geoeffneten
  RewirePerform-Webweg dem App-Datenumfang zurechnet;
- tracking: `false`.

References checked during this work:

- Apple App Privacy Details: https://developer.apple.com/app-store/app-privacy-details/
- Apple Third-Party SDK Requirements: https://developer.apple.com/support/third-party-SDK-requirements/
- Apple Privacy Manifests: https://developer.apple.com/documentation/bundleresources/privacy-manifest-files
