import { NextResponse } from "next/server";
import { getFactoryApiUrl } from "./core.js";

function hasFactoryAuthCookie(cookie) {
  return /(^|;\s*)Factory-(Access|Refresh)-Token=/.test(cookie ?? "");
}

function getSetCookies(response) {
  return response.headers.getSetCookie?.() ?? [];
}

function applySessionCookies(request, cookies) {
  for (const cookie of cookies) {
    const [nameValue] = cookie.split(";", 1);
    const separator = nameValue.indexOf("=");
    if (separator > 0) {
      request.cookies.set(
        nameValue.slice(0, separator),
        nameValue.slice(separator + 1),
      );
    }
  }
}

function relaySessionCookies(response, cookies) {
  for (const cookie of cookies) {
    response.headers.append("set-cookie", cookie);
  }
}

export async function updateAuthSession(request) {
  const cookie = request.headers.get("cookie");
  if (!hasFactoryAuthCookie(cookie)) {
    return NextResponse.next({ request });
  }
  const session = await fetch(`${getFactoryApiUrl()}/auth/session`, {
    cache: "no-store",
    headers: { cookie },
  });
  const cookies = getSetCookies(session);
  applySessionCookies(request, cookies);
  const response = NextResponse.next({ request });
  relaySessionCookies(response, cookies);
  return response;
}
