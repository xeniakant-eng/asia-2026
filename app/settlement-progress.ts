"use client";

import { useEffect, useState } from "react";

export function useSettlementProgress(trip: string, open: boolean, namespace = "billtab-settlements") {
  const [progress, setProgress] = useState<Record<string, boolean>>({});
  const [pending, setPending] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const guest = namespace + ":" + trip;

  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    setReady(false);
    setProgress({});
    setError("");
    async function load() {
      try {
        const response = await fetch("/api/checklist-progress?guest=" + encodeURIComponent(guest), {
          signal: controller.signal, cache: "no-store",
        });
        if (!response.ok) throw new Error();
        const data = await response.json();
        if (!controller.signal.aborted) {
          setProgress(data.progress);
          setReady(true);
        }
      } catch {
        if (!controller.signal.aborted) setError("Could not load settlement status. Close and reopen the summary to retry.");
      }
    }
    void load();
    return () => controller.abort();
  }, [guest, open]);

  async function toggle(key: string, checked: boolean) {
    setPending(key);
    setError("");
    try {
      const response = await fetch("/api/checklist-progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ guest, itemKey: key, checked }),
      });
      if (!response.ok) throw new Error();
      setProgress((current) => ({ ...current, [key]: checked }));
    } catch {
      setError("Could not save settlement status. Please try again.");
    } finally {
      setPending(null);
    }
  }

  return { progress, pending, ready, error, toggle };
}