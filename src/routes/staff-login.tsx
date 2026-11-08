import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, BookOpenCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { inputCls } from '@/components/Shell';
import { AuthFrame } from '@/components/AuthFrame';

export const Route = createFileRoute('/staff-login')({
  head: () => ({ meta: [
    { title: 'Records Office Login | Africa University' },
    { name: 'description', content: 'Records Office sign in for verifying and endorsing student records.' },
    { property: 'og:title', content: 'Records Office Login | Africa University' },
    { property: 'og:description', content: 'Records Office access.' },
    { property: 'og:type', content: 'website' },
    { name: 'twitter:card', content: 'summary' },
  ] }),
  component: StaffLogin,
});

export async function hasRecordsOfficeAccess() {
  const { data } = await supabase.auth.getUser();
  if (!data.user) return false;
  const { data: role } = await supabase.from('user_roles').select('role').eq('user_id', data.user.id).in('role', ['records', 'admin']);
  return Boolean(role?.length);
}

function StaffLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  useEffect(() => { void hasRecordsOfficeAccess().then(ok => { if (ok) void navigate({ to: '/staff', replace: true }); }); }, [navigate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setMessage('');
    try {
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (error) throw error;
      if (!(await hasRecordsOfficeAccess())) { await supabase.auth.signOut(); setMessage('This account is not registered with the Records Office.'); return; }
      await navigate({ to: '/staff', replace: true });
    } catch { setMessage('Sign-in failed. Check your email and password.'); }
    finally { setBusy(false); }
  }

  return <AuthFrame>
    <Link to="/" className="mb-9 inline-flex items-center gap-2 text-sm text-muted-foreground"><ArrowLeft className="size-4" />University home</Link>
    <BookOpenCheck className="mb-5 size-9 text-primary" />
    <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-primary">Records Office</p>
    <h1 className="font-display text-4xl">Records Office sign in.</h1>
    <p className="mb-8 mt-3 text-muted-foreground">Approve registrations, endorse records and handle requests.</p>
    <form onSubmit={submit} className="space-y-5">
      <label className="block text-sm font-semibold">Staff email<input className={`${inputCls} mt-2 min-h-12`} type="email" autoComplete="username" required value={email} onChange={e => setEmail(e.target.value)} /></label>
      <label className="block text-sm font-semibold">Password<input className={`${inputCls} mt-2 min-h-12`} type="password" autoComplete="current-password" required value={password} onChange={e => setPassword(e.target.value)} /></label>
      {message && <p role="status" className="text-sm text-primary">{message}</p>}
      <Button className="min-h-12 w-full" disabled={busy}>{busy ? 'Please wait…' : 'Sign in'}<ArrowRight /></Button>
      <Link to="/forgot-password" className="block text-center text-sm text-primary hover:underline">Forgot password?</Link>
    </form>
  </AuthFrame>;
}
