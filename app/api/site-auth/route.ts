import { NextRequest, NextResponse } from "next/server";

const AUTH_COOKIE = "xk_site_access";
const GUEST_TOKEN = "guest";
type SiteAccessMode = "guest" | "member" | "alaska";

async function createAuthToken(password: string) {
  const salt = process.env.SITE_AUTH_SALT || "xk-events";
  const data = new TextEncoder().encode(`${password}:${salt}`);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function getPasswordEntries() {
  return [
    { mode: "member" as const, password: process.env.SITE_PASSWORD },
    { mode: "alaska" as const, password: process.env.ALASKA_ACCESS_PASSWORD },
  ].filter((entry): entry is { mode: Exclude<SiteAccessMode, "guest">; password: string } => Boolean(entry.password));
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const requestedMode = body.mode === "guest" ? "guest" : "member";
  const password = typeof body.password === "string" ? body.password : "";

  if (requestedMode === "guest") {
    const response = NextResponse.json({ ok: true, mode: "guest" });
    response.cookies.set(AUTH_COOKIE, GUEST_TOKEN, {
      httpOnly: true,
      maxAge: 60 * 60 * 24 * 30,
      path: "/",
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });
    return response;
  }

  const passwordEntries = getPasswordEntries();
  if (!passwordEntries.length) {
    return NextResponse.json({ error: "Site password is not configured." }, { status: 503 });
  }

  const matchedEntry = passwordEntries.find((entry) => password === entry.password);
  if (!matchedEntry) {
    return NextResponse.json({ error: "Incorrect password." }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true, mode: matchedEntry.mode });
  response.cookies.set(AUTH_COOKIE, await createAuthToken(matchedEntry.password), {
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

  const passwordEntries = getPasswordEntries();
  if (!passwordEntries.length) {
    return NextResponse.json({ mode: "member" });
  }

  for (const entry of passwordEntries) {
    if (token === await createAuthToken(entry.password)) {
      return NextResponse.json({ mode: entry.mode });
    }
  }

  return NextResponse.json({ mode: "unknown" });
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
