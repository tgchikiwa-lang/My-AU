import { describe, expect, it } from 'vitest';
import { routeRequest } from '@/lib/records-rules';

describe('request routing', () => {
  it('sends transcripts to the Records Office', () => expect(routeRequest('transcript', false)).toBe('records'));
  it('sends alumni references to the Records Office', () => expect(routeRequest('reference', true)).toBe('records'));
  it('sends current students’ references to the lecturer', () => expect(routeRequest('reference', false)).toBe('lecturer'));
});
