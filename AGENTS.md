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
