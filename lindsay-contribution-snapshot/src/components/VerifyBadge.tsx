import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { BadgeCheck, Clock, ShieldQuestion, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useStore } from '@/lib/store';

export type VerifyType =
  | 'skill'
  | 'project'
  | 'academic'
  | 'achievement'
  | 'certificate';

export const myVerificationsKey = ['my-verifications'];

export function useMyVerifications() {
  return useQuery({
    queryKey: myVerificationsKey,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('verification_requests')
        .select('item_type,item_id,status,reviewer_note');

      if (error) throw error;
      return data;
    },
  });
}

export function VerifyBadge({
  type,
  id,
  summary,
}: {
  type: VerifyType;
  id: string;
  summary: string;
}) {
  const { data: store } = useStore();
  const qc = useQueryClient();
  const { data } = useMyVerifications();

  const [showForm, setShowForm] = useState(false);
  const [lecturerEmail, setLecturerEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const req = data?.find(
    r => r.item_type === type && r.item_id === id
  );

  async function request(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!lecturerEmail.trim()) {
      toast.error('Please enter the lecturer email.');
      return;
    }

    setSubmitting(true);

    const { data: requestId, error } = await supabase.rpc(
      'submit_verification_request',
      {
        p_lecturer_email: lecturerEmail.trim(),
        p_student_name: store.profile.name || 'Student',
        p_item_type: type,
        p_item_id: id,
        p_item_summary: summary.slice(0, 500),
      }
    );

    setSubmitting(false);

    if (error) {
      toast.error(
        error.message.includes('No lecturer account found')
          ? 'No lecturer account was found with that email.'
          : 'Could not send the verification request.'
      );
      return;
    }

    if (requestId) {
      toast.success('Verification request sent successfully.');
      setLecturerEmail('');
      setShowForm(false);

      await qc.invalidateQueries({
        queryKey: myVerificationsKey,
      });
    }
  }

  const base =
    'mt-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium';

  if (!req) {
    return (
      <div className="mt-2">
        {!showForm ? (
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className={`${base} border border-border text-muted-foreground hover:border-primary hover:text-primary`}
          >
            <ShieldQuestion className="size-3.5" />
            Request verification
          </button>
        ) : (
          <form onSubmit={request} className="mt-2 space-y-2">
            <label
              htmlFor={`lecturer-email-${id}`}
              className="block text-xs font-medium"
            >
              Lecturer's university email
            </label>

            <input
              id={`lecturer-email-${id}`}
              type="email"
              required
              value={lecturerEmail}
              onChange={e => setLecturerEmail(e.target.value)}
              placeholder="lecturer@africau.edu"
              className="w-full max-w-sm rounded-md border border-border bg-background px-3 py-2 text-sm"
            />

            <div className="flex gap-2">
              <button
                type="submit"
                disabled={submitting}
                className="rounded-md bg-primary px-3 py-2 text-xs text-primary-foreground disabled:opacity-50"
              >
                {submitting ? 'Sending...' : 'Send request'}
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setLecturerEmail('');
                }}
                className="rounded-md border border-border px-3 py-2 text-xs"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>
    );
  }

  if (req.status === 'approved') {
    return (
      <span className={`${base} bg-primary text-primary-foreground`}>
        <BadgeCheck className="size-3.5" />
        Verified by lecturer
      </span>
    );
  }

  if (req.status === 'rejected') {
    return (
      <span className="mt-2 block text-xs">
        <span className={`${base} mt-0 bg-destructive/10 text-destructive`}>
          <XCircle className="size-3.5" />
          Not verified
        </span>
        {req.reviewer_note && (
          <span className="ml-2 text-muted-foreground">
            “{req.reviewer_note}”
          </span>
        )}
      </span>
    );
  }

  return (
    <span className={`${base} bg-muted text-muted-foreground`}>
      <Clock className="size-3.5" />
      Awaiting verification
    </span>
  );
}