import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { useServerFn } from '@tanstack/react-start';
import { KeyRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { inputCls } from '@/components/Shell';
import { AuthFrame } from '@/components/AuthFrame';
import { openReference, submitReference } from '@/lib/records.functions';

export const Route = createFileRoute('/reference/$token')({
  head: () => ({ meta: [
    { title: 'Submit a Reference | Africa University' },
    { name: 'description', content: 'Secure lecturer page for submitting a student reference.' },
    { name: 'robots', content: 'noindex' },
    { property: 'og:title', content: 'Submit a Reference | Africa University' },
    { property: 'og:description', content: 'Secure lecturer reference submission.' },
    { property: 'og:type', content: 'website' },
    { name: 'twitter:card', content: 'summary' },
  ] }),
  component: ReferencePage,
});

function ReferencePage() {
  const { token } = Route.useParams();
  const open = useServerFn(openReference); const submit = useServerFn(submitReference);
  const [code, setCode] = useState(''); const [letter, setLetter] = useState('');
  const [info, setInfo] = useState<Awaited<ReturnType<typeof openReference>> | null>(null);
  const [message, setMessage] = useState(''); const [busy, setBusy] = useState(false); const [done, setDone] = useState(false);

  async function unlock(e: React.FormEvent) { e.preventDefault(); setBusy(true); setMessage(''); try { setInfo(await open({ data: { token, code: code.trim() } })); } catch { setMessage('This link or access code is invalid or has expired.'); } finally { setBusy(false); } }
  async function send(e: React.FormEvent) { e.preventDefault(); setBusy(true); setMessage(''); try { await submit({ data: { token, code: code.trim(), letter } }); setDone(true); } catch (err) { setMessage(err instanceof Error ? err.message : 'Could not submit.'); } finally { setBusy(false); } }

  return <AuthFrame>
    <KeyRound className="mb-5 size-9 text-primary" />
    <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-primary">Lecturer reference</p>
    {done ? <><h1 className="font-display text-3xl">Thank you.</h1><p className="mt-3 text-muted-foreground">Your recommendation has been submitted to Africa University.</p></> :
    !info ? <form onSubmit={unlock} className="space-y-5">
      <h1 className="font-display text-3xl">Enter your access code.</h1>
      <label className="block text-sm font-semibold">6-digit access code<input className={`${inputCls} mt-2 min-h-12 font-mono tracking-widest`} inputMode="numeric" pattern="\d{6}" maxLength={6} required value={code} onChange={e => setCode(e.target.value)} /></label>
      {message && <p role="alert" className="text-sm text-destructive">{message}</p>}
      <Button className="min-h-12 w-full" disabled={busy}>Continue</Button>
    </form> : info.status !== 'pending' ? <p>A recommendation has already been submitted for this request.</p> :
    <form onSubmit={send} className="space-y-5">
      <h1 className="font-display text-3xl">Reference for {info.studentName}</h1>
      <p className="text-sm text-muted-foreground">Requested of {info.recipientName} · Purpose: {info.purpose}</p>
      <label className="block text-sm font-semibold">Recommendation / endorsement<textarea required minLength={20} maxLength={5000} rows={10} className={`${inputCls} mt-2`} value={letter} onChange={e => setLetter(e.target.value)} /></label>
      {message && <p role="alert" className="text-sm text-destructive">{message}</p>}
      <Button className="min-h-12 w-full" disabled={busy}>{busy ? 'Submitting…' : 'Submit reference'}</Button>
    </form>}
  </AuthFrame>;
}
