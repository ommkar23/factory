"use client";

import React from "react";
import { useEffect, useRef, useState } from "react";
import {
  FactoryAppHeader,
  FactoryLogin,
  FactoryProfileMenu,
} from "@factory/ui";
import { signIn, signOut } from "./client.js";
import { getUserInitials } from "./core.js";

export function LoginScreen({
  appName,
  authError,
  returnTo,
  autoBootstrap = process.env.NODE_ENV === "development",
}) {
  const isDevelopment = autoBootstrap;
  const bootstrapStarted = useRef(false);
  const [error, setError] = useState(
    authError === "oauth_callback_failed"
      ? "We couldn't complete your sign-in. Please try again."
      : null,
  );
  const [bootstrapFailed, setBootstrapFailed] = useState(false);
  const [pending, setPending] = useState(isDevelopment);

  useEffect(() => {
    if (!isDevelopment || bootstrapStarted.current) return;

    bootstrapStarted.current = true;
    fetch("/api/auth/dev/bootstrap", {
      credentials: "same-origin",
      method: "POST",
    })
      .then((response) => {
        if (!response.ok) throw new Error("Development bootstrap failed.");
        window.location.replace(returnTo);
      })
      .catch(() => {
        setBootstrapFailed(true);
        setPending(false);
      });
  }, [isDevelopment, returnTo]);

  async function handleSignIn() {
    setError(null);
    setPending(true);
    try {
      await signIn({ next: returnTo });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to sign in.");
      setPending(false);
    }
  }

  return (
    <FactoryLogin
      appName={appName}
      authError={error}
      bootstrapError={bootstrapFailed}
      isDevelopment={isDevelopment}
      onSignIn={handleSignIn}
      pending={pending}
    />
  );
}

export function ProfileMenu({ loggedOutPath, user }) {
  const [error, setError] = useState(null);
  const [pending, setPending] = useState(false);

  async function handleSignOut() {
    setError(null);
    setPending(true);
    try {
      await signOut();
      window.location.replace(loggedOutPath);
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Unable to sign out.",
      );
      setPending(false);
    }
  }

  const accountLabel = user.name ?? user.email ?? "Signed-in user";

  return (
    <FactoryProfileMenu
      accountLabel={accountLabel}
      avatarUrl={user.avatarUrl}
      email={user.email}
      error={error}
      initials={getUserInitials(user)}
      onSignOut={handleSignOut}
      pending={pending}
    />
  );
}

export function AppHeader({
  appName,
  containerClassName,
  loggedOutPath,
  loginPath,
  user,
}) {
  return (
    <FactoryAppHeader appName={appName} className={containerClassName}>
      <ProfileMenu
        loggedOutPath={loggedOutPath}
        loginPath={loginPath}
        user={user}
      />
    </FactoryAppHeader>
  );
}
