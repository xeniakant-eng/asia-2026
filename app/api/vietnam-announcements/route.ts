import { createHash } from "node:crypto";

const tripDay = /^2026-11-(1[2-9]|20)$/;
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const noCache = { "Cache-Control": "no-store" };

function ownerHash(request: Request) {
  const token = request.headers.get("x-announcement-owner");
  return token && uuid.test(token) ? createHash("sha256").update(token).digest("hex") : null;
}

async function database(params: URLSearchParams, options: RequestInit = {}) {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return new Response(null, { status: 503 });
  try {
    const response = await fetch(new URL("/rest/v1/vietnam_announcements?" + params, url), {
      ...options,
      cache: "no-store",
      headers: { apikey: key, Authorization: "Bearer " + key, "Content-Type": "application/json" },
    });
    return response.ok ? response : new Response(null, { status: 502 });
  } catch {
    return new Response(null, { status: 502 });
  }
}

export async function GET(request: Request) {
  const day = new URL(request.url).searchParams.get("day");
  if (!day || !tripDay.test(day)) return new Response(null, { status: 400 });
  const owner = ownerHash(request);
  const response = await database(new URLSearchParams({
    day: "eq." + day, select: "id,message,author,owner_hash", order: "created_at.desc,id.desc",
  }));
  if (!response.ok) return response;
  const posts: { id: string; message: string; author: string; owner_hash: string }[] = await response.json();
  return Response.json(posts.map(({ id, message, author, owner_hash }) => ({
    id, message, author, canManage: owner === owner_hash,
  })), { headers: noCache });
}

export async function POST(request: Request) {
  const owner = ownerHash(request);
  if (!owner || request.headers.get("origin") !== new URL(request.url).origin) {
    return new Response(null, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  if (body?.action === "delete" && typeof body.id === "string" && uuid.test(body.id)) {
    // Match the author in the DELETE itself so there is no separate ownership check to race.
    const response = await database(new URLSearchParams({
      id: "eq." + body.id, owner_hash: "eq." + owner,
    }), { method: "DELETE" });
    return response.ok ? Response.json({ ok: true }) : response;
  }

  const message = typeof body?.message === "string" ? body.message.trim() : "";
  const author = typeof body?.party === "string" ? body.party.trim() : "";
  if (body?.action !== "post" || !tripDay.test(body.day) ||
      !message || message.length > 500 || !author || author.length > 150) {
    return new Response(null, { status: 400 });
  }
  const response = await database(new URLSearchParams(), {
    method: "POST",
    body: JSON.stringify({ day: body.day, message, author, owner_hash: owner }),
  });
  return response.ok ? Response.json({ ok: true }) : response;
}