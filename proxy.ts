import { NextRequest, NextResponse } from "next/server";

const AUTH_COOKIE = "xk_site_access";
const GUEST_TOKEN = "guest";

async function createAuthToken(password: string) {
  const salt = process.env.SITE_AUTH_SALT || "xk-events";
  const data = new TextEncoder().encode(`${password}:${salt}`);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function isPublicPath(pathname: string) {
  return (
    pathname === "/login" ||
    pathname === "/api/site-auth" ||
    pathname.startsWith("/_next/") ||
    pathname === "/favicon.ico" ||
    /\.(?:png|jpg|jpeg|gif|webp|svg|ico)$/.test(pathname)
  );
}

function rewriteTripPath(request: NextRequest) {
  if (!request.nextUrl.pathname.startsWith("/trip/")) return null;
  const rewriteUrl = request.nextUrl.clone();
  rewriteUrl.pathname = "/";
  return NextResponse.rewrite(rewriteUrl);
}

async function getValidAuthTokens() {
  const passwords = [process.env.SITE_PASSWORD, process.env.ALASKA_ACCESS_PASSWORD].filter(Boolean) as string[];
  return Promise.all(passwords.map((password) => createAuthToken(password)));
}

export async function proxy(request: NextRequest) {
  const validTokens = await getValidAuthTokens();
  if (!validTokens.length || isPublicPath(request.nextUrl.pathname)) {
    return rewriteTripPath(request) || NextResponse.next();
  }

  const authToken = request.cookies.get(AUTH_COOKIE)?.value;
  if (authToken === GUEST_TOKEN || (authToken && validTokens.includes(authToken))) {
    return rewriteTripPath(request) || NextResponse.next();
  }

  const loginUrl = request.nextUrl.clone();
  loginUrl.pathname = "/login";
  loginUrl.searchParams.set("from", `${request.nextUrl.pathname}${request.nextUrl.search}`);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: "/:path*",
};
