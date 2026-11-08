# My-AU Student Profile Project - Technical Audit

> **Implementation follow-up:** This report began as a pre-repair audit. Section L records the subsequent code changes and final checks; it supersedes earlier statements about lint/type-check failures, the sample-profile fallback, role consistency, and image 404s.
>
> **GitHub working-copy addendum:** The current branch was created from a newer public GitHub checkout than the earlier extracted ZIP. Section N supersedes prior repository/migration/environment-file claims where the two copies differ.

**Audit date:** 2026-11-08
**Scope:** Extracted project root `My-AU-main` and its checked-in source/configuration. No application source, database schema, security policy, or production data was modified.

## A. Executive summary

My-AU is a React 19 / TypeScript student-profile web application built on TanStack Start and Vite. Its frontend uses Supabase Auth, PostgREST, and Supabase Storage. TanStack Start server functions provide privileged administrator and Records Office operations. SQL migrations define owner-scoped profiles, account access, verification requests, and Records Office requests.

The local website **does run**. The welcome page and public login/registration pages load in a browser at `http://127.0.0.1:8080/`. Unauthenticated visits to protected student routes redirect to login. The welcome page and authentication backgrounds each request image assets from a Lovable asset URL that returns 404 in local development.

The configured Supabase Auth and PostgREST endpoints are reachable (read-only HTTP checks returned 200). The checked-in code contains real profile reads/writes; this is not just a localStorage application. However, no authorized student or staff account was available, so registration, login, profile retrieval/update, Storage access, and cross-account isolation were **not** exercised against a real authenticated session. The live project's migration state and Storage bucket setup could not be inspected.

The most important source-level blocker is a mismatch between the database role constraint and the Records Office role used by the application: the initial migration permits only the `admin` role, while later code attempts to assign and check `records`. If the checked-in migrations define the deployed table, Records Office role assignment fails and the Records Office workflow cannot be used. A second data correctness problem is that newly triggered profile rows start with `{}`, which fails the profile schema and causes the app to fill some fields from a hard-coded demo student.

**Assessment:** broad interface and feature coverage, but **not ready for a reliable course demonstration of end-to-end account/profile workflows** until the role/schema mismatch and new-profile fallback are resolved and real authenticated flows are tested. This is an audit finding, not a code change.

## B. Repository structure and architecture

### Project layout

| Path | Role |
|---|---|
| [`src/routes/`](./src/routes/) | TanStack file-based routes; public, student, administrator, Records Office, and reference pages |
| [`src/components/`](./src/components/) | Shared portal shell, profile backup, verification badge, and UI components |
| [`src/lib/`](./src/lib/) | Student profile state, data validation, cloud files, and server functions |
| [`src/integrations/supabase/`](./src/integrations/supabase/) | Browser, server, and authenticated-request Supabase setup |
| [`drizzle/migrations/`](./drizzle/migrations/) | Four SQL migrations for profiles, access, verification, and Records Office requests |
| [`drizzle/schema.ts`](./drizzle/schema.ts) | Empty generated Drizzle schema file; it does not define the checked-in SQL schema |
| [`supabase/config.toml`](./supabase/config.toml) | Supabase project ID only; no local bucket or migration configuration |
| [`public/`](./public/) | Public static files |
| [`src/test/`](./src/test/) | Unit and route-matching tests |
| [`lindsay-contribution-snapshot/`](./lindsay-contribution-snapshot) | A second, older project snapshot with its own `package-lock.json`; it is not the active root |

The root project has 107 files under `src`; the nested snapshot has 100. The root contains seven additional source files (including registration, results, references, and their supporting code), and 16 common source files differ. Both package manifests are identical. Running the configured `eslint .` command also includes this nested duplicate.

### Technology and entry points

- **Frontend:** React 19, TypeScript, Tailwind CSS 4, Radix/shadcn-style UI components, TanStack Router/Start, React Query.
- **Backend:** TanStack Start server functions; there is no separate Express, Next.js API, or standalone server application.
- **Database/auth/storage:** Supabase Auth, PostgreSQL through Supabase PostgREST, and Supabase Storage.
- **ORM/migrations:** Drizzle Kit is configured, but the application itself uses `@supabase/supabase-js`; `drizzle/schema.ts` is intentionally blank and the SQL migration files hold the actual schema.
- **Package manager:** root has `bun.lock` and `bunfig.toml`. Bun was not installed initially; it was provisioned through npm for the frozen-lockfile install. README instructions say `npm i`, but there is no root `package-lock.json`. The nested snapshot has a separate npm lockfile.
- **Entrypoints:** [`src/router.tsx`](./src/router.tsx), [`src/routes/__root.tsx`](./src/routes/__root.tsx), [`src/start.ts`](./src/start.ts), and [`src/server.ts`](./src/server.ts).
- **Tests/build:** Vitest, ESLint, Vite build. There is no dedicated TypeScript-check script, database migration script, integration test, or browser-test script.

### Intended request/data architecture

1. Browser pages call Supabase Auth and browser Supabase client operations.
2. Student pages use `StoreProvider` to load the signed-in user's `profiles.data` JSONB record and save profile changes back to that same row.
3. Profile photos, club photos, and CV files are uploaded to the `student-content` Storage bucket under a user-ID folder.
4. Administrator and Records Office server functions attach the signed-in user's bearer token, validate the caller and role, and dynamically load the server-only service-role client for privileged operations.
5. Row Level Security (RLS) is intended to scope student profile and file access to the owning user.

This architecture is present in source. Whether the migrations and bucket configuration have been applied to the live Supabase project is unknown.

## C. Lovable evidence

**Confirmed evidence that the project is connected to/uses Lovable:**

- [`README.md`](./README.md) explicitly says the project was built with Lovable and links to a Lovable project.
- [`.lovable/project.json`](./.lovable/project.json) contains the `tanstack_start_ts_current` Lovable template/revision metadata.
- [`package.json`](./package.json) depends on `@lovable.dev/vite-tanstack-config`, which is imported by [`vite.config.ts`](./vite.config.ts).
- The `*.jpg.asset.json` files in `src/assets` reference Lovable's `/__l5e/assets-v1/...` asset paths.

This supports that the project was created or maintained through Lovable. It does **not** establish which individual components were generated versus manually written. The extracted ZIP has no `.git` directory, so commit history and authorship are unavailable. The provided GitHub repository URL returned 404 from the GitHub API in this audit; that can mean unavailable/private or nonexistent and does not prove the repository's history. The README's Lovable editor link is not a published application URL. No public deployment URL was identified.

## D. Existing features

Status definitions follow the requested categories. `WORKING AND VERIFIED` means exercised in the local browser or test runner; it does not imply a live authenticated database test.

| Feature | Status | Evidence / files | Problem | Recommended action |
|---|---|---|---|---|
| AU welcome page and public navigation | WORKING AND VERIFIED | [`src/routes/index.tsx`](./src/routes/index.tsx) | Browser returned 200; links target student, Records Office, and admin sign-in. Main campus image returned 404 locally. | Restore/serve the referenced Lovable image assets for a complete local demo. |
| Responsive public layout | PARTIALLY IMPLEMENTED | [`src/routes/index.tsx`](./src/routes/index.tsx), [`src/styles.css`](./src/styles.css) | Browser check at 390px and 1440px found no horizontal overflow on the homepage. Protected-page/mobile navigation was not tested with an authenticated session. | Recheck every authenticated page at mobile/tablet sizes after login is available. |
| About/contact pages | MISSING | `src/routes` route inventory | No such routes exist. They are not stated as mandatory in the checked-in project brief. | Add only if the course brief requires them. |
| Student registration and email confirmation | PARTIALLY IMPLEMENTED | [`src/routes/signup.tsx`](./src/routes/signup.tsx), migration `0003` | Form validates basic inputs and calls Supabase `signUp`; confirmation and Records approval are described. No account was created in this audit. | Test with an authorized disposable test account after verifying migrations and Records role setup. |
| Student sign-in and session persistence | PARTIALLY IMPLEMENTED | [`src/routes/auth.tsx`](./src/routes/auth.tsx), [`src/integrations/supabase/client.ts`](./src/integrations/supabase/client.ts) | Uses `signInWithPassword`; Supabase client enables persisted sessions. No credential-based test was possible. | Verify login, refresh persistence, errors, and logout using a test account. |
| Protected student routes | WORKING AND VERIFIED (unauthenticated redirect) | [`src/routes/_authenticated/route.tsx`](./src/routes/_authenticated/route.tsx) | Browser navigation to `/overview` and `/skills` without a session ended at the login page. Authenticated access was not tested. | Test enabled, pending, and disabled accounts after database setup is confirmed. |
| Password recovery and password change | PARTIALLY IMPLEMENTED | [`src/routes/forgot-password.tsx`](./src/routes/forgot-password.tsx), [`src/routes/reset-password.tsx`](./src/routes/reset-password.tsx), [`src/routes/_authenticated/security.tsx`](./src/routes/_authenticated/security.tsx), `src/lib/recovery-session.ts` | Recovery callback validation and password update code exist; email delivery and token lifecycle were not tested. | Verify with test email and provider redirect configuration. |
| Student profile, digital ID, and profile editing | PARTIALLY IMPLEMENTED | [`src/routes/_authenticated/overview.tsx`](./src/routes/_authenticated/overview.tsx), [`src/lib/store.tsx`](./src/lib/store.tsx) | Overview has editable profile details and a QR ID explicitly labeled a demonstration ID. New empty rows trigger a hard-coded demo-profile fallback. Persistence not tested with a student session. | Replace demo fallback with a valid empty profile and verify round-trip persistence. |
| Skills and projects | PARTIALLY IMPLEMENTED | [`src/routes/_authenticated/skills.tsx`](./src/routes/_authenticated/skills.tsx), [`src/routes/_authenticated/projects.tsx`](./src/routes/_authenticated/projects.tsx) | Add/delete/search and project GitHub-link UI update shared state. Cloud save depends on profile loading and Supabase. | Validate actual save, reload, and deletion with test data. |
| Academic history, achievements, certificates | PARTIALLY IMPLEMENTED | [`src/routes/_authenticated/academics.tsx`](./src/routes/_authenticated/academics.tsx) | Add/delete interfaces and data structures exist; no live profile save was verified. | Test persistence and input validation; no formal edit-existing-item UI is present. |
| Clubs, associations, activities and photos | PARTIALLY IMPLEMENTED | [`src/routes/_authenticated/clubs.tsx`](./src/routes/_authenticated/clubs.tsx), [`src/lib/cloud-files.tsx`](./src/lib/cloud-files.tsx) | Item and photo actions are implemented. The `student-content` bucket is assumed by code/policies but is not created in checked-in migrations. | Confirm/provision a private bucket and verify upload, signed read, ownership, and deletion. |
| Professional profile and CV | PARTIALLY IMPLEMENTED | [`src/routes/_authenticated/professional.tsx`](./src/routes/_authenticated/professional.tsx), `src/lib/cloud-files.tsx` | GitHub/LinkedIn fields, generated printable CV, CV upload/download exist. Storage and persistence were not tested. | Test uploaded/downloaded files and validate actual output on supported browsers. |
| Results, CGPA, transcript requests | PARTIALLY IMPLEMENTED | [`src/routes/_authenticated/results.tsx`](./src/routes/_authenticated/results.tsx), [`src/lib/records.functions.ts`](./src/lib/records.functions.ts) | Course/CGPA state is stored in the profile; transcript request uses privileged server function. No authorized call was made. | Validate authenticated writes and Records Office handling end to end. |
| References / one-time lecturer link | PARTIALLY IMPLEMENTED | [`src/routes/_authenticated/references.tsx`](./src/routes/_authenticated/references.tsx), [`src/routes/reference.$token.tsx`](./src/routes/reference.$token.tsx), `src/lib/records.functions.ts` | Code hashes a high-entropy token and access code, expires links, and accepts a reference. Requires server service-role configuration; not tested. | Test only with dummy lecturer/student accounts and confirm single-use and expiry behavior. |
| Administrator student management | PARTIALLY IMPLEMENTED | [`src/routes/admin.tsx`](./src/routes/admin.tsx), [`src/lib/admin.functions.ts`](./src/lib/admin.functions.ts) | UI includes listing, search, profile review, invitations, and disable/enable operations. Server functions need `SUPABASE_SERVICE_ROLE_KEY`, which is absent from the local `.env`; no admin account test. | Supply server-only credentials through a secure local/deployment secret store and test authorization. |
| Records Office approval and verification | BROKEN IF CHECKED-IN MIGRATIONS ARE DEPLOYED AS WRITTEN | [`src/routes/staff.tsx`](./src/routes/staff.tsx), [`src/lib/records.functions.ts`](./src/lib/records.functions.ts), migrations `0001`-`0003` | `user_roles` only permits `admin`, but staff code invites/checks for `records`; assigning that role violates the table constraint. | Resolve the schema/role mismatch in an approved migration, then validate the role and RLS policy path. |
| Profile export/import | PARTIALLY IMPLEMENTED | [`src/components/ProfileBackup.tsx`](./src/components/ProfileBackup.tsx), [`src/lib/profile-backup.ts`](./src/lib/profile-backup.ts) | Versioned JSON backup schema and unit tests exist; UI behavior not browser-tested. | Test export/import with non-production profile data. |

## E. Database and integration audit

### Database technology and schema

- Supabase is configured in [`src/integrations/supabase/client.ts`](./src/integrations/supabase/client.ts); the browser uses the publishable key and Supabase JS client.
- PostgreSQL tables are declared in `drizzle/migrations`:
  - `profiles(id, data jsonb, updated_at)`: one row per Auth user; `data` contains the complete profile and arrays (skills, projects, academics, results, etc.).
  - `user_roles`: role membership.
  - `account_access`: pending/disabled status and account metadata.
  - `verification_requests`: student record verification and review.
  - `records_requests`: transcript/reference request data and hashed one-time lecturer credentials.
- `profiles.id` references `auth.users(id)` and the migration's signup trigger creates a profile row. `account_access.user_id` references `profiles.id`.
- Profile arrays are persisted in a single JSONB field rather than separate relational tables. This is a valid simple project design, but database constraints do not validate the internal JSON shape; frontend `studentSchema` does.
- The Drizzle schema source is blank. The SQL migrations, not the Drizzle schema, describe the database.

### Connection setup and actual connectivity checked

The local `.env` contains Supabase URL/project/publishable-key variable names and values; values are intentionally not reproduced here. No `.env.example` exists. The following expected server/database variables were absent from the local environment file:

- `SUPABASE_SERVICE_ROLE_KEY` - required by `src/integrations/supabase/client.server.ts` for privileged administrator/Records functions.
- `LOVABLE_DB_MIGRATION_URL` - required by `drizzle.config.ts` to run Drizzle migrations.

The `.env` file is not excluded by the current `.gitignore`. The configured browser publishable key is intended to be public; service-role credentials must remain server-only and must not be added to client code or committed.

Read-only checks against the configured backend returned:

- `/auth/v1/health`: HTTP 200.
- `/rest/v1/`: HTTP 200.
- A `profiles?select=id&limit=0` request with the publishable key: HTTP 200 with an empty JSON array. The zero-row query returned no student data; it verifies the endpoint/table route is reachable, not that student authorization or profile operations work.

The backend hostname is not a public website: opening its root in the browser returned a JSON “requested path is invalid” response. The live migration state, test users, actual profile rows, RLS behavior for authenticated users, and Storage bucket were not inspected.

### RLS and Storage

The checked-in migrations intend to:

- Enable RLS on `profiles`, with select/insert/update restricted to `auth.uid() = id`.
- Add a restrictive enabled-account policy to profiles and student uploads.
- Restrict `student-content` reads, uploads, and deletes to the first folder matching the authenticated user's ID.
- Keep user-role writes privileged (the authenticated role receives select only; service role has full table grants).
- Restrict verification requests to own rows for students and server-managed staff roles for reviews.

These are positive source-level controls, but they are not proof that the live database is running those migrations. No migration creates the `student-content` bucket itself; it may be provisioned outside this repository, which is unverified. If it is absent or not private, photo/CV operations will fail or have the wrong privacy behavior. Storage uploads use unique names; removing/replacing a profile file does not appear to delete its previous object, so orphaned files may accumulate.

### Trace: registration to profile data

1. `/signup` collects name, email, password; the client calls `supabase.auth.signUp`, sending `name` as user metadata and redirecting email confirmation to `/auth`.
2. Migration `0003` replaces the `auth.users` trigger. It inserts a `profiles` row with the default `{}` data and an `account_access` row marked `pending_approval`.
3. `/auth` calls Supabase password sign-in and navigates to `/overview`; the Supabase client is configured to persist/refresh sessions.
4. The `_authenticated` layout calls `supabase.auth.getUser()` and redirects users without a session to `/auth`.
5. `StoreProvider` calls `getUser`, `account_is_enabled`, then selects `profiles.data` for the authenticated user. RLS is intended to restrict the row to that owner.
6. A new profile's `{}` fails `studentSchema.safeParse`. The fallback copies selected fields from `initial`, which includes sample student data. It replaces the name, email, student ID, phone, address, and DOB, but retains sample programme/faculty/year/nationality/languages/bio fields.
7. Page actions update the React store; the store validates it, uploads data URL files, and updates `profiles.data` for the signed-in ID.
8. A write failure displays a toast/status and offers retry. A profile-load failure leaves the provider at an error status; there is no load retry in the student shell.
9. Refresh persistence, real profile creation, database update success, and another student's isolation were not tested with authenticated accounts.

### Trace: profile photo / CV file

The profile and club pages read files into data URLs. The store calls `uploadDataUrl`, which writes to `student-content/<user-id>/<random-name>` and saves a `storage://` reference in the profile. `CloudImage` turns that reference into a one-hour signed URL. This is a real intended Storage flow, but cannot be verified without an authenticated user and confirmed bucket/policies.

## F. Frontend/backend integration

| Operation | UI / caller | Backend/data path |
|---|---|---|
| Login / signup | `src/routes/auth.tsx`, `src/routes/signup.tsx` | Supabase Auth JS (`signInWithPassword`, `signUp`) |
| Private route gate | `src/routes/_authenticated/route.tsx` | `supabase.auth.getUser()` |
| Profile read/save | `src/lib/store.tsx` | `profiles.select('data')` and `profiles.update({data, updated_at})` under owner RLS |
| File upload/read | `src/lib/cloud-files.tsx` | Supabase Storage bucket `student-content`; user-folder policies in migration |
| Admin operations | `src/lib/admin.functions.ts` | Authenticated server functions, role check, dynamic server-only service-role client |
| Registration approval / verification / transcript/reference | `src/lib/records.functions.ts`, `src/routes/staff.tsx` | Authenticated server functions and/or Supabase queries; role checks and privileged client |
| Lecturer reference | `src/routes/reference.$token.tsx` | Public server functions verify the hashed token, access-code hash, expiry and pending status |

`src/start.ts` registers client bearer-token attachment and CSRF middleware for server functions. The privileged client is dynamically imported inside handlers rather than used as a browser client. These boundaries are appropriate in design. Local admin/Records operations still require the missing server service-role secret, and the migration role constraint blocks `records` assignment if present.

## G. Prioritized issues and root causes

### HIGH - Records Office role cannot be assigned under the checked-in schema

- **Files:** [`drizzle/migrations/0001_administrator_roles_and_account_access.sql`](./drizzle/migrations/0001_administrator_roles_and_account_access.sql), [`src/lib/admin.functions.ts`](./src/lib/admin.functions.ts), [`src/lib/records.functions.ts`](./src/lib/records.functions.ts).
- **Evidence:** Migration 0001 constrains `user_roles.role` to `'admin'` only. Later admin code inserts `'records'`, and Records Office functions query/check that role. Migration 0002 adds lecturer role checks but does not widen the constraint; migration 0003 changes the UI/workflow to Records but also does not widen it.
- **Impact:** If the checked-in schema is deployed, assigning a Records Office role fails. The invitation can be sent before role insertion fails, leaving the invitee without access. Registration approval, account review, and verification functions cannot be performed by a Records user.
- **Recommended fix:** Design and apply an explicit role-constraint migration consistent with current roles, then add a database/authorization integration test. Do not rely on the role labels in the UI.

### HIGH - A newly registered student can receive demo profile fields

- **Files:** [`drizzle/migrations/0000_student_profiles_and_private_content.sql`](./drizzle/migrations/0000_student_profiles_and_private_content.sql), [`drizzle/migrations/0003_records_office_and_requests.sql`](./drizzle/migrations/0003_records_office_and_requests.sql), [`src/lib/store.tsx`](./src/lib/store.tsx).
- **Evidence:** The trigger inserts a profile using the default JSONB `{}`. That fails the required full-profile schema, and `StoreProvider` falls back to `initial`, whose profile contains a sample name, email, programme, faculty, year and biographical details. Some but not all fields are overwritten with Auth user data.
- **Impact:** A student's own new profile can display inaccurate sample academic/personal fields, and a subsequent save can persist them as if they were real.
- **Recommended fix:** Initialize a valid empty profile using Auth metadata, or migrate the fallback to a clearly empty non-demo profile and avoid persisting sample values.

### HIGH - Privileged local server operations cannot be configured from the extracted `.env`

- **Files:** [`src/integrations/supabase/client.server.ts`](./src/integrations/supabase/client.server.ts), [`drizzle.config.ts`](./drizzle.config.ts), `.env`.
- **Evidence:** The service client throws if `SUPABASE_SERVICE_ROLE_KEY` is absent; the Drizzle config uses `LOVABLE_DB_MIGRATION_URL`, also absent. Both variables are absent from the extracted `.env`. No `.env.example` or migration script is present.
- **Impact:** Local invite, account-management, Records, and reference server functions that dynamically load the admin client cannot complete; local migration operations cannot connect. The production/Lovable runtime might inject secrets, but that was not verified.
- **Recommended fix:** Provide these only through secure server-side local/deployment configuration and document required variable names without secret values.

### MEDIUM - No repository-defined Storage bucket provisioning

- **Files:** [`src/lib/cloud-files.tsx`](./src/lib/cloud-files.tsx), `drizzle/migrations/0000_student_profiles_and_private_content.sql`, [`supabase/config.toml`](./supabase/config.toml).
- **Evidence:** Upload code and RLS policies refer to `student-content`; no checked-in migration/config creates the bucket.
- **Impact:** Student images and CV uploads fail unless a private bucket with expected settings is provisioned out of band. Live bucket existence and privacy are unknown.
- **Recommended fix:** Verify the live bucket and document/reproduce private bucket provisioning plus ownership policies.

### MEDIUM - TypeScript check fails

- **File:** [`src/routes/_authenticated/overview.tsx`](./src/routes/_authenticated/overview.tsx), line 96.
- **Evidence:** `node .\node_modules\typescript\bin\tsc --noEmit` reports `TS2322`: `draft[k]` has type `string | boolean`, which is not assignable to the input's string value type. The current edit-field list excludes the boolean `graduated`, so this appears to be a type-model issue rather than a demonstrated browser failure. Vite production build does not run this check.
- **Impact:** Type safety is not clean; the build can pass while a standalone TypeScript check fails.
- **Recommended fix:** Narrow editable profile keys to string-valued fields or use a correctly typed input model, then add the type check to a standard script.

### MEDIUM - ESLint fails across active and duplicate source trees

- **Files:** Many `src` files and `lindsay-contribution-snapshot/src`.
- **Evidence:** `npm run lint` reports 2,317 errors and 39 warnings, mostly `prettier/prettier`. Running ESLint against the active root `src` alone reports 1,287 formatting errors and 21 warnings.
- **Impact:** The repository's lint check is not passing and formatting noise obscures actionable issues. The `eslint .` script also includes the nested snapshot.
- **Recommended fix:** Decide whether the snapshot is maintained; then format and lint the intended active tree without changing unrelated code.

### MEDIUM - Profile load errors have no retry path

- **File:** [`src/lib/store.tsx`](./src/lib/store.tsx).
- **Evidence:** Initial profile loading catches errors and displays a status string, but `retry` is only exposed for saves and the shell only displays a retry button for failed saves.
- **Impact:** Transient Auth/database errors leave a signed-in student stuck without a profile until a full page refresh.
- **Recommended fix:** Add an explicit retryable load state and actionable error detail.

### LOW - Local public/auth pages have broken Lovable-hosted background assets

- **Files:** [`src/routes/index.tsx`](./src/routes/index.tsx), [`src/components/AuthFrame.tsx`](./src/components/AuthFrame.tsx), `src/assets/au-home.jpg.asset.json`, `src/assets/au-auth.jpg.asset.json`.
- **Evidence:** Local browser requests to `/__l5e/assets-v1/...` returned HTTP 404; the JSON asset descriptors exist, but their image data is not present as a local file.
- **Impact:** The pages render, but the campus hero/background image is missing and a browser console error appears.
- **Recommended fix:** Restore the assets locally or provide an appropriate local/deployed asset URL.

### LOW - Environment handling could lead to accidental configuration commits

- **Files:** `.env`, [`.gitignore`](./.gitignore), [`README.md`](./README.md).
- **Evidence:** `.env` is not ignored, no `.env.example` exists, and README describes `npm i` although the root lockfile is Bun's. The local publishable key is public by design; no service-role value was shown or included in this report.
- **Impact:** Future private local credentials could be accidentally committed, and setup instructions/package lockfiles are inconsistent.
- **Recommended fix:** Ignore local `.env` files, publish a values-free variable-name template, and document the intended root package manager.

## H. Test results

### Commands executed

| Command | Result |
|---|---|
| `node --version` | Node.js `v24.14.0` |
| `npm --version` | npm `11.12.0` |
| `bun --version` | Initially unavailable. |
| `npm exec --yes --package=bun -- bun install --frozen-lockfile` | Passed; installed 541 packages using the existing root `bun.lock`. No package manifest or lockfile change was required. |
| `npm run test` | Passed: 5 test files, 20 tests. Tests cover account/recovery rules, route matching, profile backup parsing, recovery-session logic, and request routing. No Supabase integration tests. |
| `npm run build` | Passed: client and server bundles built. Output includes Vite's `vite-tsconfig-paths` notice and TanStack Start `inputValidator()` deprecation warnings. |
| `node .\node_modules\typescript\bin\tsc --noEmit` | Failed with the single `TS2322` error described above. |
| `npm run lint` | Failed: 2,317 errors and 39 warnings, predominantly Prettier; includes the nested snapshot. |
| ESLint against root `src` | Failed: 1,287 formatting errors and 21 warnings. |
| `npm exec -- tsc --noEmit` | This did not check the project: npm resolved an unrelated `tsc` package and printed that it is not the TypeScript compiler. The direct installed TypeScript command above is the valid check. |

### Browser checks

- Started `npm run dev -- --host 127.0.0.1`; Vite reported ready at `http://127.0.0.1:8080/`.
- The homepage, `/auth`, `/signup`, `/forgot-password`, `/admin-login`, and `/staff-login` returned HTTP 200 and rendered their expected titles/headings.
- `/overview` and `/skills` without a session redirected to the student login page.
- Homepage navigation links were present for student, Records Office, and admin login.
- At 390px and 1440px widths the homepage had no horizontal overflow.
- The campus hero asset on `/` and campus background on `/auth` returned HTTP 404.
- No browser page-level JavaScript exception was observed. No form was submitted and no credential was entered.
- Authenticated student/admin/staff pages, interactive save/delete actions, mobile authenticated navigation, and browser network behavior after login were not tested.

### Database/authentication checks

- Supabase Auth health endpoint: HTTP 200.
- PostgREST root: HTTP 200.
- Zero-row `profiles` query: HTTP 200, empty result; no student data was requested or returned.
- No registration, login, logout, authenticated profile read/update, Storage upload, RLS cross-user test, or database mutation was performed. No suitable authorized test account/test database credentials were supplied.
- The GitHub API lookup for `tgchikiwa-lang/My-AU` returned 404. The ZIP has no Git metadata.
- The backend URL in `.env` is not the website: its root returned a JSON invalid-path response. The Lovable editor URL in README was not treated as a deployed public website.

## I. Missing requirements and project objective

### Supported by the repository's own project brief

The README brief asks for a responsive, interactive student profile with project and skill management; academic history, achievements, and certificates; a digital ID; account security; clubs/associations/activities with photo uploads; and a professional profile with CV, GitHub, and LinkedIn links. The current root contains interface/code for each of those areas. Their persistence and upload paths still require authenticated end-to-end validation.

The repository does not include an official course rubric or a formal specification document, so these are confirmed from the project's own README, not independently confirmed course requirements.

### Inferred core completion checklist

1. Register a student and confirm the email/account flow.
2. Create and retrieve a valid empty profile without demo data.
3. Correctly approve a pending account through an authorized Records Office role.
4. Persist profile edits and all profile collections to Supabase and verify after refresh.
5. Verify per-student RLS for profiles, verification rows, and private uploads.
6. Confirm profile, club, and CV Storage operations using a private bucket.
7. Validate logout, disabled/pending account behavior, and server errors.
8. Demonstrate navigation and responsive behavior on desktop and mobile.

About/contact pages, public student-directory search, and separate normalized tables are not stated as mandatory by the repository brief; do not prioritize them over registration, persistence, and access controls.

## J. Recommended repair plan

### Phase 1 - Stabilize local developer checks

- Decide whether `lindsay-contribution-snapshot/` is retained; clarify root package-manager instructions.
- Add a TypeScript check to the normal validation workflow and address `overview.tsx`'s type error.
- Reduce/resolve Prettier lint errors on the intended active files.
- Restore local images referenced by the Lovable asset descriptors.

### Phase 2 - Verify database provisioning

- Obtain confirmation of the live migration state without exposing secrets.
- Resolve the `user_roles` constraint versus `records` role mismatch in a reviewed migration.
- Confirm `student-content` is a private bucket and reproduce its setup in project/deployment documentation.
- Ensure server-only `SUPABASE_SERVICE_ROLE_KEY` and migration `LOVABLE_DB_MIGRATION_URL` are configured securely where required.
- Confirm `.env` handling and add a safe variable-name template.

### Phase 3 - Correct registration/profile initialization

- Ensure the signup trigger creates a valid empty profile shape (or use a safe empty-profile constructor in the frontend).
- Remove the hard-coded sample profile fallback from new/invalid profile handling.
- Test signup, confirmation, pending approval, approved sign-in, profile load, and logout with an authorized disposable test account.

### Phase 4 - Validate persistence and files

- Exercise edits to identity fields, skills, projects, academic history, results, certificates, activities, and professional profile.
- Refresh after each save and compare values; test save failure and retry.
- Upload/download/delete profile and activity images and CV files using non-production data.
- Confirm RLS rejects a second student's access to profiles and files.

### Phase 5 - Validate staff/admin workflows and security

- Test administrator invitation, role assignment, account listing, disable/enable, and self/administrator protections.
- Test Records approval/rejection, verification review, transcript responses, and lecturer link/access-code expiry.
- Confirm errors are visible and do not report success when a privileged operation fails.
- Do not run these tests against real student records.

### Phase 6 - Demonstration readiness

- Re-run build, unit tests, TypeScript, and lint after approved fixes.
- Test all routes and interactions at desktop/mobile sizes with test accounts.
- Prepare an environment with no secrets exposed in client code and document the demo accounts/data separately.

## K. Final assessment

**Estimated completion after the repair: approximately 65% (rough qualitative estimate, not a test score).** The UI and much of the student, Records Office, and administrator workflow are implemented, and the static/build checks now pass. The estimate remains limited because no authenticated account/profile workflow or live database migration/RLS behaviour was verified, and the forward migration still needs deployment to an authorized environment.

- **Working and verified:** local development server; public route rendering; unauthenticated redirect; responsive homepage overflow check; Supabase service endpoint reachability; 23 unit tests; TypeScript check; production build.
- **Implemented but unverified against authenticated data:** registration, password login/recovery, profile create/read/update, profile collections, private uploads, administrator operations, Records requests/review.
- **Still blocking a complete demonstration:** live migration and private Storage setup are unverified; privileged server functions require their server-only environment configuration; no authorized disposable test account or email-confirmation setup was available.
- **Not established:** whether the live migrations and Storage bucket are provisioned; whether a published website exists; whether actual signup/login/profile persistence and student-to-student isolation work.
- **Fix first:** review and deploy migration 0004 to an authorized test/staging database, configure server secrets safely, then verify the complete authenticated student and staff workflows. Do not treat the build passing as proof that authenticated database behaviour works.

## L. Implementation and verification follow-up (2026-11-08)

The code repairs below were made in the active project root, not the nested `lindsay-contribution-snapshot/`. A ZIP backup was created outside the project root at `C:\Users\KATSHANFU\Downloads\My-AU-main\My-AU-main-backup-20261108.zip`. No Git metadata was available, no commit or push was made, and no production data or live schema was changed.

### Repair results

| Original finding | Files changed | Correction and remaining boundary |
|---|---|---|
| Overview TypeScript error | [`src/routes/_authenticated/overview.tsx`](./src/routes/_authenticated/overview.tsx) | Excluded the boolean `graduated` field from editable text-input keys with a proper type; no `any` or suppression added. |
| `records` role conflicted with the existing database constraint | [`drizzle/migrations/0004_application_roles_and_private_storage.sql`](./drizzle/migrations/0004_application_roles_and_private_storage.sql), [`drizzle/migrations/meta/_journal.json`](./drizzle/migrations/meta/_journal.json), [`src/lib/account-rules.ts`](./src/lib/account-rules.ts), [`src/lib/admin.functions.ts`](./src/lib/admin.functions.ts), [`src/lib/records.functions.ts`](./src/lib/records.functions.ts), [`src/integrations/supabase/types.ts`](./src/integrations/supabase/types.ts) | Added a forward-only migration that standardizes `admin`/`records`, migrates legacy `lecturer` roles, preserves privileged role writes, and aligns application types/checks. Migration was **not applied**. |
| New/empty profiles could show demonstration data | [`src/lib/store.tsx`](./src/lib/store.tsx), [`src/lib/profile-state.ts`](./src/lib/profile-state.ts), [`src/routes/_authenticated/overview.tsx`](./src/routes/_authenticated/overview.tsx), [`src/test/fixtures.ts`](./src/test/fixtures.ts) | Runtime now creates an empty profile using the authenticated user's own metadata, handles a missing row by inserting it under the authenticated user ID, and exposes incomplete-profile and retrieval-error states. The demonstration fixture remains test-only. Live creation and persistence remain unverified. |
| Student-content bucket was not provisioned by checked-in migrations | [`drizzle/migrations/0004_application_roles_and_private_storage.sql`](./drizzle/migrations/0004_application_roles_and_private_storage.sql) | Migration creates/keeps `student-content` private and adds owner-folder select/insert/delete policies. Deployment and cross-user enforcement remain unverified until applied and tested on an authorized database. |
| Hosted image references returned 404 locally | [`src/routes/index.tsx`](./src/routes/index.tsx), [`src/components/AuthFrame.tsx`](./src/components/AuthFrame.tsx), [`src/assets/campus.jpg`](./src/assets/campus.jpg) | Replaced the affected references with the existing local campus asset. Browser verified the homepage image loaded at 1920px natural width and the auth image loaded; a reload had no failed HTTP responses. |
| Lint errors and duplicate snapshot lint noise | [`eslint.config.js`](./eslint.config.js), [`src/lib/profile-state.ts`](./src/lib/profile-state.ts), [`src/test/profile-backup.test.ts`](./src/test/profile-backup.test.ts) | Excluded only the non-active nested snapshot from lint and kept pure profile helpers out of the React context module. Current lint has no errors; remaining Fast Refresh warnings are listed below. |
| No safe variable template; local environment files needed protection | [`.env.example`](./.env.example), [`.gitignore`](./.gitignore) | Added variable names only and ignore rules for local environment files; no credentials are included in this report or template. |

### Checks actually run

| Check | Command/action | Result |
|---|---|---|
| TypeScript | `node .\node_modules\typescript\bin\tsc --noEmit` | Passed with exit code 0. |
| Lint | `npm run lint` | Passed with 0 errors and 20 `react-refresh/only-export-components` warnings in existing component/helper modules. |
| Automated tests | `npm run test` | Passed: 5 test files, 23 tests. |
| Production build | `npm run build` | Passed. Build still prints Vite `vite-tsconfig-paths` guidance and TanStack Start `inputValidator()` deprecation notices in admin/Records server functions. |
| Migration files (offline) | `npm exec -- drizzle-kit check`; local journal/file check | Passed. Drizzle reports migration journal consistency; 5 entries are sequential and each references an existing SQL file. This does not connect to a database or validate SQL against a live schema. |
| Local development server | `npm run dev -- --host 127.0.0.1` | Started at `http://127.0.0.1:8080/` (Vite selected port 8080). |
| Browser route smoke check | Opened homepage, auth, signup, Records login, admin login, and `/overview` | Homepage, signup, Records login, and admin login returned HTTP 200. Unauthenticated `/overview` redirected in the browser to `/auth` (the navigation response initially returned 200 before redirect). Auth page showed sign-in and signup links. No credentials were submitted. |
| Local image/mobile check | Browser image dimensions and 375px viewport | Homepage and auth campus images loaded. At a 375px viewport the page client width was 360px and document scroll width was 360px; no horizontal overflow was detected. |
| Database/authenticated integration | No test account, authorized staging environment, or email-confirmation setup available | Not run. No registration, login, profile database write/read, RLS isolation, privileged operation, upload, or migration was claimed as verified. |

**Formatting note:** `npm run lint -- --fix` was used to clear the repository's configured formatting errors. It also reformatted lint-affected files under `src/components/`, `src/integrations/supabase/`, `src/lib/`, `src/routes/`, and `src/test/`; functional changes are described in the repair table above.

**Staging migration follow-up:** The latest instruction is to hold migration execution until a staging connection is configured and verified. A presence-only check found `LOVABLE_DB_MIGRATION_URL` missing from the process environment and local `.env`, so no database connection or migration was attempted. No credential values were read or displayed. `psql` and Supabase CLI are not installed.

The proposed SQL is available as the standalone [`0004_application_roles_and_private_storage.sql`](./drizzle/migrations/0004_application_roles_and_private_storage.sql) file. The detailed compatibility review, changes, static checks, caveats, and safe staging setup steps are in [`MIGRATION_REVIEW_0004.md`](./MIGRATION_REVIEW_0004.md). No duplicate migration copy was made.

### Follow-up required

1. Follow [`MIGRATION_REVIEW_0004.md`](./MIGRATION_REVIEW_0004.md) to configure and verify a non-production staging target; review its actual schema, policies, role data, and migration history before any application.
2. Provide server-only `SUPABASE_SERVICE_ROLE_KEY` and migration `LOVABLE_DB_MIGRATION_URL` through a trusted secret manager. The browser must use only the public/publishable key. Never send credentials in chat.
3. Configure disposable test users and email confirmation, then test registration, approval, login/logout, profile completion/save/refresh, and denial of cross-user profile/storage access.
4. Verify the private bucket's actual policies and all supported file operations against that database. No Storage object was uploaded during this repair.
5. Consider a separate, scoped cleanup of the 20 Fast Refresh warnings and deprecated TanStack validator/Vite plugin notices; they do not prevent current lint/build success.

## M. Final readiness and environment-security follow-up (2026-11-09)

### Public `.env` exposure

The extracted project folder has no `.git` metadata, so local Git cannot confirm tracked status. The public GitHub repository `tgchikiwa-lang/My-AU` is publicly visible, and its root directory listing includes a tracked `.env` file. The file contents were not fetched or disclosed. Assume any private credential values it contains are compromised: revoke/rotate Supabase service-role and database credentials and review any other private values. The publishable/anon key may be public by design, but its access must remain constrained by RLS.

Local `.gitignore` excludes `.env` and `.env.*` and allows `.env.example`; the local `.env.example` contains only blank variable assignments. The public repository's current `.gitignore` lacks these environment-file ignore rules, and the remote root listing did not include `.env.example`. Since this extracted folder has no Git metadata and no push was requested, remote ignore correction/removal and adding the safe template remain pending. Once using a proper Git worktree, update `.gitignore`, remove `.env` from the tracked tree in a normal commit, add `.env.example`, and rotate exposed credentials; do not rewrite history. A new commit will not remove leaked values from old public commits.

### Student workflows: implemented versus verified

- **Registration:** Supabase `signUp` call and confirmation message exist in `src/routes/signup.tsx`; migration 0003 defines the Auth trigger that creates an empty profile and pending access row. No test student registration was performed.
- **Email confirmation:** UI redirect is configured, but delivery and confirmation depend on Supabase Auth settings. Recovery/invitation callback logic has mocked unit tests; student confirmation has no end-to-end test.
- **Records approval:** server function checks Records/admin authorization and updates the pending access row through the server-only client. It has no test with a real Supabase account or service credentials.
- **Profile create/read/update:** the signup trigger and StoreProvider code create/read/update rows scoped by the current Auth user. Unit tests cover the pure empty-profile constructor and backups, not database operations or read-after-refresh.
- **Protected routes:** tests confirm student pages are nested under the authenticated layout. They do not execute the route guard; a prior local browser smoke test observed an unauthenticated overview redirect to login. No authenticated session or cross-user RLS test was run.
- **Logout:** the UI calls Supabase sign-out, but session invalidation was not integration tested.

All Auth, approval, profile persistence, and RLS behavior remain unverified end-to-end until a disposable staging Supabase project, email configuration, server-only secrets, and authorized test accounts are available.

### Current code-level check results

On 2026-11-09: `node .\\node_modules\\typescript\\bin\\tsc --noEmit` passed; `npm run lint` passed with 0 errors and 20 Fast Refresh warnings; `npm run test` passed (5 files, 23 tests); `npm run build` passed; `npm exec -- drizzle-kit check` passed. The build retains Vite path-plugin and TanStack validator deprecation notices. None of these checks connects to Supabase or applies migration 0004.

### Changes during the final review

- `src/routes/staff-login.tsx`: renamed the Records Office role guard helper `isLecturer` to `hasRecordsOfficeAccess`.
- `src/routes/staff.tsx`: updated its helper import/use.
- `MIGRATION_REVIEW_0004.md`: documented exact migration effects, role promotion implications, private Storage compatibility, staging requirements, public `.env` exposure, workflow test boundaries, and final local check results.

The local `.env` ignore/template protections were already present before this review. Their remote adoption and public `.env` removal remain pending; migration 0004 remains unapplied.

## N. GitHub working-copy reconciliation (2026-11-09)

The application repairs were reconciled into a separate clone of the public `tgchikiwa-lang/My-AU` repository on branch `security/remove-public-env-and-merge-repairs`. The extracted project was not overwritten. The three reports were carried into the clone and updated there. No commit has been pushed, and no database was accessed.

### Current source findings

- The GitHub copy is newer than the earlier ZIP: it already contains `drizzle/migrations/0004_records_role.sql` and `0005_records_admin_read_policy.sql`. Its Drizzle journal still contains only migrations 0000–0003. The previously proposed extracted-copy migration `0004_application_roles_and_private_storage.sql` was not copied or renumbered.
- Current migration 0004 adds a role constraint but does not replace the admin-only constraint created by migration 0001. If migrations 0001–0003 were applied as checked in, migration 0004 is expected to fail due the existing same-named check constraint. The actual live schema/history is unknown; see [`MIGRATION_REVIEW_0004.md`](./MIGRATION_REVIEW_0004.md). Neither migration 0004 nor 0005 was applied.
- Migration 0005 changes the `records_requests` read policy to allow both `records` and `admin`; it does not assign roles. The checked-in SQL does not create or privatize `student-content`. Bucket settings and stored object state remain unverified.
- Active app code uses admin/Records Office roles for privileged operations; `lecturer` remains a reference-request destination rather than a required Auth role. No role data or live policy was inspected.

### Reconciled code and environment-file changes

- [`src/lib/store.tsx`](./src/lib/store.tsx) and [`src/lib/profile-state.ts`](./src/lib/profile-state.ts): removed the sample-profile fallback; load the authenticated user's profile, handle missing/empty profiles, show retryable load failures, and track completion.
- [`src/routes/_authenticated/overview.tsx`](./src/routes/_authenticated/overview.tsx): corrected the editor's typed fields and added profile onboarding and required-field validation.
- [`src/test/fixtures.ts`](./src/test/fixtures.ts) and [`src/test/profile-backup.test.ts`](./src/test/profile-backup.test.ts): keep demonstration data test-only and cover empty profiles/completion.
- [`src/routes/index.tsx`](./src/routes/index.tsx) and [`src/components/AuthFrame.tsx`](./src/components/AuthFrame.tsx): use the existing local campus image instead of missing hosted asset paths.
- [`src/routes/staff-login.tsx`](./src/routes/staff-login.tsx) and [`src/routes/staff.tsx`](./src/routes/staff.tsx): renamed the role guard from `isLecturer` to `hasRecordsOfficeAccess`.
- [`.gitignore`](./.gitignore) ignores local `.env` files and permits [`.env.example`](./.env.example), whose values are blank. The public repository's `.env` is removed from the local branch's publication change set; the local file remains present and ignored.
- A no-values scan of the available public `.env` revision found publishable Supabase configuration only, not database passwords, service-role keys, or other privileged credentials. No private-secret rotation is indicated by that scan. It does not cover credentials stored elsewhere, and deleting `.env` in a new commit will not remove it from public history.

### Checks in the current GitHub clone

- TypeScript: **passed**.
- Automated tests: **passed, 5 files / 22 tests**.
- Production build: **passed**, with existing Vite path-plugin and TanStack Start validator deprecation notices.
- Drizzle journal check: **passed**; this did not connect to a database.
- Full ESLint: **not clean** — 1,289 Prettier formatting errors and 20 warnings remain across the current source checkout. The root source formatting differs from the checked-in Prettier settings; a repository-wide auto-format was avoided to prevent unrelated changes.
- `git diff --check`: **passed**.

Registration, email confirmation, Records Office approval, authenticated profile reads/writes after refresh, RLS isolation, and Storage behavior remain **unverified end to end**. No authorized staging connection or test account was available. Review [`IMPLEMENTATION_ROADMAP.md`](./IMPLEMENTATION_ROADMAP.md) for the remaining work and safe staging prerequisites.
