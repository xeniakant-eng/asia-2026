import { NextRequest, NextResponse } from "next/server";

type ExpenseRow = {
  id: string;
  description: string;
  amount_cad: number | null;
  amount_local: number | null;
  amount_usd: number | null;
  exchange_rate_to_cad: number | null;
  converted_amount_cad: number | null;
  paid_by: string;
  paid_for: string | null;
  created_at: string;
};

type ExpenseCurrency = "CAD" | "MAD" | "USD";

function getSupabaseConfig() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return { url: url.replace(/\/$/, ""), key };
}

function serializeExpense(row: ExpenseRow) {
  return {
    id: row.id,
    description: row.description,
    amountCad: row.amount_cad === null ? null : Number(row.amount_cad),
    amountLocal: row.amount_local === null ? null : Number(row.amount_local),
    amountUsd: row.amount_usd === null ? null : Number(row.amount_usd),
    exchangeRateToCad: row.exchange_rate_to_cad === null ? null : Number(row.exchange_rate_to_cad),
    convertedAmountCad: row.converted_amount_cad === null ? null : Number(row.converted_amount_cad),
    paidBy: row.paid_by,
    paidFor: row.paid_for || "Everyone",
    createdAt: row.created_at,
  };
}

async function loadExpenses(url: string, key: string, trip: string) {
  const response = await fetch(`${url}/rest/v1/trip_expenses?trip_key=eq.${encodeURIComponent(trip)}&select=id,description,amount_cad,amount_local,amount_usd,exchange_rate_to_cad,converted_amount_cad,paid_by,paid_for,created_at&order=created_at.desc`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
    cache: "no-store",
  });
  if (!response.ok) throw new Error("Unable to load expenses.");
  return (await response.json() as ExpenseRow[]).map(serializeExpense);
}

async function getCadExchangeRate(currency: ExpenseCurrency) {
  if (currency === "CAD") return 1;
  const response = await fetch(`https://open.er-api.com/v6/latest/${currency}`, { cache: "no-store" });
  if (!response.ok) throw new Error("Unable to load the current exchange rate.");
  const data = await response.json();
  const rate = Number(data?.rates?.CAD);
  if (!Number.isFinite(rate) || rate <= 0) throw new Error("Unable to load the current exchange rate.");
  return rate;
}

function getExpenseInput(body: Record<string, unknown>) {
  const description = typeof body.description === "string" ? body.description.trim() : "";
  const paidBy = typeof body.paidBy === "string" ? body.paidBy.trim() : "";
  const paidFor = typeof body.paidFor === "string" ? body.paidFor.trim() : "";
  const amount = Number(body.amount);
  const currency: ExpenseCurrency | "" = body.currency === "MAD" ? "MAD" : body.currency === "CAD" ? "CAD" : body.currency === "USD" ? "USD" : "";
  if (!description || !paidBy || !paidFor || !currency || !Number.isFinite(amount) || amount <= 0) return null;
  return { description, paidBy, paidFor, amount, currency };
}

function verifyAdminPassword(password: unknown) {
  if (!process.env.SITE_PASSWORD) return "Administrator password is not configured.";
  if (password !== process.env.SITE_PASSWORD) return "Incorrect administrator password.";
  return "";
}

export async function GET(request: NextRequest) {
  const config = getSupabaseConfig();
  if (!config) return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  const trip = request.nextUrl.searchParams.get("trip") || "";
  if (trip !== "morocco") return NextResponse.json({ error: "Unknown trip." }, { status: 400 });
  try {
    return NextResponse.json({ expenses: await loadExpenses(config.url, config.key, trip) });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to load expenses." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const config = getSupabaseConfig();
  if (!config) return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  try {
    const body = await request.json();
    const trip = typeof body.trip === "string" ? body.trip : "";
    const expense = getExpenseInput(body);
    if (trip !== "morocco" || !expense) {
      return NextResponse.json({ error: "Valid expense details are required." }, { status: 400 });
    }
    const { description, paidBy, paidFor, amount, currency } = expense;
    const exchangeRateToCad = await getCadExchangeRate(currency);
    const convertedAmountCad = Number((amount * exchangeRateToCad).toFixed(2));
    const response = await fetch(`${config.url}/rest/v1/trip_expenses`, {
      method: "POST",
      headers: { apikey: config.key, Authorization: `Bearer ${config.key}`, "Content-Type": "application/json", Prefer: "return=minimal" },
      body: JSON.stringify({
        trip_key: trip,
        description,
        amount_cad: currency === "CAD" ? amount : null,
        amount_local: currency === "MAD" ? amount : null,
        amount_usd: currency === "USD" ? amount : null,
        exchange_rate_to_cad: exchangeRateToCad,
        converted_amount_cad: convertedAmountCad,
        paid_by: paidBy,
        paid_for: paidFor,
      }),
    });
    if (!response.ok) return NextResponse.json({ error: "Unable to save expense." }, { status: 500 });
    return NextResponse.json({ expenses: await loadExpenses(config.url, config.key, trip) });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to save expense." }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const config = getSupabaseConfig();
  if (!config) return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  try {
    const body = await request.json();
    const passwordError = verifyAdminPassword(body.password);
    if (passwordError) return NextResponse.json({ error: passwordError }, { status: process.env.SITE_PASSWORD ? 401 : 503 });
    const trip = typeof body.trip === "string" ? body.trip : "";
    const id = typeof body.id === "string" ? body.id : "";
    const expense = getExpenseInput(body);
    if (trip !== "morocco" || !id || !expense) return NextResponse.json({ error: "Valid expense details are required." }, { status: 400 });

    const { description, paidBy, paidFor, amount, currency } = expense;
    const exchangeRateToCad = await getCadExchangeRate(currency);
    const convertedAmountCad = Number((amount * exchangeRateToCad).toFixed(2));
    const response = await fetch(`${config.url}/rest/v1/trip_expenses?id=eq.${encodeURIComponent(id)}&trip_key=eq.${encodeURIComponent(trip)}`, {
      method: "PATCH",
      headers: { apikey: config.key, Authorization: `Bearer ${config.key}`, "Content-Type": "application/json", Prefer: "return=minimal" },
      body: JSON.stringify({
        description,
        amount_cad: currency === "CAD" ? amount : null,
        amount_local: currency === "MAD" ? amount : null,
        amount_usd: currency === "USD" ? amount : null,
        exchange_rate_to_cad: exchangeRateToCad,
        converted_amount_cad: convertedAmountCad,
        paid_by: paidBy,
        paid_for: paidFor,
      }),
    });
    if (!response.ok) return NextResponse.json({ error: "Unable to update expense." }, { status: 500 });
    return NextResponse.json({ expenses: await loadExpenses(config.url, config.key, trip) });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to update expense." }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const config = getSupabaseConfig();
  if (!config) return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  try {
    const body = await request.json();
    const passwordError = verifyAdminPassword(body.password);
    if (passwordError) return NextResponse.json({ error: passwordError }, { status: process.env.SITE_PASSWORD ? 401 : 503 });
    const trip = typeof body.trip === "string" ? body.trip : "";
    const id = typeof body.id === "string" ? body.id : "";
    if (trip !== "morocco" || !id) return NextResponse.json({ error: "Unknown expense." }, { status: 400 });
    const response = await fetch(`${config.url}/rest/v1/trip_expenses?id=eq.${encodeURIComponent(id)}&trip_key=eq.${encodeURIComponent(trip)}`, {
      method: "DELETE",
      headers: { apikey: config.key, Authorization: `Bearer ${config.key}` },
    });
    if (!response.ok) return NextResponse.json({ error: "Unable to delete expense." }, { status: 500 });
    return NextResponse.json({ expenses: await loadExpenses(config.url, config.key, trip) });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to delete expense." }, { status: 500 });
  }
}
