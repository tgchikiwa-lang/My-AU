import { downloadFile } from "@/lib/cloud-files";
import { Button } from "@/components/ui/button";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Download, Github, Linkedin, Save, Upload } from "lucide-react";
import { Card, PageTitle, btnCls, btnGhost, inputCls } from "@/components/Shell";
import { useStore, type Store } from "@/lib/store";

export const Route = createFileRoute("/_authenticated/professional")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Professional Profile & CV | Africa University" },
      { name: "description", content: "Download your CV and link your GitHub and LinkedIn accounts." },
      { property: "og:title", content: "Professional Profile & CV | Africa University" },
      { property: "og:description", content: "Download your CV and link your GitHub and LinkedIn accounts." },
    ],
  }),
  component: Professional,
});

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c] ?? c);

function buildCv(d: Store) {
  const p = d.profile;
  const li = (arr: string[]) => arr.map((x) => `<li>${x}</li>`).join("");
  return `<!doctype html><html><head><meta charset="utf-8"><title>CV - ${esc(p.name)}</title>
<style>body{font-family:Georgia,serif;max-width:760px;margin:40px auto;padding:0 20px;color:#222}h1{margin:0;color:#7a1f1f}h2{border-bottom:2px solid #d4a73a;padding-bottom:4px;color:#7a1f1f}small{color:#666}</style></head><body>
<h1>${esc(p.name)}</h1><small>${esc(p.email)} · ${esc(p.phone)} · ${esc(p.address)}</small><br><small>${p.github ? `GitHub: ${esc(p.github)} · ` : ""}${p.linkedin ? `LinkedIn: ${esc(p.linkedin)}` : ""}</small>
<h2>Profile</h2><p>${esc(p.bio)}</p>
<h2>Education</h2><ul>${li(d.academic.map((a) => `<b>${esc(a.qualification)}</b>, ${esc(a.institution)} (${esc(a.years)}) — ${esc(a.result)}`))}</ul>
<h2>Skills</h2><p>${d.skills.map((s) => `${esc(s.name)} (${s.level})`).join(", ")}</p>
<h2>Projects</h2><ul>${li(d.projects.map((x) => `<b>${esc(x.title)}</b> — ${esc(x.description)}${x.github ? ` <small>${esc(x.github)}</small>` : ""}`))}</ul>
<h2>Certifications</h2><ul>${li(d.certificates.map((c) => `${esc(c.title)} — ${esc(c.issuer)} (${esc(c.date)})`))}</ul>
<h2>Achievements</h2><ul>${li(d.achievements.map((a) => `${esc(a.title)} (${esc(a.year)}) — ${esc(a.description)}`))}</ul>
<h2>Clubs & Activities</h2><ul>${li(d.clubs.map((c) => `${esc(c.name)} — ${esc(c.role || c.type)}`))}</ul>
<script>window.onload=()=>window.print()</script></body></html>`;
}

function Professional() {
  const { data, update } = useStore();
  const p = data.profile;
  const [f, setF] = useState({ bio: p.bio, github: p.github, linkedin: p.linkedin });
  const [saved, setSaved] = useState(false);
  useEffect(() => setF({ bio: p.bio, github: p.github, linkedin: p.linkedin }), [p.bio, p.github, p.linkedin]);

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    update((s) => ({ ...s, profile: { ...s.profile, ...f } }));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const downloadGenerated = () => {
    const w = window.open("", "_blank");
    if (!w) return alert("Please allow pop-ups to download your CV.");
    w.document.write(buildCv(data));
    w.document.close();
  };

  const uploadCv = (file?: File) => {
    if (!file) return;
    if (file.size > 2_000_000) return alert("Please choose a file under 2 MB.");
    const r = new FileReader();
    r.onload = () => update((s) => ({ ...s, profile: { ...s.profile, cvFile: r.result as string, cvFileName: file.name } }));
    r.readAsDataURL(file);
  };

  return (
    <>
      <PageTitle title="Professional Profile" subtitle="Your CV and online presence for employers." />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="mb-4 font-display text-xl">Links & summary</h2>
          <form onSubmit={save} className="space-y-3">
            <label className="block text-sm font-medium">Professional summary
              <textarea rows={4} className={`${inputCls} mt-1`} value={f.bio} onChange={(e) => setF({ ...f, bio: e.target.value })} />
            </label>
            <label className="block text-sm font-medium">GitHub profile
              <input type="url" aria-label="https://github.com/username" placeholder="https://github.com/username" className={`${inputCls} mt-1`} value={f.github} onChange={(e) => setF({ ...f, github: e.target.value })} />
            </label>
            <label className="block text-sm font-medium">LinkedIn profile
              <input type="url" aria-label="https://linkedin.com/in/username" placeholder="https://linkedin.com/in/username" className={`${inputCls} mt-1`} value={f.linkedin} onChange={(e) => setF({ ...f, linkedin: e.target.value })} />
            </label>
            <Button className={btnCls}><Save className="h-4 w-4" /> {saved ? "Saved!" : "Save"}</Button>
          </form>
          <div className="mt-5 flex flex-wrap gap-2">
            {p.github && <a className={btnGhost} href={p.github} target="_blank" rel="noreferrer"><Github className="h-4 w-4" /> GitHub</a>}
            {p.linkedin && <a className={btnGhost} href={p.linkedin} target="_blank" rel="noreferrer"><Linkedin className="h-4 w-4" /> LinkedIn</a>}
          </div>
        </Card>

        <Card>
          <h2 className="mb-2 font-display text-xl">Curriculum Vitae</h2>
          <p className="mb-4 text-sm text-muted-foreground">Generate a CV from your profile (save it as PDF from the print window), or upload your own.</p>
          <div className="space-y-3">
            <Button onClick={downloadGenerated} className={`${btnCls} w-full`}><Download className="h-4 w-4" /> Download generated CV (PDF)</Button>
            <label className={`${btnGhost} relative focus-within:ring-2 focus-within:ring-ring w-full cursor-pointer`}>
              <Upload className="h-4 w-4" /> Upload my own CV
              <input aria-label="Upload CV" type="file" accept=".pdf,.doc,.docx" className="sr-only" onChange={(e) => uploadCv(e.target.files?.[0])} />
            </label>
            {p.cvFile && (
              <div className="flex items-center justify-between rounded-md bg-muted px-3 py-2 text-sm">
                <span className="truncate">{p.cvFileName}</span>
                <div className="flex gap-3">
                  <Button variant="link" onClick={()=>downloadFile(p.cvFile,p.cvFileName)}>Download</Button>
                  <Button className="text-destructive" onClick={() => update((s) => ({ ...s, profile: { ...s.profile, cvFile: "", cvFileName: "" } }))}>Remove</Button>
                </div>
              </div>
            )}
          </div>
        </Card>
      </div>
    </>
  );
}
