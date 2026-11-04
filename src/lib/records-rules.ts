export const REFERENCE_LINK_DAYS = 14;

/** Transcripts and every alumni request go to the Records Office; current students' references go to the named lecturer. */
export function routeRequest(kind: 'transcript' | 'reference', alumni: boolean): 'records' | 'lecturer' {
  return kind === 'transcript' || alumni ? 'records' : 'lecturer';
}
