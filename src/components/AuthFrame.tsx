import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import campus from "@/assets/campus.jpg";

export function AuthFrame({ children }: { children: ReactNode }) {
  return (
    <main className="relative isolate flex min-h-screen flex-col">
      <img
        src={campus}
        alt="Africa University campus"
        className="fixed inset-0 -z-20 h-full w-full object-cover"
      />
      <div className="fixed inset-0 -z-10 bg-foreground/65" />
      <header className="border-b border-primary-foreground/20 px-6 py-5 text-primary-foreground">
        <Link to="/" className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded bg-primary font-display">
            AU
          </span>
          <span className="font-display text-xl">Africa University</span>
        </Link>
      </header>
      <div className="mx-auto my-10 w-[calc(100%-2rem)] max-w-md rounded-lg border border-border bg-background/95 p-6 shadow-lg sm:my-16 sm:p-9">
        {children}
      </div>
      <footer className="mt-auto p-6 text-center text-xs text-primary-foreground">
        Africa University · Secure account access
      </footer>
    </main>
  );
}
