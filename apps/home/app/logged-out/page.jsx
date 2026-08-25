import React from "react";

export default function LoggedOutPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/40 px-4 py-12">
      <section className="w-full max-w-sm rounded-xl border border-border bg-card p-6 text-card-foreground shadow-sm sm:p-8">
        <h1 className="text-2xl font-semibold tracking-tight">
          You’ve been logged out.
        </h1>
        <a
          className="mt-6 inline-flex min-h-11 items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring"
          href="/"
        >
          Return to Home
        </a>
      </section>
    </main>
  );
}
