// @vitest-environment node

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  resolve(
    process.cwd(),
    "supabase/migrations/20260907073744_allow_internal_test_classification_without_product_authorization.sql",
  ),
  "utf8",
);

describe("internal tester classification through the minor guard", () => {
  it("contains exactly one narrow authorization-independent transition", () => {
    expect(migration).toContain("TG_TABLE_NAME = 'program_instances'");
    expect(migration).toContain("TG_OP = 'UPDATE'");
    expect(migration).toContain("NOT COALESCE((to_jsonb(OLD) ->> 'is_test_instance')::boolean, false)");
    expect(migration).toContain("COALESCE((to_jsonb(NEW) ->> 'is_test_instance')::boolean, false)");
    expect(migration).toContain("to_jsonb(NEW) - 'is_test_instance'");
    expect(migration).toContain("to_jsonb(OLD) - 'is_test_instance'");
    expect(migration).toContain("minor_product_authorization_required");
    expect(migration).toContain("SET search_path = pg_catalog");
    expect(migration).toContain(
      "REVOKE ALL ON FUNCTION minor_auth.enforce_product_write()",
    );
    expect(migration).not.toMatch(/DISABLE\s+TRIGGER|session_replication_role/i);
  });

  it("allows only false-to-true test promotion for an unauthorized identity", async () => {
    const db = new PGlite();
    const unauthorized = "00000000-0000-4000-8000-000000000001";
    const authorized = "00000000-0000-4000-8000-000000000002";

    await db.exec(`
      CREATE ROLE anon;
      CREATE ROLE authenticated;
      CREATE SCHEMA minor_auth;
      CREATE TABLE minor_auth.authorized_users (user_id uuid PRIMARY KEY);
      CREATE FUNCTION minor_auth.is_product_authorized(_user_id uuid)
      RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog AS $$
        SELECT EXISTS (
          SELECT 1 FROM minor_auth.authorized_users item WHERE item.user_id = _user_id
        )
      $$;
      CREATE FUNCTION minor_auth.enforce_product_write()
      RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog AS $$
      DECLARE target_user_id uuid;
      BEGIN
        target_user_id := NULLIF(to_jsonb(NEW) ->> TG_ARGV[0], '')::uuid;
        IF target_user_id IS NULL THEN
          RAISE EXCEPTION 'minor_authorization_user_required';
        END IF;
        IF NOT minor_auth.is_product_authorized(target_user_id) THEN
          RAISE EXCEPTION 'minor_product_authorization_required';
        END IF;
        RETURN NEW;
      END;
      $$;
      CREATE TABLE public.program_instances (
        id uuid PRIMARY KEY,
        user_id uuid NOT NULL,
        status text NOT NULL,
        is_test_instance boolean NOT NULL DEFAULT false
      );
      INSERT INTO public.program_instances(id, user_id, status) VALUES
        ('10000000-0000-4000-8000-000000000001', '${unauthorized}', 'active'),
        ('10000000-0000-4000-8000-000000000002', '${authorized}', 'active');
      INSERT INTO minor_auth.authorized_users(user_id) VALUES ('${authorized}');
      CREATE TRIGGER minor_product_authorization_guard
      BEFORE INSERT OR UPDATE ON public.program_instances
      FOR EACH ROW EXECUTE FUNCTION minor_auth.enforce_product_write('user_id');
    `);

    await db.exec(migration);
    await db.exec(`
      UPDATE public.program_instances
      SET is_test_instance = true
      WHERE user_id = '${unauthorized}';
    `);

    const promoted = await db.query<{ is_test_instance: boolean; status: string }>(`
      SELECT is_test_instance, status
      FROM public.program_instances
      WHERE user_id = '${unauthorized}'
    `);
    expect(promoted.rows).toEqual([{ is_test_instance: true, status: "active" }]);

    await expect(db.exec(`
      UPDATE public.program_instances
      SET is_test_instance = false
      WHERE user_id = '${unauthorized}';
    `)).rejects.toThrow("minor_product_authorization_required");

    await expect(db.exec(`
      UPDATE public.program_instances
      SET status = 'completed'
      WHERE user_id = '${unauthorized}';
    `)).rejects.toThrow("minor_product_authorization_required");

    await expect(db.exec(`
      UPDATE public.program_instances
      SET is_test_instance = true, status = 'completed'
      WHERE user_id = '${unauthorized}';
    `)).rejects.toThrow("minor_product_authorization_required");

    await expect(db.exec(`
      INSERT INTO public.program_instances(id, user_id, status, is_test_instance)
      VALUES ('10000000-0000-4000-8000-000000000003', '${unauthorized}', 'active', true);
    `)).rejects.toThrow("minor_product_authorization_required");

    await db.exec(`
      UPDATE public.program_instances
      SET status = 'completed'
      WHERE user_id = '${authorized}';
    `);
    const authorizedUpdate = await db.query<{ status: string }>(`
      SELECT status FROM public.program_instances WHERE user_id = '${authorized}'
    `);
    expect(authorizedUpdate.rows).toEqual([{ status: "completed" }]);
  });
});
