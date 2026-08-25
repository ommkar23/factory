"use client";

export async function signIn({ next }) {
  window.location.assign(`/auth/login?next=${encodeURIComponent(next)}`);
}

export async function signOut() {
  const response = await fetch("/auth/logout", {
    credentials: "include",
    method: "POST",
  });
  if (!response.ok) {
    throw new Error("Unable to sign out.");
  }
}
