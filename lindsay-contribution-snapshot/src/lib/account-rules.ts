export function assertAccountManagement(callerId: string, targetId: string, targetIsAdmin: boolean) {
  if (callerId === targetId) throw new Error('You cannot disable your own account.');
  if (targetIsAdmin) throw new Error('Administrator accounts cannot be disabled here.');
}

export function hasRecoveryLink(hash: string) {
  const params = new URLSearchParams(hash.replace(/^#/, ''));
  return ['recovery', 'invite'].includes(params.get('type') ?? '') && Boolean(params.get('access_token'));
}