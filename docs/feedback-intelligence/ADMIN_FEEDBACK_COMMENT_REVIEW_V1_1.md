# Admin Feedback Comment Review V1.1

Status: local implementation candidate; external gates remain closed.

## B — target

Mahle can review the voluntary comments that athletes intentionally submit inside the Feedback Intelligence questionnaires at program days 10, 24, 39 and 55. Each comment is shown with its exact structured answer and an approved count-only activity snapshot so product decisions can be grounded in context.

The target explicitly excludes journals, private reflections, support messages, names, email addresses, direct user/team/coach identifiers and direct table access. This Admin view does not export text to Jarvis.

For athletes under 16, raw Feedback Intelligence text is readable only while both the athlete text consent and the matching Guardian authorization are valid at read time. Structured questionnaire answers remain usable without raw-text consent.

## A — current verified local state

- The Founder/Admin page contains a dedicated `Feedback Intelligence` review surface. Legacy support and technical messages remain in a separate card and data path.
- `public.get_admin_feedback_comment_page(text,text,integer,timestamptz,uuid,integer)` is the only UI read contract for this view.
- The RPC requires a server-verified `admin` role and the exact purpose `pilot_product_feedback_review`.
- Production and synthetic records are separated, checkpoint filters are deterministic, and pagination uses the `(submitted_at, comment_id)` cursor.
- Consent, campaign version, questionnaire hash, content version, retention and under-16 Guardian scope are revalidated by the database. Contract drift fails closed again in the TypeScript adapter.
- The response contains a program-instance pseudonym, questionnaire context, structured option IDs, the voluntarily submitted feedback comment and approved activity counts only.
- Each successful page access writes a metadata-only audit entry. The audit table has no column for raw text, comment IDs or subject references and is append-only.
- `anon`, `service_role`, the dedicated Jarvis reader and non-admin authenticated users cannot execute this RPC. No role receives direct access to the raw comment or audit tables through this change.
- A development-only synthetic preview exists at `/internal/admin-feedback-comments-preview`. It performs no Supabase, Analytics or AI call and is excluded from normal production routing.

## Delta — still required before a real pilot host

1. Independent privacy/App-Store review must accept the exact athlete notice, under-16 Guardian scope, privacy policy and App Store data declaration.
2. Apply the additive migration to the intended staging project, then repeat privilege, RLS, withdrawal/deletion and metadata-only audit checks against the deployed definitions.
3. Run the admin UI against synthetic staging submissions on desktop and the physical iPhone build.
4. Confirm the pilot admission process operationally accepts only teams whose athletes are at least 15. The existing product-wide minimum remains 13; this block does not silently replace that global rule.
5. Open collection/consent/Privacy/App-Store/Minor gates only through the separately approved release sequence. Production, real feedback and Jarvis text reads remain closed until that sequence is complete.

## Separation from Jarvis

This Admin contract is intentionally independent from the Machine/Jarvis export contracts. Closing Jarvis gates does not prevent Mahle from reviewing properly consented questionnaire comments through the Admin RPC after the legal and deployment gates are opened.

The existing Machine contract must not be described as a structured-only pilot read unless a new byte-pinned mode explicitly excludes `comment`. Historical Consumer or one-shot acceptances do not authorize a newer package, credentials, Production or real data.

## Release sequence

1. Local implementation and complete CI.
2. Independent code/privacy/App-Store review.
3. Staging migration and metadata-only privilege assurance.
4. Synthetic end-to-end Admin verification and physical-device QA.
5. Separate human release approval.
6. Production migration and narrowly scoped pilot activation.

Any definition, privilege, consent, Guardian, retention, content-version or questionnaire-hash drift is a `NO-GO`.
