import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { routeRequest, REFERENCE_LINK_DAYS } from './records-rules';

type Client = import('@supabase/supabase-js').SupabaseClient<import('@/integrations/supabase/types').Database>;

async function sha256(value: string) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return Array.from(new Uint8Array(buf), b => b.toString(16).padStart(2, '0')).join('');
}
function randomHex(bytes: number) { const a = new Uint8Array(bytes); crypto.getRandomValues(a); return Array.from(a, b => b.toString(16).padStart(2, '0')).join(''); }
function randomCode() { const a = new Uint32Array(1); crypto.getRandomValues(a); return String(a[0]! % 1000000).padStart(6, '0'); }

export async function requireRecordsStaff(client: Client, userId: string) {
  const { data: enabled } = await client.rpc('account_is_enabled');
  const [{ data: records }, { data: admin }] = await Promise.all([
    client.rpc('has_role', { _user_id: userId, _role: 'records' }),
    client.rpc('has_role', { _user_id: userId, _role: 'admin' }),
  ]);
  if (!enabled || !(records || admin)) throw new Error('Records Office access required.');
}

export const getRecordsAccess = createServerFn({ method: 'GET' }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  try { await requireRecordsStaff(context.supabase, context.userId); return true; } catch { return false; }
});

export const listAccounts = createServerFn({ method: 'GET' }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  await requireRecordsStaff(context.supabase, context.userId);
  const { data, error } = await context.supabase.from('account_access').select('user_id,email,full_name,pending_approval,disabled_at,disabled_reason,created_at').order('created_at', { ascending: false }).limit(500);
  if (error) throw new Error('Could not load accounts.');
  return data;
});

export const reviewRegistration = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ userId: z.string().uuid(), approve: z.boolean() }).parse(i))
  .handler(async ({ context, data }) => {
    await requireRecordsStaff(context.supabase, context.userId);
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
    const { error } = await supabaseAdmin.from('account_access').update(data.approve
      ? { pending_approval: false, updated_by: context.userId, updated_at: new Date().toISOString() }
      : { pending_approval: false, disabled_at: new Date().toISOString(), disabled_reason: 'Registration not approved', updated_by: context.userId, updated_at: new Date().toISOString() }).eq('user_id', data.userId);
    if (error) throw new Error('Could not update registration.');
    if (!data.approve) await supabaseAdmin.auth.admin.updateUserById(data.userId, { ban_duration: '876000h' });
    return { success: true };
  });

export const setAccountStatus = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ userId: z.string().uuid(), disabled: z.boolean(), reason: z.string().max(300).default('') }).parse(i))
  .handler(async ({ context, data }) => {
    await requireRecordsStaff(context.supabase, context.userId);
    if (data.userId === context.userId) throw new Error('You cannot disable your own account.');
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
    const { data: staff } = await supabaseAdmin.from('user_roles').select('role').eq('user_id', data.userId).in('role', ['admin', 'records']);
    if (staff?.length) throw new Error('Staff accounts cannot be disabled here.');
    // Records are retained: only access is blocked, profile data stays for statistics.
    const { error } = await supabaseAdmin.from('account_access').upsert({ user_id: data.userId, disabled_at: data.disabled ? new Date().toISOString() : null, disabled_reason: data.disabled ? data.reason || null : null, updated_by: context.userId, updated_at: new Date().toISOString() });
    if (error) throw new Error('Could not update account.');
    await supabaseAdmin.auth.admin.updateUserById(data.userId, { ban_duration: data.disabled ? '876000h' : 'none' });
    return { success: true };
  });

export const createRecordsRequest = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({
    kind: z.enum(['transcript', 'reference']), alumni: z.boolean(),
    recipientName: z.string().trim().max(200).default(''), recipientEmail: z.string().trim().max(200).default(''),
    purpose: z.string().trim().min(3).max(1000),
  }).parse(i))
  .handler(async ({ context, data }) => {
    const { data: enabled } = await context.supabase.rpc('account_is_enabled');
    if (!enabled) throw new Error('Account access is disabled.');
    const routed = routeRequest(data.kind, data.alumni);
    if (routed === 'lecturer' && (!data.recipientName || !z.string().email().safeParse(data.recipientEmail).success)) throw new Error('Enter the lecturer’s name and a valid email address.');
    const { data: profile } = await context.supabase.from('profiles').select('data').eq('id', context.userId).single();
    const name = String(((profile?.data as { profile?: { name?: string } } | null)?.profile?.name) ?? 'Student').slice(0, 200);
    const token = routed === 'lecturer' ? randomHex(24) : null;
    const code = routed === 'lecturer' ? randomCode() : null;
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
    const { error } = await supabaseAdmin.from('records_requests').insert({
      student_id: context.userId, student_name: name, kind: data.kind, alumni: data.alumni, routed_to: routed,
      recipient_name: data.recipientName, recipient_email: data.recipientEmail, purpose: data.purpose,
      token_hash: token ? await sha256(token) : null, code_hash: code ? await sha256(code) : null,
      expires_at: token ? new Date(Date.now() + REFERENCE_LINK_DAYS * 864e5).toISOString() : null,
    });
    if (error) throw new Error('Could not create the request.');
    const { getRequest } = await import('@tanstack/react-start/server');
    const origin = new URL(getRequest().url).origin;
    return { routed, link: token ? `${origin}/reference/${token}` : null, code };
  });

export const respondRecordsRequest = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid(), status: z.enum(['fulfilled', 'declined']), response: z.string().max(5000).default('') }).parse(i))
  .handler(async ({ context, data }) => {
    await requireRecordsStaff(context.supabase, context.userId);
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
    const { error } = await supabaseAdmin.from('records_requests').update({ status: data.status, response: data.response || null, responded_at: new Date().toISOString() }).eq('id', data.id).eq('routed_to', 'records');
    if (error) throw new Error('Could not update the request.');
    return { success: true };
  });

// Public: lecturer access by emailed link + access code. Never returns private data without the code.
async function findByToken(token: string) {
  const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
  const { data } = await supabaseAdmin.from('records_requests').select('*').eq('token_hash', await sha256(token)).maybeSingle();
  return { supabaseAdmin, row: data };
}
const tokenSchema = z.string().regex(/^[a-f0-9]{48}$/);

export const openReference = createServerFn({ method: 'POST' })
  .inputValidator((i: unknown) => z.object({ token: tokenSchema, code: z.string().regex(/^\d{6}$/) }).parse(i))
  .handler(async ({ data }) => {
    const { row } = await findByToken(data.token);
    if (!row || row.code_hash !== await sha256(data.code) || !row.expires_at || new Date(row.expires_at) < new Date()) throw new Error('This link or access code is invalid or has expired.');
    return { studentName: row.student_name, recipientName: row.recipient_name, purpose: row.purpose, status: row.status };
  });

export const submitReference = createServerFn({ method: 'POST' })
  .inputValidator((i: unknown) => z.object({ token: tokenSchema, code: z.string().regex(/^\d{6}$/), letter: z.string().trim().min(20).max(5000) }).parse(i))
  .handler(async ({ data }) => {
    const { row, supabaseAdmin } = await findByToken(data.token);
    if (!row || row.code_hash !== await sha256(data.code) || !row.expires_at || new Date(row.expires_at) < new Date()) throw new Error('This link or access code is invalid or has expired.');
    if (row.status !== 'pending') throw new Error('A recommendation has already been submitted for this request.');
    const { error } = await supabaseAdmin.from('records_requests').update({ status: 'fulfilled', response: data.letter, responded_at: new Date().toISOString() }).eq('id', row.id).eq('status', 'pending');
    if (error) throw new Error('Could not save the recommendation.');
    return { success: true };
  });
