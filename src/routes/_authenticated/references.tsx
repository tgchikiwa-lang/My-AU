import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { Copy, Mail } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, PageTitle, btnCls, inputCls } from '@/components/Shell';
import { useStore } from '@/lib/store';
import { createRecordsRequest } from '@/lib/records.functions';
import { myRequestsKey, useMyRequests } from './results';

export const Route = createFileRoute('/_authenticated/references')({
  head: () => ({ meta: [
    { title: 'Reference Letters | Africa University' },
    { name: 'description', content: 'Request reference and recommendation letters from lecturers.' },
    { property: 'og:title', content: 'Reference Letters | Africa University' },
    { property: 'og:description', content: 'Request references from lecturers or the Records Office.' },
    { property: 'og:type', content: 'website' },
    { name: 'twitter:card', content: 'summary' },
  ] }),
  component: References,
});

function References() {
  const { data } = useStore();
  const qc = useQueryClient();
  const create = useServerFn(createRecordsRequest);
  const requests = useMyRequests();
  const [f, setF] = useState({ recipientName: '', recipientEmail: '', purpose: '' });
  const [busy, setBusy] = useState(false);
  const [issued, setIssued] = useState<{ link: string; code: string; email: string } | null>(null);
  const alumni = data.profile.graduated;

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setIssued(null);
    try {
      const r = await create({ data: { kind: 'reference', alumni, ...f } });
      if (r.link && r.code) setIssued({ link: r.link, code: r.code, email: f.recipientEmail });
      toast.success(alumni ? 'Request sent to the Records Office.' : 'Reference link created.');
      setF({ recipientName: '', recipientEmail: '', purpose: '' });
      await qc.invalidateQueries({ queryKey: myRequestsKey });
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Could not create request.'); } finally { setBusy(false); }
  }
  const mailto = issued ? `mailto:${issued.email}?subject=${encodeURIComponent('Reference request – Africa University')}&body=${encodeURIComponent(`Dear lecturer,\n\nPlease submit a reference for ${data.profile.name} using this secure link:\n${issued.link}\n\nAccess code: ${issued.code}\n\nThe link expires in 14 days.`)}` : '';

  return <>
    <PageTitle title="Reference Letters" subtitle={alumni ? 'As an alumnus, your requests go directly to the Records Office.' : 'A lecturer receives a secure link and access code — no account needed.'} />
    <div className="space-y-6">
      <Card>
        <h2 className="mb-4 flex items-center gap-2 font-display text-xl"><Mail className="h-5 w-5 text-primary" />New request</h2>
        <form onSubmit={submit} className="grid gap-2 sm:grid-cols-2">
          <input required={!alumni} aria-label="Recipient name" placeholder={alumni ? 'Recipient name (optional)' : 'Lecturer name'} className={inputCls} value={f.recipientName} onChange={e => setF({ ...f, recipientName: e.target.value })} />
          <input required={!alumni} type="email" aria-label="Recipient email" placeholder={alumni ? 'Recipient email (optional)' : 'Lecturer university email'} className={inputCls} value={f.recipientEmail} onChange={e => setF({ ...f, recipientEmail: e.target.value })} />
          <textarea required minLength={3} rows={2} aria-label="Purpose" placeholder="Purpose (e.g. Master's application to University of Cape Town)" className={`${inputCls} sm:col-span-2`} value={f.purpose} onChange={e => setF({ ...f, purpose: e.target.value })} />
          <Button className={`${btnCls} sm:col-span-2`} disabled={busy}>{busy ? 'Sending…' : 'Request reference'}</Button>
        </form>
        {issued && <div role="status" className="mt-5 rounded-md border border-primary p-4 text-sm">
          <p className="mb-2 font-semibold">Send these to your lecturer</p>
          <p className="break-all">Link: {issued.link}</p>
          <p>Access code: <span className="font-mono text-lg">{issued.code}</span></p>
          <p className="mt-1 text-xs text-muted-foreground">The code is shown only once. The link expires in 14 days.</p>
          <div className="mt-3 flex flex-wrap gap-2"><Button asChild><a href={mailto}><Mail />Email lecturer</a></Button><Button variant="outline" onClick={() => void navigator.clipboard.writeText(`${issued.link}\nAccess code: ${issued.code}`).then(() => toast.success('Copied'))}><Copy />Copy</Button></div>
        </div>}
      </Card>
      <Card>
        <h2 className="mb-3 font-display text-xl">My requests</h2>
        <ul className="divide-y divide-border">
          {(requests.data ?? []).filter(r => r.kind === 'reference').map(r => <li key={r.id} className="py-3 text-sm">
            <div className="flex flex-wrap justify-between gap-2"><span className="font-semibold">{r.routed_to === 'records' ? 'Records Office' : r.recipient_name}</span><span className="capitalize">{r.status === 'fulfilled' ? 'Submitted' : r.status}</span></div>
            <p className="text-muted-foreground">{r.purpose} · {new Date(r.created_at).toLocaleDateString()}</p>
          </li>)}
          {requests.data?.filter(r => r.kind === 'reference').length === 0 && <li className="py-2 text-sm text-muted-foreground">No requests yet.</li>}
        </ul>
      </Card>
    </div>
  </>;
}
