import { NextRequest, NextResponse } from "next/server";

type ProgressRow = {
  item_key: string;
  checked: boolean;
};

function getSupabaseConfig() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return { url: url.replace(/\/$/, ""), key };
}

function unavailableResponse() {
  return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
}

export async function GET(request: NextRequest) {
  const config = getSupabaseConfig();
  if (!config) return unavailableResponse();

  const guest = request.nextUrl.searchParams.get("guest")?.trim() || "";
  if (!guest) {
    return NextResponse.json({ error: "Guest is required." }, { status: 400 });
  }

  try {
    const response = await fetch(
      `${config.url}/rest/v1/checklist_progress?guest=eq.${encodeURIComponent(guest)}&select=item_key,checked`,
      {
        headers: {
          apikey: config.key,
          Authorization: `Bearer ${config.key}`,
        },
        cache: "no-store",
      }
    );

    if (!response.ok) {
      return NextResponse.json({ error: "Unable to load checklist progress." }, { status: 500 });
    }

    const rows = await response.json() as ProgressRow[];
    const progress = rows.reduce<Record<string, boolean>>((result, row) => {
      result[row.item_key] = row.checked;
      return result;
    }, {});

    return NextResponse.json({ progress });
  } catch {
    return NextResponse.json({ error: "Unable to load checklist progress." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const config = getSupabaseConfig();
  if (!config) return unavailableResponse();

  try {
    const body = await request.json();
    const guest = typeof body.guest === "string" ? body.guest.trim() : "";
    const itemKey = typeof body.itemKey === "string" ? body.itemKey.trim() : "";
    const checked = Boolean(body.checked);

    if (!guest || !itemKey) {
      return NextResponse.json({ error: "Guest and itemKey are required." }, { status: 400 });
    }

    const response = await fetch(`${config.url}/rest/v1/checklist_progress`, {
      method: "POST",
      headers: {
        apikey: config.key,
        Authorization: `Bearer ${config.key}`,
        "Content-Type": "application/json",
        Prefer: "resolution=merge-duplicates,return=minimal",
      },
      body: JSON.stringify({
        guest,
        item_key: itemKey,
        checked,
        updated_at: new Date().toISOString(),
      }),
    });

    if (!response.ok) {
      return NextResponse.json({ error: "Unable to save checklist progress." }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Unable to save checklist progress." }, { status: 500 });
  }
}
