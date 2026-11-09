import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  resolve(process.cwd(), "drizzle/migrations/0006_auto_approve_active_students.sql"),
  "utf8",
);
const signup = readFileSync(resolve(process.cwd(), "src/routes/signup.tsx"), "utf8");
const profilesMigration = readFileSync(
  resolve(process.cwd(), "drizzle/migrations/0000_student_profiles_and_private_content.sql"),
  "utf8",
);
const accessMigration = readFileSync(
  resolve(process.cwd(), "drizzle/migrations/0001_administrator_roles_and_account_access.sql"),
  "utf8",
);

describe("automatic student account access migration", () => {
  it("creates profiles and approved account-access rows idempotently from Auth signup", () => {
    expect(migration).toMatch(
      /INSERT INTO public\.profiles\(id\)[\s\S]*?ON CONFLICT \(id\) DO NOTHING/,
    );
    expect(migration).toMatch(
      /INSERT INTO public\.account_access\(user_id, pending_approval, email, full_name\)[\s\S]*?VALUES \([\s\S]*?NEW\.id,\s*false,[\s\S]*?NEW\.email[\s\S]*?raw_user_meta_data->>'name'[\s\S]*?ON CONFLICT \(user_id\) DO UPDATE/i,
    );
    expect(migration).toMatch(
      /SET pending_approval = false,[\s\S]*?email = EXCLUDED\.email,[\s\S]*?full_name = EXCLUDED\.full_name/,
    );
    const signupTrigger = migration.match(
      /CREATE OR REPLACE FUNCTION public\.create_student_profile\(\)([\s\S]*?)CREATE OR REPLACE FUNCTION public\.account_is_enabled/,
    )?.[1];
    expect(signupTrigger).toBeDefined();
    expect(signupTrigger).not.toMatch(/disabled_at\s*=/i);
  });

  it("requires an authenticated user and an existing non-disabled access row", () => {
    const functionBody = migration.match(
      /CREATE OR REPLACE FUNCTION public\.account_is_enabled\(\)([\s\S]*?)REVOKE ALL ON FUNCTION/,
    )?.[1];
    expect(functionBody).toBeDefined();
    expect(functionBody).toMatch(/auth\.uid\(\)\s+IS NOT NULL/);
    expect(functionBody).toMatch(
      /AND EXISTS\s*\([\s\S]*?FROM public\.account_access[\s\S]*?disabled_at IS NULL/,
    );
    expect(functionBody).not.toMatch(/pending_approval/);
  });

  it("backfills profiles and access rows without enabling disabled accounts", () => {
    expect(migration).toMatch(
      /INSERT INTO public\.profiles\(id\)[\s\S]*?FROM auth\.users AS users[\s\S]*?ON CONFLICT \(id\) DO NOTHING/,
    );
    expect(migration).toMatch(
      /INSERT INTO public\.account_access\(user_id, pending_approval, email, full_name, disabled_at\)[\s\S]*?false,[\s\S]*?CASE WHEN users\.banned_until > now\(\) THEN now\(\) END[\s\S]*?FROM auth\.users AS users[\s\S]*?ON CONFLICT \(user_id\) DO NOTHING/,
    );
    expect(migration).toMatch(
      /UPDATE public\.account_access AS access[\s\S]*?SET disabled_at = coalesce\(access\.disabled_at, now\(\)\)[\s\S]*?users\.banned_until > now\(\)/,
    );
    expect(migration).toMatch(
      /UPDATE public\.account_access[\s\S]*?SET pending_approval = false[\s\S]*?WHERE disabled_at IS NULL\s+AND pending_approval/,
    );
    expect(migration).not.toMatch(/UPDATE public\.account_access[\s\S]*?SET disabled_at = null/i);
  });

  it("retains the existing owner and enabled-account restrictive policies", () => {
    expect(profilesMigration).toMatch(/auth\.uid\(\) = id/);
    expect(accessMigration).toMatch(
      /Disabled accounts cannot access profiles[\s\S]*?account_is_enabled\(\)/,
    );
    expect(accessMigration).toMatch(
      /Disabled accounts cannot access student uploads[\s\S]*?account_is_enabled\(\)/,
    );
    expect(migration).not.toMatch(/CREATE POLICY|DROP POLICY|ALTER POLICY/i);
  });

  it("does not claim staff approval is required after registration", () => {
    expect(signup).toContain("Your account has been created.");
    expect(signup).toContain("Confirm your email if requested");
    expect(signup).toContain("No staff approval is required.");
    expect(signup).not.toContain("verify your registration before your profile is activated");
    expect(signup).toMatch(/to="\/auth">\s*Go to sign in\s*<\/Link>/);
  });
});
