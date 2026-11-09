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

## Follow-up: automatic student access (migration 0006)

**Prepared, not applied. Not yet database-ready.** The new [`drizzle/migrations/0006_auto_approve_active_students.sql`](./drizzle/migrations/0006_auto_approve_active_students.sql) makes these changes transactionally:

- Replaces `create_student_profile()` so Auth signup creates the owner profile if absent and upserts `account_access` with `pending_approval = false`, Auth email, and the name metadata. The conflict update does not modify `disabled_at`, `disabled_reason`, or `updated_by`, so an existing disable remains in effect.
- Replaces `account_is_enabled()` with a fail-closed check: a non-null authenticated user must have an `account_access` row whose `disabled_at` is null. `pending_approval` no longer gates access. The function's prior execution revocations/grants are explicitly retained.
- Backfills missing profile rows and missing access rows from `auth.users`, using Auth email/name and approved status. Users with an active Auth ban (`banned_until > now()`) receive a non-null `disabled_at`; existing access rows for currently banned users are likewise kept disabled. Conflicts do not create duplicates.
- Clears `pending_approval` only for existing rows where `disabled_at IS NULL`. It never clears `disabled_at`; for a currently banned account with no disable timestamp, it records one rather than granting access.

The existing application's account-disable operation writes `disabled_at` before/with its Auth ban; the migration preserves that state and also fails closed when it finds an active Auth ban without a corresponding timestamp. Verify that the target Supabase Auth schema exposes `auth.users.banned_until` with the expected timestamp semantics before execution. The migration does not alter ownership RLS policies; existing restrictive profile and Storage policies continue to call `account_is_enabled()`, and owner-folder checks remain unchanged.

The repository has no student-import feature. The migration backfill handles existing Auth accounts, including imported users already present in `auth.users`. Future account creation via Supabase Auth signup or the existing privileged invite path will invoke the trigger and start approved. Any future import path must create Auth users through the supported Auth API/trigger or explicitly create profile/access rows with `pending_approval = false`; no import system was added here.

The signup confirmation now tells students they may sign in without staff approval and to confirm email if requested; email-confirmation configuration is unchanged. The prior `StoreProvider` pending-specific denial copy was removed; it still reports disabled access.

### Journal/release gate for migration 0006

The journal remains unchanged because 0004 and 0005 are still unregistered and their target execution state is unknown. Migration 0006 must **not** be registered or applied yet. After verifying the staging migration ledger and schema:

1. If migrations 0004 and 0005 were not applied, reconcile their journal entries at indices 4 and 5, in SQL order, following the checked-in version-7 journal format; review the target state before running them.
2. If either was applied out of band, reconcile the bookkeeping without scheduling a replay; use a forward-safe reconciliation if the actual schema differs.
3. Verify `auth.users.banned_until` exists and review current Auth bans against `account_access.disabled_at`, especially accounts missing access rows. Confirm the migration's mapping preserves the intended disabled state.
4. Only once the migration history and Auth schema are reconciled, register `0006_auto_approve_active_students` as the next entry (index 6), verify the generated migration metadata and run it only against explicitly authorized staging.
5. Validate signup, pending legacy records, Auth/database ban consistency, account disable/enable and owner-isolation using disposable staging users. Production remains out of scope.

Until that review is complete, the SQL file and source-level tests do not establish that the database is ready or that the migration has run.

### Code-level verification for this follow-up

- TypeScript check: passed.
- Automated tests: passed, 6 files / 27 tests.
- Targeted ESLint on `src/routes/signup.tsx`, `src/lib/store.tsx`, and `src/test/instant-account-access.test.ts`: 0 errors, 4 Fast Refresh warnings in `store.tsx`.
- Production build: passed; existing Vite path-plugin and TanStack Start validator deprecation notices remain.
- `drizzle-kit check`: passed for the existing journal entries 0000–0003 only. It does not register or execute SQL 0004–0006.

The migration behavior tests inspect SQL and source contracts; no SQL was executed and no authenticated student workflow was tested.
