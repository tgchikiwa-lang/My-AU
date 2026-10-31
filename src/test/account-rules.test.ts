import { describe, expect, it } from 'vitest';
import { assertAccountManagement, hasRecoveryLink } from '@/lib/account-rules';
describe('Administrator account protection',()=>{
  it('prevents administrators from disabling themselves',()=>expect(()=>assertAccountManagement('a','a',false)).toThrow());
  it('prevents disabling another administrator',()=>expect(()=>assertAccountManagement('a','b',true)).toThrow());
  it('allows managing student access',()=>expect(()=>assertAccountManagement('a','b',false)).not.toThrow());
});
describe('Password recovery',()=>{
  it('rejects a normal sign-in link',()=>expect(hasRecoveryLink('#type=signup&access_token=test')).toBe(false));
  it('requires a recovery token',()=>expect(hasRecoveryLink('#type=recovery')).toBe(false));
  it('accepts a password recovery link',()=>expect(hasRecoveryLink('#type=recovery&access_token=test')).toBe(true));
  it('accepts account activation invitations',()=>expect(hasRecoveryLink('#type=invite&access_token=test')).toBe(true));
});