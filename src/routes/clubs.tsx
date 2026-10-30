import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { ImagePlus, Plus, Trash2, X } from "lucide-react";
import { Card, PageTitle, btnCls, btnGhost, delBtn, inputCls } from "@/components/Shell";
import { readImage, uid, useStore, type Club } from "@/lib/store";

export const Route = createFileRoute("/clubs")({
  head: () => ({
    meta: [
      { title: "Clubs, Associations & Activities | Africa University" },
      { name: "description", content: "Your clubs, associations and activities with photo galleries." },
      { property: "og:title", content: "Clubs & Activities | Africa University" },
      { property: "og:description", content: "Your clubs, associations and activities with photo galleries." },
    ],
  }),
  component: Clubs,
});

function Clubs() {
  const { data, update } = useStore();
  const [f, setF] = useState({ name: "", type: "Club" as Club["type"], role: "" });
  const [view, setView] = useState<string | null>(null);
  const [filter, setFilter] = useState<"All" | Club["type"]>("All");

  const add = (e: React.FormEvent) => {
    e.preventDefault();
    if (!f.name.trim()) return;
    update((s) => ({ ...s, clubs: [...s.clubs, { id: uid(), ...f, photos: [] }] }));
    setF({ name: "", type: "Club", role: "" });
  };

  const upload = async (id: string, files: FileList | null) => {
    if (!files) return;
    const imgs = await Promise.all(Array.from(files).map((file) => readImage(file, 900)));
    update((s) => ({ ...s, clubs: s.clubs.map((c) => (c.id === id ? { ...c, photos: [...c.photos, ...imgs] } : c)) }));
  };

  const list = data.clubs.filter((c) => filter === "All" || c.type === filter);

  return (
    <>
      <PageTitle title="Clubs, Associations & Activities" subtitle="Share what you're involved in — with pictures." />
      <Card className="mb-6">
        <form onSubmit={add} className="grid gap-3 sm:grid-cols-4">
          <input required className={`${inputCls} sm:col-span-2`} placeholder="Name (e.g. Debate Club)" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
          <select className={inputCls} value={f.type} onChange={(e) => setF({ ...f, type: e.target.value as Club["type"] })}>
            <option>Club</option><option>Association</option><option>Activity</option>
          </select>
          <input className={inputCls} placeholder="Your role" value={f.role} onChange={(e) => setF({ ...f, role: e.target.value })} />
          <button className={`${btnCls} sm:col-span-4`}><Plus className="h-4 w-4" /> Add</button>
        </form>
      </Card>

      <div className="mb-4 flex flex-wrap gap-2">
        {(["All", "Club", "Association", "Activity"] as const).map((t) => (
          <button key={t} onClick={() => setFilter(t)} className={`rounded-full px-3 py-1 text-sm ${filter === t ? "bg-primary text-primary-foreground" : "bg-muted"}`}>{t}</button>
        ))}
      </div>

      <div className="space-y-5">
        {list.map((c) => (
          <Card key={c.id}>
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <h3 className="font-display text-lg">{c.name}</h3>
                <p className="text-sm text-muted-foreground">{c.type}{c.role && ` · ${c.role}`}</p>
              </div>
              <div className="flex gap-2">
                <label className={`${btnGhost} cursor-pointer`}>
                  <ImagePlus className="h-4 w-4" /> Upload pictures
                  <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => upload(c.id, e.target.files)} />
                </label>
                <button className={delBtn} aria-label="Delete" onClick={() => confirm(`Delete "${c.name}"?`) && update((s) => ({ ...s, clubs: s.clubs.filter((x) => x.id !== c.id) }))}>
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
            {c.photos.length > 0 ? (
              <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                {c.photos.map((src, i) => (
                  <div key={i} className="group relative aspect-square overflow-hidden rounded-lg">
                    <img src={src} alt={`${c.name} ${i + 1}`} className="h-full w-full cursor-zoom-in object-cover transition group-hover:scale-105" onClick={() => setView(src)} />
                    <button
                      className="absolute right-1 top-1 rounded-full bg-card/90 p-1 text-destructive opacity-0 group-hover:opacity-100"
                      aria-label="Remove picture"
                      onClick={() => update((s) => ({ ...s, clubs: s.clubs.map((x) => (x.id === c.id ? { ...x, photos: x.photos.filter((_, j) => j !== i) } : x)) }))}
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-3 text-sm text-muted-foreground">No pictures yet.</p>
            )}
          </Card>
        ))}
      </div>

      {view && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-foreground/80 p-4" onClick={() => setView(null)}>
          <img src={view} alt="Enlarged" className="max-h-full max-w-full rounded-lg" />
        </div>
      )}
    </>
  );
}
