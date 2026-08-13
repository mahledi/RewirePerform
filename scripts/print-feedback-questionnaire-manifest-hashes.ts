import { createHash } from "node:crypto";

import {
  FEEDBACK_CHECKPOINTS,
  getFeedbackQuestionnaireManifestPayload,
} from "../src/content/feedbackIntelligenceV1";

for (const checkpoint of Object.values(FEEDBACK_CHECKPOINTS)) {
  const hash = createHash("sha256")
    .update(JSON.stringify(getFeedbackQuestionnaireManifestPayload(checkpoint)))
    .digest("hex");
  console.log(`${checkpoint.checkpointDay} ${hash}`);
}
