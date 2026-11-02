import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { ShieldCheck, ArrowLeft, LogOut, Mail, CalendarDays, KeyRound, BadgeCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getAdminAccess, getAdminProfile } from '@/lib/admin.functions';
import { supabase } from '@/integrations/supabase/client';

export const Route = createFileRoute('/admin-profile')({
  ssr: false,
  head: () => ({
    meta: [
      { title: 'Administrator Profile | Africa University' },
      { name: 'description', content: 'Your Africa University administrator account details and security access.' },
      { property: 'og:title', content: 'Administrator Profile | Africa University' },
      { property: 'og:description', content: 'Administrator account overview.' },
      { property: 'og:type', content: 'website' },
      { name: 'twitter:card', content: 'summary' },
    ],
  }),
  component: AdminProfile,
});

function formatDate(value: string | null) {
  return value ? new Date(value).toLocaleString() : 'Never';
}

function AdminProfile() {
  const verify = useServerFn(getAdminAccess);
  const load = useServerFn(getAdminProfile);
  const navigate = useNavigate();
  const { queryClient } = Route.useRouteContext();
  const access = useQuery({ queryKey: ['admin-access'], queryFn: () => verify(), retry: false });
  const profile = useQuery({ queryKey: ['admin-profile'], queryFn: () => load(), enabled: access.data === true, retry: false });

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    await navigate({ to: '/auth', replace: true });
  }

  if (access.isPending) return <main className="p-10" role="status">Checking administrator access…</main>;
  if (!access.data) {
    return (
      <main className="mx-auto max-w-lg px-6 py-20">
        <ShieldCheck className="mb-5 size-10 text-primary" />
        <h1 className="font-display text-3xl">Administrator access required</h1>
        <p className="my-5 text-muted-foreground">Sign in with an authorized administrator account.</p>
        <Button asChild><Link to="/auth">Sign in</Link></Button>
        <Button asChild variant="link"><Link to="/">University home</Link></Button>
      </main>
    );
  }

  const p = profile.data;
  return (
    <main className="min-h-screen bg-background">
      <header className="border-b border-border bg-foreground text-background">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-6 py-5">
          <Link to="/" className="font-display text-xl">AU · Africa University</Link>
          <Button variant="ghost" className="text-background hover:bg-background/10 hover:text-background" onClick={signOut}>
            <LogOut />Sign out
          </Button>
        </div>
      </header>
      <div className="mx-auto max-w-3xl px-6 py-10">
        <Button asChild variant="link" className="mb-6 pl-0">
          <Link to="/admin"><ArrowLeft />Back to student accounts</Link>
        </Button>
        <p className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase text-primary">
          <ShieldCheck className="size-4" />Administration
        </p>
        <h1 className="font-display text-4xl">Administrator profile</h1>
        <p className="mt-3 text-muted-foreground">Your account details and administrative access.</p>

        {profile.isPending ? (
          <p className="mt-10" role="status">Loading profile…</p>
        ) : profile.isError || !p ? (
          <p className="mt-10" role="alert">Profile could not be loaded. Please retry.</p>
        ) : (
          <section className="mt-10 rounded-lg border border-border">
            <div className="flex flex-wrap items-center gap-4 border-b border-border bg-muted px-6 py-5">
              <span className="grid size-14 place-items-center rounded-full bg-primary font-display text-xl text-primary-foreground">
                {p.email.slice(0, 2).toUpperCase()}
              </span>
              <div>
                <p className="font-semibold">{p.email}</p>
                <p className="flex items-center gap-1 text-sm text-primary"><BadgeCheck className="size-4" />Administrator</p>
              </div>
            </div>
            <dl className="grid gap-6 px-6 py-6 sm:grid-cols-2">
              <div>
                <dt className="flex items-center gap-2 text-xs uppercase text-muted-foreground"><Mail className="size-4" />Email</dt>
                <dd className="mt-1 text-sm">{p.email}</dd>
              </div>
              <div>
                <dt className="flex items-center gap-2 text-xs uppercase text-muted-foreground"><KeyRound className="size-4" />Email status</dt>
                <dd className="mt-1 text-sm">{p.confirmed ? 'Confirmed' : 'Awaiting confirmation'}</dd>
              </div>
              <div>
                <dt className="flex items-center gap-2 text-xs uppercase text-muted-foreground"><CalendarDays className="size-4" />Account created</dt>
                <dd className="mt-1 text-sm">{formatDate(p.createdAt)}</dd>
              </div>
              <div>
                <dt className="flex items-center gap-2 text-xs uppercase text-muted-foreground"><CalendarDays className="size-4" />Last sign-in</dt>
                <dd className="mt-1 text-sm">{formatDate(p.lastSignIn)}</dd>
              </div>
            </dl>
            <div className="flex flex-wrap gap-3 border-t border-border px-6 py-5">
              <Button asChild variant="outline"><Link to="/forgot-password">Change password</Link></Button>
              <Button asChild variant="outline"><Link to="/admin">Manage student accounts</Link></Button>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
