"use client";
import { createBrowserClient } from "@supabase/ssr";
import { getSupabaseConfig } from "./core";
export function createSupabaseBrowserClient() {
  const { publishableKey, url } = getSupabaseConfig();
  return createBrowserClient(url, publishableKey);
}
export async function signIn({ redirectTo }) {
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
export async function signOut() {
  const { error } = await createSupabaseBrowserClient().auth.signOut();
  if (error) {
    throw error;
  }
}
