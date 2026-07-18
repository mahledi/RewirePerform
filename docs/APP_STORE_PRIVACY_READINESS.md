# App Store Privacy Readiness

RewirePerform collects product-critical account, training, progress, questionnaire,
and diagnostic data. This is not advertising tracking and must not be turned into
cross-app or third-party marketing tracking.

## Hard Boundaries

- No IDFA, no advertising SDKs, no data brokers, no marketing pixels.
- No journal text, free reflections, raw questionnaire answers, individual mood
  history, or individual psychological scores in coach views, exports, or
  incident logs.
- Sentry is not part of the shipped app. The retained external project is
  disconnected unless a new privacy and product review explicitly approves it.
- `app_event_log` stays incident-only. Normal product activity belongs in domain
  tables such as check-ins, journals, completions, assessments, questionnaire
  responses, snapshots, and notification logs.

## Data Linked To User

For App Store Connect privacy labels, assume these are linked to the user because
they are tied to the account:

- Account/profile basics needed for roles and team membership.
- Product interaction data: program progress, completions, check-in completion,
  comprehension completion, notification delivery/open/failure status.
- User content: journal/reflection/questionnaire answers exist in the product,
  but must remain private to the athlete and excluded from coach/admin exports.
- Diagnostics: incident-only system events with normalized error codes and
  allow-listed technical metadata.

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

- Add/verify `PrivacyInfo.xcprivacy` for the native wrapper and any listed SDKs.
- Confirm App Store Connect privacy answers match actual collection.
- Provide Privacy Policy URL and User Privacy Choices URL.
- Recheck Apple requirements before submission; Apple can update SDK privacy
  manifest and required-reason API rules.

References checked during this work:

- Apple App Privacy Details: https://developer.apple.com/app-store/app-privacy-details/
- Apple Third-Party SDK Requirements: https://developer.apple.com/support/third-party-SDK-requirements/
- Apple Privacy Manifests: https://developer.apple.com/documentation/bundleresources/privacy-manifest-files
