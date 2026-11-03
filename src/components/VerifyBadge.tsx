import { useQuery, useQueryClient } from '@tanstack/react-query';
import { BadgeCheck, Clock, ShieldQuestion, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useStore } from '@/lib/store';

export type VerifyType = 'skill' | 'project' | 'academic' | 'achievement' | 'certificate';
export const myVerificationsKey = ['my-verifications'];

export function useMyVerifications() {
  return useQuery({
    queryKey: myVerificationsKey,
    queryFn: async () => {
      const { data, error } = await supabase.from('verification_requests').select('item_type,item_id,status,reviewer_note');
      if (error) throw error;
      return data;
    },
  });
}

export function VerifyBadge({ type, id, summary }: { type: VerifyType; id: string; summary: string }) {
  const { data: store } = useStore();
  const qc = useQueryClient();
  const { data } = useMyVerifications();
  const req = data?.find(r => r.item_type === type && r.item_id === id);

  async function request() {
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return;
    const { error } = await supabase.from('verification_requests').insert({ student_id: auth.user.id, student_name: store.profile.name || 'Student', item_type: type, item_id: id, item_summary: summary.slice(0, 500) });
    if (error) toast.error('Could not send the verification request.');
    else { toast.success('Sent to lecturers for verification.'); await qc.invalidateQueries({ queryKey: myVerificationsKey }); }
  }
  async function retry() {
    const { error } = await supabase.from('verification_requests').delete().eq('item_type', type).eq('item_id', id);
    if (!error) await request();
  }

  const base = 'mt-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium';
  if (!req) return <button type="button" onClick={request} className={`${base} border border-border text-muted-foreground hover:border-primary hover:text-primary focus-visible:outline-2 focus-visible:outline-ring`}><ShieldQuestion className="size-3.5" />Request verification</button>;
  if (req.status === 'approved') return <span className={`${base} bg-primary text-primary-foreground`}><BadgeCheck className="size-3.5" />Verified by lecturer</span>;
  if (req.status === 'rejected') return <span className="mt-2 block text-xs"><span className={`${base} mt-0 bg-destructive/10 text-destructive`}><XCircle className="size-3.5" />Not verified</span>{req.reviewer_note && <span className="ml-2 text-muted-foreground">“{req.reviewer_note}”</span>} <button type="button" onClick={retry} className="ml-2 text-primary underline">Request again</button></span>;
  return <span className={`${base} bg-muted text-muted-foreground`}><Clock className="size-3.5" />Awaiting verification</span>;
}
