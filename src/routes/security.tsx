import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Eye, EyeOff, KeyRound } from "lucide-react";
import { Card, PageTitle, btnCls, inputCls } from "@/components/Shell";
import { passwordStrength, useStore } from "@/lib/store";

export const Route = createFileRoute("/security")({
  head: () => ({
    meta: [
      { title: "Account Security | Africa University" },
      { name: "description", content: "Change your password and review account security tips." },
      { property: "og:title", content: "Account Security | Africa University" },
      { property: "og:description", content: "Change your password and review account security tips." },
    ],
  }),
  component: Security,
});

function Security() {
  const { data, update } = useStore();
  const [f, setF] = useState({ current: "", next: "", confirm: "" });
  const [show, setShow] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const strength = passwordStrength(f.next);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (f.current !== data.password) return setMsg({ ok: false, text: "Current password is incorrect." });
    if (f.next.length < 8) return setMsg({ ok: false, text: "New password must be at least 8 characters." });
    if (f.next !== f.confirm) return setMsg({ ok: false, text: "New passwords do not match." });
    if (f.next === f.current) return setMsg({ ok: false, text: "New password must be different." });
    update((s) => ({ ...s, password: f.next }));
    setF({ current: "", next: "", confirm: "" });
    setMsg({ ok: true, text: "Password changed successfully." });
  };

  const type = show ? "text" : "password";
  const bar = ["bg-destructive", "bg-destructive", "bg-accent", "bg-accent", "bg-primary"][strength.score];

  return (
    <>
      <PageTitle title="Account Security" subtitle="Keep your student account safe." />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <Card>
          <h2 className="mb-4 flex items-center gap-2 font-display text-xl"><KeyRound className="h-5 w-5 text-primary" /> Change password</h2>
          <form onSubmit={submit} className="space-y-3">
            <input required type={type} autoComplete="current-password" placeholder="Current password" className={inputCls} value={f.current} onChange={(e) => setF({ ...f, current: e.target.value })} />
            <input required type={type} autoComplete="new-password" placeholder="New password" className={inputCls} value={f.next} onChange={(e) => setF({ ...f, next: e.target.value })} />
            {f.next && (
              <div>
                <div className="h-1.5 rounded-full bg-muted"><div className={`h-full rounded-full ${bar}`} style={{ width: `${(strength.score / 4) * 100}%` }} /></div>
                <p className="mt-1 text-xs text-muted-foreground">Strength: {strength.label}</p>
              </div>
            )}
            <input required type={type} autoComplete="new-password" placeholder="Confirm new password" className={inputCls} value={f.confirm} onChange={(e) => setF({ ...f, confirm: e.target.value })} />
            <button type="button" onClick={() => setShow(!show)} className="flex items-center gap-1 text-sm text-muted-foreground">
              {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />} {show ? "Hide" : "Show"} passwords
            </button>
            {msg && <p role="status" className={`text-sm ${msg.ok ? "text-primary" : "text-destructive"}`}>{msg.text}</p>}
            <button className={btnCls}>Change password</button>
          </form>
          <p className="mt-4 text-xs text-muted-foreground">Demo password is <code>student123</code>. For educational demonstration only.</p>
        </Card>
        <Card>
          <h2 className="mb-3 font-display text-lg">Security tips</h2>
          <ul className="list-disc space-y-2 pl-5 text-sm text-muted-foreground">
            <li>Use at least 8 characters with numbers and symbols.</li>
            <li>Never share your password with anyone.</li>
            <li>Sign out on shared computers.</li>
            <li>Change your password every few months.</li>
          </ul>
        </Card>
      </div>
    </>
  );
}
