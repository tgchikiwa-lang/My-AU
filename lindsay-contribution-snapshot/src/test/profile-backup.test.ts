import { describe, expect, it } from 'vitest';
import { parseBackup } from '@/lib/profile-backup';
import { initial } from '@/lib/store';
describe('Student backup restoration',()=>{
  it('restores skills, projects, certifications and activities',()=>{
    const data={...initial,certificates:[{id:'cert',title:'Web design',issuer:'AU',date:'2026-10'}]};
    const restored=parseBackup(JSON.stringify({version:1,data}));
    expect(restored.skills).toEqual(data.skills);
    expect(restored.projects).toEqual(data.projects);
    expect(restored.certificates).toEqual(data.certificates);
    expect(restored.clubs).toEqual(data.clubs);
  });
  it('never imports passwords or account identity',()=>{
    const restored=parseBackup(JSON.stringify({version:1,data:{...initial,password:'secret',id:'other-user'}}));
    expect(restored).not.toHaveProperty('password');
    expect(restored).not.toHaveProperty('id');
  });
  it('rejects malformed backups',()=>expect(()=>parseBackup('{"version":1,"data":{}}')).toThrow());
});