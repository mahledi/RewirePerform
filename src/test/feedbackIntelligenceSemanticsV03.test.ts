import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createHash } from "node:crypto";

import Ajv2020 from "ajv/dist/2020.js";
import { describe, expect, it } from "vitest";

import { FEEDBACK_CHECKPOINTS } from "@/content/feedbackIntelligenceV1";
import { FEEDBACK_CONSTRUCT_CATALOG_V03 } from "@/content/feedbackIntelligenceSemanticsV03";

const readJson = (path: string): unknown => JSON.parse(readFileSync(resolve(process.cwd(), path), "utf8"));
const staticCatalog = readJson("docs/feedback-intelligence/contracts/v0.3/construct-catalog.json");
const catalogSchema = readJson("docs/feedback-intelligence/contracts/v0.3/construct-catalog.schema.json");
const packageManifest = readJson(
  "docs/feedback-intelligence/contracts/v0.3/producer-package-manifest.json",
) as {
  package_sha256: string;
  package_signed: boolean;
  activation: Record<string, boolean>;
  files: { path: string; sha256: string }[];
};
const registryMigration = [
  "supabase/migrations/20260805103600_feedback_intelligence_v1_registry.sql",
  "supabase/migrations/20260806110000_feedback_intelligence_rest_visualization_v1_1.sql",
].map((path) => readFileSync(resolve(process.cwd(), path), "utf8")).join("\n");

const catalogFamilies = FEEDBACK_CONSTRUCT_CATALOG_V03.constructs.flatMap(
  ({ item_families }) => item_families,
);
const catalogQuestions = catalogFamilies.flatMap(({ questions }) => questions);
const sourceQuestions = Object.values(FEEDBACK_CHECKPOINTS).flatMap((checkpoint) =>
  checkpoint.questions.map((question) => ({ checkpoint, question })),
);

describe("feedback intelligence semantic catalog v0.3", () => {
  it("validates the byte-exported producer catalog against its closed schema", () => {
    const ajv = new Ajv2020({ allErrors: true, strict: true });
    const validate = ajv.compile(catalogSchema);
    expect(validate(staticCatalog), JSON.stringify(validate.errors, null, 2)).toBe(true);
    expect(staticCatalog).toEqual(FEEDBACK_CONSTRUCT_CATALOG_V03);
  });

  it("covers all 55 real questions without synthetic or orphan identifiers", () => {
    expect(FEEDBACK_CONSTRUCT_CATALOG_V03.constructs).toHaveLength(29);
    expect(catalogFamilies).toHaveLength(32);
    expect(catalogQuestions).toHaveLength(55);

    const sourceIds = sourceQuestions.map(({ question }) => question.id).sort();
    const catalogIds = catalogQuestions.map(({ question_id }) => question_id).sort();
    expect(catalogIds).toEqual(sourceIds);
  });

  it("copies every prompt, variant and visible answer label exactly from the athlete UI", () => {
    const catalogById = new Map(catalogQuestions.map((question) => [question.question_id, question]));

    for (const { checkpoint, question } of sourceQuestions) {
      const semantic = catalogById.get(question.id);
      expect(semantic).toBeDefined();
      expect(semantic).toMatchObject({
        human_label_de: question.prompt,
        item_variant_id: question.itemVariantId,
        analysis_role: question.analysisRole,
        checkpoint: { program_day: checkpoint.checkpointDay },
      });
      expect(semantic?.display_answer_options).toEqual(question.options.map((option) => ({
        answer_id: option.id,
        human_label_de: option.label,
        not_scored: option.notScored ?? false,
        exclusive: option.exclusive ?? false,
      })));
    }
  });

  it("keeps one stable scale per comparable family and splits false comparisons", () => {
    for (const family of catalogFamilies) {
      const sourceScales = new Set(sourceQuestions
        .filter(({ question }) => question.itemFamilyId === family.item_family_id)
        .map(({ question }) => question.scaleId));
      expect(sourceScales).toEqual(new Set([family.scale.scale_id]));
      expect(family.longitudinal_comparison).toBe(family.questions.length > 1);
    }

    expect(catalogFamilies.find(({ item_family_id }) => item_family_id === "training_transfer_v1")?.questions)
      .toHaveLength(3);
    expect(catalogFamilies.find(({ item_family_id }) => item_family_id === "automaticity_stage_v1")?.questions)
      .toHaveLength(2);
    expect(catalogFamilies.filter(({ item_family_id }) => item_family_id.startsWith("helpful_components_d")))
      .toHaveLength(2);
    expect(catalogFamilies.filter(({ item_family_id }) => item_family_id.startsWith("improvement_priority_d")))
      .toHaveLength(3);
  });

  it("keeps the local Supabase registry aligned with every producer comparison identifier", () => {
    for (const { question } of sourceQuestions) {
      const expectedRegistrySequence = [
        `'${question.id}'`,
        `'${question.constructId}'`,
        `'${question.itemFamilyId}'`,
        `'${question.itemVariantId}'`,
        `'${question.scaleId}'`,
        `'${question.type}'`,
      ].join(", ");
      expect(registryMigration).toContain(expectedRegistrySequence);
    }
  });

  it("prevents efficacy and scoring shortcuts in ambiguous constructs", () => {
    const changeMagnitude = catalogFamilies.find(
      ({ item_family_id }) => item_family_id === "perceived_change_magnitude_v1",
    );
    expect(changeMagnitude?.scale.analysis_mode).toBe("ORDINAL_MAGNITUDE");
    expect(changeMagnitude?.scale.answer_options.every(({ polarity }) => polarity === "NEUTRAL"))
      .toBe(true);

    const textLoad = catalogFamilies.find(({ item_family_id }) => item_family_id === "text_load_v1");
    expect(textLoad?.scale.analysis_mode).toBe("BIPOLAR_OPTIMUM");
    expect(textLoad?.scale.answer_options.map(({ polarity }) => polarity))
      .toEqual(["CONCERN", "CONCERN", "SUPPORTIVE", "CONCERN", "CONCERN"]);

    expect(FEEDBACK_CONSTRUCT_CATALOG_V03.evidence_boundaries).toMatchObject({
      observational_not_causal: true,
      self_report_not_objective_performance: true,
      automaticity_not_neurophysiological_proof: true,
      categorical_options_not_scores: true,
    });

    const restVisualizationFamilies = catalogFamilies.filter(({ item_family_id }) =>
      item_family_id.startsWith("rest_visualization_"));
    expect(restVisualizationFamilies).toHaveLength(5);
    for (const family of restVisualizationFamilies) {
      expect(family.scale.interpretation_rule_de).toContain("kein Wirkungs-");
      expect(family.scale.answer_options.find(({ answer_id }) => answer_id === "not_used")?.polarity)
        .toBe("NOT_APPLICABLE");
    }
  });

  it("contains semantics only and no athlete, feedback, activity or private-text records", () => {
    const encoded = JSON.stringify(FEEDBACK_CONSTRUCT_CATALOG_V03).toLowerCase();
    for (const forbidden of [
      "user_id", "email", "subject_reference", "feedback_reference", "activity_snapshot",
      "journal_text", "raw_text", "comment", "coach_data", "team_id",
    ]) {
      expect(encoded).not.toContain(forbidden);
    }
  });

  it("byte-pins every handoff file while keeping every activation gate closed", () => {
    const digestLines = packageManifest.files.map(({ path, sha256 }) => {
      const actual = createHash("sha256").update(readFileSync(resolve(process.cwd(), path))).digest("hex");
      expect(actual).toBe(sha256);
      return `${actual}  ${path}\n`;
    }).join("");
    const packageDigest = createHash("sha256").update(digestLines).digest("hex");

    expect(packageDigest).toBe(packageManifest.package_sha256);
    expect(packageManifest.package_signed).toBe(false);
    expect(Object.values(packageManifest.activation).every((value) => value === false)).toBe(true);
  });
});
