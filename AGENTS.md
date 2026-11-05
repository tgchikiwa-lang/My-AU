<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->
- Student data is stored in owner-scoped Cloud profiles, with private Storage uploads; StoreProvider serializes saves and never stores passwords in profile data.
- Student routes live under the managed _authenticated layout; the public index is the AU welcome page and /auth handles credential login.
- Administrator UI lives outside StoreProvider at /admin; every privileged function verifies an enabled caller and server-managed role before dynamically loading the privileged client, preventing student access and accidental profile editing.
- Account disabling combines an Auth ban with restrictive profile/storage RLS driven by server-managed account_access so previously issued tokens cannot bypass denial; administrator accounts and self-disabling are protected.
- Password recovery and invitation activation use public authentication pages, validate the provider session and link, remove URL tokens, and sign out after updating the password.
- Recovery callback validation waits for provider initialization and retains a short-lived user-bound tab marker until password update so token cleanup cannot invalidate an active recovery form.
- Verification requests are reviewed only by accounts with the server-managed lecturer role (via /staff); RLS lets students insert/withdraw their own pending rows and a trigger stops reviewers changing request content.
- Records Office (role `records`) replaces lecturer accounts; lecturers act only via hashed one-time reference link + access code handled by public server functions — keeps external staff account-free.
- New self-registered accounts start `pending_approval` in account_access and account_is_enabled() denies them until Records approves; a profiles trigger rejects edits to approved verification items.
