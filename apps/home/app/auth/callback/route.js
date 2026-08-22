import { handleAuthCallback } from "@factory/auth/routes";
export async function GET(request) {
  return handleAuthCallback(request);
}
