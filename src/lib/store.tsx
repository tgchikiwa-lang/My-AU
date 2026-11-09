import { createContext, useContext, useEffect, useState, useRef, type ReactNode } from "react";

import { supabase } from "@/integrations/supabase/client";
import { studentSchema } from "./profile-backup";
import { createEmptyStore, isEmptyProfileData, isProfileComplete } from "./profile-state";
import { uploadDataUrl } from "./cloud-files";
import { toast } from "sonner";

export type Skill = { id: string; name: string; level: "Beginner" | "Intermediate" | "Advanced" };
export type Project = {
  id: string;
  title: string;
  description: string;
  tech: string;
  github: string;
};
export type Certificate = { id: string; title: string; issuer: string; date: string };
export type AcademicRecord = {
  id: string;
  institution: string;
  qualification: string;
  years: string;
  result: string;
};
export type Achievement = {
  id: string;
  title: string;
  year: string;
  description: string;
  categories: string[];
  date: string;
  evidence: string;
};
export type Club = {
  id: string;
  name: string;
  type: "Club" | "Association" | "Activity";
  role: string;
  photos: string[];
};

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
  cgpa: string;
  graduated: boolean;
};
export type CourseResult = {
  id: string;
  code: string;
  course: string;
  semester: string;
  grade: string;
  credits: string;
};

export type Store = {
  profile: Profile;
  skills: Skill[];
  projects: Project[];
  certificates: Certificate[];
  academic: AcademicRecord[];
  achievements: Achievement[];
  clubs: Club[];
  results: CourseResult[];
};

export const uid = () => Math.random().toString(36).slice(2, 10);

type Ctx = {
  data: Store;
  update: (fn: (s: Store) => Store) => void;
  ready: boolean;
  profileComplete: boolean;
  status: string;
  retry: () => void;
};
const StoreCtx = createContext<Ctx | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<Store>(() => createEmptyStore());
  const [ready, setReady] = useState(false);
  const [status, setStatus] = useState("Loading profile…");
  const [loadError, setLoadError] = useState(false);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [profileComplete, setProfileComplete] = useState(false);
  const current = useRef(data);
  const owner = useRef("");
  const queue = useRef(Promise.resolve());
  const revision = useRef(0);
  useEffect(() => {
    let active = true;
    void (async () => {
      const { data: auth, error: authError } = await supabase.auth.getUser();
      if (authError || !auth.user) throw new Error("Please sign in again.");
      const { data: enabled, error: accessError } = await supabase.rpc("account_is_enabled");
      if (accessError) throw new Error("Could not verify account access. Please retry.");
      if (!enabled) {
        const { data: access, error } = await supabase
          .from("account_access")
          .select("pending_approval")
          .eq("user_id", auth.user.id)
          .maybeSingle();
        if (error) throw new Error("Could not retrieve account access status. Please retry.");
        throw new Error(
          access?.pending_approval
            ? "Your registration is waiting for approval by the Records Office. You will be able to use your profile once it is approved."
            : "Account access is disabled. Please contact the university.",
        );
      }

      const { data: row, error } = await supabase
        .from("profiles")
        .select("data")
        .eq("id", auth.user.id)
        .maybeSingle();
      if (error) throw new Error("Could not load your profile. Please retry.");

      const metadataName = auth.user.user_metadata["name"];
      const empty = createEmptyStore(
        typeof metadataName === "string" ? metadataName.trim() : "",
        auth.user.email ?? "",
      );
      let next: Store;
      if (!row) {
        const { error: insertError } = await supabase
          .from("profiles")
          .insert({ id: auth.user.id, data: empty })
          .select("id")
          .single();
        if (insertError) throw new Error("Could not create your profile. Please retry.");
        next = empty;
      } else if (isEmptyProfileData(row.data)) {
        next = empty;
      } else {
        const parsed = studentSchema.safeParse(row.data);
        if (!parsed.success) {
          throw new Error("Your saved profile data is invalid. Please contact the Records Office.");
        }
        next = parsed.data;
      }

      if (active) {
        owner.current = auth.user.id;
        current.current = next;
        setData(next);
        setProfileComplete(isProfileComplete(next));
        setReady(true);
        setLoadError(false);
        setStatus("All changes saved");
      }
    })().catch((error: unknown) => {
      if (active) {
        setLoadError(true);
        setStatus(
          error instanceof Error ? error.message : "Could not load your profile. Please retry.",
        );
      }
    });
    return () => {
      active = false;
    };
  }, [loadAttempt]);
  const persist = (next: Store) => {
    const version = ++revision.current;
    const userId = owner.current;
    setStatus("Saving…");
    queue.current = queue.current
      .then(async () => {
        const { data: enabled, error: accessError } = await supabase.rpc("account_is_enabled");
        if (accessError || !enabled) throw new Error("Account access is disabled.");
        const clean = studentSchema.parse(next);
        const cloud = {
          ...clean,
          profile: {
            ...clean.profile,
            photo: await uploadDataUrl(clean.profile.photo, userId),
            cvFile: await uploadDataUrl(clean.profile.cvFile, userId),
          },
          clubs: await Promise.all(
            clean.clubs.map(async (club) => ({
              ...club,
              photos: await Promise.all(club.photos.map((src) => uploadDataUrl(src, userId))),
            })),
          ),
        };
        const { error } = await supabase
          .from("profiles")
          .update({ data: cloud, updated_at: new Date().toISOString() })
          .eq("id", userId)
          .select("id")
          .single();
        if (error) throw error;
        if (version === revision.current) {
          current.current = cloud;
          setData(cloud);
          setProfileComplete(isProfileComplete(cloud));
          setStatus("All changes saved");
        }
      })
      .catch(() => {
        if (version === revision.current) setStatus("Not saved — retry");
        toast.error("Changes were not saved. Please retry before leaving.");
      });
  };
  const update = (fn: (s: Store) => Store) => {
    if (!ready) return;
    const next = fn(current.current);
    current.current = next;
    setData(next);
    persist(next);
  };
  if (!ready)
    return (
      <div className="p-8 text-center">
        <p role={loadError ? "alert" : "status"}>{status}</p>
        {loadError && (
          <button
            className="mt-4 rounded-md border border-input px-4 py-2 text-sm font-medium hover:bg-muted"
            onClick={() => setLoadAttempt((attempt) => attempt + 1)}
          >
            Retry
          </button>
        )}
      </div>
    );
  return (
    <StoreCtx.Provider
      value={{
        data,
        update,
        ready,
        profileComplete,
        status,
        retry: () => persist(current.current),
      }}
    >
      {children}
    </StoreCtx.Provider>
  );
}

export function useStore() {
  const ctx = useContext(StoreCtx);
  if (!ctx) throw new Error("useStore outside provider");
  return ctx;
}

/** Read an image file, downscale it, and return a JPEG data URL. */
export function readImage(file: File, max = 800): Promise<string> {
  if (!/^image\/(jpeg|png|webp)$/.test(file.type))
    return Promise.reject(new Error("Please select a JPG, PNG or WebP photo."));
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
