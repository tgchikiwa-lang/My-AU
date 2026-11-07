import { z } from 'zod';

const text = z.string().max(20000);
const url = text.refine(v => !v || /^https:\/\//.test(v), 'Use an https link');
const media = z.string().refine(v => !v || v.startsWith('storage://') || /^data:(image\/(jpeg|png|webp)|application\/(pdf|msword|vnd.openxmlformats-officedocument.wordprocessingml.document));base64,/.test(v), 'Invalid uploaded file');
const id = z.string().min(1).max(200);
export const studentSchema = z.object({
  profile: z.object({name:text,studentId:text,programme:text,faculty:text,year:text,email:text,phone:text,address:text,dob:text,nationality:text,languages:text,photo:media,bio:text,github:url,linkedin:url,cvFile:media,cvFileName:text,cgpa:text.default(''),graduated:z.boolean().default(false)}),
  results:z.array(z.object({id,code:text,course:text,semester:text,grade:text,credits:text})).default([]),
  skills:z.array(z.object({id,name:text,level:z.enum(['Beginner','Intermediate','Advanced'])})),
  projects:z.array(z.object({id,title:text,description:text,tech:text,github:url})),
  certificates:z.array(z.object({id,title:text,issuer:text,date:text})),
  academic:z.array(z.object({id,institution:text,qualification:text,years:text,result:text})),
  achievements: z.array(z.object({
  id,
  title: text,
  year: text,
  description: text,
  categories: z.array(z.string().max(80)).default([]),
  date: text.default(''),
  evidence: media.default('')
})),
  clubs:z.array(z.object({id,name:text,type:z.enum(['Club','Association','Activity']),role:text,photos:z.array(media)})),
});
export const backupSchema = z.object({version:z.literal(1),data:studentSchema});
export function parseBackup(raw: string) { return backupSchema.parse(JSON.parse(raw)).data; }