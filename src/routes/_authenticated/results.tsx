import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { FileText, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, PageTitle, btnCls, delBtn, inputCls } from '@/components/Shell';
import { VerifyBadge, useVerifiedIds } from '@/components/VerifyBadge';
import { uid, useStore } from '@/lib/store';
import { supabase } from '@/integrations/supabase/client';
import { createRecordsRequest } from '@/lib/records.functions';

export const Route = createFileRoute('/_authenticated/results')({
  head: () => ({ meta: [
    { title: 'Results, CGPA & Transcripts | Africa University' },
    { name: 'description', content: 'Record your course results and CGPA and request interim transcripts.' },
    { property: 'og:title', content: 'Results & Transcripts | Africa University' },
    { property: 'og:description', content: 'Course results, CGPA and transcript requests.' },
    { property: 'og:type', content: 'website' },
    { name: 'twitter:card', content: 'summary' },
  ] }),
  component: Results,
});

export const myRequestsKey = ['my-records-requests'];
export function useMyRequests() {
  return useQuery({ queryKey: myRequestsKey, queryFn: async () => {
    const { data, error } = await supabase.from('records_requests').select('id,kind,alumni,routed_to,recipient_name,recipient_email,purpose,status,response,created_at').order('created_at', { ascending: false });
    if (error) throw error; return data;
  } });
}

const blank = { code: '', course: '', semester: '', grade: '', credits: '' };

function Results() {
  const { data, update } = useStore();
  const verified = useVerifiedIds();
  const qc = useQueryClient();
  const create = useServerFn(createRecordsRequest);
  const requests = useMyRequests();
  const [f, setF] = useState(blank);
  const [purpose, setPurpose] = useState('');
  const [busy, setBusy] = useState(false);
  const cgpaLocked = verified.has('result:cgpa');

  async function requestTranscript(e: React.FormEvent) {
    e.preventDefault(); setBusy(true);
    try { await create({ data: { kind: 'transcript', alumni: data.profile.graduated, purpose } }); setPurpose(''); toast.success('Transcript request sent to the Records Office.'); await qc.invalidateQueries({ queryKey: myRequestsKey }); }
    catch (err) { toast.error(err instanceof Error ? err.message : 'Could not send request.'); } finally { setBusy(false); }
  }

  return <>
    <PageTitle title="Results & Transcripts" subtitle="Enter your course results and CGPA, then request an interim transcript." />
    <div className="space-y-6">
      <Card>
        <h2 className="mb-4 font-display text-xl">Current CGPA</h2>
        <div className="flex flex-wrap items-end gap-4">
          <label className="text-sm font-semibold">CGPA (out of 4.0)<input className={`${inputCls} mt-2 w-32`} inputMode="decimal" disabled={cgpaLocked} value={data.profile.cgpa} onChange={e => { const v = e.target.value; if (/^\d?(\.\d{0,2})?$/.test(v) && (v === '' || Number(v) <= 4)) update(s => ({ ...s, profile: { ...s.profile, cgpa: v } })); }} /></label>
          {data.profile.cgpa && <VerifyBadge type="result" id="cgpa" summary={`Current CGPA: ${data.profile.cgpa}`} />}
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={data.profile.graduated} onChange={e => update(s => ({ ...s, profile: { ...s.profile, graduated: e.target.checked } }))} />I have graduated (alumni)</label>
        </div>
      </Card>
      <Card>
        <h2 className="mb-4 font-display text-xl">Course results</h2>
        <ul className="mb-4 divide-y divide-border">
          {data.results.length === 0 && <li className="py-2 text-sm text-muted-foreground">No results added yet.</li>}
          {data.results.map(r => { const locked = verified.has(`result:${r.id}`); return <li key={r.id} className="flex items-start justify-between gap-3 py-3">
            <div><div className="font-semibold">{r.code} · {r.course}</div><div className="text-sm text-muted-foreground">{r.semester} · Grade {r.grade} · {r.credits} credits</div><VerifyBadge type="result" id={r.id} summary={`${r.code} ${r.course} (${r.semester}) — ${r.grade}`} /></div>
            <Button className={delBtn} disabled={locked} title={locked ? 'Verified items cannot be deleted' : undefined} aria-label={`Delete ${r.course}`} onClick={() => confirm('Delete this result?') && update(s => ({ ...s, results: s.results.filter(x => x.id !== r.id) }))}><Trash2 className="h-4 w-4" /></Button>
          </li>; })}
        </ul>
        <form onSubmit={e => { e.preventDefault(); update(s => ({ ...s, results: [...s.results, { id: uid(), ...f }] })); setF(blank); }} className="grid gap-2 sm:grid-cols-5">
          {([['code', 'Course code'], ['course', 'Course name'], ['semester', 'Semester (e.g. 2024 S1)'], ['grade', 'Grade'], ['credits', 'Credits']] as const).map(([k, l]) => <input key={k} required aria-label={l} placeholder={l} className={inputCls} value={f[k]} onChange={e => setF({ ...f, [k]: e.target.value })} />)}
          <Button className={`${btnCls} sm:col-span-5`}><Plus className="h-4 w-4" />Add result</Button>
        </form>
      </Card>
      <Card>
        <h2 className="mb-2 flex items-center gap-2 font-display text-xl"><FileText className="h-5 w-5 text-primary" />Request interim transcript</h2>
        <p className="mb-4 text-sm text-muted-foreground">Requests go to the Records Office.</p>
        <form onSubmit={requestTranscript} className="flex flex-wrap gap-2">
          <input required minLength={3} className={`${inputCls} min-w-0 flex-1`} aria-label="Purpose" placeholder="Purpose (e.g. internship application)" value={purpose} onChange={e => setPurpose(e.target.value)} />
          <Button className={btnCls} disabled={busy}>Request transcript</Button>
        </form>
        <ul className="mt-4 divide-y divide-border">{requests.data?.filter(r => r.kind === 'transcript').map(r => <li key={r.id} className="py-2 text-sm"><span className="font-semibold capitalize">{r.status}</span> · {r.purpose} · {new Date(r.created_at).toLocaleDateString()}{r.response && <p className="text-muted-foreground">Records Office: {r.response}</p>}</li>)}</ul>
      </Card>
    </div>
  </>;
}
