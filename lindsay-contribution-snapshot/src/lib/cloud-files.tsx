import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const bucket = 'student-content';
export async function fileUrl(source: string) {
  if (!source.startsWith('storage://')) return source;
  const {data,error} = await supabase.storage.from(bucket).createSignedUrl(source.slice(10),3600);
  if(error) throw error;
  return data.signedUrl;
}
export function CloudImage({src,alt,...props}: React.ImgHTMLAttributes<HTMLImageElement>) {
  const [url,setUrl] = useState('');
  useEffect(()=>{let active=true; const load=()=>{if(src) void fileUrl(src).then(v=>{if(active)setUrl(v)}).catch(()=>toast.error('Photo could not be loaded.'));};load();const timer=setInterval(load,3000000);return()=>{active=false;clearInterval(timer)}},[src]);
  return url ? <img {...props} src={url} alt={alt}/> : <div className={props.className} aria-label={alt}/>;
}
export async function uploadDataUrl(source: string,userId: string) {
  if(!source.startsWith('data:')) return source;
  const blob=await (await fetch(source)).blob();
  const ext=blob.type.includes('image')?'jpg':blob.type.includes('pdf')?'pdf':'docx';
  const path=`${userId}/${crypto.randomUUID()}.${ext}`;
  const {error}=await supabase.storage.from(bucket).upload(path,blob,{contentType:blob.type});
  if(error) throw error;
  return `storage://${path}`;
}
export async function downloadFile(source: string,name: string) {
  try {const blob=await (await fetch(await fileUrl(source))).blob(); const url=URL.createObjectURL(blob); const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}catch{toast.error('File could not be downloaded.');}
}
export async function portableFile(source: string) {
  if(!source.startsWith('storage://'))return source;
  const blob=await (await fetch(await fileUrl(source))).blob();
  return await new Promise<string>((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result));reader.onerror=reject;reader.readAsDataURL(blob)});
}