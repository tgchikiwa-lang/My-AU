# Migration review: current GitHub baseline

## Status and scope

**No migration was applied.** No database connection was made, and no production or staging data was accessed or changed.

This review covers the SQL currently present in the separate GitHub working copy:

- `drizzle/migrations/0004_records_role.sql`
- `drizzle/migrations/0005_records_admin_read_policy.sql`
- `drizzle/migrations/meta/_journal.json`

The previously reviewed `0004_application_roles_and_private_storage.sql` from the extracted copy was **not** carried over: upstream already uses the `0004` and `0005` filenames for different SQL. The actual database schema and applied-migration history remain unverified.

## What the checked-in migrations change

### `0004_records_role.sql`

The migration drops the constraint named `user_roles_role_check` if present, then adds a check permitting `student`, `lecturer`, `admin`, and `records`. It does not insert, update, delete, or convert role rows, and it does not change table grants or RLS policies.

Migration 0001 defines `role text NOT NULL CHECK (role = 'admin')`. PostgreSQL's default name for that single-column check is `user_roles_role_check`, so in a database matching the checked-in 0001 migration, 0004 replaces the admin-only constraint as intended. It is not intrinsically blocked by a duplicate same-named constraint, contrary to an earlier draft of this review.

Before applying, inspect the actual constraints: a schema changed out of band could use a different constraint name, leaving another restrictive check in place. Also verify every existing `user_roles.role` value is among the four permitted values; 0004 does not map or delete rows, and an unexpected value would make the new check fail. The role assignments' privilege effects are none because this migration changes only the accepted-value constraint.

### `0005_records_admin_read_policy.sql`

The migration replaces the named Records Office read policy on `records_requests` so that callers with either the `records` or `admin` role can read those rows. This broadens read access to administrator accounts compared with the Records-only policy in migration 0003. It does not change role assignments, table grants, insert/update/delete permissions, or the student-owned read policy.

## Role and authorization consistency

- Migration 0001 defines `admin` as the only accepted role; migration 0003 adds Records Office authorization policies that check for `records` but does not update the role constraint.
- Migration 0004 replaces the expected `admin`-only check with a check accepting `student`, `lecturer`, `admin`, and `records`.
- Current application server code assigns `records` only through its privileged invitation path and checks `admin` or `records` for privileged operations. The Records Office login guard is named `hasRecordsOfficeAccess`.
- The database still has lecturer verification-request read and review policies created in migration 0002. Migration 0003 adds Records Office policies but does not remove the lecturer policies; PostgreSQL permissive policies combine with OR semantics. Therefore, although there is no lecturer login/reviewer UI in the active app, the `lecturer` role remains an active database authorization path and must not be removed from the allowed-role constraint until maintainers decide whether that review path is obsolete and explicitly remove or replace its policies in a safe forward migration.
- Separately, `lecturer` is a request-routing value for external reference recipients: lecturers submit by a one-time link and code, not through an authenticated lecturer workspace. This workflow does not itself require an Auth `lecturer` role. Do not conflate this request value with the still-present lecturer verification RLS policies.
- The `student` value is permitted by migration 0004, but current app code does not assign a student row in `user_roles`; ordinary student accounts are identified by their Auth/profile and account-access records. The generated Supabase `user_roles.role` field is currently a generic string, not a TypeScript role union.
- Application role checks and type declarations do not establish which roles are assigned in a live database. No live role rows, custom policies, or extra grants have been inspected.

An ordinary student must not be granted role-table write access. The checked-in migration 0001 grants authenticated users `SELECT` and service role broader access, with an own-row read policy; migration 0004 does not add any write grants. This is a static source review only, not a live authorization test.

## Storage and private-bucket compatibility

Neither migration 0004 nor 0005 creates `student-content`, changes bucket visibility, or changes Storage policies. Migration 0000 defines owner-folder policies for select, insert, and delete, but the migration set does not provision the bucket or establish its `public` setting. Therefore no private-bucket conversion can be claimed as ready.

The application stores files under the authenticated user's UUID folder and uses Storage references/signed URLs for private content. Before provisioning or changing the bucket to private, inspect staging bucket metadata, object paths, and profile JSON for legacy public URLs; test signed viewing/downloads, upload, deletion, and cross-user denial with disposable accounts. Public URLs to objects in a bucket made private may stop working, and the migrations do not rewrite stored profile references. Do not upload student documents or make the bucket public to bypass authorization checks.

## Migration journal and database uncertainty

The checked-in Drizzle journal currently contains entries only for migrations 0000–0003, while SQL files 0004 and 0005 are present. Git history confirms 0004 was introduced in commit `616bb86` and 0005 in `6014559`, without matching journal entries. A local `drizzle-kit check` validates the registered journal; it does not detect or prove execution of these unregistered SQL files, nor does it prove that the live schema or migration history matches them.

The intended order, if target history confirms all earlier migrations are applied and these two are still pending, is **0004 then 0005**. Migration 0005 alters the exact `"Records read all records requests"` policy created in migration 0003; it therefore depends on 0003's schema/policy being present. It expands read access on `records_requests` from Records-only to Records plus admin; it does not alter role assignments or write access.

Do not append 0004/0005 to the journal merely because the files exist. First compare every target's Drizzle migration ledger and actual schema with the checked-in migrations. If both SQL files are unapplied and the target matches the expected 0003 state, add journal entries at indices 4 and 5, with the exact tags `0004_records_role` and `0005_records_admin_read_policy`, following the existing version-7 metadata conventions; then test execution only on authorized staging. If either SQL file was applied out of band, do not register it as pending and risk rerunning it; reconcile migration bookkeeping using a documented, version-appropriate procedure after confirming the actual effects. If the schema differs or environments have inconsistent histories, prepare a forward-safe reconciliation plan for the verified state rather than editing applied migrations or blindly replaying these files.

Before any staging execution:

1. Obtain an authorized, disposable staging project; keep production disconnected.
2. Verify the actual schema, all role constraint names and role values, assigned roles, grants, RLS policies, Storage bucket settings/objects, and the database migration-history table.
3. Determine whether 0004/0005 were ever applied outside the checked-in journal and reconcile migration bookkeeping without rewriting published migrations.
4. Confirm the four allowed database role values are intended. Decide separately whether the lecturer verification policies remain a supported workflow; only remove them through a reviewed forward migration after checking assigned lecturer accounts and operational needs.
5. Inventory legacy Storage URLs and objects. The checked-in migration set has owner-folder Storage policies but does not create `student-content` or set its privacy; prepare a separate, reviewed bucket-provisioning/private-access migration or approved setup procedure after the existing bucket state and legacy links are known.
6. Test private access behavior, role boundaries, and migration effects with disposable accounts; back up staging and obtain explicit approval before applying any migration.

The local staging migration URL is not configured. **Migration execution remains on hold.**
