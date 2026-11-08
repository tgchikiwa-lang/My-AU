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

The migration adds a check constraint permitting `student`, `lecturer`, `admin`, and `records` as `user_roles.role` values. It does not insert, update, delete, or convert role rows, and it does not change table grants or RLS policies.

**Blocking safety issue:** migration `0001_administrator_roles_and_account_access.sql` creates `user_roles.role` with an inline `CHECK (role = 'admin')`. PostgreSQL names this inline constraint `user_roles_role_check` by default. Migration 0004 adds a constraint with that same name but does not drop or replace the existing one. If migrations 0001–0003 were applied as checked in, 0004 is expected to fail because the named constraint already exists. Even if its constraint were given a different name, retaining the old admin-only check would continue to reject the other role values. Do not execute 0004 until the repository maintainers reconcile the migration and journal strategy.

The SQL itself performs no legacy-role promotion. The role assignment effect in a real database cannot be inferred without inspecting its rows.

### `0005_records_admin_read_policy.sql`

The migration replaces the named Records Office read policy on `records_requests` so that callers with either the `records` or `admin` role can read those rows. This broadens read access to administrator accounts compared with the Records-only policy in migration 0003. It does not change role assignments, table grants, insert/update/delete permissions, or the student-owned read policy.

## Role and authorization consistency

- Migration 0001 defines `admin` as the only accepted role; migration 0003 adds Records Office authorization policies that check for `records` but does not update the role constraint.
- Migration 0004 intends to permit `student`, `lecturer`, `admin`, and `records`, but as written it does not safely replace the earlier check.
- Current application server code assigns `records` only through its privileged invitation path and checks `admin` or `records` for privileged operations. The Records Office login guard is named `hasRecordsOfficeAccess`.
- `lecturer` remains a request-routing value for external reference recipients; lecturers submit by a one-time link and code, not through an authenticated lecturer workspace. The current application code does not require an Auth `lecturer` role for that workflow.
- Application role checks and type declarations do not establish which roles are assigned in a live database. No live role rows, custom policies, or extra grants have been inspected.

An ordinary student must not be granted role-table write access. The checked-in migration 0001 grants authenticated users `SELECT` and service role broader access, with an own-row read policy; migration 0004 does not add any write grants. This is a static source review only, not a live authorization test.

## Storage and private-bucket compatibility

Neither migration 0004 nor 0005 creates `student-content`, changes bucket visibility, or changes Storage policies. Migration 0000 defines owner-folder policies for select, insert, and delete, but the migration set does not provision the bucket or establish its `public` setting. Therefore no private-bucket conversion can be claimed as ready.

The application stores files under the authenticated user's UUID folder and uses Storage references/signed URLs for private content. Before provisioning or changing the bucket to private, inspect staging bucket metadata, object paths, and profile JSON for legacy public URLs; test signed viewing/downloads, upload, deletion, and cross-user denial with disposable accounts. Public URLs to objects in a bucket made private may stop working, and the migrations do not rewrite stored profile references. Do not upload student documents or make the bucket public to bypass authorization checks.

## Migration journal and database uncertainty

The checked-in Drizzle journal currently contains entries only for migrations 0000–0003, while SQL files 0004 and 0005 are present. A local `drizzle-kit check` validates the journal it sees; it does not prove that the SQL files were applied, that the live schema matches them, or that migration history is complete.

Before any staging execution:

1. Obtain an authorized, disposable staging project; keep production disconnected.
2. Verify the actual schema, constraint names, roles and role rows, grants, RLS policies, Storage bucket settings/objects, and the database migration-history table.
3. Determine whether 0004/0005 were ever applied outside the checked-in journal and reconcile the repository history without rewriting published migrations.
4. Have maintainers correct and review the duplicate/admin-only constraint problem using a forward-safe plan appropriate to the verified database state.
5. Verify the intended role mapping and explicitly authorize any privilege change. Do not convert external lecturer request recipients into staff accounts.
6. Inventory legacy Storage URLs and objects, then test private access behavior using disposable accounts.
7. Back up staging and obtain explicit approval before applying any migration. Use the team's approved migration procedure only after those checks.

The local staging migration URL is not configured. **Migration execution remains on hold.**
