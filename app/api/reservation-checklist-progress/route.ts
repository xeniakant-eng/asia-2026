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

  const trip = request.nextUrl.searchParams.get("trip")?.trim() || "";
  const guest = request.nextUrl.searchParams.get("guest")?.trim() || "";
  if (!trip || !guest) {
    return NextResponse.json({ error: "Trip and guest are required." }, { status: 400 });
  }

  try {
    const response = await fetch(
      `${config.url}/rest/v1/reservation_checklist_progress?trip_key=eq.${encodeURIComponent(trip)}&guest=eq.${encodeURIComponent(guest)}&select=item_key,checked`,
      {
        headers: {
          apikey: config.key,
          Authorization: `Bearer ${config.key}`,
        },
        cache: "no-store",
      }
    );

    if (!response.ok) {
      return NextResponse.json({ error: "Unable to load reservation checklist progress." }, { status: 500 });
    }

    const rows = await response.json() as ProgressRow[];
    const progress = rows.reduce<Record<string, boolean>>((result, row) => {
      result[row.item_key] = row.checked;
      return result;
    }, {});

    return NextResponse.json({ progress });
  } catch {
    return NextResponse.json({ error: "Unable to load reservation checklist progress." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const config = getSupabaseConfig();
  if (!config) return unavailableResponse();

  try {
    const body = await request.json();
    const trip = typeof body.trip === "string" ? body.trip.trim() : "";
    const guest = typeof body.guest === "string" ? body.guest.trim() : "";
    const itemKey = typeof body.itemKey === "string" ? body.itemKey.trim() : "";
    const checked = Boolean(body.checked);

    if (!trip || !guest || !itemKey) {
      return NextResponse.json({ error: "Trip, guest, and itemKey are required." }, { status: 400 });
    }
    if (guest === "Guest" || guest === "I am just a random Guest") {
      return NextResponse.json({ error: "Guest access is read-only." }, { status: 403 });
    }

    const response = await fetch(`${config.url}/rest/v1/reservation_checklist_progress`, {
      method: "POST",
      headers: {
        apikey: config.key,
        Authorization: `Bearer ${config.key}`,
        "Content-Type": "application/json",
        Prefer: "resolution=merge-duplicates,return=minimal",
      },
      body: JSON.stringify({
        trip_key: trip,
        guest,
        item_key: itemKey,
        checked,
        updated_at: new Date().toISOString(),
      }),
    });

    if (!response.ok) {
      return NextResponse.json({ error: "Unable to save reservation checklist progress." }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Unable to save reservation checklist progress." }, { status: 500 });
  }
}
