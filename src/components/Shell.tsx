import { Link, useRouterState } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import { Menu, X, Home, FolderGit2, Star, GraduationCap, Users, Briefcase, ShieldCheck } from "lucide-react";

const nav = [
  { to: "/", label: "Overview", icon: Home },
  { to: "/projects", label: "My Projects", icon: FolderGit2 },
  { to: "/skills", label: "My Skills", icon: Star },
  { to: "/academics", label: "Academics & Certificates", icon: GraduationCap },
  { to: "/clubs", label: "Clubs & Activities", icon: Users },
  { to: "/professional", label: "Professional Profile", icon: Briefcase },
  { to: "/security", label: "Account Security", icon: ShieldCheck },
] as const;

export function Shell({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const path = useRouterState({ select: (s) => s.location.pathname });

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b border-border bg-primary text-primary-foreground">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
          <Link to="/" className="flex items-center gap-3">
            <span className="grid h-9 w-9 place-items-center rounded-full bg-accent font-display text-lg text-accent-foreground">AU</span>
            <span>
              <span className="block font-display text-lg leading-tight">Africa University</span>
              <span className="block text-xs opacity-80">Student Profile · CIS2103</span>
            </span>
          </Link>
          <button className="rounded-md p-2 lg:hidden" onClick={() => setOpen(!open)} aria-label="Toggle menu">
            {open ? <X /> : <Menu />}
          </button>
        </div>
      </header>

      <div className="mx-auto flex max-w-7xl gap-6 px-4 py-6">
        <nav
          className={`${open ? "block" : "hidden"} fixed inset-x-0 top-[61px] z-20 border-b border-border bg-card p-4 shadow-lg lg:static lg:block lg:w-64 lg:shrink-0 lg:self-start lg:rounded-xl lg:border lg:shadow-none`}
        >
          <ul className="space-y-1">
            {nav.map(({ to, label, icon: Icon }) => {
              const active = to === "/" ? path === "/" : path.startsWith(to);
              return (
                <li key={to}>
                  <Link
                    to={to}
                    onClick={() => setOpen(false)}
                    className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                      active ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-muted"
                    }`}
                  >
                    <Icon className="h-4 w-4" /> {label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}

export function PageTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-6">
      <h1 className="font-display text-3xl text-foreground md:text-4xl">{title}</h1>
      {subtitle && <p className="mt-1 text-muted-foreground">{subtitle}</p>}
    </div>
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`rounded-xl border border-border bg-card p-5 shadow-sm ${className}`}>{children}</section>;
}

export const inputCls =
  "w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring";
export const btnCls =
  "inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:opacity-50";
export const btnGhost =
  "inline-flex items-center justify-center gap-2 rounded-md border border-border px-3 py-2 text-sm font-medium hover:bg-muted";
export const delBtn = "rounded-md p-1.5 text-destructive hover:bg-destructive/10";
