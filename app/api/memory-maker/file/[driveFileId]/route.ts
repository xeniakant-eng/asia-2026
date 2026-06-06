import { NextRequest, NextResponse } from "next/server";
import { downloadGoogleDriveFile, isGoogleDriveConfigured } from "@/lib/google-drive";

export const runtime = "nodejs";

function getSupabaseConfig() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return { url: url.replace(/\/$/, ""), key };
}

export async function GET(request: NextRequest, context: { params: Promise<{ driveFileId: string }> }) {
  const config = getSupabaseConfig();
  if (!config || !isGoogleDriveConfigured()) return NextResponse.json({ error: "Memory Maker storage is not configured." }, { status: 503 });
  const { driveFileId } = await context.params;

  const metadataResponse = await fetch(
    `${config.url}/rest/v1/memory_maker_files?drive_file_id=eq.${encodeURIComponent(driveFileId)}&select=id&limit=1`,
    {
      headers: { apikey: config.key, Authorization: `Bearer ${config.key}` },
      cache: "no-store",
    }
  );
  if (!metadataResponse.ok) return NextResponse.json({ error: "Unable to verify media." }, { status: 500 });
  const metadata = await metadataResponse.json() as Array<{ id: string }>;
  if (!metadata.length) return NextResponse.json({ error: "Media not found." }, { status: 404 });

  const response = await downloadGoogleDriveFile(driveFileId, request.headers.get("range"));
  if (!response.ok && response.status !== 206) {
    return NextResponse.json({ error: "Unable to load media." }, { status: response.status });
  }

  const headers = new Headers();
  for (const name of ["content-type", "content-length", "content-range", "accept-ranges"]) {
    const value = response.headers.get(name);
    if (value) headers.set(name, value);
  }
  headers.set("Cache-Control", "private, max-age=3600");
  return new NextResponse(response.body, { status: response.status, headers });
}
