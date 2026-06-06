import { NextRequest, NextResponse } from "next/server";

type RentalCarDayRow = {
  status: "planned" | "pending" | "not_required";
  notes: string | null;
};

type RentalCarAssignmentRow = {
  id: string;
  car_key: string;
  notes: string | null;
  sort_order: number;
};

type RentalCarRow = {
  car_key: string;
  car_name: string;
  capacity: number;
};

type RentalCarOccupantRow = {
  assignment_id: string;
  person_name: string;
  party_name: string;
  role: "driver" | "passenger";
  sort_order: number;
};

function getSupabaseConfig() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return { url: url.replace(/\/$/, ""), key };
}

function supabaseHeaders(key: string) {
  return { apikey: key, Authorization: `Bearer ${key}` };
}

export async function GET(request: NextRequest) {
  const config = getSupabaseConfig();
  if (!config) return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });

  const date = request.nextUrl.searchParams.get("date") || "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: "A valid trip date is required." }, { status: 400 });
  }

  try {
    const dayResponse = await fetch(
      `${config.url}/rest/v1/rental_car_days?trip_date=eq.${encodeURIComponent(date)}&select=status,notes&limit=1`,
      { headers: supabaseHeaders(config.key), cache: "no-store" }
    );
    if (!dayResponse.ok) return NextResponse.json({ error: "Unable to load rental car arrangements." }, { status: 500 });
    const days = await dayResponse.json() as RentalCarDayRow[];
    const day = days[0];
    if (!day) return NextResponse.json({ status: "pending", notes: null, arrangements: [] });
    if (day.status !== "planned") return NextResponse.json({ status: day.status, notes: day.notes, arrangements: [] });

    const assignmentsResponse = await fetch(
      `${config.url}/rest/v1/rental_car_daily_assignments?trip_date=eq.${encodeURIComponent(date)}&select=id,car_key,notes,sort_order&order=sort_order.asc`,
      { headers: supabaseHeaders(config.key), cache: "no-store" }
    );
    if (!assignmentsResponse.ok) return NextResponse.json({ error: "Unable to load rental car arrangements." }, { status: 500 });
    const assignments = await assignmentsResponse.json() as RentalCarAssignmentRow[];
    if (!assignments.length) return NextResponse.json({ status: day.status, notes: day.notes, arrangements: [] });

    const assignmentIds = assignments.map((assignment) => assignment.id).join(",");
    const carKeys = assignments.map((assignment) => assignment.car_key).join(",");
    const [carsResponse, occupantsResponse] = await Promise.all([
      fetch(`${config.url}/rest/v1/rental_cars?car_key=in.(${encodeURIComponent(carKeys)})&select=car_key,car_name,capacity`, {
        headers: supabaseHeaders(config.key),
        cache: "no-store",
      }),
      fetch(`${config.url}/rest/v1/rental_car_occupants?assignment_id=in.(${encodeURIComponent(assignmentIds)})&select=assignment_id,person_name,party_name,role,sort_order&order=sort_order.asc`, {
        headers: supabaseHeaders(config.key),
        cache: "no-store",
      }),
    ]);
    if (!carsResponse.ok || !occupantsResponse.ok) {
      return NextResponse.json({ error: "Unable to load rental car arrangements." }, { status: 500 });
    }

    const cars = await carsResponse.json() as RentalCarRow[];
    const occupants = await occupantsResponse.json() as RentalCarOccupantRow[];
    const arrangements = assignments.map((assignment) => {
      const car = cars.find((candidate) => candidate.car_key === assignment.car_key);
      return {
        id: assignment.id,
        carName: car?.car_name || assignment.car_key,
        capacity: car?.capacity || 0,
        notes: assignment.notes,
        occupants: occupants
          .filter((occupant) => occupant.assignment_id === assignment.id)
          .map(({ person_name, party_name, role }) => ({ personName: person_name, partyName: party_name, role })),
      };
    });

    return NextResponse.json({ status: day.status, notes: day.notes, arrangements });
  } catch {
    return NextResponse.json({ error: "Unable to load rental car arrangements." }, { status: 500 });
  }
}
