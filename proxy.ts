import { NextRequest, NextResponse } from "next/server";

const AUTH_COOKIE = "xk_site_auth";

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

export async function proxy(request: NextRequest) {
  const password = process.env.SITE_PASSWORD;
  if (!password || isPublicPath(request.nextUrl.pathname)) {
    return rewriteTripPath(request) || NextResponse.next();
  }

  const expectedToken = await createAuthToken(password);
  if (request.cookies.get(AUTH_COOKIE)?.value === expectedToken) {
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
