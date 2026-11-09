# My-AU implementation roadmap

## Current working-copy status

This roadmap reflects the separate GitHub clone at `security/remove-public-env-and-merge-repairs`, not just the earlier extracted ZIP. Changes are on the local branch and have not been pushed. The original extracted project and its `.env` were preserved.

### Completed in this working copy

- Added `.env`/`.env.*` ignore rules while allowing `.env.example`; `.env` is removed from the local branch's current tree while its local copy remains on disk.
- Added a blank `.env.example` containing variable names only.
- Removed runtime sample-profile initialization. `StoreProvider` now loads an authenticated user's profile, creates an empty profile if the owner row is absent, treats an empty object as an onboarding state, and exposes retryable load errors.
- Added profile completeness state and a completion prompt with required-field validation in the overview.
- Kept the sample student data only as a test fixture and added empty-profile/completion tests.
- Replaced missing Lovable-hosted image references on the welcome and sign-in backgrounds with the existing local `src/assets/campus.jpg`.
- Renamed `isLecturer` to `hasRecordsOfficeAccess` in `src/routes/staff-login.tsx` and updated its consumer in `src/routes/staff.tsx`.
- Excluded the duplicate `lindsay-contribution-snapshot/` from the root lint scan; set Prettier's line-ending mode to `auto` to handle Windows checkout line endings; formatted only source/config files changed by this branch.
- Updated the migration review to describe the actual upstream 0004/0005 SQL, missing journal entries, surviving lecturer review policies, and safe reconciliation sequence. No migration file was changed, and none was applied.
- Prepared migration 0006 for approved student signup, fail-closed enabled-account checks, and idempotent backfill of existing Auth accounts; deliberately left the Drizzle journal unchanged pending migration-history verification.
- Updated the signup confirmation and removed the StoreProvider's pending-approval denial messaging. Updated `AGENTS.md` to reflect the new account-access invariant.

## Verification on the GitHub clone

These are results from the current clone after the code changes:

- TypeScript (`node .\node_modules\typescript\bin\tsc --noEmit`): **passed**.
- Tests (`npm run test`): **passed, 5 files / 22 tests**.
- Production build (`npm run build`): **passed**. Existing Vite path-plugin and TanStack Start `inputValidator()` deprecation notices remain.
- Drizzle journal (`npm exec -- drizzle-kit check`): **passed** (“Everything's fine”). This checks the checked-in journal only; it does not connect to a database.
- Full ESLint (`npm run lint`): **not clean** — **1,105 errors and 20 warnings** remain in the full repository. The 1,105 errors are Prettier formatting violations in existing, otherwise untouched files; the source/config files modified by this branch were formatted and targeted ESLint reports **0 errors and 5 Fast Refresh warnings**. No unrelated files were mass-formatted. A repository-wide formatting cleanup should be a separate reviewed change.
- `git diff --check`: **passed**.

No live database, production environment, student account, or Storage object was accessed. The checks do not verify registration, email confirmation, Records Office approval, authenticated profile persistence, RLS, or private Storage end to end.

## Instant student account access

- New signup and the existing admin invite path use the Auth signup trigger; migration `0006_auto_approve_active_students.sql` sets new account records to `pending_approval = false`.
- The migration backfills missing profile/access rows from `auth.users` and approves existing access records only where `disabled_at IS NULL`. It maps currently active Auth bans (`banned_until > now()`) to a non-null `disabled_at`, including missing access rows, so Auth-banned users do not become enabled by the backfill. Verify `auth.users.banned_until` semantics on staging before execution.
- `account_is_enabled()` will require an authenticated user plus an existing, non-disabled access row. Pending status is no longer an access restriction. Existing profile/storage restrictive RLS continues using the function and ownership policies are unchanged.
- No student import feature exists. The backfill covers accounts already in Auth; future imports must go through the supported Auth trigger or create approved access rows explicitly.
- Signup confirmation explains that staff approval is not needed and that email confirmation may still be requested; Supabase email-confirmation settings are unchanged.
- Unit/source-contract tests cover the migration SQL requirements, signup text, and unchanged ownership/restrictive policy definitions. They do not execute SQL or prove live database behavior.
- Migration 0006 is **not database-ready**: the journal still lacks 0004/0005 and actual applied history is unknown. Keep it unregistered/unapplied until the reconciliation procedure in [`MIGRATION_REVIEW_0004.md`](./MIGRATION_REVIEW_0004.md) is completed on verified staging.
- Follow-up checks: TypeScript passed; 6 test files / 27 tests passed; targeted ESLint on signup/store/new test reported 0 errors and 4 Fast Refresh warnings; production build passed with existing Vite/TanStack deprecation notices; `drizzle-kit check` passed against only the existing 0000–0003 journal.
- Full-project ESLint was not rerun for this scoped change. The preceding full-project run reported 1,105 Prettier errors and 20 warnings before the signup-page formatting change, so the current full-project total is unknown; this feature's modified TS/TSX/test files pass targeted lint.
- No migration or database operation was executed; end-to-end signup, email confirmation, disabled-account behavior, and profile access remain unverified without an authorized staging environment.

## Public environment-file remediation

- The public GitHub repository tracks `.env`; it is removed from the local branch's publication change set, while the local file remains present and ignored.
- `.gitignore` now ignores `.env` and `.env.*` but permits `.env.example`.
- `.env.example` contains only blank variable assignments. Its names include browser Supabase settings and server-only migration/service-role settings; no values are included.
- A no-values scan of the available `.env` history found public/publishable Supabase configuration only, not a database password, service-role key, or other privileged credential. **No private credential rotation is indicated by that scan.** It does not cover credentials stored elsewhere.
- The public repository still contains historical `.env` revisions. Removing `.env` in a new commit will remove it from the current published tree only; it will not erase old history. Do not rewrite history. If any private credential is found in another source, rotate it with its provider before use.
- **Security task status:** included in the local change set but not yet published. The public repository will stop tracking `.env` only after the user reviews and pushes the commit.

## Migration and database hold

The GitHub clone contains `0004_records_role.sql` and `0005_records_admin_read_policy.sql`, but the Drizzle journal lists only 0000–0003. Migration 0004 drops the expected `user_roles_role_check` constraint from 0001 and replaces it with a check allowing `student`, `lecturer`, `admin`, and `records`; it does not change role rows. Verify actual constraint names and current role values before applying. Migration 0005 broadens the `records_requests` read policy to admin and Records Office users.

The nominal order is 0004 then 0005 after migrations 0000–0003. Migration 0005 alters the policy created by 0003, so depends on that baseline. Do not register these files in the Drizzle journal until maintainers confirm whether they were applied out of band and verify the target's actual migration ledger/schema. If both are pending on a database matching 0003, register them in index order using the project's Drizzle metadata conventions. If either was already applied, reconcile bookkeeping without scheduling a replay. No migration was applied during this work.

The `lecturer` role remains referenced by verification-request RLS policies created in migration 0002. Although the active UI has no lecturer reviewer login and lecturers receive reference requests by one-time link, those policies still form an authorization path. Do not remove the role or policies until maintainers review assigned accounts and decide whether that reviewer capability is obsolete. Current generated Supabase types model `user_roles.role` as a generic string; app code grants `records` only through the privileged admin invitation path, and does not assign `student` role rows. Narrowing the type to the database's accepted role set is a possible small follow-up, but must be coordinated with regenerating these generated types.

Migration 0000 scopes Storage object operations to the owner's UUID folder, but none of migrations 0000–0005 creates the `student-content` bucket or marks it private. After inspecting actual bucket metadata, objects, and public URLs, prepare a separate reviewed bucket-provisioning/private-access migration or approved setup procedure. Preserve owner-folder select/insert/delete and restrictive enabled-account policies. Do not turn a live public bucket private before evaluating legacy links.

The actual database schema, applied-migration history, role rows, grants, RLS policies, bucket metadata, and existing Storage objects are unverified. Keep migration execution on hold until an authorized staging connection is configured, history and schema are reconciled, role assignments and file references are reviewed, and staging is backed up. Do not connect to production or run `drizzle-kit migrate` as part of this preparation.

## Remaining work before a staging demo

1. Review and publish code only through the normal branch/PR process; the `.env` file remains excluded and its local copy is preserved.
2. Configure an authorized disposable staging Supabase project, email confirmation, and server-only credentials through a trusted secret store. Do not place privileged values in source or browser variables.
3. Verify staging's actual schema, applied migrations, role assignments, table grants, RLS, bucket visibility, object paths, and legacy profile URLs before changing anything.
4. Reconcile 0004/0005 migration records first, then review/register/apply 0006 only in authorized staging.
5. Test signup, email confirmation, automatic access, legacy pending-row backfill, disable/enable, profile save/refresh, cross-user denial, and Storage upload/download/delete using disposable accounts only.
6. Decide separately whether to normalize formatting across the existing upstream source; avoid mixing a repository-wide reformat into this security/application repair.
