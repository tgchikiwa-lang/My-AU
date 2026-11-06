import { createContext, useContext, useEffect, useState, useRef, type ReactNode } from "react";

import { supabase } from "@/integrations/supabase/client";
import { studentSchema } from "./profile-backup";
import { uploadDataUrl } from "./cloud-files";
import { toast } from "sonner";

export type Skill = { id: string; name: string; level: "Beginner" | "Intermediate" | "Advanced" };
export type Project = { id: string; title: string; description: string; tech: string; github: string };
export type Certificate = { id: string; title: string; issuer: string; date: string };
export type AcademicRecord = { id: string; institution: string; qualification: string; years: string; result: string };
export type Achievement = {
  id: string;
  title: string;
  year: string;
  description: string;
  categories: string[];
  date: string;
  evidence: string;
};
export type Club = { id: string; name: string; type: "Club" | "Association" | "Activity"; role: string; photos: string[] };

export type Profile = {
  name: string;
  studentId: string;
  programme: string;
  faculty: string;
  year: string;
  email: string;
  phone: string;
  address: string;
  dob: string;
  nationality: string;
  languages: string;
  photo: string;
  bio: string;
  github: string;
  linkedin: string;
  cvFile: string;
  cvFileName: string;
};

export type Store = {
  profile: Profile;
  skills: Skill[];
  projects: Project[];
  certificates: Certificate[];
  academic: AcademicRecord[];
  achievements: Achievement[];
  clubs: Club[];
};

export const uid = () => Math.random().toString(36).slice(2, 10);

export const initial: Store = {
  profile: {
    name: "Tadiwa Moyo",
    studentId: "AU-2023-04817",
    programme: "BSc Computer Information Systems",
    faculty: "Computing & Social Sciences",
    year: "Year 2",
    email: "tadiwa.moyo@africau.edu",
    phone: "+263 77 123 4567",
    address: "Fairview Road, Mutare, Zimbabwe",
    dob: "2004-03-14",
    nationality: "Zimbabwean",
    languages: "English, Shona",
    photo: "",
    bio: "Computer Information Systems student passionate about web technologies and building tools that help communities.",
    github: "",
    linkedin: "",
    cvFile: "",
    cvFileName: "",
  },
  skills: [
    { id: uid(), name: "HTML & CSS", level: "Advanced" },
    { id: uid(), name: "JavaScript", level: "Intermediate" },
    { id: uid(), name: "Python", level: "Intermediate" },
    { id: uid(), name: "Public Speaking", level: "Beginner" },
  ],
  projects: [
    { id: uid(), title: "Student Profile System", description: "Responsive student dashboard for CIS2103.", tech: "HTML, CSS, JavaScript", github: "" },
  ],
  certificates: [
    { id: uid(), title: "Responsive Web Design", issuer: "freeCodeCamp", date: "2025-06" },
  ],
  academic: [
    { id: uid(), institution: "Africa University", qualification: "BSc Computer Information Systems", years: "2023 – present", result: "In progress" },
    { id: uid(), institution: "Hillcrest College", qualification: "A Level", years: "2020 – 2022", result: "15 points" },
  ],
  achievements: [
    {
  id: uid(),
  title: "Dean's List",
  year: "2024",
  description: "Top 10% of the faculty for the academic year.",
  categories: ["Academic"],
  date: "",
  evidence: "",
},
  ],
  clubs: [
    { id: uid(), name: "Computer Science Society", type: "Association", role: "Member", photos: [] },
  ],
};

type Ctx = { data: Store; update: (fn: (s: Store) => Store) => void; ready: boolean; status: string; retry: () => void };
const StoreCtx = createContext<Ctx | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<Store>(initial);
  const [ready, setReady] = useState(false);
  const [status, setStatus] = useState("Loading profile…");
  const current = useRef(initial);
  const owner = useRef("");
  const queue = useRef(Promise.resolve());
  const revision = useRef(0);
  useEffect(() => {
    let active = true;
    void (async () => {
      const {data: auth,error: authError} = await supabase.auth.getUser();
      if(authError || !auth.user) throw new Error("Please sign in again.");
      const {data: enabled,error: accessError}=await supabase.rpc('account_is_enabled');
      if(accessError || !enabled) throw new Error('Account access is disabled. Please contact the university.');
      const {data: row,error} = await supabase.from('profiles').select('data').eq('id',auth.user.id).single();
      if(error) throw error;
      const parsed=studentSchema.safeParse(row.data);
      const next=parsed.success ? parsed.data : {...initial, profile:{...initial.profile,name:auth.user.user_metadata["name"] ?? 'Student',email:auth.user.email ?? '', studentId:'',phone:'',address:'',dob:''},skills:[],projects:[],academic:[],certificates:[],achievements:[],clubs:[]};
      if(active){owner.current=auth.user.id;current.current=next;setData(next);setReady(true);setStatus('All changes saved');}
    })().catch(e=>{if(active)setStatus(e.message ?? 'Could not load profile. Please refresh.');});
    return()=>{active=false};
  }, []);
  const persist = (next: Store) => {
    const version=++revision.current;
    const userId=owner.current;
    setStatus('Saving…');
    queue.current=queue.current.then(async()=>{
      const {data: enabled,error: accessError}=await supabase.rpc('account_is_enabled');
      if(accessError || !enabled)throw new Error('Account access is disabled.');
      const clean=studentSchema.parse(next);
      const cloud = {
  ...clean,
  profile: {
    ...clean.profile,
    photo: await uploadDataUrl(clean.profile.photo, userId),
    cvFile: await uploadDataUrl(clean.profile.cvFile, userId),
  },
  clubs: await Promise.all(
    clean.clubs.map(async c => ({
      ...c,
      photos: await Promise.all(
        c.photos.map(src => uploadDataUrl(src, userId))
      ),
    }))
  ),
  achievements: await Promise.all(
    clean.achievements.map(async achievement => ({
      ...achievement,
      evidence: await uploadDataUrl(achievement.evidence, userId),
    }))
  ),
};
      const {error}=await supabase.from('profiles').update({data:cloud,updated_at:new Date().toISOString()}).eq('id',userId).select('id').single();
      if(error)throw error;
      if(version===revision.current){current.current=cloud;setData(cloud);setStatus('All changes saved');}
    }).catch(()=>{if(version===revision.current)setStatus('Not saved — retry');toast.error('Changes were not saved. Please retry before leaving.');});
  };
  const update=(fn: (s: Store)=>Store)=>{if(!ready)return;const next=fn(current.current);current.current=next;setData(next);persist(next);};
  if(!ready)return <div role="status" className="p-8 text-center">{status}</div>;
  return <StoreCtx.Provider value={{data,update,ready,status,retry:()=>persist(current.current)}}>{children}</StoreCtx.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreCtx);
  if (!ctx) throw new Error("useStore outside provider");
  return ctx;
}

/** Read an image file, downscale it, and return a JPEG data URL. */
export function readImage(file: File, max = 800): Promise<string> {
  if (!/^image\/(jpeg|png|webp)$/.test(file.type)) return Promise.reject(new Error("Please select a JPG, PNG or WebP photo."));
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, max / Math.max(img.width, img.height));
        const c = document.createElement("canvas");
        c.width = img.width * scale;
        c.height = img.height * scale;
        const context = c.getContext("2d");
        if (!context) return reject(new Error("Image processing unavailable"));
        context.drawImage(img, 0, 0, c.width, c.height);
        resolve(c.toDataURL("image/jpeg", 0.8));
      };
      img.onerror = reject;
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

export function passwordStrength(pw: string): { score: number; label: string } {
  let score = 0;
  if (pw.length >= 8) score++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
  if (/\d/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  return { score, label: ["Very weak", "Weak", "Fair", "Good", "Strong"][score] ?? "Very weak" };
}
