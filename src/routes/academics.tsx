import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Award, Plus, School, Trash2, Trophy } from "lucide-react";
import { Card, PageTitle, btnCls, delBtn, inputCls } from "@/components/Shell";
import { uid, useStore, type Store } from "@/lib/store";

export const Route = createFileRoute("/academics")({
  head: () => ({
    meta: [
      { title: "Academic History, Achievements & Certificates | Africa University" },
      { name: "description", content: "Your full academic history, achievements and certifications." },
      { property: "og:title", content: "Academic History & Certificates | Africa University" },
      { property: "og:description", content: "Your full academic history, achievements and certifications." },
    ],
  }),
  component: Academics,
});

type Key = "academic" | "achievements" | "certificates";

function Section<K extends Key>({
  k, title, icon, fields, render,
}: {
  k: K;
  title: string;
  icon: React.ReactNode;
  fields: { name: string; placeholder: string; type?: string }[];
  render: (item: Store[K][number]) => React.ReactNode;
}) {
  const { data, update } = useStore();
  const blank = Object.fromEntries(fields.map((f) => [f.name, ""]));
  const [f, setF] = useState<Record<string, string>>(blank);
  const items = data[k] as Store[K];

  const add = (e: React.FormEvent) => {
    e.preventDefault();
    update((s) => ({ ...s, [k]: [...s[k], { id: uid(), ...f }] }));
    setF(blank);
  };

  return (
    <Card>
      <h2 className="mb-4 flex items-center gap-2 font-display text-xl">{icon} {title}</h2>
      <ul className="mb-4 divide-y divide-border">
        {items.length === 0 && <li className="py-2 text-sm text-muted-foreground">Nothing added yet.</li>}
        {items.map((it) => (
          <li key={it.id} className="flex items-start justify-between gap-3 py-3">
            <div className="min-w-0">{render(it as Store[K][number])}</div>
            <button className={delBtn} aria-label="Delete" onClick={() => confirm("Delete this entry?") && update((s) => ({ ...s, [k]: (s[k] as { id: string }[]).filter((x) => x.id !== it.id) }))}>
              <Trash2 className="h-4 w-4" />
            </button>
          </li>
        ))}
      </ul>
      <form onSubmit={add} className="grid gap-2 sm:grid-cols-2">
        {fields.map((fd) => (
          <input key={fd.name} required type={fd.type ?? "text"} className={inputCls} placeholder={fd.placeholder} value={f[fd.name]} onChange={(e) => setF({ ...f, [fd.name]: e.target.value })} />
        ))}
        <button className={`${btnCls} sm:col-span-2`}><Plus className="h-4 w-4" /> Add</button>
      </form>
    </Card>
  );
}

function Academics() {
  return (
    <>
      <PageTitle title="Academics & Certificates" subtitle="Your academic history, achievements and certifications in one place." />
      <div className="space-y-6">
        <Section
          k="academic" title="Academic history" icon={<School className="h-5 w-5 text-primary" />}
          fields={[{ name: "institution", placeholder: "Institution" }, { name: "qualification", placeholder: "Qualification" }, { name: "years", placeholder: "Years (e.g. 2020 – 2022)" }, { name: "result", placeholder: "Result / grade" }]}
          render={(a) => (<><div className="font-semibold">{a.qualification}</div><div className="text-sm text-muted-foreground">{a.institution} · {a.years} · {a.result}</div></>)}
        />
        <div className="grid gap-6 lg:grid-cols-2">
          <Section
            k="achievements" title="Achievements" icon={<Trophy className="h-5 w-5 text-primary" />}
            fields={[{ name: "title", placeholder: "Achievement" }, { name: "year", placeholder: "Year" }, { name: "description", placeholder: "Description" }]}
            render={(a) => (<><div className="font-semibold">{a.title} <span className="text-sm font-normal text-muted-foreground">· {a.year}</span></div><div className="text-sm text-muted-foreground">{a.description}</div></>)}
          />
          <Section
            k="certificates" title="Certificates" icon={<Award className="h-5 w-5 text-primary" />}
            fields={[{ name: "title", placeholder: "Certificate name" }, { name: "issuer", placeholder: "Issued by" }, { name: "date", placeholder: "Date", type: "month" }]}
            render={(c) => (<><div className="font-semibold">{c.title}</div><div className="text-sm text-muted-foreground">{c.issuer} · {c.date}</div></>)}
          />
        </div>
      </div>
    </>
  );
}
