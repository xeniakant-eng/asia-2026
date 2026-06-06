"use client";

import { use, useCallback, useEffect, useState } from "react";

type MemoryMakerFile = {
  id: string;
  fileName: string;
  mimeType: string;
  uploader: string;
  createdAt: string;
  mediaUrl: string;
};

const ALBUM_NAMES: Record<string, string> = {
  taiwanNovember: "Taiwan November",
  japanNovember: "Japan November",
  taiwanDecember: "Taiwan December",
};

export default function MemoryMakerAlbumPage({ params }: { params: Promise<{ albumKey: string }> }) {
  const { albumKey } = use(params);
  const [files, setFiles] = useState<MemoryMakerFile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deletingId, setDeletingId] = useState("");
  const [message, setMessage] = useState("");

  const loadFiles = useCallback(async () => {
    setIsLoading(true);
    setMessage("");
    try {
      const response = await fetch(`/api/memory-maker?album=${encodeURIComponent(albumKey)}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to load album.");
      setFiles(Array.isArray(data.files) ? data.files : []);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to load album.");
    } finally {
      setIsLoading(false);
    }
  }, [albumKey]);

  useEffect(() => {
    loadFiles();
  }, [loadFiles]);

  const albumName = ALBUM_NAMES[albumKey] || "Trip";
  const deletePhoto = async (file: MemoryMakerFile) => {
    if (!window.confirm("Delete this photo permanently from the shared album?")) return;
    const password = window.prompt("Enter the administrator password to delete this photo:");
    if (password === null) return;

    setDeletingId(file.id);
    setMessage("");
    try {
      const response = await fetch("/api/memory-maker", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: file.id, album: albumKey, password }),
      });
      const data = await response.json().catch(() => null) as { error?: string } | null;
      if (!response.ok) throw new Error(data?.error || "Unable to delete photo.");
      setFiles((currentFiles) => currentFiles.filter((currentFile) => currentFile.id !== file.id));
      setMessage("Photo deleted.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to delete photo.");
    } finally {
      setDeletingId("");
    }
  };

  const closeAlbum = () => {
    const searchParams = new URLSearchParams(window.location.search);
    const returnChapter = searchParams.get("returnChapter") || albumKey;
    const guest = searchParams.get("guest") || "Guest";
    window.location.replace(`/?chapter=${encodeURIComponent(returnChapter)}&guest=${encodeURIComponent(guest)}`);
  };

  return (
    <main className="min-h-screen bg-black px-5 py-8 text-white md:px-10 md:py-12">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex flex-col gap-5 border-b border-white/10 pb-7 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="mb-2 text-xs uppercase tracking-[0.3em] text-[#72E49A]">Memory Maker</p>
            <h1 className="text-3xl font-light tracking-wide md:text-5xl">{albumName} Memories</h1>
            <p className="mt-3 text-sm text-white/45">{albumName} · {files.length} {files.length === 1 ? "memory" : "memories"}</p>
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={loadFiles} disabled={isLoading} className="rounded-full border border-white/20 bg-white/[0.04] px-5 py-3 text-xs uppercase tracking-[0.18em] text-white/70 transition hover:border-white/40 hover:bg-white/[0.08] disabled:cursor-wait disabled:opacity-50">Refresh</button>
            <button type="button" onClick={closeAlbum} className="rounded-full border border-white/20 bg-white/[0.04] px-5 py-3 text-xs uppercase tracking-[0.18em] text-white/70 transition hover:border-white/40 hover:bg-white/[0.08]">Close</button>
          </div>
        </div>

        {message && <p className="rounded-2xl border border-red-300/20 bg-red-300/5 px-4 py-4 text-sm text-red-100/75">{message}</p>}
        {!message && isLoading && <p className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-8 text-center text-sm text-white/40">Loading album...</p>}
        {!message && !isLoading && !files.length && <p className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-8 text-center text-sm text-white/40">No memories uploaded yet.</p>}

        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
          {files.map((file) => (
            <figure key={file.id} className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03]">
              <a href={file.mediaUrl} target="_blank" rel="noopener noreferrer"><img src={file.mediaUrl} alt={file.fileName} loading="lazy" className="aspect-square w-full object-cover transition hover:opacity-85" /></a>
              <figcaption className="p-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="min-w-0 truncate text-[10px] text-white/35">{file.uploader}</p>
                  <button type="button" onClick={() => deletePhoto(file)} disabled={Boolean(deletingId)} className="shrink-0 text-[10px] uppercase tracking-[0.14em] text-red-200/45 transition hover:text-red-200 disabled:cursor-wait disabled:opacity-30">{deletingId === file.id ? "Deleting..." : "Delete"}</button>
                </div>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </main>
  );
}
