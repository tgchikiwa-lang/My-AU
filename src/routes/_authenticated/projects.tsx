import { Button } from "@/components/ui/button";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Github, Plus, Trash2 } from "lucide-react";
import { Card, PageTitle, btnCls, delBtn, inputCls } from "@/components/Shell";
import { VerifyBadge } from "@/components/VerifyBadge";
import { uid, useStore } from "@/lib/store";

export const Route = createFileRoute("/_authenticated/projects")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "My Projects | Africa University" },
      { name: "description", content: "Academic and personal projects with GitHub repositories." },
      { property: "og:title", content: "My Projects | Africa University" },
      { property: "og:description", content: "Academic and personal projects with GitHub repositories." },
    ],
  }),
  component: Projects,
});

const empty = { title: "", description: "", tech: "", github: "" };

function Projects() {
  const { data, update } = useStore();
  const [f, setF] = useState(empty);

  const add = (e: React.FormEvent) => {
    e.preventDefault();
    if (!f.title.trim()) return;
    update((s) => ({ ...s, projects: [{ id: uid(), ...f }, ...s.projects] }));
    setF(empty);
  };

  return (
    <>
      <PageTitle title="My Projects" subtitle="Academic and personal work, with GitHub links where available." />
      <Card className="mb-6">
        <h2 className="mb-3 font-display text-lg">Add a project</h2>
        <form onSubmit={add} className="grid gap-3 sm:grid-cols-2">
          <input required className={inputCls} aria-label="Project title" placeholder="Project title" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} />
          <input className={inputCls} aria-label="Technologies (e.g. HTML, JS)" placeholder="Technologies (e.g. HTML, JS)" value={f.tech} onChange={(e) => setF({ ...f, tech: e.target.value })} />
          <textarea className={`${inputCls} sm:col-span-2`} rows={2} aria-label="Short description" placeholder="Short description" value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} />
          <input type="url" className={inputCls} aria-label="GitHub URL (optional)" placeholder="GitHub URL (optional)" value={f.github} onChange={(e) => setF({ ...f, github: e.target.value })} />
          <Button className={btnCls}><Plus className="h-4 w-4" /> Add project</Button>
        </form>
      </Card>
      <div className="grid gap-4 md:grid-cols-2">
        {data.projects.map((p) => (
          <Card key={p.id}>
            <div className="flex justify-between gap-2">
              <h3 className="font-display text-lg">{p.title}</h3>
              <Button className={delBtn} aria-label="Delete project" onClick={() => confirm(`Delete "${p.title}"?`) && update((s) => ({ ...s, projects: s.projects.filter((x) => x.id !== p.id) }))}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">{p.description}</p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {p.tech.split(",").filter(Boolean).map((t) => (
                <span key={t} className="rounded-full bg-secondary px-2 py-0.5 text-xs text-secondary-foreground">{t.trim()}</span>
              ))}
            </div>
            <VerifyBadge type="project" id={p.id} summary={`${p.title}${p.tech ? ` — ${p.tech}` : ""}${p.github ? ` (${p.github})` : ""}`} />
            {p.github && (
              <a href={p.github} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
                <Github className="h-4 w-4" /> View on GitHub
              </a>
            )}
          </Card>
        ))}
      </div>
    </>
  );
}
