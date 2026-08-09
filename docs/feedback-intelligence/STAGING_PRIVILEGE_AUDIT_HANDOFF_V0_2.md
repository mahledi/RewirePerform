# Feedback Intelligence Staging Privilege Audit v0.2

Status: `LOCAL_UNSIGNED_METADATA_ONLY_AWAITING_CONSUMER_REVIEW`

This package supersedes v0.1 for every deployment or read after Producer commit
`cbecd9066a1004ddb284ddcad3ae443d73b85451`. Historical v0.1 remote results
remain immutable evidence of their earlier database state, but cannot satisfy
the current gate.

The audit is catalog-metadata-only and pins the complete
`pg_get_functiondef(oid)` SHA-256 plus owner, `SECURITY DEFINER`,
`search_path`, return type and volatility for both executed data paths:

- `public.read_feedback_intelligence_v0_2_draft(text,text,text,text)`
  - definition SHA-256: `0d617fcb5e5a7ece31ca94b7ff0cf07026712b0d9ed4206c95bee9f4b198a8af`
- `feedback_analysis.export_feedback_intelligence_v0_2_internal(text,text,text,text)`
  - definition SHA-256: `89420ddf3f79ad57538f4fb1ad56458717874490ddbc88b52d577e081d3e872f`

Any missing function or definition, owner, definer, setting, return-type or
volatility drift is a fail-closed NO-GO. The existing role, relation, sequence,
schema, membership, denied-role and default-ACL checks remain in force.

No deployment, credential, application-row read, application-function call,
signing, Production action or synthetic network read is authorized by this
package.
