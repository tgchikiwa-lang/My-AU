import type { SupabaseClient } from '@supabase/supabase-js';

const markerKey = 'au-recovery';
const lifetime = 10 * 60 * 1000;

/** URL hints never grant access without a provider-validated user. */
export async function validateRecoverySession(auth: SupabaseClient['auth'], url: URL, storage: Storage) {
  const hash = new URLSearchParams(url.hash.slice(1));
  const type = hash.get('type') ?? url.searchParams.get('type');
  const isRecovery = type === 'invite' || type === 'recovery';
  // Wait for the SDK's automatic URL processing before inspecting the session.
  await auth.getSession();
  const access = hash.get('access_token');
  const refresh = hash.get('refresh_token');
  const tokenHash = url.searchParams.get('token_hash');
  const code = url.searchParams.get('code');
  let fromLink = false;
  if (isRecovery && access && refresh) {
    const { error } = await auth.setSession({ access_token: access, refresh_token: refresh });
    if (error) throw error;
    fromLink = true;
  } else if (isRecovery && tokenHash) {
    const { error } = await auth.verifyOtp({ token_hash: tokenHash, type });
    if (error) throw error;
    fromLink = true;
  } else if (code) {
    // getSession may already have exchanged this single-use PKCE code.
    const { data } = await auth.getSession();
    if (!data.session) {
      const { error } = await auth.exchangeCodeForSession(code);
      if (error) throw error;
    }
    fromLink = true;
  }
  const { data, error } = await auth.getUser();
  if (error || !data.user) return false;
  if (fromLink) {
    storage.setItem(markerKey, JSON.stringify({ id: data.user.id, time: Date.now() }));
    return true;
  }
  try {
    const marker = JSON.parse(storage.getItem(markerKey) ?? 'null');
    const age = Date.now() - marker?.time;
    return marker?.id === data.user.id && age >= 0 && age < lifetime;
  } catch { return false; }
}