import { createFileRoute, Link } from "@tanstack/react-router";
import { QRCodeSVG } from "qrcode.react";
import { useState } from "react";
import { Camera, Pencil, Save } from "lucide-react";
import { Card, PageTitle, btnCls, btnGhost, inputCls } from "@/components/Shell";
import { readImage, useStore, type Profile } from "@/lib/store";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Overview & Digital Student ID | Africa University" },
      { name: "description", content: "Student profile overview with a digital student identification card." },
      { property: "og:title", content: "Overview & Digital Student ID | Africa University" },
      { property: "og:description", content: "Student profile overview with a digital student identification card." },
    ],
  }),
  component: Overview,
});

const fields: [keyof Profile, string, string?][] = [
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

function Overview() {
  const { data, update } = useStore();
  const p = data.profile;
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(p);

  const onPhoto = async (f?: File) => {
    if (!f) return;
    const photo = await readImage(f, 400);
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
      <PageTitle title={`Welcome, ${p.name.split(" ")[0]}`} subtitle="Your student profile at a glance." />

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
                <button
                  className={btnCls}
                  onClick={() => {
                    update((s) => ({ ...s, profile: { ...s.profile, ...draft, photo: s.profile.photo } }));
                    setEditing(false);
                  }}
                >
                  <Save className="h-4 w-4" /> Save
                </button>
              ) : (
                <button className={btnGhost} onClick={() => { setDraft(p); setEditing(true); }}>
                  <Pencil className="h-4 w-4" /> Edit
                </button>
              )}
            </div>
            <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
              {fields.map(([k, label, type]) => (
                <div key={k}>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</dt>
                  {editing ? (
                    <input type={type ?? "text"} className={inputCls} value={draft[k]} onChange={(e) => setDraft({ ...draft, [k]: e.target.value })} />
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
          <label className={`${btnGhost} mt-3 w-full cursor-pointer`}>
            <Camera className="h-4 w-4" /> Change ID photo
            <input type="file" accept="image/*" className="hidden" onChange={(e) => onPhoto(e.target.files?.[0])} />
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
          {p.photo ? <img src={p.photo} alt="Student" className="h-full w-full object-cover" /> : <div className="grid h-full place-items-center text-3xl">🎓</div>}
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
