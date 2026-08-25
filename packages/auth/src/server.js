import { cookies } from "next/headers";
import { getFactoryApiUrl } from "./core.js";

function getRequestCookieHeader(cookieStore) {
  return cookieStore
    .getAll()
    .map(({ name, value }) => `${name}=${value}`)
    .join("; ");
}

export async function getCurrentUser() {
  const cookieStore = await cookies();
  const cookie = getRequestCookieHeader(cookieStore);
  const response = await fetch(`${getFactoryApiUrl()}/auth/session`, {
    cache: "no-store",
    headers: cookie ? { cookie } : {},
  });
  if (!response.ok) {
    return null;
  }
  const session = await response.json();
  if (!session?.user || typeof session.user.id !== "string") {
    return null;
  }
  return {
    id: session.user.id,
    email: typeof session.user.email === "string" ? session.user.email : null,
    name: null,
    avatarUrl: null,
  };
}

export async function requireCurrentUser() {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("Authentication is required.");
  }
  return user;
}
