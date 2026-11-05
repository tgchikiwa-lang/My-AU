import { Button } from "@/components/ui/button";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { useVerifiedIds } from "@/components/VerifyBadge";
import { Card, PageTitle, btnCls, delBtn, inputCls } from "@/components/Shell";
import { VerifyBadge } from "@/components/VerifyBadge";
import { uid, useStore, type Skill } from "@/lib/store";

export const Route = createFileRoute("/_authenticated/skills")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "My Skills | Africa University" },
      { name: "description", content: "Add, view and remove your technical and professional skills." },
      { property: "og:title", content: "My Skills | Africa University" },
      { property: "og:description", content: "Add, view and remove your technical and professional skills." },
    ],
  }),
  component: Skills,
});

const levelWidth = { Beginner: "w-1/3", Intermediate: "w-2/3", Advanced: "w-full" };

function Skills() {
  const { data, update } = useStore();
  const verified = useVerifiedIds();
  const [name, setName] = useState("");
  const [level, setLevel] = useState<Skill["level"]>("Beginner");
  const [q, setQ] = useState("");

  const add = (e: React.FormEvent) => {
    e.preventDefault();
    const n = name.trim();
    if (!n) return;
    if (data.skills.some((s) => s.name.toLowerCase() === n.toLowerCase())) return alert("You already have this skill.");
    update((s) => ({ ...s, skills: [...s.skills, { id: uid(), name: n, level }] }));
    setName("");
  };

  const list = data.skills.filter((s) => s.name.toLowerCase().includes(q.toLowerCase()));

  return (
    <>
      <PageTitle title="My Skills" subtitle="Technical, academic and professional skills." />
      <Card className="mb-6">
        <form onSubmit={add} className="flex flex-col gap-3 sm:flex-row">
          <input className={inputCls} aria-label="e.g. React, Teamwork" placeholder="e.g. React, Teamwork" value={name} onChange={(e) => setName(e.target.value)} />
          <select aria-label="Skill level" className={`${inputCls} sm:w-44`} value={level} onChange={(e) => setLevel(e.target.value as Skill["level"])}>
            <option>Beginner</option><option>Intermediate</option><option>Advanced</option>
          </select>
          <Button className={btnCls}><Plus className="h-4 w-4" /> Add skill</Button>
        </form>
      </Card>
      <input className={`${inputCls} mb-4`} aria-label="Search skills…" placeholder="Search skills…" value={q} onChange={(e) => setQ(e.target.value)} />
      {list.length === 0 && <p className="text-muted-foreground">No skills found.</p>}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {list.map((s) => (
          <Card key={s.id} className="!p-4">
            <div className="flex items-start justify-between">
              <div>
                <div className="font-semibold">{s.name}</div>
                <div className="text-xs text-muted-foreground">{s.level}</div>
                <VerifyBadge type="skill" id={s.id} summary={`${s.name} (${s.level})`} />
              </div>
              <Button className={delBtn} disabled={verified.has(`skill:${s.id}`)} title={verified.has(`skill:${s.id}`)?"Verified items cannot be deleted":undefined} aria-label={`Delete ${s.name}`} onClick={() => confirm(`Delete "${s.name}"?`) && update((st) => ({ ...st, skills: st.skills.filter((x) => x.id !== s.id) }))}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
            <div className="mt-3 h-1.5 rounded-full bg-muted"><div className={`h-full rounded-full bg-accent ${levelWidth[s.level]}`} /></div>
          </Card>
        ))}
      </div>
    </>
  );
}
