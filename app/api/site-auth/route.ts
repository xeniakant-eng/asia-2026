import { NextRequest, NextResponse } from "next/server";

const AUTH_COOKIE = "xk_site_auth";

async function createAuthToken(password: string) {
  const salt = process.env.SITE_AUTH_SALT || "xk-events";
  const data = new TextEncoder().encode(`${password}:${salt}`);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function POST(request: NextRequest) {
  const sitePassword = process.env.SITE_PASSWORD;
  if (!sitePassword) {
    return NextResponse.json({ error: "Site password is not configured." }, { status: 503 });
  }

  const body = await request.json().catch(() => ({}));
  const password = typeof body.password === "string" ? body.password : "";

  if (password !== sitePassword) {
    return NextResponse.json({ error: "Incorrect password." }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(AUTH_COOKIE, await createAuthToken(sitePassword), {
    httpOnly: true,
    maxAge: 60 * 60 * 24 * 30,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
  return response;
}
