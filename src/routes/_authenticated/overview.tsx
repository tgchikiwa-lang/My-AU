import { CloudImage } from "@/lib/cloud-files";
import { Button } from "@/components/ui/button";
import { createFileRoute, Link } from "@tanstack/react-router";
import { QRCodeSVG } from "qrcode.react";
import { useState } from "react";
import { Camera, Pencil, Save } from "lucide-react";
import { Card, PageTitle, btnCls, btnGhost, inputCls } from "@/components/Shell";
import { readImage, useStore, type Profile } from "@/lib/store";

export const Route = createFileRoute("/_authenticated/overview")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Overview & Digital Student ID | Africa University" },
      { name: "description", content: "Student profile overview with a digital student identification card." },
      { property: "og:title", content: "Overview & Digital Student ID | Africa University" },
      { property: "og:description", content: "Student profile overview with a digital student identification card." },
    ],
  }),
  component: Overview,
});

const fields: [Exclude<keyof Profile, "graduated">, string, string?][] = [
  ["name", "Full name"],
  ["studentId", "Student ID"],
  ["programme", "Programme"],
  ["faculty", "Faculty"],
  ["year", "Year of study"],
  ["dob", "Date of birth", "date"],
  ["nationality", "Nationality"],
  ["languages", "Languages"],
  ["email", "Email", "email"],
  ["phone", "Phone", "tel"],
  ["address", "Address"],
];

const requiredProfileFields: Exclude<keyof Profile, "graduated">[] = [
  "name",
  "studentId",
  "programme",
  "faculty",
  "year",
  "email",
];

function Overview() {
  const { data, update, profileComplete } = useStore();
  const p = data.profile;
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(p);
  const [formError, setFormError] = useState("");

  const beginEditing = () => {
    setDraft(p);
    setFormError("");
    setEditing(true);
  };

  const saveProfile = () => {
    if (requiredProfileFields.some((key) => !draft[key].trim())) {
      setFormError("Complete your name, student ID, programme, faculty, year of study, and email.");
      return;
    }

    update((s) => ({ ...s, profile: { ...s.profile, ...draft, photo: s.profile.photo } }));
    setFormError("");
    setEditing(false);
  };

  const onPhoto = async (f?: File) => {
    if (!f) return;
    let photo; try {photo = await readImage(f, 400);} catch(e) {alert(e instanceof Error ? e.message : "Photo upload failed");return;}
    update((s) => ({ ...s, profile: { ...s.profile, photo } }));
  };

  const stats = [
    { label: "Skills", n: data.skills.length, to: "/skills" as const },
    { label: "Projects", n: data.projects.length, to: "/projects" as const },
    { label: "Certificates", n: data.certificates.length, to: "/academics" as const },
    { label: "Clubs & activities", n: data.clubs.length, to: "/clubs" as const },
  ];

  return (
    <>
      <PageTitle
        title={`Welcome, ${p.name.trim().split(/\s+/)[0] || "Student"}`}
        subtitle="Your student profile at a glance."
      />

      {!profileComplete && (
        <Card className="mb-6 border-primary/40">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="font-display text-xl">Complete your student profile</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Add your student and academic details to complete your profile.
              </p>
            </div>
            <Button className={btnCls} onClick={beginEditing}>
              <Pencil className="h-4 w-4" /> Complete profile
            </Button>
          </div>
        </Card>
      )}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {stats.map((s) => (
              <Link key={s.label} to={s.to} className="rounded-xl border border-border bg-card p-4 transition hover:-translate-y-0.5 hover:shadow-md">
                <div className="font-display text-3xl text-primary">{s.n}</div>
                <div className="text-sm text-muted-foreground">{s.label}</div>
              </Link>
            ))}
          </div>

          <Card>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display text-xl">Personal & academic details</h2>
              {editing ? (
                <Button
                  className={btnCls}
                  onClick={saveProfile}
                >
                  <Save className="h-4 w-4" /> Save
                </Button>
              ) : (
                <Button className={btnGhost} onClick={beginEditing}>
                  <Pencil className="h-4 w-4" /> Edit
                </Button>
              )}
            </div>
            {formError && (
              <p role="alert" className="mb-4 text-sm text-destructive">
                {formError}
              </p>
            )}
            <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
              {fields.map(([k, label, type]) => (
                <div key={k}>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</dt>
                  {editing ? (
                    <input
                      aria-label={label}
                      aria-required={requiredProfileFields.includes(k)}
                      type={type ?? "text"}
                      className={inputCls}
                      value={draft[k]}
                      onChange={(e) => {
                        setDraft({ ...draft, [k]: e.target.value });
                        setFormError("");
                      }}
                    />
                  ) : (
                    <dd className="mt-0.5 text-sm">{p[k] || "—"}</dd>
                  )}
                </div>
              ))}
            </dl>
          </Card>
        </div>

        <div>
          <IdCard />
          <label className={`${btnGhost} relative focus-within:ring-2 focus-within:ring-ring mt-3 w-full cursor-pointer`}>
            <Camera className="h-4 w-4" /> Change ID photo
            <input aria-label="Change ID photo" type="file" accept="image/*" className="sr-only" onChange={(e) => onPhoto(e.target.files?.[0])} />
          </label>
          <p className="mt-2 text-center text-xs text-muted-foreground">Demonstration ID for CIS2103 — not an official document.</p>
        </div>
      </div>
    </>
  );
}

function IdCard() {
  const { data } = useStore();
  const p = data.profile;
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-lg">
      <div className="bg-primary px-5 py-4 text-primary-foreground">
        <div className="font-display text-xl">Africa University</div>
        <div className="text-xs tracking-[0.2em] opacity-80">STUDENT IDENTIFICATION CARD</div>
      </div>
      <div className="flex gap-4 p-5">
        <div className="h-28 w-24 shrink-0 overflow-hidden rounded-lg bg-muted">
          {p.photo ? <CloudImage src={p.photo} alt="Student" className="h-full w-full object-cover" /> : <div className="grid h-full place-items-center text-3xl">🎓</div>}
        </div>
        <div className="min-w-0 space-y-1 text-sm">
          <div className="font-display text-lg leading-tight">{p.name}</div>
          <div><span className="text-muted-foreground">ID:</span> {p.studentId}</div>
          <div className="truncate"><span className="text-muted-foreground">Prog:</span> {p.programme}</div>
          <div><span className="text-muted-foreground">Year:</span> {p.year}</div>
        </div>
      </div>
      <div className="flex items-end justify-between px-5 pb-4">
        <div className="text-xs text-muted-foreground">Valid {new Date().getFullYear()}/{new Date().getFullYear() + 1}</div>
        <QRCodeSVG value={`${p.studentId}|${p.name}|${p.programme}`} size={72} />
      </div>
      <div className="bg-accent py-1.5 text-center text-xs font-semibold tracking-widest text-accent-foreground">DIGITAL STUDENT ID</div>
    </div>
  );
}
