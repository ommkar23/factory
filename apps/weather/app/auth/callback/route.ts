import { getRequestBasePath } from "@factory/auth";
import { handleAuthCallback } from "@factory/auth/routes";
import type { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  return handleAuthCallback(request, {
    basePath: getRequestBasePath("/weather"),
  });
}
