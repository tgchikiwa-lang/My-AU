import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import { useServerFn } from '@tanstack/react-start';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { inputCls } from '@/components/Shell';
import { AuthFrame } from '@/components/AuthFrame';
import { getAdminAccess } from '@/lib/admin.functions';

export const Route = createFileRoute('/admin-login')({
  head: () => ({ meta: [
    { title: 'Administrator Login | Africa University' },
    { name: 'description', content: 'Restricted sign-in for Africa University portal administrators.' },
    { property: 'og:title', content: 'Administrator Login | Africa University' },
    { property: 'og:description', content: 'Restricted sign-in for portal administrators.' },
    { property: 'og:type', content: 'website' },
    { name: 'twitter:card', content: 'summary' },
  ] }),
  component: AdminLogin,
});

function AdminLogin() {
  const navigate = useNavigate();
  const adminAccess = useServerFn(getAdminAccess);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    void supabase.auth.getUser().then(async ({ data }) => {
      if (data.user && await adminAccess().catch(() => false)) void navigate({ to: '/admin', replace: true });
    });
  }, [navigate, adminAccess]);

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setMessage('');
    try {
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (error) throw error;
      if (!(await adminAccess().catch(() => false))) {
        await supabase.auth.signOut();
        setMessage('This account does not have administrator access. Students should use the student login.');
        return;
      }
      await navigate({ to: '/admin', replace: true });
    } catch { setMessage('Sign-in failed. Check your email and password.'); }
    finally { setBusy(false); }
  }

  return <AuthFrame>
    <Link to="/" className="mb-9 inline-flex items-center gap-2 text-sm text-muted-foreground"><ArrowLeft className="size-4" />University home</Link>
    <ShieldCheck className="mb-5 size-9 text-primary" />
    <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-primary">Administrators only</p>
    <h1 className="font-display text-4xl">Admin sign in.</h1>
    <p className="mb-8 mt-3 text-muted-foreground">Restricted access for portal administrators.</p>
    <form onSubmit={submit} className="space-y-5">
      <label className="block text-sm font-semibold">Admin email<input className={`${inputCls} mt-2 min-h-12`} type="email" autoComplete="username" required value={email} onChange={e => setEmail(e.target.value)} /></label>
      <label className="block text-sm font-semibold">Password<div className="relative mt-2"><input className={`${inputCls} min-h-12 pr-12`} type={show ? 'text' : 'password'} autoComplete="current-password" required value={password} onChange={e => setPassword(e.target.value)} /><Button type="button" variant="ghost" size="icon" className="absolute right-1 top-1" aria-label={show ? 'Hide password' : 'Show password'} onClick={() => setShow(!show)}>{show ? <EyeOff /> : <Eye />}</Button></div></label>
      {message && <p role="status" className="text-sm text-primary">{message}</p>}
      <Button className="min-h-12 w-full" disabled={busy}>{busy ? 'Please wait…' : 'Sign in as administrator'}<ArrowRight /></Button>
      <div className="flex justify-between text-sm"><Link to="/forgot-password" className="text-primary hover:underline">Forgot password?</Link><Link to="/auth" className="text-muted-foreground hover:underline">Student login</Link></div>
    </form>
  </AuthFrame>;
}
