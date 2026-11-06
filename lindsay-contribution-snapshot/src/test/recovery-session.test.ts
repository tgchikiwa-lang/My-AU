import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { validateRecoverySession } from '@/lib/recovery-session';

function mockAuth() {
  return {
    getSession: vi.fn().mockResolvedValue({ data: { session: { user: { id: 'admin' } } }, error: null }),
    getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'admin' } }, error: null }),
    setSession: vi.fn().mockResolvedValue({ error: null }),
    verifyOtp: vi.fn().mockResolvedValue({ error: null }),
    exchangeCodeForSession: vi.fn().mockResolvedValue({ error: null }),
  };
}
describe('Recovery session validation', () => {
  beforeEach(() => sessionStorage.clear());
  it('accepts a verified invitation and survives callback token removal', async () => {
    const auth = mockAuth();
    expect(await validateRecoverySession(auth as unknown as SupabaseClient['auth'],new URL('https://portal.test/reset-password#type=invite&access_token=test&refresh_token=refresh'),sessionStorage)).toBe(true);
    expect(auth.setSession).toHaveBeenCalledWith({ access_token: 'test', refresh_token: 'refresh' });
    expect(await validateRecoverySession(auth as unknown as SupabaseClient['auth'],new URL('https://portal.test/reset-password'),sessionStorage)).toBe(true);
  });
  it('rejects a signed-in user without recovery authorization', async () => {
    expect(await validateRecoverySession(mockAuth() as unknown as SupabaseClient['auth'],new URL('https://portal.test/reset-password'),sessionStorage)).toBe(false);
  });
  it('rejects expired invitation tokens even with an existing session', async () => {
    const auth=mockAuth(); auth.setSession.mockResolvedValue({ error: new Error('Expired') });
    await expect(validateRecoverySession(auth as unknown as SupabaseClient['auth'],new URL('https://portal.test/reset-password#type=invite&access_token=expired&refresh_token=refresh'),sessionStorage)).rejects.toThrow('Expired');
  });
  it('rejects a recovery marker belonging to another user', async () => {
    sessionStorage.setItem('au-recovery',JSON.stringify({id:'other',time:Date.now()}));
    expect(await validateRecoverySession(mockAuth() as unknown as SupabaseClient['auth'],new URL('https://portal.test/reset-password'),sessionStorage)).toBe(false);
  });
  it('verifies token-hash recovery callbacks', async () => {
    const auth=mockAuth();
    expect(await validateRecoverySession(auth as unknown as SupabaseClient['auth'],new URL('https://portal.test/reset-password?type=recovery&token_hash=test'),sessionStorage)).toBe(true);
    expect(auth.verifyOtp).toHaveBeenCalledWith({token_hash:'test',type:'recovery'});
  });
});