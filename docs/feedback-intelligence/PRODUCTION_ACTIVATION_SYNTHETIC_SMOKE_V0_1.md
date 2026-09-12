# Feedback Intelligence V1.1 Activation + Synthetic Smoke V0.1

This package is a local, fail-closed contract. It does not authorize or perform a Production activation, credential operation, data read, Jarvis read, deployment, merge, push or App Store action.

Activation requires an explicit qualified legal-review reference and an exact closed V1.1 baseline. The reference format is only a technical pin; it is not evidence that a qualified legal/privacy review actually happened. Installing both migrations leaves every runtime gate false. The owner-only activation function atomically approves the DE structured/raw policy, activates exactly the four final campaigns and the final Guardian policy, and opens only the five product collection prerequisites. It does not open a Machine or Jarvis gate.

The later synthetic Production smoke is separately gated. Its prepared operator is limited to generated users marked `is_test_user`, generated program instances marked `is_test_instance`, and the single literal `SYNTHETIC_OPTIONAL_COMMENT_V1_1`. It covers adult, age 16–17, under-16 Guardian plus athlete authorization, optional comment, decline, withdrawal, deletion and idempotent retry. All eight API paths run in one outer transaction with no retry, re-close before rollback and unconditional rollback. A second, fresh metadata-only session must then prove the rollback boundary. No SQL result contains the supplied review reference or application values.

Local fixtures may use a clearly labelled contract-only reference to test SQL structure. That value is rejected by the runtime operator and never authorizes Production. A later external run still requires the separately supplied real qualified-review reference plus three explicit approvals: Production activation, ephemeral Production database credential, and synthetic smoke. The repository keeps every one of those gates false.

The emergency re-close function disables runtime gates first, pauses campaigns and the DE policy, and retires the active Guardian policy. A real reactivation after emergency retirement requires a new versioned Guardian policy; history is never rewritten.

Next gate: qualified legal/privacy review reference plus a separate explicit Production synthetic-smoke approval and audited credential/operator review.
