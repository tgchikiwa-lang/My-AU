import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type Skill = { id: string; name: string; level: "Beginner" | "Intermediate" | "Advanced" };
export type Project = { id: string; title: string; description: string; tech: string; github: string };
export type Certificate = { id: string; title: string; issuer: string; date: string };
export type AcademicRecord = { id: string; institution: string; qualification: string; years: string; result: string };
export type Achievement = { id: string; title: string; year: string; description: string };
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
  password: string;
  skills: Skill[];
  projects: Project[];
  certificates: Certificate[];
  academic: AcademicRecord[];
  achievements: Achievement[];
  clubs: Club[];
};

export const uid = () => Math.random().toString(36).slice(2, 10);

const initial: Store = {
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
  password: "student123",
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
    { id: uid(), title: "Dean's List", year: "2024", description: "Top 10% of the faculty for the academic year." },
  ],
  clubs: [
    { id: uid(), name: "Computer Science Society", type: "Association", role: "Member", photos: [] },
  ],
};

const KEY = "au-student-profile-v1";

type Ctx = { data: Store; update: (fn: (s: Store) => Store) => void; ready: boolean };
const StoreCtx = createContext<Ctx | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<Store>(initial);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setData({ ...initial, ...JSON.parse(raw) });
    } catch {
      /* ignore */
    }
    setReady(true);
  }, []);

  const update = (fn: (s: Store) => Store) =>
    setData((prev) => {
      const next = fn(prev);
      try {
        localStorage.setItem(KEY, JSON.stringify(next));
      } catch {
        alert("Storage is full. Try smaller pictures or remove some.");
        return prev;
      }
      return next;
    });

  return <StoreCtx.Provider value={{ data, update, ready }}>{children}</StoreCtx.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreCtx);
  if (!ctx) throw new Error("useStore outside provider");
  return ctx;
}

/** Read an image file, downscale it, and return a JPEG data URL. */
export function readImage(file: File, max = 800): Promise<string> {
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
        c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
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
  return { score, label: ["Very weak", "Weak", "Fair", "Good", "Strong"][score] };
}
