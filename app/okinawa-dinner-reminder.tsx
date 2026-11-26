"use client";

import { useSettlementProgress } from "./settlement-progress";

export default function OkinawaDinnerReminder() {
  const status = useSettlementProgress("okinawaJapan", true, "itinerary-actions");
  const key = "2026-11-27-call-ko-chan-nov30-7adults-4kids-special-family";
  const yuinchiKey = "2026-11-27-call-yuinchi-dec3-5adults-1elementary-2toddlers";
  return (
    <div className="space-y-2 text-sm">
      <p className="text-xs uppercase tracking-wider text-[#9EDCFF]">Evening · Action item</p>
      <div className="flex items-start gap-3">
        <input type="checkbox" aria-label="Completed Yakiniku Ko-chan reservation call"
          checked={Boolean(status.progress[key])} disabled={!status.ready || status.pending !== null}
          onChange={(event) => void status.toggle(key, event.target.checked)}
          className="mt-1 h-4 w-4 shrink-0 accent-[#9EDCFF]" />
        <p className={status.progress[key] ? "text-white/50 line-through" : "text-white/85"}>
          Call <strong>Yakiniku Ko-chan directly at <a href="tel:+81980439820" className="text-[#9EDCFF] underline">+81 980-43-9820</a></strong> to make a Dinner Reservation for Nov 30, 7 adults + 4 kids, 1 Ko-Chan Special set + 1 Family set.
        </p>
      </div>
      <div className="flex items-start gap-3 border-t border-white/10 pt-3">
        <input type="checkbox" aria-label="Completed Yuinchi Hotel Nanjo dinner reservation call"
          checked={Boolean(status.progress[yuinchiKey])} disabled={!status.ready || status.pending !== null}
          onChange={(event) => void status.toggle(yuinchiKey, event.target.checked)}
          className="mt-1 h-4 w-4 shrink-0 accent-[#9EDCFF]" />
        <div className={status.progress[yuinchiKey] ? "space-y-2 text-white/50 line-through" : "space-y-2 text-white/85"}>
          <p>Call <strong>Wellness Resort Okinawa Yuinchi Hotel Nanjo <a href="tel:+81989470111" className="text-[#9EDCFF] underline">098-947-0111</a></strong> to book a dinner reservation for December 3.</p>
          <p>Confirmed bookings: 3745-8247-6491, 3745-8205-3357, 3745-8153-7713.</p>
          <p>5 adults + 1 elementary school child + 2 toddlers. Total 8 people.</p>
        </div>
      </div>
      {status.error && <p role="status" className="text-xs text-red-300">{status.error}</p>}
    </div>
  );
}