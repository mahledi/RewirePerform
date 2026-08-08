-- RewirePerform Feedback Intelligence metadata-only Staging privilege audit v0.1.
--
-- Read-only by construction: this statement reads PostgreSQL catalog metadata
-- only. It does not select from application relations, call application
-- functions, change roles, acquire credentials, or mutate database state.

WITH
constants AS (
  SELECT
    'mahleos_feedback_reader'::text AS reader_role,
    'public.read_feedback_intelligence_v0_2_draft(text,text,text,text)'::text AS gateway_signature,
    ARRAY['public', 'feedback_core', 'feedback_consent', 'feedback_raw', 'feedback_analysis']::text[] AS audited_schemas,
    ARRAY['PUBLIC', 'anon', 'authenticated', 'service_role']::text[] AS denied_roles
),
audited_namespaces AS (
  SELECT namespace.oid, namespace.nspname
  FROM pg_catalog.pg_namespace namespace, constants
  WHERE namespace.nspname = ANY(constants.audited_schemas)
),
known_roles AS (
  SELECT role.oid, role.rolname, role.rolsuper, role.rolinherit,
    role.rolcreaterole, role.rolcreatedb, role.rolcanlogin,
    role.rolreplication, role.rolbypassrls
  FROM pg_catalog.pg_roles role, constants
  WHERE role.rolname = constants.reader_role
     OR role.rolname = ANY(constants.denied_roles[2:4])
),
reader_role AS (
  SELECT role.*
  FROM known_roles role, constants
  WHERE role.rolname = constants.reader_role
),
gateway_function AS (
  SELECT procedure.oid, namespace.nspname AS schema_name,
    procedure.proname AS function_name,
    pg_catalog.oidvectortypes(procedure.proargtypes) AS identity_arguments,
    pg_catalog.pg_get_userbyid(procedure.proowner) AS owner_name,
    owner.rolsuper AS owner_superuser,
    owner.rolbypassrls AS owner_bypassrls,
    procedure.prosecdef AS security_definer,
    COALESCE(procedure.proconfig, ARRAY[]::text[]) AS function_settings
  FROM pg_catalog.pg_proc procedure
  JOIN pg_catalog.pg_namespace namespace ON namespace.oid = procedure.pronamespace
  JOIN pg_catalog.pg_roles owner ON owner.oid = procedure.proowner
  WHERE procedure.oid = pg_catalog.to_regprocedure(
    'public.read_feedback_intelligence_v0_2_draft(text,text,text,text)'
  )
),
audited_functions AS (
  SELECT procedure.oid, namespace.oid AS namespace_oid,
    namespace.nspname AS schema_name, procedure.proname AS function_name,
    pg_catalog.oidvectortypes(procedure.proargtypes) AS identity_arguments,
    procedure.prosecdef AS security_definer,
    pg_catalog.pg_get_userbyid(procedure.proowner) AS owner_name,
    procedure.prosrc AS function_source,
    COALESCE(procedure.proconfig, ARRAY[]::text[]) AS function_settings,
    pg_catalog.pg_get_function_result(procedure.oid) AS return_type,
    CASE procedure.provolatile
      WHEN 'i' THEN 'IMMUTABLE'
      WHEN 's' THEN 'STABLE'
      ELSE 'VOLATILE'
    END AS volatility,
    COALESCE(procedure.proacl, pg_catalog.acldefault('f', procedure.proowner)) AS function_acl
  FROM pg_catalog.pg_proc procedure
  JOIN audited_namespaces namespace ON namespace.oid = procedure.pronamespace
),
machine_export_functions AS (
  SELECT function.oid, function.namespace_oid, function.schema_name,
    function.function_name, function.identity_arguments,
    function.security_definer, function.owner_name,
    function.function_settings, function.return_type, function.volatility,
    pg_catalog.encode(extensions.digest(
      pg_catalog.convert_to(pg_catalog.pg_get_functiondef(function.oid), 'UTF8'),
      'sha256'
    ), 'hex') AS definition_sha256,
    function.function_acl
  FROM audited_functions function
  WHERE function.schema_name = 'feedback_analysis'
     OR function.function_name ~* '(feedback_intelligence|machine|export_feedback)'
     OR function.function_source ~* 'feedback_analysis[.](export_feedback_intelligence|machine_)'
),
reader_callable_functions AS (
  SELECT function.schema_name, function.function_name,
    function.identity_arguments, function.security_definer, function.owner_name
  FROM reader_role reader
  JOIN audited_functions function
    ON pg_catalog.has_schema_privilege(reader.oid, function.namespace_oid, 'USAGE')
   AND pg_catalog.has_function_privilege(reader.oid, function.oid, 'EXECUTE')
),
gateway_execute_matrix AS (
  SELECT role.rolname,
    CASE WHEN gateway.oid IS NULL THEN false
      ELSE pg_catalog.has_schema_privilege(role.oid, gateway.schema_name, 'USAGE')
       AND pg_catalog.has_function_privilege(role.oid, gateway.oid, 'EXECUTE')
    END AS callable
  FROM known_roles role
  LEFT JOIN gateway_function gateway ON true
),
denied_named_role_machine_paths AS (
  SELECT role.rolname AS subject_role, function.schema_name,
    function.function_name, function.identity_arguments,
    function.owner_name, function.security_definer, function.function_settings,
    function.return_type, function.volatility, function.definition_sha256
  FROM known_roles role
  JOIN machine_export_functions function
    ON role.rolname <> (SELECT reader_role FROM constants)
   AND pg_catalog.has_schema_privilege(role.oid, function.namespace_oid, 'USAGE')
   AND pg_catalog.has_function_privilege(role.oid, function.oid, 'EXECUTE')
),
public_machine_paths AS (
  SELECT 'PUBLIC'::text AS subject_role, function.schema_name,
    function.function_name, function.identity_arguments,
    function.owner_name, function.security_definer, function.function_settings,
    function.return_type, function.volatility, function.definition_sha256
  FROM machine_export_functions function
  -- A PUBLIC function EXECUTE grant is treated as a side path even if schema
  -- USAGE is currently closed. This is deliberately stricter than callability
  -- so a later schema grant cannot silently activate the function.
  WHERE EXISTS (
      SELECT 1
      FROM pg_catalog.aclexplode(function.function_acl) privilege
      WHERE privilege.grantee = 0 AND privilege.privilege_type = 'EXECUTE'
  )
),
denied_role_machine_paths AS (
  SELECT * FROM public_machine_paths
  UNION ALL
  SELECT * FROM denied_named_role_machine_paths
),
reader_memberships AS (
  SELECT member.rolname AS member_name, granted.rolname AS granted_role,
    membership.admin_option
  FROM pg_catalog.pg_auth_members membership
  JOIN pg_catalog.pg_roles member ON member.oid = membership.member
  JOIN pg_catalog.pg_roles granted ON granted.oid = membership.roleid
  JOIN reader_role reader ON reader.oid = member.oid OR reader.oid = granted.oid
),
audited_relations AS (
  SELECT relation.oid, namespace.oid AS namespace_oid,
    namespace.nspname AS schema_name, relation.relname AS relation_name,
    relation.relkind
  FROM pg_catalog.pg_class relation
  JOIN audited_namespaces namespace ON namespace.oid = relation.relnamespace
  WHERE relation.relkind IN ('r', 'p', 'v', 'm', 'S')
),
reader_relation_privileges AS (
  SELECT relation.schema_name, relation.relation_name, relation.relkind,
    privilege.privilege_type
  FROM reader_role reader
  JOIN audited_relations relation ON true
  CROSS JOIN LATERAL (
    VALUES
      ('SELECT', pg_catalog.has_table_privilege(reader.oid, relation.oid, 'SELECT')),
      ('INSERT', pg_catalog.has_table_privilege(reader.oid, relation.oid, 'INSERT')),
      ('UPDATE', pg_catalog.has_table_privilege(reader.oid, relation.oid, 'UPDATE')),
      ('DELETE', pg_catalog.has_table_privilege(reader.oid, relation.oid, 'DELETE')),
      ('TRUNCATE', pg_catalog.has_table_privilege(reader.oid, relation.oid, 'TRUNCATE')),
      ('REFERENCES', pg_catalog.has_table_privilege(reader.oid, relation.oid, 'REFERENCES')),
      ('TRIGGER', pg_catalog.has_table_privilege(reader.oid, relation.oid, 'TRIGGER'))
  ) AS privilege(privilege_type, allowed)
  WHERE relation.relkind <> 'S' AND privilege.allowed
),
reader_sequence_privileges AS (
  SELECT relation.schema_name, relation.relation_name,
    privilege.privilege_type
  FROM reader_role reader
  JOIN audited_relations relation ON relation.relkind = 'S'
  CROSS JOIN LATERAL (
    VALUES
      ('USAGE', pg_catalog.has_sequence_privilege(reader.oid, relation.oid, 'USAGE')),
      ('SELECT', pg_catalog.has_sequence_privilege(reader.oid, relation.oid, 'SELECT')),
      ('UPDATE', pg_catalog.has_sequence_privilege(reader.oid, relation.oid, 'UPDATE'))
  ) AS privilege(privilege_type, allowed)
  WHERE privilege.allowed
),
reader_schema_usage AS (
  SELECT namespace.nspname AS schema_name
  FROM reader_role reader
  JOIN audited_namespaces namespace
    ON pg_catalog.has_schema_privilege(reader.oid, namespace.oid, 'USAGE')
),
function_owners AS (
  SELECT DISTINCT procedure.proowner AS owner_oid
  FROM pg_catalog.pg_proc procedure
  JOIN audited_namespaces namespace ON namespace.oid = procedure.pronamespace
  UNION
  SELECT role.oid
  FROM pg_catalog.pg_roles role
  WHERE role.rolname = CURRENT_USER
),
public_namespace AS (
  SELECT oid FROM pg_catalog.pg_namespace WHERE nspname = 'public'
),
public_execute_defaults AS (
  SELECT owner.rolname AS owner_name,
    CASE WHEN defaults.oid IS NULL THEN 'BUILT_IN_DEFAULT' ELSE 'ALTERED_DEFAULT' END AS source
  FROM function_owners function_owner
  JOIN pg_catalog.pg_roles owner ON owner.oid = function_owner.owner_oid
  CROSS JOIN public_namespace public_schema
  LEFT JOIN pg_catalog.pg_default_acl defaults
    ON defaults.defaclrole = function_owner.owner_oid
   AND defaults.defaclnamespace = public_schema.oid
   AND defaults.defaclobjtype = 'f'
  CROSS JOIN LATERAL pg_catalog.aclexplode(
    COALESCE(defaults.defaclacl, pg_catalog.acldefault('f', function_owner.owner_oid))
  ) exploded
  WHERE exploded.grantee = 0
    AND exploded.privilege_type = 'EXECUTE'
),
evidence AS (
  SELECT jsonb_build_object(
    'reader_role', COALESCE((
      SELECT jsonb_build_object(
        'present', true,
        'superuser', reader.rolsuper,
        'inherit', reader.rolinherit,
        'create_role', reader.rolcreaterole,
        'create_db', reader.rolcreatedb,
        'can_login', reader.rolcanlogin,
        'replication', reader.rolreplication,
        'bypass_rls', reader.rolbypassrls,
        'database_connect', pg_catalog.has_database_privilege(reader.oid, pg_catalog.current_database(), 'CONNECT')
      ) FROM reader_role reader
    ), jsonb_build_object('present', false)),
    'reader_memberships', COALESCE((
      SELECT jsonb_agg(to_jsonb(membership) ORDER BY membership.member_name, membership.granted_role)
      FROM reader_memberships membership
    ), '[]'::jsonb),
    'gateway_function', COALESCE((
      SELECT jsonb_build_object(
        'present', true,
        'signature', gateway.schema_name || '.' || gateway.function_name || '(' || gateway.identity_arguments || ')',
        'security_definer', gateway.security_definer,
        'function_settings', to_jsonb(gateway.function_settings),
        'owner_name', gateway.owner_name,
        'owner_superuser', gateway.owner_superuser,
        'owner_bypass_rls', gateway.owner_bypassrls
      ) FROM gateway_function gateway
    ), jsonb_build_object('present', false)),
    'gateway_execute_matrix', COALESCE((
      SELECT jsonb_object_agg(matrix.rolname, matrix.callable ORDER BY matrix.rolname)
      FROM gateway_execute_matrix matrix
    ), '{}'::jsonb),
    'machine_export_functions', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'schema_name', function.schema_name,
        'function_name', function.function_name,
        'identity_arguments', function.identity_arguments,
        'security_definer', function.security_definer,
        'owner_name', function.owner_name,
        'function_settings', to_jsonb(function.function_settings),
        'return_type', function.return_type,
        'volatility', function.volatility,
        'definition_sha256', function.definition_sha256
      ) ORDER BY function.schema_name, function.function_name, function.identity_arguments)
      FROM machine_export_functions function
    ), '[]'::jsonb),
    'denied_role_machine_paths', COALESCE((
      SELECT jsonb_agg(to_jsonb(path) ORDER BY path.subject_role, path.schema_name, path.function_name, path.identity_arguments)
      FROM denied_role_machine_paths path
    ), '[]'::jsonb),
    'reader_callable_functions', COALESCE((
      SELECT jsonb_agg(to_jsonb(function) ORDER BY function.schema_name, function.function_name, function.identity_arguments)
      FROM reader_callable_functions function
    ), '[]'::jsonb),
    'reader_relation_privileges', COALESCE((
      SELECT jsonb_agg(to_jsonb(privilege) ORDER BY privilege.schema_name, privilege.relation_name, privilege.privilege_type)
      FROM reader_relation_privileges privilege
    ), '[]'::jsonb),
    'reader_sequence_privileges', COALESCE((
      SELECT jsonb_agg(to_jsonb(privilege) ORDER BY privilege.schema_name, privilege.relation_name, privilege.privilege_type)
      FROM reader_sequence_privileges privilege
    ), '[]'::jsonb),
    'reader_schema_usage', COALESCE((
      SELECT jsonb_agg(usage.schema_name ORDER BY usage.schema_name)
      FROM reader_schema_usage usage
    ), '[]'::jsonb),
    'public_execute_defaults', COALESCE((
      SELECT jsonb_agg(to_jsonb(defaults) ORDER BY defaults.owner_name)
      FROM public_execute_defaults defaults
    ), '[]'::jsonb)
  ) AS value
)
SELECT jsonb_build_object(
  'schema_version', 'rewireperform-feedback-intelligence-staging-privilege-audit-result-v1',
  'contract_status', 'METADATA_ONLY_UNSIGNED_NOT_ACTIVATED',
  'project_ref', 'zbeswjipayspgvcipzmx',
  'executed_at', pg_catalog.clock_timestamp(),
  'database_name_redacted', true,
  'audit_phase', CASE
    WHEN EXISTS (SELECT 1 FROM reader_role) AND EXISTS (SELECT 1 FROM gateway_function)
      THEN 'POSTDEPLOY_ASSURANCE'
    ELSE 'PREDEPLOY_BASELINE'
  END,
  'data_access', jsonb_build_object(
    'catalog_metadata_only', true,
    'application_rows_read', false,
    'application_functions_called', false,
    'database_mutated', false
  ),
  'evidence', evidence.value
) AS audit_result
FROM evidence;
