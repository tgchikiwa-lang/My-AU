import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { useState } from 'react';
import { Check, LogOut, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { inputCls } from '@/components/Shell';
import { hasRecordsOfficeAccess } from './staff-login';
import { listAccounts, reviewRegistration, setAccountStatus, respondRecordsRequest } from '@/lib/records.functions';

export const Route = createFileRoute('/staff')({
  ssr: false,
  head: () => ({ meta: [
    { title: 'Records Office | Africa University' },
    { name: 'description', content: 'Approve registrations, endorse student records and handle transcript and reference requests.' },
    { property: 'og:title', content: 'Records Office | Africa University' },
    { property: 'og:description', content: 'Records Office workspace.' },
    { property: 'og:type', content: 'website' },
    { name: 'twitter:card', content: 'summary' },
  ] }),
  component: Staff,
});

const label: Record<string, string> = { skill: 'Skill', project: 'Project', academic: 'Academic record', achievement: 'Achievement / hackathon', certificate: 'Certificate', result: 'Grade / CGPA', hackathon: 'Hackathon' };
type Tab = 'registrations' | 'endorsements' | 'requests' | 'accounts';

function Staff() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>('registrations');
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const fetchAccounts = useServerFn(listAccounts); const review = useServerFn(reviewRegistration); const setStatus = useServerFn(setAccountStatus); const respond = useServerFn(respondRecordsRequest);
  const access = useQuery({ queryKey: ['records-access'], queryFn: hasRecordsOfficeAccess });
  const accounts = useQuery({ queryKey: ['records-accounts'], enabled: access.data === true, queryFn: () => fetchAccounts() });
  const queue = useQuery({ queryKey: ['verification-queue'], enabled: access.data === true, queryFn: async () => {
    const { data, error } = await supabase.from('verification_requests').select('*').order('created_at', { ascending: false }); if (error) throw error; return data; } });
  const requests = useQuery({ queryKey: ['records-requests'], enabled: access.data === true, queryFn: async () => {
    const { data, error } = await supabase.from('records_requests').select('id,student_name,kind,alumni,routed_to,recipient_name,recipient_email,purpose,status,response,created_at').order('created_at', { ascending: false }); if (error) throw error; return data; } });

  async function run(fn: () => Promise<unknown>, ok: string, key: string) { setBusy(true); try { await fn(); toast.success(ok); await qc.invalidateQueries({ queryKey: [key] }); } catch (e) { toast.error(e instanceof Error ? e.message : 'Action failed.'); } finally { setBusy(false); } }
  async function endorse(id: string, status: 'approved' | 'rejected') {
    const { data: auth } = await supabase.auth.getUser();
    await run(async () => { const { error } = await supabase.from('verification_requests').update({ status, reviewer_id: auth.user!.id, reviewer_note: notes[id]?.trim() || null }).eq('id', id); if (error) throw new Error('Could not save.'); }, status === 'approved' ? 'Endorsed.' : 'Rejected.', 'verification-queue');
  }
  async function signOut() { await qc.cancelQueries(); qc.clear(); await supabase.auth.signOut(); await navigate({ to: '/staff-login', replace: true }); }

  if (access.isPending) return <p role="status" className="p-10">Checking access…</p>;
  if (!access.data) return <main className="mx-auto max-w-lg px-6 py-20"><h1 className="font-display text-3xl">Records Office access required</h1><p className="my-5 text-muted-foreground">Sign in with a Records Office account.</p><Button asChild><Link to="/staff-login">Sign in</Link></Button></main>;

  const pending = (accounts.data ?? []).filter(a => a.pending_approval && !a.disabled_at);
  const counts: Record<Tab, number> = { registrations: pending.length, endorsements: (queue.data ?? []).filter(r => r.status === 'pending').length, requests: (requests.data ?? []).filter(r => r.status === 'pending' && r.routed_to === 'records').length, accounts: 0 };
  const card = 'rounded-lg border border-border p-5';
  return <main className="min-h-screen bg-background">
    <header className="border-b border-border bg-foreground text-background"><div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5"><Link to="/" className="font-display text-xl">AU · Records Office</Link><Button variant="ghost" className="text-background hover:bg-background/10 hover:text-background" onClick={signOut}><LogOut />Sign out</Button></div></header>
    <div className="mx-auto max-w-5xl px-6 py-10">
      <h1 className="font-display text-4xl">Records Office</h1>
      <div className="my-6 flex flex-wrap gap-2" role="tablist">{(['registrations', 'endorsements', 'requests', 'accounts'] as const).map(t => <Button key={t} role="tab" aria-selected={tab === t} variant={tab === t ? 'default' : 'outline'} onClick={() => setTab(t)} className="capitalize">{t}{counts[t] ? ` (${counts[t]})` : ''}</Button>)}</div>

      {tab === 'registrations' && <ul className="space-y-4">{pending.length === 0 && <p className="text-muted-foreground">No registrations waiting.</p>}{pending.map(a => <li key={a.user_id} className={card}>
        <p className="font-semibold">{a.full_name || 'Unnamed student'}</p><p className="text-sm text-muted-foreground">{a.email} · registered {new Date(a.created_at).toLocaleDateString()}</p>
        <div className="mt-4 flex gap-2"><Button disabled={busy} onClick={() => run(() => review({ data: { userId: a.user_id, approve: true } }), 'Account activated.', 'records-accounts')}><Check />Approve</Button><Button variant="outline" disabled={busy} onClick={() => run(() => review({ data: { userId: a.user_id, approve: false } }), 'Registration rejected.', 'records-accounts')}><X />Reject</Button></div>
      </li>)}</ul>}

      {tab === 'endorsements' && <ul className="space-y-4">{(queue.data ?? []).map(r => <li key={r.id} className={card}>
        <div className="flex flex-wrap justify-between gap-2"><span className="text-xs font-semibold uppercase text-primary">{label[r.item_type]}</span><span className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</span></div>
        <p className="mt-1 font-semibold">{r.item_summary}</p><p className="text-sm text-muted-foreground">Student: {r.student_name}</p>
        {r.status === 'pending' ? <div className="mt-4 flex flex-wrap gap-2">
          <input aria-label="Note to student (optional)" placeholder="Note to student (optional)" className={`${inputCls} min-w-0 flex-1`} value={notes[r.id] ?? ''} onChange={e => setNotes({ ...notes, [r.id]: e.target.value })} />
          <Button disabled={busy} onClick={() => endorse(r.id, 'approved')}><Check />Endorse</Button><Button variant="outline" disabled={busy} onClick={() => endorse(r.id, 'rejected')}><X />Reject</Button>
        </div> : <p className="mt-3 text-sm">{r.status === 'approved' ? 'Endorsed — locked for the student' : 'Rejected'}{r.reviewer_note ? ` — “${r.reviewer_note}”` : ''}</p>}
      </li>)}</ul>}

      {tab === 'requests' && <ul className="space-y-4">{(requests.data ?? []).map(r => <li key={r.id} className={card}>
        <div className="flex flex-wrap justify-between gap-2"><span className="text-xs font-semibold uppercase text-primary">{r.kind}{r.alumni ? ' · Alumni' : ''}</span><span className="text-xs capitalize">{r.status}</span></div>
        <p className="mt-1 font-semibold">{r.student_name}</p><p className="text-sm text-muted-foreground">{r.purpose}{r.recipient_name ? ` · for ${r.recipient_name} ${r.recipient_email}` : ''}</p>
        {r.routed_to === 'lecturer' ? <p className="mt-2 text-sm text-muted-foreground">Sent to lecturer by secure link.{r.response ? ' Reference received.' : ''}</p>
        : r.status === 'pending' ? <div className="mt-4 flex flex-wrap gap-2">
          <input aria-label="Response to student" placeholder="Response (e.g. transcript collected / sent)" className={`${inputCls} min-w-0 flex-1`} value={notes[r.id] ?? ''} onChange={e => setNotes({ ...notes, [r.id]: e.target.value })} />
          <Button disabled={busy} onClick={() => run(() => respond({ data: { id: r.id, status: 'fulfilled', response: notes[r.id] ?? '' } }), 'Marked fulfilled.', 'records-requests')}><Check />Fulfil</Button>
          <Button variant="outline" disabled={busy} onClick={() => run(() => respond({ data: { id: r.id, status: 'declined', response: notes[r.id] ?? '' } }), 'Declined.', 'records-requests')}><X />Decline</Button>
        </div> : r.response && <p className="mt-2 text-sm">{r.response}</p>}
      </li>)}</ul>}

      {tab === 'accounts' && <ul className="space-y-3">{(accounts.data ?? []).filter(a => !a.pending_approval).map(a => <li key={a.user_id} className={`${card} flex flex-wrap items-center justify-between gap-3`}>
        <div><p className="font-semibold">{a.full_name || a.email || 'Student'}</p><p className="text-sm text-muted-foreground">{a.email}{a.disabled_at ? ` · Disabled${a.disabled_reason ? `: ${a.disabled_reason}` : ''} (records retained)` : ' · Active'}</p></div>
        {a.disabled_at ? <Button variant="outline" disabled={busy} onClick={() => run(() => setStatus({ data: { userId: a.user_id, disabled: false } }), 'Account enabled.', 'records-accounts')}>Enable</Button>
        : <Button variant="outline" disabled={busy} onClick={() => { const reason = prompt('Reason for disabling (records are kept for statistics):') ; if (reason !== null) void run(() => setStatus({ data: { userId: a.user_id, disabled: true, reason } }), 'Account disabled. Records retained.', 'records-accounts'); }}>Disable</Button>}
      </li>)}</ul>}
    </div>
  </main>;
}
