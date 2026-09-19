-- Feedback Intelligence v1.1 jurisdiction/minor release policy.
--
-- The statutory consent threshold is evidence metadata, not an automatic
-- authorization decision. RewirePerform keeps a separate, deliberately more
-- conservative product rule and requires an explicit legal/privacy approval
-- per jurisdiction and data class. The 1.1 release scope is Germany only;
-- every non-DE row is an explicit deny-list entry and remains fail-closed.

BEGIN;

CREATE TABLE feedback_core.jurisdiction_policies (
  jurisdiction text PRIMARY KEY CHECK (jurisdiction IN ('DE', 'AT', 'CH')),
  policy_version text NOT NULL UNIQUE
    CHECK (policy_version ~ '^feedback-jurisdiction-minor-[a-z]{2}-v[0-9]+\.[0-9]+\.[0-9]+$'),
  product_minimum_age smallint NOT NULL DEFAULT 15
    CHECK (product_minimum_age = 15),
  product_guardian_required_below_age smallint NOT NULL DEFAULT 16
    CHECK (product_guardian_required_below_age BETWEEN 13 AND 18),
  statutory_information_society_consent_age smallint
    CHECK (statutory_information_society_consent_age BETWEEN 13 AND 16),
  statutory_age_rule text NOT NULL CHECK (statutory_age_rule IN (
    'gdpr_article_8_default_16',
    'national_article_8_age_14',
    'context_specific_capacity_no_fixed_age'
  )),
  structured_collection_status text NOT NULL DEFAULT 'legal_review_required'
    CHECK (structured_collection_status IN ('out_of_scope', 'legal_review_required', 'approved', 'paused')),
  raw_text_collection_status text NOT NULL DEFAULT 'legal_review_required'
    CHECK (raw_text_collection_status IN ('out_of_scope', 'legal_review_required', 'approved', 'paused')),
  legal_source_uri text NOT NULL CHECK (legal_source_uri ~ '^https://'),
  legal_review_reference text,
  approved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (
    (structured_collection_status <> 'approved' AND raw_text_collection_status <> 'approved')
    OR (legal_review_reference IS NOT NULL AND approved_at IS NOT NULL)
  )
);

INSERT INTO feedback_core.jurisdiction_policies(
  jurisdiction,
  policy_version,
  statutory_information_society_consent_age,
  statutory_age_rule,
  structured_collection_status,
  raw_text_collection_status,
  legal_source_uri
) VALUES
  (
    'DE',
    'feedback-jurisdiction-minor-de-v1.0.0',
    16,
    'gdpr_article_8_default_16',
    'legal_review_required',
    'legal_review_required',
    'https://eur-lex.europa.eu/eli/reg/2016/679/oj'
  ),
  (
    'AT',
    'feedback-jurisdiction-minor-at-v1.0.0',
    14,
    'national_article_8_age_14',
    'out_of_scope',
    'out_of_scope',
    'https://ris.bka.gv.at/NormDokument.wxe?Abfrage=Bundesnormen&Gesetzesnummer=10001597&Artikel=2&Paragraf=4'
  ),
  (
    'CH',
    'feedback-jurisdiction-minor-ch-v1.0.0',
    NULL,
    'context_specific_capacity_no_fixed_age',
    'out_of_scope',
    'out_of_scope',
    'https://www.edoeb.admin.ch/de/informationspflicht'
  )
ON CONFLICT (jurisdiction) DO NOTHING;

ALTER TABLE feedback_core.jurisdiction_policies ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE feedback_core.jurisdiction_policies
  FROM PUBLIC, anon, authenticated, service_role;

CREATE TRIGGER feedback_jurisdiction_policies_touch_updated_at
BEFORE UPDATE ON feedback_core.jurisdiction_policies
FOR EACH ROW EXECUTE FUNCTION feedback_core.touch_updated_at();

CREATE OR REPLACE FUNCTION feedback_core.jurisdiction_policy_ready(
  _jurisdiction text,
  _include_raw_text boolean DEFAULT false
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT COALESCE((
    SELECT policy.structured_collection_status = 'approved'
      AND (
        NOT _include_raw_text
        OR policy.raw_text_collection_status = 'approved'
      )
      AND policy.legal_review_reference IS NOT NULL
      AND policy.approved_at IS NOT NULL
    FROM feedback_core.jurisdiction_policies policy
    WHERE policy.jurisdiction = _jurisdiction
  ), false)
$$;

REVOKE ALL ON FUNCTION feedback_core.jurisdiction_policy_ready(text, boolean)
  FROM PUBLIC, anon, authenticated, service_role;

COMMENT ON TABLE feedback_core.jurisdiction_policies IS
  'Fail-closed jurisdiction matrix. The 1.1 release scope is DE only; statutory age metadata never self-activates collection.';
COMMENT ON COLUMN feedback_core.jurisdiction_policies.product_guardian_required_below_age IS
  'RewirePerform safety default; deliberately separate from the jurisdiction statutory threshold.';

COMMIT;
