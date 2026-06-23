import { NextRequest, NextResponse } from "next/server";

const VALID_TRIPS = new Set(["morocco", "vietnam", "skiMyoko", "skiDeerValley", "skiBig3", "panama", "houston", "azoresPortugal", "similanThailand", "centralVietnam", "disneyWorld", "fiveStans"]);

type SignupRow = {
  name: string;
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

async function fetchTripNames(tripKey: string): Promise<string[]> {
  const config = getSupabaseConfig();
  if (!config) throw new Error("Supabase is not configured.");

  const response = await fetch(
    `${config.url}/rest/v1/trip_signups?trip_key=eq.${encodeURIComponent(tripKey)}&select=name&order=created_at.asc`,
    {
      headers: {
        apikey: config.key,
        Authorization: `Bearer ${config.key}`,
      },
      cache: "no-store",
    }
  );

  if (!response.ok) {
    throw new Error(`Supabase read failed: ${response.status}`);
  }

  const rows = await response.json() as SignupRow[];
  return rows.map((row) => row.name);
}

export async function GET(request: NextRequest) {
  const tripKey = request.nextUrl.searchParams.get("trip") || "";
  if (!VALID_TRIPS.has(tripKey)) {
    return NextResponse.json({ error: "Unknown trip." }, { status: 400 });
  }
  if (!getSupabaseConfig()) return unavailableResponse();

  try {
    return NextResponse.json({ names: await fetchTripNames(tripKey) });
  } catch {
    return NextResponse.json({ error: "Unable to load signups." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const config = getSupabaseConfig();
  if (!config) return unavailableResponse();

  try {
    const body = await request.json();
    const tripKey = typeof body.trip === "string" ? body.trip : "";
    const name = typeof body.name === "string" ? body.name.trim() : "";

    if (!VALID_TRIPS.has(tripKey)) {
      return NextResponse.json({ error: "Unknown trip." }, { status: 400 });
    }
    if (!name) {
      return NextResponse.json({ error: "Name is required." }, { status: 400 });
    }

    const currentNames = await fetchTripNames(tripKey);
    if (currentNames.includes(name)) {
      return NextResponse.json({ names: currentNames });
    }

    const insertResponse = await fetch(`${config.url}/rest/v1/trip_signups`, {
      method: "POST",
      headers: {
        apikey: config.key,
        Authorization: `Bearer ${config.key}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify({ trip_key: tripKey, name }),
    });

    if (!insertResponse.ok) {
      return NextResponse.json({ error: "Unable to save signup." }, { status: 500 });
    }

    return NextResponse.json({ names: await fetchTripNames(tripKey) });
  } catch {
    return NextResponse.json({ error: "Unable to save signup." }, { status: 500 });
  }
}
