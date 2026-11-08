# My-AU implementation roadmap

## Current working-copy status

This roadmap reflects the separate GitHub clone at `security/remove-public-env-and-merge-repairs`, not just the earlier extracted ZIP. Changes are on the local branch and have not been pushed. The original extracted project and its `.env` were preserved.

### Completed in this working copy

- Added `.env`/`.env.*` ignore rules while allowing `.env.example`; staged `.env` for removal from the next Git revision while keeping the local file on disk.
- Added a blank `.env.example` containing variable names only.
- Removed runtime sample-profile initialization. `StoreProvider` now loads an authenticated user's profile, creates an empty profile if the owner row is absent, treats an empty object as an onboarding state, and exposes retryable load errors.
- Added profile completeness state and a completion prompt with required-field validation in the overview.
- Kept the sample student data only as a test fixture and added empty-profile/completion tests.
- Replaced missing Lovable-hosted image references on the welcome and sign-in backgrounds with the existing local `src/assets/campus.jpg`.
- Renamed `isLecturer` to `hasRecordsOfficeAccess` in `src/routes/staff-login.tsx` and updated its consumer in `src/routes/staff.tsx`.
- Excluded the duplicate `lindsay-contribution-snapshot/` from the root lint scan; set Prettier's line-ending mode to `auto` to avoid Windows checkout line-ending errors.
- Updated the migration review to describe the actual upstream 0004/0005 SQL and their missing journal entries. No migration file was changed, and none was applied.

## Verification on the GitHub clone

These are results from the current clone after the code changes:

- TypeScript (`node .\node_modules\typescript\bin\tsc --noEmit`): **passed**.
- Tests (`npm run test`): **passed, 5 files / 22 tests**.
- Production build (`npm run build`): **passed**. Existing Vite path-plugin and TanStack Start `inputValidator()` deprecation notices remain.
- Drizzle journal (`npm exec -- drizzle-kit check`): **passed** (“Everything's fine”). This checks the checked-in journal only; it does not connect to a database.
- Full ESLint (`npm run lint`): **not clean**. After excluding the duplicate snapshot and accounting for Windows line endings, it reports **1,289 Prettier formatting errors and 20 warnings** across the current upstream source. The upstream source style does not match the repository's Prettier formatting settings. A broad auto-format would create unrelated changes, so it was not run. Review/agree on the project's intended formatting baseline before a separate formatting cleanup.
- `git diff --check`: **passed**.

No live database, production environment, student account, or Storage object was accessed. The checks do not verify registration, email confirmation, Records Office approval, authenticated profile persistence, RLS, or private Storage end to end.

## Public environment-file remediation

- The public GitHub repository tracks `.env`; it is removed from the local branch's publication change set, while the local file remains present and ignored.
- `.gitignore` now ignores `.env` and `.env.*` but permits `.env.example`.
- `.env.example` contains only blank variable assignments. Its names include browser Supabase settings and server-only migration/service-role settings; no values are included.
- A no-values scan of the available `.env` history found public/publishable Supabase configuration only, not a database password, service-role key, or other privileged credential. **No private credential rotation is indicated by that scan.** It does not cover credentials stored elsewhere.
- The public repository still contains historical `.env` revisions. Removing `.env` in a new commit will remove it from the current published tree only; it will not erase old history. Do not rewrite history. If any private credential is found in another source, rotate it with its provider before use.
- **Security task status:** included in the local change set but not yet published. The public repository will stop tracking `.env` only after the user reviews and pushes the commit.

## Migration and database hold

The GitHub clone contains `0004_records_role.sql` and `0005_records_admin_read_policy.sql`, but the Drizzle journal lists only 0000–0003. Migration 0004 adds a role constraint without dropping the admin-only constraint created by 0001; if the checked-in 0001 was applied as written, the new same-named constraint is expected to fail. Migration 0005 broadens the `records_requests` read policy to admin and Records Office users. Neither migration creates or privatizes the `student-content` bucket.

The actual database schema, applied-migration history, role rows, grants, RLS policies, bucket metadata, and existing Storage objects are unverified. Keep migration execution on hold until an authorized staging connection is configured, the journal discrepancy and constraint issue are reconciled, existing role assignments and file references are reviewed, and the staging target is backed up. Do not connect to production or run `drizzle-kit migrate` as part of this preparation.

## Remaining work before a staging demo

1. Review the local diff and proposed commit; confirm `.env` removal and secret-free `.env.example`.
2. Resolve the 0004/0005 journal and constraint inconsistencies with the repository/database maintainer before any staging migration.
3. Configure an authorized disposable staging Supabase project, email confirmation, and server-only credentials through a trusted secret store. Do not place privileged values in source or browser variables.
4. Verify staging's actual schema, applied migrations, role assignments, table grants, RLS, bucket visibility, object paths, and legacy profile URLs before changing anything.
5. After approved staging setup, test registration, confirmation, approval, login/logout, profile completion/save/refresh, cross-user access denial, and Storage upload/download/delete using disposable accounts only.
6. Decide separately whether to normalize formatting across the existing upstream source; avoid mixing a repository-wide reformat into this security/application repair.
