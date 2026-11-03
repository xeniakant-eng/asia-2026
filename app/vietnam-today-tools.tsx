"use client";

import { useEffect, useState } from "react";
import VietnamWeather from "./vietnam-weather";

type Day = { dateKey: string; date: string; title: string; location: string; items: readonly string[]; stay?: string };
type Announcement = { id: string; message: string; author?: string; canManage: boolean };
const endpoint = "/api/vietnam-announcements";
const buttonClass = "rounded-lg border border-[#F6C65B]/35 px-3 py-2 text-sm text-[#F6C65B] disabled:opacity-40";

function saveDay(day: Day, address?: string) {
  const escape = (text: string) => text.replace(/[&<>]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[char]!);
  const heading = escape(day.title);
  const saved = escape(new Date().toLocaleString());
  const html = `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${heading}</title>
<style>body{font:1rem/1.55 system-ui,sans-serif;background:#faf6ea;color:#242018;max-width:36rem;margin:auto;padding:1.25rem}li{margin-bottom:.6rem}small{color:#5b5141}</style>
<main><small>Vietnam 2026 · ${escape(day.date)} · ${escape(day.location)}</small><h1>${heading}</h1>
<ul>${day.items.map((item) => `<li>${escape(item)}</li>`).join("")}</ul>
${day.stay ? `<h2>Tonight’s stay</h2><p>${escape(day.stay)}</p>` : ""}
${address && !day.stay?.includes(address) ? `<p>${escape(address)}</p>` : ""}
<small>Saved ${saved}. Open the trip site when online to check for changes.</small></main></html>`;
  const url = URL.createObjectURL(new Blob([html], { type: "text/html;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = `vietnam-${day.dateKey}.html`;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

export function SaveVietnamDayButton({ day, address }: { day: Day; address?: string }) {
  return <button type="button" className={buttonClass + " shrink-0 max-w-[8rem] leading-tight sm:max-w-none"} onClick={() => saveDay(day, address)}>Save Today Offline</button>;
}

export default function VietnamTodayTools({ day, party }: { day: Day; party: string }) {
  return (
    <div className="mb-4 space-y-3">
      <VietnamWeather key={day.dateKey} location={day.location} date={day.dateKey} />
      <Announcements key={day.dateKey + party} day={day.dateKey} party={party} />
    </div>
  );
}

function ownerHeader() {
  const key = "vietnam-announcement-owner";
  const owner = localStorage.getItem(key) || crypto.randomUUID();
  localStorage.setItem(key, owner);
  return { "x-announcement-owner": owner };
}

function Announcements({ day, party }: { day: string; party: string }) {
  const [updates, setUpdates] = useState<Announcement[]>([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    async function refresh() {
      try {
        const response = await fetch(endpoint + "?day=" + encodeURIComponent(day), { signal: controller.signal, headers: ownerHeader() });
        if (!response.ok) throw new Error();
        const result: Announcement[] = await response.json();
        if (!controller.signal.aborted) setUpdates(result);
      } catch {
        if (!controller.signal.aborted) setError("Could not load announcements. Try refreshing.");
      }
    }
    void refresh();
    const timer = window.setInterval(() => void refresh(), 15_000);
    return () => { controller.abort(); window.clearInterval(timer); };
  }, [day, revision]);

  async function send(body: { action: "post"; message: string } | { action: "delete"; id: string }) {
    setBusy(true);
    setError("");
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...ownerHeader() },
        body: JSON.stringify({ ...body, day, party }),
      });
      if (!response.ok) throw new Error();
      if (body.action === "post") setMessage("");
      setRevision((value) => value + 1);
    } catch {
      setError("Could not save. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section aria-label="Bulletin Board" className="space-y-3 rounded-xl border border-white/15 bg-white/[0.04] p-4">
      <h3 className="text-sm font-semibold text-[#F6C65B]">Bulletin Board</h3>
      {error && <p role="status" className="text-sm text-red-300">{error}</p>}
      {!updates.length && <p className="text-sm text-white/65">No updates for this day.</p>}
      {updates.map((update) => (
        <article key={update.id} className="space-y-2 border-b border-white/10 pb-3">
          {update.author && <p className="text-xs font-semibold text-white/65">{update.author}</p>}
          <p className="whitespace-pre-wrap break-words text-sm text-white">{update.message}</p>
          {update.canManage && (
            <div className="flex gap-2">
              <button type="button" className={buttonClass} disabled={busy} onClick={() => {
                if (window.confirm("Delete this announcement?")) void send({ action: "delete", id: update.id });
              }}>Delete</button>
            </div>
          )}
        </article>
      ))}

        <form className="mt-3 space-y-2" onSubmit={(event) => { event.preventDefault(); void send({ action: "post", message }); }}>
          <textarea id="vietnam-update" aria-label="Announcement message" value={message} onChange={(event) => setMessage(event.target.value)} maxLength={500} required rows={3} className="w-full rounded-lg border border-white/15 bg-black/40 p-2 text-sm text-white" />
          <button className={buttonClass} disabled={busy || !message.trim()}>Post update</button>
        </form>

    </section>
  );
}