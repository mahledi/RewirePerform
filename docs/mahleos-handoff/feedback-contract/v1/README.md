# RewirePerform -> MahleOS Feedback Contract v1

This package defines a separate read-only channel for user-submitted feedback.
It is intentionally not part of the aggregate Tracking or Evidence contract.

## Hard boundaries

- Dedicated 256-bit machine credential; never an admin password.
- HTTPS POST only, no redirects and no free filters.
- No structured names, emails, account IDs, admin notes or attachments.
- Recognized email addresses, phone numbers and credential-shaped values are
  redacted before export. Free text can still contain personal data, including
  names, and must therefore be treated as personal data.
- Production feedback only; marked test users are excluded.
- Raw feedback text is processed ephemerally by MahleOS and is never persisted.
- Local redaction runs before any optional model analysis.
- Feedback concerning minors, mental health, privacy or secrets is never sent
  automatically to a model.
- Unknown fields or schema versions block the source.
- After successful machine authentication, malformed media, oversized bodies,
  invalid JSON and invalid schemas are counted in the same 30/minute window as
  valid reads and leave only a generic audit classification. Request bodies and
  identities are never written to that audit.
- `app_version` is retained only as `x.y.z` or `x.y.z+build`. It is
  `client_reported_non_authoritative`, useful only for technical triage, and is
  never Evidence.

The package does not deploy the Edge Function, apply its migration, install a
secret, connect MahleOS or activate automation. The reviewed producer commit is
pinned by the bilateral handoff after all release gates pass.
