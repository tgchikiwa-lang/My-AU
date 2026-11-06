import { createFileRoute, Link } from '@tanstack/react-router';
import { useState } from 'react';
import { ArrowLeft, Mail } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { AuthFrame } from '@/components/AuthFrame';
import { Button } from '@/components/ui/button';
import { inputCls } from '@/components/Shell';

export const Route = createFileRoute('/forgot-password')({ head: () => ({ meta: [
  { title: 'Forgot Password | Africa University' }, { name: 'description', content: 'Request a secure recovery link for your Africa University account.' },
  { property: 'og:title', content: 'Forgot Password | Africa University' }, { property: 'og:description', content: 'Recover access to your university account.' },
  { property: 'og:type', content: 'website' }, { name: 'twitter:card', content: 'summary' },
] }), component: ForgotPassword });
function ForgotPassword() {
  const [email, setEmail] = useState(''); const [busy, setBusy] = useState(false); const [message, setMessage] = useState(''); const [sent, setSent] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setMessage('');
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: `${window.location.origin}/reset-password` });
      if (error) throw error;
      setSent(true); setMessage('If an account exists for this email, a password reset link has been sent. Check your inbox and spam folder.');
    } catch { setMessage('We could not send the request. Please wait a moment and try again.'); }
    finally { setBusy(false); }
  }
  return <AuthFrame><Link to="/auth" className="mb-8 inline-flex items-center gap-2 text-sm text-muted-foreground"><ArrowLeft className="size-4"/>Back to sign in</Link><Mail className="mb-4 size-9 text-primary"/><h1 className="font-display text-3xl">Forgot your password?</h1><p className="mb-7 mt-3 text-muted-foreground">Enter your university account email.</p><form onSubmit={submit} className="space-y-5"><label className="block text-sm font-semibold">Email address<input type="email" autoComplete="email" required className={`${inputCls} mt-2`} value={email} onChange={e=>{setEmail(e.target.value);setSent(false)}}/></label><Button className="w-full" disabled={busy || sent}>{busy?'Sending…':sent?'Request sent':'Send reset link'}</Button></form>{message&&<p role="status" className="mt-5 text-sm">{message}</p>}</AuthFrame>;
}