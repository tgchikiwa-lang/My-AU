import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { assertAccountManagement } from './account-rules';

export const getAdminAccess = createServerFn({ method: 'GET' }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const { data: enabled, error: accessError } = await context.supabase.rpc('account_is_enabled');
  if (accessError || !enabled) return false;
  const { data, error } = await context.supabase.from('user_roles').select('role').eq('user_id', context.userId).eq('role', 'admin').maybeSingle();
  if (error) throw new Error('Could not verify administrator access.');
  return Boolean(data);
});

async function authorize(client: Parameters<typeof requireRole>[0], userId: string) { await requireRole(client, userId); }
async function requireRole(client: import('@supabase/supabase-js').SupabaseClient<import('@/integrations/supabase/types').Database>, userId: string) {
  const { data: enabled, error: accessError } = await client.rpc('account_is_enabled');
  const { data, error } = await client.from('user_roles').select('role').eq('user_id', userId).eq('role', 'admin').maybeSingle();
  if (accessError || !enabled || error || !data) throw new Error('Administrator access required.');
}

export const getAdminProfile = createServerFn({ method: 'GET' }).middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await authorize(context.supabase, context.userId);
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
    const { data: target, error } = await supabaseAdmin.auth.admin.getUserById(context.userId);
    if (error || !target.user) throw new Error('Could not load administrator account.');
    return {
      id: target.user.id,
      email: target.user.email ?? '',
      createdAt: target.user.created_at,
      lastSignIn: target.user.last_sign_in_at ?? null,
      confirmed: Boolean(target.user.email_confirmed_at),
    };
  });

export const listStudentAccounts = createServerFn({ method: 'GET' }).middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ page: z.number().int().min(1).default(1) }).parse(input))
  .handler(async ({ context, data }) => {
    await authorize(context.supabase, context.userId);
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
    const { data: result, error } = await supabaseAdmin.auth.admin.listUsers({ page: data.page, perPage: 50 });
    if (error) throw new Error('Could not load student accounts.');
    const ids = result.users.map(user => user.id);
    const [profiles, access, roles] = await Promise.all([
      supabaseAdmin.from('profiles').select('id,data,updated_at').in('id', ids),
      supabaseAdmin.from('account_access').select('user_id,disabled_at').in('user_id', ids),
      supabaseAdmin.from('user_roles').select('user_id,role').in('user_id', ids),
    ]);
    if (profiles.error || access.error || roles.error) throw new Error('Could not load account details.');
    return { hasMore: result.users.length === 50, accounts: result.users.map(user => ({
      id: user.id, email: user.email ?? '', createdAt: user.created_at, lastSignIn: user.last_sign_in_at,
      confirmed: Boolean(user.email_confirmed_at), disabled: Boolean(access.data?.find(row => row.user_id === user.id)?.disabled_at),
      admin: roles.data?.some(row => row.user_id === user.id && row.role === 'admin') ?? false,
      profile: profiles.data?.find(row => row.id === user.id)?.data ?? null,
    })) };
  });

export const setStudentAccess = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ userId: z.string().uuid(), disabled: z.boolean() }).parse(input))
  .handler(async ({ context, data }) => {
    await authorize(context.supabase, context.userId);
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
    const { data: role, error: roleError } = await supabaseAdmin.from('user_roles').select('role').eq('user_id', data.userId).eq('role', 'admin').maybeSingle();
    if (roleError) throw new Error('Could not verify target account.');
    assertAccountManagement(context.userId, data.userId, Boolean(role));
    const { data: target, error: targetError } = await supabaseAdmin.auth.admin.getUserById(data.userId);
    if (targetError || !target.user) throw new Error('Student account not found.');
    // Write denial first: existing access tokens are blocked by restrictive RLS immediately.
    if (data.disabled) {
      const { error } = await supabaseAdmin.from('account_access').upsert({ user_id: data.userId, disabled_at: new Date().toISOString(), updated_by: context.userId });
      if (error) throw new Error('Could not disable account access.');
    }
    const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(data.userId, { ban_duration: data.disabled ? '876000h' : 'none' });
    if (authError) throw new Error(data.disabled ? 'Profile access is blocked, but sign-in restriction failed. Retry disabling.' : 'Could not restore sign-in.');
    if (!data.disabled) {
      const { error } = await supabaseAdmin.from('account_access').upsert({ user_id: data.userId, disabled_at: null, updated_by: context.userId });
      if (error) throw new Error('Sign-in restored, but profile access is still blocked. Retry enabling.');
    }
    return { success: true };
  });

export const inviteStudent = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ email: z.string().email(), origin: z.string().url(), role: z.enum(['student', 'lecturer']).default('student') }).parse(input))
  .handler(async ({ context, data }) => {
    await authorize(context.supabase, context.userId);
    const { getRequest } = await import('@tanstack/react-start/server');
    const origin = new URL(getRequest().url).origin;
    if (new URL(data.origin).origin !== origin) throw new Error('Invalid invitation return address.');
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
    const { data: invited, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(data.email, { redirectTo: `${origin}/reset-password` });
    if (error || !invited.user) throw new Error('Invitation could not be sent. Check whether this account already exists.');
    if (data.role === 'lecturer') {
      const { error: roleError } = await supabaseAdmin.from('user_roles').insert({ user_id: invited.user.id, role: 'lecturer' });
      if (roleError) throw new Error('Invitation sent, but the lecturer role could not be assigned.');
    }
    return { success: true };
  });