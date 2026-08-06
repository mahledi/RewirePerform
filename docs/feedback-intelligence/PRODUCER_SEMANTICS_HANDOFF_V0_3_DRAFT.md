# Feedback Intelligence Producer Semantics Handoff v0.3 Draft

Status: `PRODUCER_CONFIRMED_DRAFT_NOT_ACTIVATED`

This package supplies the missing human and machine meaning layer for the real
RewirePerform feedback questionnaires. It does not activate collection, grant a
machine role, expose a Supabase table, or permit real feedback reads.

## What the catalog contains

- all 47 real questions from program days 10, 24, 39 and 55;
- 24 constructs, 27 item families and 26 semantic scales;
- exact German prompts and exact prompt-local answer labels;
- stable construct, family, variant, scale and evidence identifiers;
- explicit interpretation modes and answer polarity;
- evidence boundaries and product-test hypotheses.

The catalog is semantics-only. It contains no athlete reference, feedback,
comment, activity snapshot, journal text, coach data, team data, name or email.
It is intended to be bundled and byte-pinned with the reviewed Jarvis consumer
release. Jarvis does not need a direct database read for this catalog.

## Identifier corrections before activation

The visible questionnaire wording did not change. Internal comparison metadata
was corrected before any real activation:

- content clarity, task actionability, training transfer and perceived
  automaticity now use one stable semantic scale per comparable family;
- the Tag 24 and Tag 55 helpful-component option sets are separate families;
- the Tag 10, Tag 24 and Tag 55 improvement-priority option sets are separate
  families;
- perceived change magnitude, retention-gap frequency and training-transfer
  frequency no longer share scale meanings that could invert interpretation.

These corrections prevent the consumer from treating different categories as
the same longitudinal measure or reading the same numeric answer with opposite
meaning.

## Required Jarvis consumer changes

The v0.3 consumer prototype used 28 synthetic questions and uppercase synthetic
answer aliases. The producer catalog intentionally uses the exact exported
`structured_answer` values, including numeric and lowercase identifiers.

Jarvis must also accept:

- `observed_labels_de` for wording variants on a shared semantic scale;
- exact `display_answer_options` on every question;
- `analysis_mode` values for ordinal, bipolar, stage and categorical analysis;
- `DESCRIPTIVE` polarity;
- descriptive or magnitude-only families without forced supportive/concern
  answers;
- `product_test_hypothesis_de` instead of `proposed_test`.

Unknown fields, missing real questions, scale drift, answer drift, catalog hash
drift or questionnaire/catalog disagreement must fail closed.

## What Jarvis may conclude

Jarvis may produce descriptive checkpoint distributions, privacy-safe
longitudinal patterns, consent coverage, text themes, activity associations and
evidence-bound product hypotheses. Every claim must retain one of the agreed
evidence classes and the underlying sample size.

Jarvis must not report causality, objective performance improvement,
neurophysiological automaticity, a psychological profile, an individual athlete
decision or a coach evaluation. Activity associations are observational and
must keep missingness, small-cell suppression and cohort confidence visible.

## Still closed

- real feedback and raw-text reads;
- machine credential and network transport;
- Production export and scheduling;
- qualified German legal/privacy approval;
- final App Store privacy declaration;
- final under-16 guardian notice and authorization scope;
- fixed raw-text retention and automated deletion;
- native-device validation;
- push, merge, deployment and release.
