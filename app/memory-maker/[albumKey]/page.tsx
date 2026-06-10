"use client";

import { use, useCallback, useEffect, useRef, useState } from "react";

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
  moroccoSeptember: "Morocco",
};

export default function MemoryMakerAlbumPage({ params }: { params: Promise<{ albumKey: string }> }) {
  const { albumKey } = use(params);
  const [files, setFiles] = useState<MemoryMakerFile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isBulkWorking, setIsBulkWorking] = useState(false);
  const [activePhotoIndex, setActivePhotoIndex] = useState<number | null>(null);
  const [message, setMessage] = useState("");
  const touchStartX = useRef<number | null>(null);

  const loadFiles = useCallback(async () => {
    setIsLoading(true);
    setMessage("");
    try {
      const response = await fetch(`/api/memory-maker?album=${encodeURIComponent(albumKey)}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to load album.");
      setFiles(Array.isArray(data.files) ? data.files : []);
      setSelectedIds([]);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to load album.");
    } finally {
      setIsLoading(false);
    }
  }, [albumKey]);

  useEffect(() => {
    loadFiles();
  }, [loadFiles]);

  const showPreviousPhoto = useCallback(() => {
    setActivePhotoIndex((current) => current === null ? null : (current - 1 + files.length) % files.length);
  }, [files.length]);

  const showNextPhoto = useCallback(() => {
    setActivePhotoIndex((current) => current === null ? null : (current + 1) % files.length);
  }, [files.length]);

  useEffect(() => {
    if (activePhotoIndex === null) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setActivePhotoIndex(null);
      if (event.key === "ArrowLeft") showPreviousPhoto();
      if (event.key === "ArrowRight") showNextPhoto();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activePhotoIndex, showNextPhoto, showPreviousPhoto]);

  const albumName = ALBUM_NAMES[albumKey] || "Trip";
  const activePhoto = activePhotoIndex === null ? null : files[activePhotoIndex];
  const deletePhotos = async (ids: string[]) => {
    if (!ids.length || !window.confirm(`Delete ${ids.length === 1 ? "this photo" : `these ${ids.length} photos`} permanently from the shared album?`)) return;
    const password = window.prompt(`Enter the administrator password to delete ${ids.length === 1 ? "this photo" : "these photos"}:`);
    if (password === null) return;

    setIsBulkWorking(true);
    setMessage("");
    try {
      const response = await fetch("/api/memory-maker", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids, album: albumKey, password }),
      });
      const data = await response.json().catch(() => null) as { error?: string; deletedIds?: string[] } | null;
      if (!response.ok) throw new Error(data?.error || "Unable to delete photos.");
      const deletedIds = data?.deletedIds || ids;
      setFiles((currentFiles) => currentFiles.filter((currentFile) => !deletedIds.includes(currentFile.id)));
      setSelectedIds((currentIds) => currentIds.filter((id) => !deletedIds.includes(id)));
      setMessage(`${deletedIds.length} ${deletedIds.length === 1 ? "photo" : "photos"} deleted.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to delete photos.");
    } finally {
      setIsBulkWorking(false);
    }
  };

  const downloadSelectedPhotos = async () => {
    const selectedFiles = files.filter((file) => selectedIds.includes(file.id));
    if (!selectedFiles.length) return;
    setIsBulkWorking(true);
    setMessage(`Preparing ${selectedFiles.length} ${selectedFiles.length === 1 ? "photo" : "photos"} for download...`);
    try {
      const preparedFiles: File[] = [];
      for (const file of selectedFiles) {
        const response = await fetch(file.mediaUrl);
        if (!response.ok) throw new Error(`Unable to prepare ${file.fileName}.`);
        const blob = await response.blob();
        preparedFiles.push(new File([blob], file.fileName || "photo.jpg", { type: blob.type || file.mimeType || "image/jpeg" }));
      }

      if (navigator.canShare?.({ files: preparedFiles })) {
        await navigator.share({ files: preparedFiles, title: `${albumName} Memories` });
        setMessage(`Choose "Save Images" in the share menu to add ${preparedFiles.length === 1 ? "this photo" : "these photos"} to your photo library.`);
        return;
      }

      for (const file of preparedFiles) {
        const blobUrl = URL.createObjectURL(file);
        const link = document.createElement("a");
        link.href = blobUrl;
        link.download = file.name;
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
        await new Promise((resolve) => window.setTimeout(resolve, 250));
      }
      setMessage(`${preparedFiles.length} ${preparedFiles.length === 1 ? "photo" : "photos"} downloaded.`);
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        setMessage("Save / Share cancelled.");
        return;
      }
      setMessage(error instanceof Error ? error.message : "Unable to download selected photos.");
    } finally {
      setIsBulkWorking(false);
    }
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
          </div>
        </div>

        {message && <p className="rounded-2xl border border-red-300/20 bg-red-300/5 px-4 py-4 text-sm text-red-100/75">{message}</p>}
        {!message && isLoading && <p className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-8 text-center text-sm text-white/40">Loading album...</p>}
        {!message && !isLoading && !files.length && <p className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-8 text-center text-sm leading-6 text-white/40">No memories uploaded yet. Photos shared from the trip dashboard or itinerary will appear here.</p>}

        {!isLoading && files.length > 0 && (
          <div className="mb-5 flex flex-wrap items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-3">
            <label className="flex cursor-pointer items-center gap-2 px-2 text-xs uppercase tracking-[0.14em] text-white/55"><input type="checkbox" checked={selectedIds.length === files.length} onChange={(event) => setSelectedIds(event.target.checked ? files.map((file) => file.id) : [])} className="h-4 w-4 accent-[#72E49A]" />Select all</label>
            <span className="text-xs text-white/35">{selectedIds.length} selected</span>
            <div className="ml-auto flex gap-2">
              <button type="button" onClick={downloadSelectedPhotos} disabled={!selectedIds.length || isBulkWorking} className="rounded-full border border-white/20 px-4 py-2 text-xs uppercase tracking-[0.14em] text-white/65 transition hover:border-white/40 disabled:cursor-not-allowed disabled:opacity-30">Save / Download</button>
              <button type="button" onClick={() => deletePhotos(selectedIds)} disabled={!selectedIds.length || isBulkWorking} className="rounded-full border border-red-300/20 px-4 py-2 text-xs uppercase tracking-[0.14em] text-red-200/65 transition hover:border-red-300/45 disabled:cursor-not-allowed disabled:opacity-30">Delete</button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
          {files.map((file) => (
            <figure key={file.id} className={`relative overflow-hidden rounded-2xl border bg-white/[0.03] ${selectedIds.includes(file.id) ? "border-[#72E49A]/70" : "border-white/10"}`}>
              <button type="button" onClick={() => setActivePhotoIndex(files.findIndex((candidate) => candidate.id === file.id))} className="block w-full"><img src={file.mediaUrl} alt={file.fileName} loading="lazy" className="aspect-square w-full object-cover transition hover:opacity-85" /></button>
              <figcaption className="p-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="min-w-0 truncate text-[10px] text-white/35">{file.uploader}</p>
                  <label className="flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-full border border-white/20 bg-black/30"><input type="checkbox" checked={selectedIds.includes(file.id)} onChange={(event) => setSelectedIds((current) => event.target.checked ? [...current, file.id] : current.filter((id) => id !== file.id))} className="h-4 w-4 accent-[#72E49A]" aria-label={`Select photo uploaded by ${file.uploader}`} /></label>
                </div>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
      {activePhoto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 p-3 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label={`Photo ${activePhotoIndex! + 1} of ${files.length}`}>
          <button type="button" onClick={() => setActivePhotoIndex(null)} aria-label="Close photo viewer" title="Close" className="absolute right-4 top-4 z-20 flex h-11 w-11 items-center justify-center rounded-full border border-white/20 bg-black/50 text-2xl text-white/75 transition hover:border-white/45 hover:text-white">×</button>
          {files.length > 1 && <button type="button" onClick={showPreviousPhoto} aria-label="Previous photo" title="Previous photo" className="absolute left-3 top-1/2 z-20 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-black/50 text-3xl text-white/75 transition hover:border-white/45 hover:text-white md:left-6">‹</button>}
          <div className="flex h-full w-full flex-col items-center justify-center gap-4" onTouchStart={(event) => { touchStartX.current = event.touches[0]?.clientX ?? null; }} onTouchEnd={(event) => { if (touchStartX.current === null) return; const distance = event.changedTouches[0].clientX - touchStartX.current; if (Math.abs(distance) > 50) { if (distance > 0) showPreviousPhoto(); else showNextPhoto(); } touchStartX.current = null; }}>
            <img src={activePhoto.mediaUrl} alt={activePhoto.fileName} className="max-h-[84vh] max-w-full object-contain" />
            <p className="text-xs uppercase tracking-[0.2em] text-white/45">{activePhotoIndex! + 1} / {files.length} · {activePhoto.uploader}</p>
          </div>
          {files.length > 1 && <button type="button" onClick={showNextPhoto} aria-label="Next photo" title="Next photo" className="absolute right-3 top-1/2 z-20 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-black/50 text-3xl text-white/75 transition hover:border-white/45 hover:text-white md:right-6">›</button>}
        </div>
      )}
    </main>
  );
}
