import { NextRequest, NextResponse } from "next/server";
import { deleteGoogleDriveFile, isGoogleDriveConfigured, uploadMemoryMakerFile } from "@/lib/google-drive";

export const runtime = "nodejs";

const VALID_ALBUMS = new Set(["taiwanNovember", "japanNovember", "taiwanDecember", "moroccoSeptember"]);
const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;

type MemoryMakerRow = {
  id: string;
  album_key: string;
  drive_file_id: string;
  file_name: string;
  mime_type: string;
  uploader: string;
  created_at: string;
};

function getSupabaseConfig() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return { url: url.replace(/\/$/, ""), key };
}

function unavailableResponse() {
  return NextResponse.json({ error: "Memory Maker storage is not configured yet." }, { status: 503 });
}

function serializeRow(row: MemoryMakerRow) {
  return {
    id: row.id,
    fileName: row.file_name,
    mimeType: row.mime_type,
    uploader: row.uploader,
    createdAt: row.created_at,
    mediaUrl: `/api/memory-maker/file/${row.drive_file_id}`,
  };
}

export async function GET(request: NextRequest) {
  const config = getSupabaseConfig();
  if (!config || !isGoogleDriveConfigured()) return unavailableResponse();
  const album = request.nextUrl.searchParams.get("album") || "";
  if (!VALID_ALBUMS.has(album)) return NextResponse.json({ error: "Unknown album." }, { status: 400 });

  const response = await fetch(
    `${config.url}/rest/v1/memory_maker_files?album_key=eq.${encodeURIComponent(album)}&select=id,album_key,drive_file_id,file_name,mime_type,uploader,created_at&order=created_at.desc`,
    {
      headers: { apikey: config.key, Authorization: `Bearer ${config.key}` },
      cache: "no-store",
    }
  );
  if (!response.ok) return NextResponse.json({ error: "Unable to load album." }, { status: 500 });
  const rows = await response.json() as MemoryMakerRow[];
  return NextResponse.json({ files: rows.map(serializeRow) });
}

export async function POST(request: NextRequest) {
  const config = getSupabaseConfig();
  if (!config || !isGoogleDriveConfigured()) return unavailableResponse();

  try {
    const formData = await request.formData();
    const album = typeof formData.get("album") === "string" ? String(formData.get("album")) : "";
    const albumName = typeof formData.get("albumName") === "string" ? String(formData.get("albumName")).trim() : "";
    const uploader = typeof formData.get("uploader") === "string" ? String(formData.get("uploader")).trim() : "Guest";
    const file = formData.get("file");

    if (!VALID_ALBUMS.has(album) || !albumName) return NextResponse.json({ error: "Unknown album." }, { status: 400 });
    if (!(file instanceof File)) return NextResponse.json({ error: "A photo is required." }, { status: 400 });
    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ error: "Only photos can be uploaded." }, { status: 400 });
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      return NextResponse.json({ error: "This file is larger than the current 4 MB website upload limit." }, { status: 413 });
    }

    const driveFile = await uploadMemoryMakerFile(file, album, albumName);
    const insertResponse = await fetch(`${config.url}/rest/v1/memory_maker_files`, {
      method: "POST",
      headers: {
        apikey: config.key,
        Authorization: `Bearer ${config.key}`,
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      body: JSON.stringify({
        album_key: album,
        drive_file_id: driveFile.id,
        file_name: driveFile.name,
        mime_type: driveFile.mimeType,
        file_size: driveFile.size ? Number(driveFile.size) : file.size,
        uploader: uploader || "Guest",
      }),
    });
    if (!insertResponse.ok) return NextResponse.json({ error: "The file uploaded, but its album record could not be saved." }, { status: 500 });
    const rows = await insertResponse.json() as MemoryMakerRow[];
    return NextResponse.json({ file: rows[0] ? serializeRow(rows[0]) : null });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to upload file." }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const config = getSupabaseConfig();
  if (!config || !isGoogleDriveConfigured()) return unavailableResponse();

  const body = await request.json().catch(() => ({}));
  const ids = Array.isArray(body.ids)
    ? body.ids.filter((id: unknown): id is string => typeof id === "string" && Boolean(id))
    : typeof body.id === "string" && body.id ? [body.id] : [];
  const album = typeof body.album === "string" ? body.album : "";
  const password = typeof body.password === "string" ? body.password : "";

  if (!process.env.SITE_PASSWORD) {
    return NextResponse.json({ error: "Administrator password is not configured." }, { status: 503 });
  }
  if (password !== process.env.SITE_PASSWORD) {
    return NextResponse.json({ error: "Incorrect administrator password." }, { status: 401 });
  }
  if (!ids.length || !VALID_ALBUMS.has(album)) {
    return NextResponse.json({ error: "Unknown photo." }, { status: 400 });
  }

  try {
    const lookupResponse = await fetch(
      `${config.url}/rest/v1/memory_maker_files?id=in.(${encodeURIComponent(ids.join(","))})&album_key=eq.${encodeURIComponent(album)}&select=id,drive_file_id`,
      {
        headers: { apikey: config.key, Authorization: `Bearer ${config.key}` },
        cache: "no-store",
      }
    );
    if (!lookupResponse.ok) return NextResponse.json({ error: "Unable to verify the photo." }, { status: 500 });
    const rows = await lookupResponse.json() as Array<{ id: string; drive_file_id: string }>;
    if (!rows.length) return NextResponse.json({ error: "Photos not found." }, { status: 404 });

    for (const row of rows) await deleteGoogleDriveFile(row.drive_file_id);
    const deleteResponse = await fetch(`${config.url}/rest/v1/memory_maker_files?id=in.(${encodeURIComponent(rows.map((row) => row.id).join(","))})`, {
      method: "DELETE",
      headers: {
        apikey: config.key,
        Authorization: `Bearer ${config.key}`,
      },
    });
    if (!deleteResponse.ok) {
      return NextResponse.json({ error: "The Drive photo was deleted, but its album record could not be removed." }, { status: 500 });
    }
    return NextResponse.json({ ok: true, deletedIds: rows.map((row) => row.id) });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to delete photo." }, { status: 500 });
  }
}
