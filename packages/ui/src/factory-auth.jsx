"use client";

import * as React from "react";
import { Alert, AlertDescription, AlertTitle } from "#components/alert";
import { Badge } from "#components/badge";
import { Button } from "#components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "#components/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "#components/dropdown-menu";
import { cn } from "#lib/utils";

function FactoryLogin({
  appName,
  authError,
  bootstrapError = false,
  isDevelopment = false,
  onSignIn,
  pending = false,
}) {
  return (
    <main className="flex min-h-screen items-start justify-center bg-muted/40 px-4 py-12 sm:items-center">
      <section
        aria-labelledby="factory-login-title"
        className="w-full max-w-sm"
      >
        <div className="mb-5 flex justify-center">
          <Badge variant="outline">Factory</Badge>
        </div>
        <Card className="py-6 sm:[--card-spacing:--spacing(6)]">
          <CardHeader>
            <CardTitle
              className="text-2xl font-semibold tracking-tight"
              id="factory-login-title"
            >
              Sign in to Factory
            </CardTitle>
            <CardDescription>
              Use your account to continue to {appName}.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isDevelopment ? (
              bootstrapError ? (
                <Alert variant="destructive">
                  <AlertTitle>
                    Unable to start your local development session.
                  </AlertTitle>
                  <AlertDescription>
                    Check that the local development services are running, then
                    refresh.
                  </AlertDescription>
                </Alert>
              ) : (
                <p className="text-sm text-muted-foreground" role="status">
                  Preparing your local development session…
                </p>
              )
            ) : (
              <div className="space-y-4">
                <Button
                  className="min-h-11 w-full gap-3"
                  disabled={pending}
                  onClick={onSignIn}
                  size="lg"
                  type="button"
                >
                  <GoogleMark />
                  {pending ? "Connecting to Google…" : "Continue with Google"}
                </Button>
                <p className="text-center text-xs leading-5 text-muted-foreground">
                  You’ll be redirected to Google to sign in securely.
                </p>
              </div>
            )}
            {authError ? (
              <Alert className="mt-5" variant="destructive">
                <AlertTitle>We couldn’t sign you in</AlertTitle>
                <AlertDescription>{authError}</AlertDescription>
              </Alert>
            ) : null}
          </CardContent>
        </Card>
      </section>
    </main>
  );
}

function FactoryProfileMenu({
  accountLabel,
  avatarUrl,
  defaultOpen = false,
  email,
  error,
  initials,
  onSignOut,
  pending = false,
}) {
  return (
    <DropdownMenu defaultOpen={defaultOpen}>
      <DropdownMenuTrigger
        aria-label="Open account menu"
        className="flex size-11 items-center justify-center rounded-full text-sm font-semibold text-foreground transition-colors hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring"
      >
        {avatarUrl ? (
          <img
            alt=""
            className="size-8 rounded-full border border-border object-cover"
            src={avatarUrl}
          />
        ) : (
          <span className="flex size-8 items-center justify-center rounded-full border border-border bg-muted text-xs">
            {initials}
          </span>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56">
        <DropdownMenuLabel>
          <span className="block truncate" title={accountLabel}>
            {accountLabel}
          </span>
          {email ? (
            <span
              className="block truncate text-xs font-normal text-muted-foreground"
              title={email}
            >
              {email}
            </span>
          ) : null}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          closeOnClick={false}
          disabled={pending}
          onClick={onSignOut}
        >
          {pending ? "Signing out…" : "Sign out"}
        </DropdownMenuItem>
        {error ? (
          <Alert className="mt-1 px-2 py-1.5" variant="destructive">
            <AlertDescription className="text-xs">
              We couldn’t sign you out. Try again.
            </AlertDescription>
          </Alert>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function FactoryAppHeader({ appName, children, className }) {
  return (
    <header className="border-b border-border bg-background/95">
      <div
        className={cn(
          "mx-auto flex min-h-14 items-center justify-between px-4 sm:px-6",
          className,
        )}
      >
        <span className="truncate text-sm font-medium">{appName}</span>
        {children}
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

export { FactoryAppHeader, FactoryLogin, FactoryProfileMenu };
