import { Link, useRouterState } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import { Menu, X, Home, FolderGit2, Star, GraduationCap, Users, Briefcase, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger, SheetClose } from "@/components/ui/sheet";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate, useRouteContext } from "@tanstack/react-router";
import { useStore } from "@/lib/store";
import { ProfileBackup } from "./ProfileBackup";

const nav = [
  { to: "/overview", label: "Overview", icon: Home },
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
  const {status,retry}=useStore();
  const navigate=useNavigate();
  const {queryClient}=useRouteContext({from:'__root__'});
  async function signOut(){if(status==='Saving…' || status.startsWith('Not saved')){alert('Wait for your profile to save before signing out.');return;}await queryClient.cancelQueries();queryClient.clear();await supabase.auth.signOut();await navigate({to:'/auth',replace:true});}
  const navigation=<ul className="space-y-1">{nav.map(({to,label,icon:Icon})=><li key={to}><Link to={to} aria-current={path===to?'page':undefined} onClick={()=>setOpen(false)} className={`flex min-h-11 items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors ${path===to?'bg-primary text-primary-foreground':'text-foreground hover:bg-muted'}`}><Icon className="size-4"/>{label}</Link></li>)}</ul>;

  return (
    <div className="min-h-screen bg-background">
      <a href="#student-main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:bg-card focus:p-3">Skip to profile content</a>
      <header className="sticky top-0 z-30 border-b border-border bg-foreground text-background">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
          <Link to="/" className="flex items-center gap-3">
            <span className="grid h-9 w-9 place-items-center rounded-full bg-accent font-display text-lg text-accent-foreground">AU</span>
            <span>
              <span className="block font-display text-lg leading-tight">Africa University</span>
              <span className="block text-xs opacity-80">Student Profile · CIS2103</span>
            </span>
          </Link>
          <div className="flex items-center gap-2"><Button variant="ghost" className="text-background hover:bg-background/10 hover:text-background" onClick={signOut}>Sign out</Button><Sheet open={open} onOpenChange={setOpen}><SheetTrigger asChild><Button variant="ghost" size="icon" className="min-h-11 min-w-11 text-background lg:hidden" aria-label="Open student navigation"><Menu/></Button></SheetTrigger><SheetContent side="left"><SheetTitle className="mb-6 font-display text-xl">Student portal</SheetTitle>{navigation}</SheetContent></Sheet></div>
        </div>
      </header>

      <div className="mx-auto flex max-w-7xl gap-6 px-4 py-6">
        <nav
          aria-label="Student navigation" className="hidden lg:block lg:w-64 lg:shrink-0 lg:self-start"
        >
          <ul className="space-y-1">
            {nav.map(({ to, label, icon: Icon }) => {
              const active = path.startsWith(to);
              return (
                <li key={to}>
                  <Link
                    to={to}
                     aria-current={active ? 'page' : undefined}
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
        <main id="student-main" className="min-w-0 flex-1"><div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4"><span role="status" className="text-xs text-muted-foreground">{status}</span>{status.startsWith('Not saved') && <Button variant="outline" onClick={retry}>Retry save</Button>}<ProfileBackup/></div>{children}</main>
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
