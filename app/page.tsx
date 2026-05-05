"use client";
import React, { useEffect, useMemo, useState } from "react";

const MS_PER_DAY = 1000 * 60 * 60 * 24;

function buildDateRange(start, end) {
  const dates = [];
  const current = new Date(start);

  while (current <= end) {
    dates.push(new Date(current));
    current.setDate(current.getDate() + 1);
  }

  return dates;
}

function getTimelinePercent(targetDate, timelineStart, timelineEnd) {
  const totalDays = (timelineEnd.getTime() - timelineStart.getTime()) / MS_PER_DAY;
  const dayOffset = (targetDate.getTime() - timelineStart.getTime()) / MS_PER_DAY;
  return (dayOffset / totalDays) * 100;
}

function Pin({ id, label, x, y, hovered, setHovered, leaveTo = null, activeColor, onClick }) {
  return (
    <div
      className="absolute z-30 -translate-x-1/2 -translate-y-1/2"
      style={{ left: `${x}%`, top: `${y}%` }}
      onMouseEnter={(event) => {
        event.stopPropagation();
        setHovered(id);
      }}
      onMouseLeave={(event) => {
        event.stopPropagation();
        setHovered(leaveTo);
      }}
    >
      {hovered === id && (
        <div
          className="pointer-events-none absolute left-1/2 top-0 z-40 whitespace-nowrap rounded-full border border-white/30 bg-black/80 px-3 py-1 text-xs text-white backdrop-blur-md"
          style={{ transform: "translate(-50%, -135%)" }}
        >
          {label}
        </div>
      )}

      <button
        type="button"
        aria-label={label}
        onClick={onClick}
        className="relative h-5 w-5 rounded-full bg-transparent"
      >
        <span
          className="absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full"
          style={{ backgroundColor: hovered === id ? (activeColor || "white") : "white" }}
        />
      </button>
    </div>
  );
}

export default function TravelSite() {
  const [hovered, setHovered] = useState(null);
  const [page, setPage] = useState("map");
  const [usdToJpy, setUsdToJpy] = useState("150");
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    async function fetchExchangeRate() {
      try {
        const response = await fetch("https://open.er-api.com/v6/latest/USD");
        const data = await response.json();

        if (data?.rates?.JPY) {
          setUsdToJpy(Math.round(data.rates.JPY).toString());
        }
      } catch (error) {
        console.warn("Unable to fetch USD to JPY exchange rate. Using fallback.", error);
      }
    }

    fetchExchangeRate();
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNow(new Date());
    }, 1000);

    return () => window.clearInterval(timer);
  }, []);

  const timelineStart = useMemo(() => new Date(2026, 10, 20), []);
  const timelineEnd = useMemo(() => new Date(2026, 11, 31), []);
  const dates = useMemo(() => buildDateRange(timelineStart, timelineEnd), [timelineStart, timelineEnd]);

  const xiaoliuqiuStart = getTimelinePercent(new Date(2026, 10, 20), timelineStart, timelineEnd);
  const xiaoliuqiuEnd = getTimelinePercent(new Date(2026, 10, 23), timelineStart, timelineEnd);
  const onnaStart = getTimelinePercent(new Date(2026, 10, 27), timelineStart, timelineEnd);
  const onnaEnd = getTimelinePercent(new Date(2026, 10, 30), timelineStart, timelineEnd);
  const nagoStart = getTimelinePercent(new Date(2026, 10, 30), timelineStart, timelineEnd);
  const nagoEnd = getTimelinePercent(new Date(2026, 11, 2), timelineStart, timelineEnd);
  const nanjoStart = getTimelinePercent(new Date(2026, 11, 2), timelineStart, timelineEnd);
  const nanjoEnd = getTimelinePercent(new Date(2026, 11, 4), timelineStart, timelineEnd);
  const nahaStart = getTimelinePercent(new Date(2026, 11, 4), timelineStart, timelineEnd);
  const nahaEnd = getTimelinePercent(new Date(2026, 11, 6), timelineStart, timelineEnd);
  const okinawaStart = getTimelinePercent(new Date(2026, 10, 27), timelineStart, timelineEnd);
  const okinawaEnd = getTimelinePercent(new Date(2026, 11, 6), timelineStart, timelineEnd);
  const BABY_BLUE = "#9EDCFF";
  const BABY_BLUE_SHADOW = "0 0 12px rgba(158,220,255,0.9)";

  const isOkinawaIslandHover = hovered === "okinawa";
  const isOnnaHover = hovered === "onna";
  const isNagoHover = hovered === "nago";
  const isNanjoHover = hovered === "nanjo";
  const isNahaHover = hovered === "naha";
  const showFullOkinawaTimeline = isOkinawaIslandHover;

  const departureDate = new Date(2026, 10, 19, 0, 0, 0);
  const countdownMs = Math.max(departureDate.getTime() - now.getTime(), 0);
  const countdownDays = Math.floor(countdownMs / MS_PER_DAY);
  const countdownHours = Math.floor((countdownMs % MS_PER_DAY) / (1000 * 60 * 60));
  const countdownMinutes = Math.floor((countdownMs % (1000 * 60 * 60)) / (1000 * 60));
  const countdownSeconds = Math.floor((countdownMs % (1000 * 60)) / 1000);

  if (page === "overlap") {
    return (
      <div className="min-h-screen bg-black px-6 py-10 text-white">
        <button
          type="button"
          onClick={() => setPage("map")}
          className="mb-10 rounded-full border border-white/30 px-4 py-2 text-sm text-white/80 transition hover:border-white hover:text-white"
        >
          ← Back to Map
        </button>

        <main className="mx-auto max-w-5xl">
          <p className="mb-3 text-sm uppercase tracking-[0.35em] text-[#9EDCFF]">Group</p>
          <h1 className="mb-10 text-4xl font-light tracking-wide md:text-6xl">Overlap Timeline</h1>

          <div className="space-y-6">
            {[
              { name: "Anthony", segments: [["Nov 20","Nov 25"]] },
              { name: "Xenia", segments: [["Nov 20","Dec 6"],["Dec 8","Feb 3"]] },
              { name: "Dave", segments: [["Nov 27","Dec 24"]] },
              { name: "Mark", segments: [["Nov 20","Nov 30"]] },
              { name: "Steven", segments: [["Nov 25","Dec 6"]] },
              { name: "Julie", segments: [["Dec 8","Dec 17"]] },
            ].map((person) => (
              <div key={person.name} className="space-y-2">
                <p className="text-sm text-white/80">{person.name}</p>
                <div className="relative h-4 w-full rounded-full bg-white/10">
                  {person.segments.map((seg, i) => (
                    <div
                      key={i}
                      className="absolute top-0 h-4 rounded-full"
                      style={{
                        left: `${Math.random()*20}%`,
                        width: `${40 + Math.random()*30}%`,
                        backgroundColor: "#9EDCFF",
                      }}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </main>
      </div>
    );
  }

  if (page === "onna") {
    return (
      <div className="min-h-screen bg-black px-6 py-10 text-white">
        <button
          type="button"
          onClick={() => setPage("map")}
          className="mb-10 rounded-full border border-white/30 px-4 py-2 text-sm text-white/80 transition hover:border-white hover:text-white"
        >
          ← Back to Map
        </button>

        <main className="mx-auto max-w-4xl">
          <p className="mb-3 text-sm uppercase tracking-[0.35em] text-[#9EDCFF]">Okinawa · Onna</p>
          <h1 className="mb-6 text-4xl font-light tracking-wide md:text-6xl">Wedding Resort Chapter</h1>

          {/* Quick Info */}
          <section className="mb-10 grid gap-4 md:grid-cols-5">
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-center">
              <p className="mb-2 text-2xl">💴</p>
              <p className="text-xs text-gray-400">Currency</p>
              <p className="mt-1 text-sm font-medium">JPY ¥</p>
              <p className="mt-1 text-xs text-gray-400">1 USD ≈ {usdToJpy} JPY</p>
              <p className="mt-1 text-[9px] text-gray-500">Live rate · fallback 150</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-center">
              <p className="mb-2 text-2xl">🌤️</p>
              <p className="text-xs text-gray-400">November Temp</p>
              <p className="mt-1 text-sm font-medium">22–26°C</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-center">
              <p className="mb-2 text-2xl">🕘</p>
              <p className="text-xs text-gray-400">Time Zone</p>
              <p className="mt-1 text-sm font-medium">JST (UTC+9)</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-center">
              <p className="mb-2 text-2xl">🌙</p>
              <p className="text-xs text-gray-400">Nights</p>
              <p className="mt-1 text-sm font-medium">3 Nights</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-center">
              <p className="mb-2 text-2xl">🏨</p>
              <p className="text-xs text-gray-400">Hotel</p>
              <a
                href="https://www.hotelmonterey.co.jp/en/okinawa/"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1 block text-sm font-medium text-[#9EDCFF] hover:underline"
              >
                Hotel Monterey Okinawa
              </a>
            </div>
          </section>

          <section className="space-y-8">
            <article className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur-md">
              <p className="mb-2 text-sm text-[#9EDCFF]">Friday, November 27, 2026</p>
              <h2 className="mb-5 text-2xl font-light">Morning Arrival · Naha → Onna</h2>
              <div className="space-y-3 text-sm leading-7 text-white/75">
                <p>✈ EVA Air BR112 · Arrive 9:15 AM at Naha Airport</p>
                <p>🚗 Pick up rental car, Rental Company TBD</p>
                <p>🕛 Lunch at Senaga Island / Umikaji Terrace if weather is good and flight is on time.</p>
                <p>MKCafe → ocean view, plane takeoffs/landings, and Mackerel Bitter Melon Burger 鯖魚苦瓜漢堡.</p>

              </div>

              <div className="mt-6 grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl border border-white/10 p-4">
                  <h3 className="mb-2 text-sm font-semibold text-white">Option 1 · Indoor / Easy Day</h3>
                  <p className="text-sm leading-6 text-white/65">Parco City shopping centre with indoor toddler facilities. Afternoon tea / dessert and stroll at 港川外人住宅 Minatogawa State Side Town, including Beans Store & Canele dessert.</p>
                </div>
                <div className="rounded-2xl border border-white/10 p-4">
                  <h3 className="mb-2 text-sm font-semibold text-white">Option 2 · Good Weather</h3>
                  <p className="text-sm leading-6 text-white/65">Araha Beach Park playground if the weather is nice.</p>
                </div>
              </div>

              <p className="mt-5 text-sm leading-7 text-white/75">Aeon Mall Rycom for essentials and indoor play centre as rain backup. Drive to resort, around 45 minutes.</p>
            </article>

            <article className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur-md">
              <p className="mb-2 text-sm text-[#9EDCFF]">Saturday, November 28, 2026</p>
              <h2 className="mb-5 text-2xl font-light">Resort Day · Beach / Culture / Blue Cave</h2>
              <div className="space-y-3 text-sm leading-7 text-white/75">
                <p>Breakfast · Hotel buffet</p>
                <p>Option 1 · Resort & beach activities</p>
                <p>Option 2 · Ryukyu Mura with FunPass</p>
                <p>Option 3 · Blue Cave dive / snorkel 青之洞窟潛水 if weather permits</p>
                <div className="flex flex-wrap gap-2 pt-2 text-xs">
                  <a className="rounded-full border border-white/20 px-3 py-1 text-[#9EDCFF]" href="https://tw.blue-cave.org/about-bluecave/" target="_blank" rel="noopener noreferrer">Blue Cave</a>
                  <a className="rounded-full border border-white/20 px-3 py-1 text-[#9EDCFF]" href="https://www.alohadiversokinawa.com/blue-cave-okinawa" target="_blank" rel="noopener noreferrer">Aloha Divers</a>
                  <a className="rounded-full border border-white/20 px-3 py-1 text-[#9EDCFF]" href="https://blue-cave.okinawa/" target="_blank" rel="noopener noreferrer">blue-cave.okinawa</a>
                  <a className="rounded-full border border-white/20 px-3 py-1 text-[#9EDCFF]" href="https://www.bestdiveokinawa.com/boatandbeach/" target="_blank" rel="noopener noreferrer">Best Dive Okinawa</a>
                </div>
                <p>Afternoon · Resort free time</p>
                <p>Dinner · TBD</p>
              </div>
            </article>

            <article className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur-md">
              <p className="mb-2 text-sm text-[#9EDCFF]">Sunday, November 29, 2026</p>
              <h2 className="mb-5 text-2xl font-light">Albert & Quinn Wedding Day</h2>
              <div className="space-y-3 text-sm leading-7 text-white/75">
                <p>Breakfast · Hotel buffet</p>
                <p>💍 Albert & Quinn Wedding at Hotel Monterey Okinawa Spa & Resort</p>
              </div>
            </article>
          </section>

          {/* Who's Joining */}
          <section className="mt-12">
            <h2 className="mb-4 text-2xl font-light">Who's Joining Us Here</h2>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                <p className="text-sm font-medium text-white">Xenia's Family</p>
                <p className="text-xs text-gray-400">Nov 27 – Dec 6 · Okinawa</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                <p className="text-sm font-medium text-white">Dave's Family</p>
                <p className="text-xs text-gray-400">Nov 27 – Dec 6 · Okinawa</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                <p className="text-sm font-medium text-white">Steven</p>
                <p className="text-xs text-gray-400">Nov 25 – Dec 6 · Okinawa</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                <p className="text-sm font-medium text-white">Mark</p>
                <p className="text-xs text-gray-400">Nov 25 – Nov 30 · Okinawa</p>
              </div>
            </div>
          </section>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <section className="relative flex h-[90vh] items-center justify-center overflow-hidden px-6">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.06),transparent_55%)]" />

        <div className="relative z-10 flex w-full max-w-5xl items-center justify-center gap-10 md:gap-20">
          <div className="relative h-[426px] w-[208px] md:h-[495px] md:w-[243px]">
            <svg
              viewBox="0 0 140 260"
              className="h-full w-full object-contain opacity-90"
              fill="none"
              stroke="white"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M110 0 L105 0 L94 12 L80 16 L69 24 L58 47 L47 57 L29 90 L10 117 L8 147 L0 173 L10 181 L16 205 L21 213 L43 230 L48 242 L47 254 L50 259 L61 254 L62 227 L68 210 L84 193 L98 163 L107 132 L113 96 L130 61 L127 36 L139 24 L134 15 L120 10 Z" />
            </svg>

            <Pin id="taipei" label="Taipei" x={77} y={9} hovered={hovered} setHovered={setHovered} />
            <Pin id="xiaoliuqiu" label="Xiaoliuqiu" x={28} y={90} hovered={hovered} setHovered={setHovered} />
            <Pin id="yilan" label="Yilan" x={86} y={20} hovered={hovered} setHovered={setHovered} />
          </div>

          <div
            className="relative h-[250px] w-[250px] md:h-[305px] md:w-[305px] cursor-pointer"
            style={{ transform: "translateY(-5.5rem)" }}
            onMouseEnter={() => setHovered("okinawa")}
            onMouseLeave={() => setHovered(null)}
            onClick={() => setPage("onna")}
          >
            <svg
              viewBox="0 0 331 520"
              className="h-full w-full object-contain"
              fill="none"
              stroke={isOkinawaIslandHover ? BABY_BLUE : "white"}
              strokeWidth={isOkinawaIslandHover ? 4 : 3}
              style={{ opacity: isOkinawaIslandHover ? 1 : 0.9, filter: isOkinawaIslandHover ? "drop-shadow(0 0 10px rgba(158,220,255,0.9))" : "none" }}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M291 5 L282 5 L280 12 L283 27 L277 42 L262 65 L257 79 L251 83 L242 82 L239 85 L238 90 L243 93 L243 97 L237 105 L223 112 L216 127 L222 134 L213 135 L212 144 L209 147 L196 150 L192 156 L180 154 L177 160 L169 160 L162 154 L164 149 L173 147 L181 151 L185 145 L176 133 L167 132 L167 125 L154 124 L142 115 L130 115 L121 120 L113 118 L106 120 L104 136 L111 144 L108 157 L110 173 L120 186 L134 182 L141 189 L158 192 L159 204 L124 235 L120 235 L115 244 L108 240 L99 244 L89 264 L80 273 L74 287 L62 285 L53 293 L40 288 L35 291 L36 314 L54 350 L53 358 L60 367 L60 377 L52 380 L47 389 L36 391 L27 407 L19 405 L17 418 L20 426 L8 425 L5 431 L4 441 L10 448 L10 456 L19 465 L19 468 L15 470 L15 479 L20 486 L19 507 L23 514 L32 516 L41 509 L51 507 L69 484 L85 479 L89 470 L103 459 L103 450 L97 438 L92 435 L85 437 L79 449 L68 431 L79 420 L80 408 L84 400 L94 391 L90 379 L97 374 L98 369 L107 367 L102 355 L112 346 L120 361 L132 374 L140 372 L139 361 L118 333 L115 321 L108 318 L95 298 L99 294 L99 289 L111 279 L138 279 L141 284 L147 282 L150 278 L149 272 L153 269 L162 269 L175 254 L172 245 L174 240 L182 241 L194 232 L196 224 L192 217 L195 214 L221 219 L229 211 L237 209 L240 204 L239 199 L245 189 L237 183 L236 179 L244 164 L253 161 L266 166 L277 159 L286 157 L290 153 L292 142 L304 129 L311 105 L325 84 L322 73 L327 59 L322 50 L320 35 L309 24 L310 18 L298 13 Z" />
            </svg>

            <Pin id="naha" label="Naha" x={24} y={84} hovered={hovered} setHovered={setHovered} leaveTo="okinawa" activeColor={BABY_BLUE} />
            <Pin id="onna" label="Onna" x={30} y={60} hovered={hovered} setHovered={setHovered} leaveTo="okinawa" activeColor={BABY_BLUE} onClick={() => setPage("onna")} />
            <Pin id="nago" label="Nago" x={46} y={33} hovered={hovered} setHovered={setHovered} leaveTo="okinawa" activeColor={BABY_BLUE} />
            <Pin id="nanjo" label="Nanjo" x={30} y={90} hovered={hovered} setHovered={setHovered} leaveTo="okinawa" activeColor={BABY_BLUE} />
          </div>
        </div>

        <div className="absolute bottom-4 left-0 w-full px-6">
          <div className="mx-auto max-w-5xl">
            <div className="relative h-[2px] bg-white/30">
              {hovered === "xiaoliuqiu" && (
                <div
                  className="absolute top-0 h-[2px] bg-white shadow-[0_0_12px_rgba(255,255,255,0.9)]"
                  style={{ left: `${xiaoliuqiuStart}%`, width: `${xiaoliuqiuEnd - xiaoliuqiuStart}%` }}
                />
              )}

              {showFullOkinawaTimeline && (
                <div
                  className="absolute top-0 h-[2px]"
                  style={{ left: `${okinawaStart}%`, width: `${okinawaEnd - okinawaStart}%`, backgroundColor: BABY_BLUE, boxShadow: BABY_BLUE_SHADOW }}
                />
              )}

              {isOnnaHover && (
                <div
                  className="absolute top-0 h-[2px]"
                  style={{ left: `${onnaStart}%`, width: `${onnaEnd - onnaStart}%`, backgroundColor: BABY_BLUE, boxShadow: BABY_BLUE_SHADOW }}
                />
              )}

              {isNagoHover && (
                <div
                  className="absolute top-0 h-[2px]"
                  style={{ left: `${nagoStart}%`, width: `${nagoEnd - nagoStart}%`, backgroundColor: BABY_BLUE, boxShadow: BABY_BLUE_SHADOW }}
                />
              )}

              {isNanjoHover && (
                <div
                  className="absolute top-0 h-[2px]"
                  style={{ left: `${nanjoStart}%`, width: `${nanjoEnd - nanjoStart}%`, backgroundColor: BABY_BLUE, boxShadow: BABY_BLUE_SHADOW }}
                />
              )}

              {isNahaHover && (
                <div
                  className="absolute top-0 h-[2px]"
                  style={{ left: `${nahaStart}%`, width: `${nahaEnd - nahaStart}%`, backgroundColor: BABY_BLUE, boxShadow: BABY_BLUE_SHADOW }}
                />
              )}

              {dates.map((date, index) => {
                const isStart = index === 0;
                const isNov23 = date.getMonth() === 10 && date.getDate() === 23;
                const isNov27 = date.getMonth() === 10 && date.getDate() === 27;
                const isDec6 = date.getMonth() === 11 && date.getDate() === 6;
                const isOkinawaRange =
                  (date.getMonth() === 10 && date.getDate() >= 27) ||
                  (date.getMonth() === 11 && date.getDate() <= 6);
                const isOnnaRange = date.getMonth() === 10 && date.getDate() >= 27 && date.getDate() <= 30;
                const isNagoRange =
                  (date.getMonth() === 10 && date.getDate() >= 30) ||
                  (date.getMonth() === 11 && date.getDate() <= 2);
                const isNanjoRange = date.getMonth() === 11 && date.getDate() >= 2 && date.getDate() <= 4;
                const isNahaRange = date.getMonth() === 11 && date.getDate() >= 4 && date.getDate() <= 6;
                const highlightOkinawa = showFullOkinawaTimeline && isOkinawaRange;
                const highlightOnna = isOnnaHover && isOnnaRange;
                const highlightNago = isNagoHover && isNagoRange;
                const highlightNanjo = isNanjoHover && isNanjoRange;
                const highlightNaha = isNahaHover && isNahaRange;
                const highlightTimeline = highlightOkinawa || highlightOnna || highlightNago || highlightNanjo || highlightNaha;

                return (
                  <div
                    key={`${date.getMonth()}-${date.getDate()}`}
                    className="absolute top-1/2 -translate-y-1/2"
                    style={{ left: `${(index / (dates.length - 1)) * 100}%` }}
                  >
                    <div
                      className={`h-2 w-px ${highlightTimeline ? "" : "bg-white/50"}`}
                      style={highlightTimeline ? { backgroundColor: BABY_BLUE } : undefined}
                    />
                    {(isStart || isNov23 || isNov27 || isDec6) && (
                      <div
                        className={`mt-2 -translate-x-1/2 text-[9px] transition-all ${highlightTimeline ? "font-semibold" : "text-gray-400"}`}
                        style={highlightTimeline ? { color: BABY_BLUE } : undefined}
                      >
                        {date.getMonth() === 10 ? "Nov" : "Dec"} {date.getDate()}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="absolute bottom-16 z-20 text-center">
          <div className="mb-5 rounded-3xl border border-white/10 bg-white/[0.04] px-4 py-3 backdrop-blur-md scale-75 origin-center">
            <p className="mb-3 text-xs uppercase tracking-[0.3em] text-[#9EDCFF]">Countdown to Departure</p>
            <div className="grid grid-cols-4 gap-3 text-center">
              <div>
                <p className="text-xl font-light md:text-2xl">{countdownDays}</p>
                <p className="text-[9px] text-gray-400">Days</p>
              </div>
              <div>
                <p className="text-xl font-light md:text-2xl">{countdownHours}</p>
                <p className="text-[9px] text-gray-400">Hours</p>
              </div>
              <div>
                <p className="text-xl font-light md:text-2xl">{countdownMinutes}</p>
                <p className="text-[9px] text-gray-400">Min</p>
              </div>
              <div>
                <p className="text-xl font-light md:text-2xl">{countdownSeconds}</p>
                <p className="text-[9px] text-gray-400">Sec</p>
              </div>
            </div>
            <p className="mt-3 text-xs text-gray-400">Nov 19 · YYZ → TPE</p>
          </div>

          <div className="flex flex-col items-center gap-3">
            <h1 className="text-3xl font-light tracking-wide md:text-4xl">Taiwan · Okinawa Japan</h1>
          </div>
          <p className="mt-3 text-gray-400">Nov 2026 - Dec 2026 - Jan 2027</p>
        </div>
      </section>
    </div>
  );
}
