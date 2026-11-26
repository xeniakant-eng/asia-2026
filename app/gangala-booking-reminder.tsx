"use client";

import { useSettlementProgress } from "./settlement-progress";

export default function GangalaBookingReminder() {
  const status = useSettlementProgress("okinawaJapan", true, "itinerary-actions");
  const key = "2026-11-30-book-gangala-dec3";
  return (
    <div className="space-y-2 text-sm">
      <label className="flex cursor-pointer items-start gap-3 text-white/85">
        <input type="checkbox" checked={Boolean(status.progress[key])}
          disabled={!status.ready || status.pending !== null}
          onChange={(event) => void status.toggle(key, event.target.checked)}
          className="mt-1 h-4 w-4 shrink-0 accent-[#9EDCFF]" />
        <span className={status.progress[key] ? "text-white/50 line-through" : ""}>Discuss and book reservation Gangala之谷 (December 3)</span>
      </label>
      {status.error && <p role="status" className="text-xs text-red-300">{status.error}</p>}
    </div>
  );
}