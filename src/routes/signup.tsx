import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, ArrowRight, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { inputCls } from "@/components/Shell";
import { AuthFrame } from "@/components/AuthFrame";
import { passwordStrength } from "@/lib/store";

export const Route = createFileRoute("/signup")({
  head: () => ({
    meta: [
      { title: "Student Registration | Africa University" },
      { name: "description", content: "Create your Africa University student profile account." },
      { property: "og:title", content: "Student Registration | Africa University" },
      { property: "og:description", content: "Register for the Africa University student portal." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Signup,
});

function Signup() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [done, setDone] = useState(false);
  const strength = passwordStrength(password);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMessage("");
    if (strength.score < 3) {
      setMessage(
        "Choose a stronger password: 8+ characters with upper and lower case letters and a number.",
      );
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { data: { name: name.trim() }, emailRedirectTo: `${window.location.origin}/auth` },
    });
    setBusy(false);
    if (error) setMessage(error.message);
    else setDone(true);
  }
  return (
    <AuthFrame>
      <Link to="/" className="mb-9 inline-flex items-center gap-2 text-sm text-muted-foreground">
        <ArrowLeft className="size-4" />
        University home
      </Link>
      <UserPlus className="mb-5 size-9 text-primary" />
      <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-primary">
        Student portal
      </p>
      <h1 className="font-display text-4xl">Create your account.</h1>
      {done ? (
        <div className="mt-6 space-y-4" role="status">
          <p>
            Your account has been created. Confirm your email if requested, then sign in to begin
            using your student profile. No staff approval is required.
          </p>
          <Button asChild>
            <Link to="/auth">Go to sign in</Link>
          </Button>
        </div>
      ) : (
        <form onSubmit={submit} className="mt-8 space-y-5">
          <label className="block text-sm font-semibold">
            Full name
            <input
              className={`${inputCls} mt-2 min-h-12`}
              required
              maxLength={200}
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
            />
          </label>
          <label className="block text-sm font-semibold">
            University email
            <input
              className={`${inputCls} mt-2 min-h-12`}
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
          </label>
          <label className="block text-sm font-semibold">
            Password
            <input
              className={`${inputCls} mt-2 min-h-12`}
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
            />
            <span className="mt-1 block text-xs text-muted-foreground">
              Strength: {strength.label}
            </span>
          </label>
          {message && (
            <p role="alert" className="text-sm text-destructive">
              {message}
            </p>
          )}
          <Button className="min-h-12 w-full" disabled={busy}>
            {busy ? "Please wait…" : "Register"}
            <ArrowRight />
          </Button>
          <p className="text-center text-sm">
            Already registered?{" "}
            <Link to="/auth" className="text-primary hover:underline">
              Sign in
            </Link>
          </p>
        </form>
      )}
    </AuthFrame>
  );
}
