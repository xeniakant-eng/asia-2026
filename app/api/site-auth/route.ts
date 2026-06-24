import { NextRequest, NextResponse } from "next/server";

const AUTH_COOKIE = "xk_site_access";
const GUEST_TOKEN = "guest";

async function createAuthToken(password: string) {
  const salt = process.env.SITE_AUTH_SALT || "xk-events";
  const data = new TextEncoder().encode(`${password}:${salt}`);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function POST(request: NextRequest) {
  const sitePassword = process.env.SITE_PASSWORD;
  const body = await request.json().catch(() => ({}));
  const mode = body.mode === "guest" ? "guest" : "member";
  const password = typeof body.password === "string" ? body.password : "";

  if (mode === "member" && !sitePassword) {
    return NextResponse.json({ error: "Site password is not configured." }, { status: 503 });
  }
  if (mode === "member" && password !== sitePassword) {
    return NextResponse.json({ error: "Incorrect password." }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true, mode });
  response.cookies.set(AUTH_COOKIE, mode === "guest" ? GUEST_TOKEN : await createAuthToken(sitePassword!), {
    httpOnly: true,
    maxAge: 60 * 60 * 24 * 30,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
  return response;
}

export async function GET(request: NextRequest) {
  const token = request.cookies.get(AUTH_COOKIE)?.value || "";
  if (token === GUEST_TOKEN) {
    return NextResponse.json({ mode: "guest" });
  }

  const sitePassword = process.env.SITE_PASSWORD;
  if (!sitePassword) {
    return NextResponse.json({ mode: "member" });
  }

  const expectedToken = await createAuthToken(sitePassword);
  return NextResponse.json({ mode: token === expectedToken ? "member" : "unknown" });
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(AUTH_COOKIE, "", {
    httpOnly: true,
    maxAge: 0,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
  return response;
}
