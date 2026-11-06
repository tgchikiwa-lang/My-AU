import { Button } from "@/components/ui/button";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  Award,
  Plus,
  School,
  Trash2,
  Trophy,
  Upload,
  Download,
  FileText,
} from "lucide-react";
import {
  Card,
  PageTitle,
  btnCls,
  delBtn,
  inputCls,
} from "@/components/Shell";
import { VerifyBadge } from "@/components/VerifyBadge";
import { uid, useStore, type Store } from "@/lib/store";
import { downloadFile } from "@/lib/cloud-files";

export const Route = createFileRoute("/_authenticated/academics")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      {
        title: "Academic History, Achievements & Certificates | Africa University",
      },
      {
        name: "description",
        content:
          "Your full academic history, achievements and certifications.",
      },
      {
        property: "og:title",
        content: "Academic History & Certificates | Africa University",
      },
      {
        property: "og:description",
        content:
          "Your full academic history, achievements and certifications.",
      },
    ],
  }),
  component: Academics,
});

type Key = "academic" | "certificates";

function Section<K extends Key>({
  k,
  vtype,
  summary,
  title,
  icon,
  fields,
  render,
}: {
  k: K;
  vtype: "academic" | "certificate";
  summary: (item: Store[K][number]) => string;
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

    update((s) => ({
      ...s,
      [k]: [...s[k], { id: uid(), ...f }],
    }));

    setF(blank);
  };

  return (
    <Card>
      <h2 className="mb-4 flex items-center gap-2 font-display text-xl">
        {icon} {title}
      </h2>

      <ul className="mb-4 divide-y divide-border">
        {items.length === 0 && (
          <li className="py-2 text-sm text-muted-foreground">
            Nothing added yet.
          </li>
        )}

        {items.map((it) => (
          <li
            key={it.id}
            className="flex items-start justify-between gap-3 py-3"
          >
            <div className="min-w-0">
              {render(it as Store[K][number])}
              <VerifyBadge
                type={vtype}
                id={it.id}
                summary={summary(it as Store[K][number])}
              />
            </div>

            <Button
              className={delBtn}
              aria-label="Delete"
              onClick={() =>
                confirm("Delete this entry?") &&
                update((s) => ({
                  ...s,
                  [k]: (s[k] as { id: string }[]).filter(
                    (x) => x.id !== it.id
                  ),
                }))
              }
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </li>
        ))}
      </ul>

      <form onSubmit={add} className="grid gap-2 sm:grid-cols-2">
        {fields.map((fd) => (
          <input
            aria-label={fd.placeholder}
            key={fd.name}
            required
            type={fd.type ?? "text"}
            className={inputCls}
            placeholder={fd.placeholder}
            value={f[fd.name]}
            onChange={(e) =>
              setF({ ...f, [fd.name]: e.target.value })
            }
          />
        ))}

        <Button className={`${btnCls} sm:col-span-2`}>
          <Plus className="h-4 w-4" /> Add
        </Button>
      </form>
    </Card>
  );
}

const achievementCategories = [
  "Academic Awards",
  "Scholarships",
  "Conferences",
  "Certifications",
  "Leadership",
  "Clubs & Societies",
  "Sports",
  "Debate & Public Speaking",
  "Volunteering",
  "Technical & Professional",
  "Entrepreneurship",
  "Other",
];

function AchievementsSection() {
  const { data, update } = useStore();

  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [description, setDescription] = useState("");
  const [categories, setCategories] = useState<string[]>([]);
  const [evidence, setEvidence] = useState("");
  const [evidenceName, setEvidenceName] = useState("");
  const [fileError, setFileError] = useState("");

  const toggleCategory = (category: string) => {
    setCategories((current) =>
      current.includes(category)
        ? current.filter((item) => item !== category)
        : [...current, category]
    );
  };

  const handleEvidence = (file?: File) => {
    setFileError("");
    setEvidence("");
    setEvidenceName("");

    if (!file) return;

    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];

    if (!allowedTypes.includes(file.type)) {
      setFileError("Please upload a PDF, Word document or image.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setFileError("The file must not exceed 5 MB.");
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      setEvidence(String(reader.result));
      setEvidenceName(file.name);
    };

    reader.onerror = () => {
      setFileError("The file could not be read. Please try again.");
    };

    reader.readAsDataURL(file);
  };

  const addAchievement = (e: React.FormEvent) => {
    e.preventDefault();

    if (categories.length === 0) {
      setFileError("Please select at least one achievement category.");
      return;
    }

    update((s) => ({
      ...s,
      achievements: [
        ...s.achievements,
        {
          id: uid(),
          title,
          year: date.slice(0, 4),
          date,
          description,
          categories,
          evidence,
        },
      ],
    }));

    setTitle("");
    setDate("");
    setDescription("");
    setCategories([]);
    setEvidence("");
    setEvidenceName("");
    setFileError("");
  };

  return (
    <Card>
      <h2 className="mb-2 flex items-center gap-2 font-display text-xl">
        <Trophy className="h-5 w-5 text-primary" />
        Achievements
      </h2>

      <p className="mb-5 text-sm text-muted-foreground">
        Record your accomplishments, recognitions and contributions
        throughout your academic and professional journey.
      </p>

      <div className="mb-6 space-y-4">
        {data.achievements.length === 0 && (
          <p className="py-3 text-sm text-muted-foreground">
            No achievements added yet.
          </p>
        )}

        {data.achievements.map((achievement) => (
          <div
            key={achievement.id}
            className="rounded-lg border border-border p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="font-semibold">
                  {achievement.title}
                </h3>

                <p className="text-sm text-muted-foreground">
                  {achievement.date || achievement.year}
                </p>
              </div>

              <Button
                className={delBtn}
                aria-label="Delete achievement"
                onClick={() =>
                  confirm("Delete this achievement?") &&
                  update((s) => ({
                    ...s,
                    achievements: s.achievements.filter(
                      (item) => item.id !== achievement.id
                    ),
                  }))
                }
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>

            <p className="mt-2 text-sm text-muted-foreground">
              {achievement.description}
            </p>

            <div className="mt-3 flex flex-wrap gap-2">
              {(achievement.categories ?? []).map((category) => (
                <span
                  key={category}
                  className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary"
                >
                  {category}
                </span>
              ))}
            </div>

            {achievement.evidence && (
              <button
                type="button"
                onClick={() =>
                  void downloadFile(
                    achievement.evidence,
                    `evidence-${achievement.title.replace(/[^a-z0-9]/gi, "-")}`
                  )
                }
                className="mt-3 flex items-center gap-2 text-sm text-primary hover:underline"
              >
                <Download className="h-4 w-4" />
                Download supporting evidence
              </button>
            )}

            <VerifyBadge
              type="achievement"
              id={achievement.id}
              summary={`${achievement.title} (${achievement.date || achievement.year}) — ${achievement.description}`}
            />
          </div>
        ))}
      </div>

      <div className="border-t border-border pt-5">
        <h3 className="mb-4 font-semibold">Add an achievement</h3>

        <form onSubmit={addAchievement} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium">
              Achievement title
            </label>

            <input
              required
              className={inputCls}
              placeholder="e.g. Dean's List, Debate Competition Winner"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">
              Achievement date
            </label>

            <input
              required
              type="date"
              className={inputCls}
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">
              Achievement categories
            </label>

            <p className="mb-3 text-xs text-muted-foreground">
              Select all categories that apply.
            </p>

            <div className="grid gap-3 sm:grid-cols-2">
              {achievementCategories.map((category) => (
                <label
                  key={category}
                  className="flex items-center gap-2 text-sm"
                >
                  <input
                    type="checkbox"
                    checked={categories.includes(category)}
                    onChange={() => toggleCategory(category)}
                    className="h-4 w-4 accent-primary"
                  />
                  {category}
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">
              Description
            </label>

            <textarea
              required
              rows={4}
              className={`${inputCls} resize-y`}
              placeholder="Describe what you achieved and why it is significant."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">
              Supporting evidence (optional)
            </label>

            <label className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-border p-6 text-center transition hover:border-primary">
              <Upload className="mb-2 h-6 w-6 text-primary" />

              <span className="text-sm font-medium">
                Upload certificate or supporting document
              </span>

              <span className="mt-1 text-xs text-muted-foreground">
                PDF, Word, JPG, PNG or WebP · Maximum 5 MB
              </span>

              <input
                type="file"
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.webp"
                className="sr-only"
                onChange={(e) => handleEvidence(e.target.files?.[0])}
              />
            </label>

            {evidenceName && (
              <p className="mt-2 flex items-center gap-2 text-sm text-green-600">
                <FileText className="h-4 w-4" />
                {evidenceName}
              </p>
            )}

            {fileError && (
              <p className="mt-2 text-sm text-destructive">
                {fileError}
              </p>
            )}
          </div>

          <Button type="submit" className={btnCls}>
            <Plus className="h-4 w-4" />
            Add achievement
          </Button>
        </form>
      </div>
    </Card>
  );
}

function Academics() {
  return (
    <>
      <PageTitle
        title="Academics & Certificates"
        subtitle="Your academic history, achievements and certifications in one place."
      />

      <div className="space-y-6">
        <Section
          k="academic"
          vtype="academic"
          summary={(a) =>
            `${a.qualification}, ${a.institution} (${a.years}) — ${a.result}`
          }
          title="Academic history"
          icon={<School className="h-5 w-5 text-primary" />}
          fields={[
            { name: "institution", placeholder: "Institution" },
            { name: "qualification", placeholder: "Qualification" },
            { name: "years", placeholder: "Years (e.g. 2020 – 2022)" },
            { name: "result", placeholder: "Result / grade" },
          ]}
          render={(a) => (
            <>
              <div className="font-semibold">{a.qualification}</div>
              <div className="text-sm text-muted-foreground">
                {a.institution} · {a.years} · {a.result}
              </div>
            </>
          )}
        />

        <AchievementsSection />

        <Section
          k="certificates"
          vtype="certificate"
          summary={(c) =>
            `${c.title}, issued by ${c.issuer} (${c.date})`
          }
          title="Certificates"
          icon={<Award className="h-5 w-5 text-primary" />}
          fields={[
            { name: "title", placeholder: "Certificate name" },
            { name: "issuer", placeholder: "Issued by" },
            { name: "date", placeholder: "Date", type: "month" },
          ]}
          render={(c) => (
            <>
              <div className="font-semibold">{c.title}</div>
              <div className="text-sm text-muted-foreground">
                {c.issuer} · {c.date}
              </div>
            </>
          )}
        />
      </div>
    </>
  );
}