import { Download, Upload } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { useStore } from '@/lib/store';
import { parseBackup } from '@/lib/profile-backup';
import { portableFile } from '@/lib/cloud-files';

export function ProfileBackup(){const {data,update}=useStore();const [busy,setBusy]=useState(false);
async function exportProfile(){setBusy(true);try{const portable={...data,profile:{...data.profile,photo:await portableFile(data.profile.photo),cvFile:await portableFile(data.profile.cvFile)},clubs:await Promise.all(data.clubs.map(async c=>({...c,photos:await Promise.all(c.photos.map(portableFile)))}))};const url=URL.createObjectURL(new Blob([JSON.stringify({version:1,data:portable},null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='student-profile-backup.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}catch{toast.error('Backup could not be exported.');}finally{setBusy(false)}}
async function restore(file?:File){if(!file)return;setBusy(true);try{const next=parseBackup(await file.text());if(confirm('Replace your current profile, skills, projects, certificates, and activities with this backup?')){update(()=>next);toast.success('Backup restored. Saving your profile…');}}catch{toast.error('This is not a valid student profile backup.');}finally{setBusy(false)}}
return <div className="flex flex-wrap gap-2"><Button variant="outline" disabled={busy} onClick={exportProfile}><Download/>Export profile</Button><label className="relative inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-md border border-input px-4 text-sm font-medium focus-within:ring-2 focus-within:ring-ring"><Upload className="size-4"/>Import profile<input aria-label="Import student profile backup" type="file" accept=".json,application/json" disabled={busy} className="sr-only" onChange={e=>{void restore(e.target.files?.[0]);e.target.value=''}}/></label></div>}