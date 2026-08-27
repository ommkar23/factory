import { NextResponse } from "next/server";
import { getFactoryApiUrl } from "@factory/auth";

function getSetCookies(response) {
  return response.headers.getSetCookie?.() ?? [];
}

export async function POST() {
  if (
    process.env.NODE_ENV !== "development" &&
    process.env.FACTORY_DEV_AUTH_BOOTSTRAP !== "true"
  ) {
    return new NextResponse(null, { status: 404 });
  }

  const secret = process.env.DEV_AUTH_SECRET;
  if (!secret) {
    return new NextResponse(null, { status: 503 });
  }

  const upstream = await fetch(`${getFactoryApiUrl()}/auth/dev/session`, {
    cache: "no-store",
    headers: { "X-Dev-Auth-Secret": secret },
    method: "POST",
  });
  const response = new NextResponse(null, { status: upstream.status });
  for (const cookie of getSetCookies(upstream)) {
    response.headers.append("set-cookie", cookie);
  }
  return response;
}
