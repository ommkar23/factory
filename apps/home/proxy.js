import { updateAuthSession } from "@factory/auth/proxy";
export async function proxy(request) {
  return updateAuthSession(request);
}
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
