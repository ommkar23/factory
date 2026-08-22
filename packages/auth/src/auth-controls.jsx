"use client";
import React from "react";
import { useEffect, useRef, useState } from "react";
import { signIn, signOut } from "./client";
import { getUserInitials, isDevelopmentAuthBypass } from "./core";
export function LoginScreen({ appName, authError, callbackPath }) {
  const [error, setError] = useState(
    authError === "oauth_callback_failed"
      ? "We couldn't complete your sign-in. Please try again."
      : null,
  );
  const [pending, setPending] = useState(false);
  async function handleSignIn() {
    setError(null);
    setPending(true);
    try {
      const redirectTo = new URL(
        callbackPath,
        window.location.origin,
      ).toString();
      await signIn({ redirectTo });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to sign in.");
      setPending(false);
    }
  }
  const actionLabel = pending
    ? "Connecting to Google…"
    : "Continue with Google";
  return (
    <main className="flex min-h-screen items-start justify-center bg-muted/40 px-4 py-12 sm:items-center">
      <section
        className="w-full max-w-sm"
        aria-labelledby="factory-login-title"
      >
        <div className="mb-5 flex justify-center">
          <span className="rounded-full border border-border bg-background px-3 py-1 text-xs font-medium text-muted-foreground">
            Factory
          </span>
        </div>
        <div className="rounded-xl border border-border bg-card p-6 text-card-foreground shadow-sm sm:p-8">
          <div className="space-y-2">
            <h1
              id="factory-login-title"
              className="text-2xl font-semibold tracking-tight"
            >
              Sign in to Factory
            </h1>
            <p className="text-sm text-muted-foreground">
              Use your account to continue to {appName}.
            </p>
          </div>

          <div className="mt-6 space-y-4">
            <button
              className="flex min-h-11 w-full items-center justify-center gap-3 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
              disabled={pending}
              onClick={handleSignIn}
              type="button"
            >
              <GoogleMark />
              {actionLabel}
            </button>

            <p className="text-center text-xs leading-5 text-muted-foreground">
              You’ll be redirected to Google to sign in securely.
            </p>
          </div>

          {error ? (
            <div
              className="mt-5 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm"
              role="alert"
            >
              <p className="font-medium">We couldn’t sign you in</p>
              <p className="mt-1 text-muted-foreground">{error}</p>
            </div>
          ) : null}
        </div>
      </section>
    </main>
  );
}
export function ProfileMenu({ loginPath, user }) {
  const [error, setError] = useState(null);
  const [isOpen, setIsOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const triggerRef = useRef(null);
  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === "Escape" && isOpen) {
        setIsOpen(false);
        triggerRef.current?.focus();
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);
  async function handleSignOut() {
    setError(null);
    setPending(true);
    try {
      await signOut();
      window.location.replace(loginPath);
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Unable to sign out.",
      );
      setPending(false);
    }
  }
  const accountLabel = user.name ?? user.email ?? "Signed-in user";
  const showSignOut = !isDevelopmentAuthBypass();
  return (
    <div className="relative">
      <button
        aria-expanded={isOpen}
        aria-haspopup="menu"
        aria-label="Open account menu"
        className="flex size-11 items-center justify-center rounded-full text-sm font-semibold text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring"
        onClick={() => setIsOpen((open) => !open)}
        ref={triggerRef}
        type="button"
      >
        {user.avatarUrl ? (
          <img
            alt=""
            className="size-8 rounded-full border border-border object-cover"
            src={user.avatarUrl}
          />
        ) : (
          <span className="flex size-8 items-center justify-center rounded-full border border-border bg-muted text-xs">
            {getUserInitials(user)}
          </span>
        )}
      </button>

      {isOpen ? (
        <div
          className="absolute right-0 z-50 mt-2 w-56 rounded-lg border border-border bg-popover p-1 text-popover-foreground shadow-md"
          role="menu"
        >
          <div className="px-3 py-2" role="presentation">
            <p className="truncate text-sm font-medium" title={accountLabel}>
              {accountLabel}
            </p>
            {user.email ? (
              <p
                className="truncate text-xs text-muted-foreground"
                title={user.email}
              >
                {user.email}
              </p>
            ) : null}
          </div>
          {showSignOut ? (
            <>
              <div className="my-1 h-px bg-border" role="presentation" />
              <button
                className="flex min-h-10 w-full items-center rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
                disabled={pending}
                onClick={handleSignOut}
                role="menuitem"
                type="button"
              >
                {pending ? "Signing out…" : "Sign out"}
              </button>
              {error ? (
                <p className="px-3 pb-2 text-xs text-destructive" role="alert">
                  We couldn’t sign you out. Try again.
                </p>
              ) : null}
            </>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
export function AppHeader({ appName, containerClassName, loginPath, user }) {
  return (
    <header className="border-b border-border bg-background/95">
      <div
        className={`mx-auto flex min-h-14 items-center justify-between px-4 sm:px-6 ${containerClassName}`}
      >
        <span className="text-sm font-medium">{appName}</span>
        <ProfileMenu loginPath={loginPath} user={user} />
      </div>
    </header>
  );
}
function GoogleMark() {
  return (
    <svg aria-hidden="true" className="size-4" viewBox="0 0 24 24">
      <path
        d="M21.35 12.27c0-.79-.07-1.55-.2-2.27H12v4.3h5.23a4.47 4.47 0 0 1-1.94 2.93v2.8h3.14c1.84-1.7 2.92-4.2 2.92-7.76Z"
        fill="currentColor"
      />
      <path
        d="M12 21.75c2.62 0 4.82-.87 6.43-2.36l-3.14-2.8c-.87.58-1.99.92-3.29.92-2.53 0-4.67-1.7-5.44-4.01H3.31v2.9A9.72 9.72 0 0 0 12 21.75Z"
        fill="currentColor"
      />
      <path
        d="M6.56 13.5a5.84 5.84 0 0 1 0-3.74v-2.9H3.31a9.75 9.75 0 0 0 0 9.54l3.25-2.9Z"
        fill="currentColor"
      />
      <path
        d="M12 5.75c1.43 0 2.71.49 3.72 1.45l2.79-2.79C16.81 2.82 14.62 1.75 12 1.75a9.72 9.72 0 0 0-8.69 5.11l3.25 2.9C7.33 7.45 9.47 5.75 12 5.75Z"
        fill="currentColor"
      />
    </svg>
  );
}
