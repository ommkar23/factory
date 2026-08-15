"use client";

import { createBrowserClient } from "@supabase/ssr";

import { getSupabaseConfig, type AuthMode } from "./core";

export type SignInOptions = {
  mode: AuthMode;
  redirectTo: string;
};

export function createSupabaseBrowserClient() {
  const { publishableKey, url } = getSupabaseConfig();

  return createBrowserClient(url, publishableKey);
}

export async function signIn({
  mode,
  redirectTo,
}: SignInOptions): Promise<void> {
  if (mode === "mock") {
    const response = await fetch("/auth/mock/sign-in", { method: "POST" });

    if (!response.ok) {
      throw new Error("Unable to start the mock development session.");
    }

    return;
  }

  const { data, error } =
    await createSupabaseBrowserClient().auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo,
      },
    });

  if (error) {
    throw error;
  }

  if (!data.url) {
    throw new Error("Supabase did not return an OAuth redirect URL.");
  }

  window.location.assign(data.url);
}

export async function signOut(mode: AuthMode): Promise<void> {
  if (mode === "mock") {
    const response = await fetch("/auth/mock/sign-out", { method: "POST" });

    if (!response.ok) {
      throw new Error("Unable to end the mock development session.");
    }

    return;
  }

  const { error } = await createSupabaseBrowserClient().auth.signOut();

  if (error) {
    throw error;
  }
}
