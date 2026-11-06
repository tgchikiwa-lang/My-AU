import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Check, LogOut, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { inputCls } from '@/components/Shell';
import { isLecturer } from './staff-login';

export const Route = createFileRoute('/staff')({
  ssr: false,
  head: () => ({ meta: [
    { title: 'Verification Queue | Africa University Staff' },
    { name: 'description', content: 'Lecturer queue for verifying student skills, projects and certificates.' },
    { property: 'og:title', content: 'Verification Queue | Africa University Staff' },
    { property: 'og:description', content: 'Verify student records.' },
    { property: 'og:type', content: 'website' },
    { name: 'twitter:card', content: 'summary' },
  ] }),
  component: Staff,
});

const label: Record<string, string> = { skill: 'Skill', project: 'Project', academic: 'Academic record', achievement: 'Achievement', certificate: 'Certificate' };

function Staff() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [tab, setTab] = useState<'pending' | 'reviewed'>('pending');
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [reviewError, setReviewError] = useState('');
  const access = useQuery({ queryKey: ['lecturer-access'], queryFn: isLecturer });
  const queue = useQuery({
    queryKey: ['verification-queue'], enabled: access.data === true,
    queryFn: async () => {
      const { data, error } = await supabase.from('verification_requests').select('*').order('created_at', { ascending: false });
      if (error) throw error; return data;
    },
  });

 async function review(id: string, status: 'approved' | 'rejected') {
  setReviewingId(id);
  setReviewError('');

  try {
    const { data: auth, error: authError } = await supabase.auth.getUser();

    if (authError || !auth.user) {
      throw new Error('Your session has expired. Please sign in again.');
    }

    const { error } = await supabase
      .from('verification_requests')
      .update({
        status,
        reviewer_id: auth.user.id,
        reviewer_note: notes[id]?.trim() || null,
      })
      .eq('id', id);

    if (error) throw error;

    await qc.invalidateQueries({
      queryKey: ['verification-queue'],
    });

  } catch (error) {
    setReviewError(
      error instanceof Error
        ? error.message
        : 'Could not update the verification request.'
    );
  } finally {
    setReviewingId(null);
  }
}
  async function signOut() { await qc.cancelQueries(); qc.clear(); await supabase.auth.signOut(); await navigate({ to: '/staff-login', replace: true }); }

  if (access.isPending) return <p role="status" className="p-10">Checking access…</p>;
  if (!access.data) return <main className="mx-auto max-w-lg px-6 py-20"><h1 className="font-display text-3xl">Staff access required</h1><p className="my-5 text-muted-foreground">Sign in with a lecturer account.</p><Button asChild><Link to="/staff-login">Staff sign in</Link></Button></main>;

  const rows = (queue.data ?? []).filter(r => tab === 'pending' ? r.status === 'pending' : r.status !== 'pending');
  const pendingCount = (queue.data ?? []).filter(r => r.status === 'pending').length;
  const reviewedCount = (queue.data ?? []).filter(r => r.status !== 'pending').length;
  return <main className="min-h-screen bg-background">
    <header className="border-b border-border bg-foreground text-background"><div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5"><Link to="/" className="font-display text-xl">AU · Staff portal</Link><Button variant="ghost" className="text-background hover:bg-background/10 hover:text-background" onClick={signOut}><LogOut />Sign out</Button></div></header>
    <div className="mx-auto max-w-5xl px-6 py-10">
      <h1 className="font-display text-4xl">Verification requests</h1>
      <div className="my-6 flex gap-2" role="tablist">
  {(['pending', 'reviewed'] as const).map(t => (
    <Button key={t} role="tab" aria-selected={tab === t} variant={tab === t ? 'default' : 'outline'} onClick={() => setTab(t)}>
      {t === 'pending'
  ? `Pending (${pendingCount})`
  : `Reviewed (${reviewedCount})`}
    </Button>
  ))}
</div>

{reviewError && (
  <p role="alert" className="my-4 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
    {reviewError}
  </p>
)}

{queue.isPending ? (
  <p role="status">Loading verification requests…</p>
) : queue.isError ? (
  <p role="alert" className="text-destructive">
    Could not load verification requests. Please refresh and try again.
  </p>
) : rows.length === 0 ? (
  <p className="text-muted-foreground">No {tab} requests.</p>
) :
        <ul className="space-y-4">{rows.map(r => <li key={r.id} className="rounded-lg border border-border p-5">
          <div className="flex flex-wrap justify-between gap-2"><span className="text-xs font-semibold uppercase text-primary">{label[r.item_type]}</span><span className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</span></div>
          <p className="mt-1 font-semibold">{r.item_summary}</p>
          <p className="text-sm text-muted-foreground">Student: {r.student_name}</p>
          {r.status === 'pending' ? <div className="mt-4 flex flex-wrap gap-2">
            <input aria-label="Note to student (optional)" placeholder="Note to student (optional)" className={`${inputCls} min-w-0 flex-1`} value={notes[r.id] ?? ''} onChange={e => setNotes({ ...notes, [r.id]: e.target.value })} />
           <Button
  disabled={reviewingId === r.id}
  onClick={() => review(r.id, 'approved')}
>
  <Check />
  {reviewingId === r.id ? 'Saving…' : 'Verify'}
</Button>

<Button
  variant="outline"
  disabled={reviewingId === r.id}
  onClick={() => review(r.id, 'rejected')}
>
  <X />
  {reviewingId === r.id ? 'Saving…' : 'Reject'}
</Button>
          </div> : <p className="mt-3 text-sm">{r.status === 'approved' ? 'Verified' : 'Rejected'}{r.reviewer_note ? ` — “${r.reviewer_note}”` : ''}</p>}
        </li>)}</ul>}
    </div>
  </main>;
}
