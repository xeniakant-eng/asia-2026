"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";

const MS_PER_DAY = 1000 * 60 * 60 * 24;
const BABY_BLUE = "#9EDCFF";
const BABY_BLUE_SHADOW = "0 0 12px rgba(158,220,255,0.9)";
const TAIWAN_GOLD = "#FFD76A";
const TAIWAN_GOLD_SHADOW = "0 0 14px rgba(255,215,106,0.95)";

type PageName = "map" | "xiaoliuqiu" | "onna" | "nago" | "nanjo" | "naha" | "overlap";

type SvgPinProps = {
  id: string;
  label: string;
  cx: number;
  cy: number;
  hovered: string | null;
  setHovered: React.Dispatch<React.SetStateAction<string | null>>;
  leaveTo?: string | null;
  activeColor?: string;
  onClick?: () => void;
  onDoubleClick?: () => void;
  scale?: number;
  labelFontSize?: number;
  labelOffset?: number;
};

type TimelineItem = {
  id: string;
  label: string;
  range: string;
  color: "taiwan" | "okinawa";
};

function buildDateRange(start: Date, end: Date): Date[] {
  const dates: Date[] = [];
  const current = new Date(start);

  while (current <= end) {
    dates.push(new Date(current));
    current.setDate(current.getDate() + 1);
  }

  return dates;
}

function getTimelinePercent(targetDate: Date, timelineStart: Date, timelineEnd: Date): number {
  const totalDays = (timelineEnd.getTime() - timelineStart.getTime()) / MS_PER_DAY;
  const dayOffset = (targetDate.getTime() - timelineStart.getTime()) / MS_PER_DAY;
  return (dayOffset / totalDays) * 100;
}

function SvgPin({
  id,
  label,
  cx,
  cy,
  hovered,
  setHovered,
  leaveTo = null,
  activeColor,
  onClick,
  onDoubleClick,
  scale = 1,
  labelFontSize = 14,
  labelOffset = 28,
}: SvgPinProps) {
  const isActive = hovered === id;
  const active = activeColor || "white";
  const pinGlow =
    activeColor === BABY_BLUE
      ? "drop-shadow(0 0 4px rgba(158,220,255,0.85)) drop-shadow(0 0 10px rgba(158,220,255,0.45))"
      : activeColor === TAIWAN_GOLD
        ? "drop-shadow(0 0 4px rgba(255,215,106,0.9)) drop-shadow(0 0 10px rgba(255,215,106,0.55))"
        : "drop-shadow(0 0 4px rgba(255,255,255,0.75)) drop-shadow(0 0 10px rgba(255,255,255,0.35))";

  return (
    <g
      style={{ cursor: onClick || onDoubleClick ? "pointer" : "default" }}
      onMouseEnter={(event) => {
        event.stopPropagation();
        setHovered(id);
      }}
      onMouseLeave={(event) => {
        event.stopPropagation();
        setHovered(leaveTo);
      }}
      onClick={(event) => {
        event.stopPropagation();
        onClick?.();
      }}
      onDoubleClick={(event) => {
        event.stopPropagation();
        onDoubleClick?.();
      }}
      onTouchStart={(event) => {
        event.stopPropagation();
        setHovered(id);
      }}
      aria-label={label}
    >
      <circle cx={cx} cy={cy} r={10 * scale} fill="transparent" stroke="none" />
      <circle
        cx={cx}
        cy={cy}
        r={5.2 * scale}
        fill={isActive ? active : "white"}
        stroke="none"
        style={{
          filter: isActive ? pinGlow : "none",
          transform: isActive ? "scale(1.15)" : "scale(1)",
          transformOrigin: `${cx}px ${cy}px`,
          transition: "transform 160ms ease-out, filter 160ms ease-out, fill 160ms ease-out",
        }}
      />

      {isActive && (() => {
        const fontSize = labelFontSize;
        const charWidth = fontSize * 0.66;
        const paddingX = fontSize * 0.85;
        const paddingY = fontSize * 0.48;
        const textWidth = label.length * charWidth;
        const boxWidth = textWidth + paddingX * 2;
        const boxHeight = fontSize + paddingY * 2;
        const boxY = cy - labelOffset - boxHeight;

        return (
          <g pointerEvents="none">
            <rect
              x={cx - boxWidth / 2}
              y={boxY}
              rx={fontSize * 0.45}
              ry={fontSize * 0.45}
              width={boxWidth}
              height={boxHeight}
              fill="rgba(0,0,0,0.82)"
              stroke="none"
            />
            <text
              x={cx}
              y={boxY + boxHeight / 2 + fontSize * 0.08}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize={fontSize}
              fill="#F3F4F6"
              stroke="none"
              style={{
                fontWeight: 300,
                letterSpacing: "0.01em",
                fontFamily: "-apple-system, BlinkMacSystemFont, 'Inter', 'Helvetica Neue', Arial, sans-serif",
              }}
            >
              {label}
            </text>
          </g>
        );
      })()}
    </g>
  );
}

export default function TravelSite() {
  const [hovered, setHovered] = useState<string | null>(null);
  const [page, setPage] = useState<PageName>("map");
  const [usdToJpy, setUsdToJpy] = useState("150");
  const [usdToTwd, setUsdToTwd] = useState("32");
  const [now, setNow] = useState(new Date());
  const [selectedTimelineSectionId, setSelectedTimelineSectionId] = useState(1);
  const [guestName, setGuestName] = useState("");
  const [isGuestConfirmed, setIsGuestConfirmed] = useState(false);
  const [showGuestActions, setShowGuestActions] = useState(false);
  const timelineScrollRef = useRef<HTMLDivElement | null>(null);

  const guestOptions = [
    "I am just a random Guest",
    "Xenia & David",
    "Anthony & Christine",
    "Jennifer & Hiroshi",
    "Heather & Jack",
    "Steven Wang",
    "Mark Wang",
    "Mei & Emilia",
    "Julie & Adrian",
    "Dave & Christina",
  ];

  useEffect(() => {
    async function fetchExchangeRate() {
      try {
        const response = await fetch("https://open.er-api.com/v6/latest/USD");
        const data = await response.json();
        if (data?.rates?.JPY) setUsdToJpy(Math.round(data.rates.JPY).toString());
        if (data?.rates?.TWD) setUsdToTwd(Math.round(data.rates.TWD).toString());
      } catch (error) {
        console.warn("Unable to fetch USD to JPY exchange rate. Using fallback.", error);
      }
    }

    fetchExchangeRate();
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const timelineSections = useMemo(
    () => [
      { id: 1, label: "Section 1", start: new Date(2026, 10, 20), end: new Date(2026, 11, 6) },
      { id: 2, label: "Section 2", start: new Date(2026, 11, 6), end: new Date(2026, 11, 23) },
      { id: 3, label: "Section 3", start: new Date(2026, 11, 23), end: new Date(2027, 0, 8) },
      { id: 4, label: "Section 4", start: new Date(2027, 0, 8), end: new Date(2027, 0, 25) },
    ],
    []
  );

  const selectedTimelineSection = timelineSections.find((section) => section.id === selectedTimelineSectionId) || timelineSections[0];
  const hoverTimelineSection = (() => {
    if (!hovered) return null;
    if (hovered === "yilan") return timelineSections[1];
    if (["taipei", "xiaoliuqiu", "okinawa", "onna", "nago", "nanjo", "naha"].includes(hovered)) return timelineSections[0];
    return null;
  })();

  const activeTimelineSection = hoverTimelineSection || selectedTimelineSection;
  const sectionDates = useMemo(() => buildDateRange(activeTimelineSection.start, activeTimelineSection.end), [activeTimelineSection]);
  const isSection1Visible = selectedTimelineSection.id === 1;
  const isSection2Visible = selectedTimelineSection.id === 2;
  const getSectionPercent = (targetDate: Date) => getTimelinePercent(targetDate, activeTimelineSection.start, activeTimelineSection.end);

  const isOkinawaIslandHover = hovered === "okinawa";
  const isOnnaHover = hovered === "onna";
  const isNagoHover = hovered === "nago";
  const isNanjoHover = hovered === "nanjo";
  const isNahaHover = hovered === "naha";

  useEffect(() => {
    const timeline = timelineScrollRef.current;
    if (!timeline) return;
    timeline.scrollTo({ left: 0, behavior: "smooth" });
  }, [activeTimelineSection.id]);

  const departureDate = new Date(2026, 10, 19, 0, 0, 0);
  const countdownMs = Math.max(departureDate.getTime() - now.getTime(), 0);
  const countdownDays = Math.floor(countdownMs / MS_PER_DAY);
  const countdownHours = Math.floor((countdownMs % MS_PER_DAY) / (1000 * 60 * 60));
  const countdownMinutes = Math.floor((countdownMs % (1000 * 60 * 60)) / (1000 * 60));
  const countdownSeconds = Math.floor((countdownMs % (1000 * 60)) / 1000);
  const okinawaLocalTime = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Tokyo",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  }).format(now);

  const mobileTimelineItems: Record<number, TimelineItem[]> = {
    1: [
      { id: "xiaoliuqiu", label: "Xiaoliuqiu", range: "Nov 20–23", color: "taiwan" },
      { id: "taipei", label: "Taipei", range: "Nov 23–27", color: "taiwan" },
      { id: "onna", label: "Onna", range: "Nov 27–30", color: "okinawa" },
      { id: "nago", label: "Nago", range: "Nov 30–Dec 2", color: "okinawa" },
      { id: "nanjo", label: "Nanjo", range: "Dec 2–4", color: "okinawa" },
      { id: "naha", label: "Naha", range: "Dec 4–6", color: "okinawa" },
    ],
    2: [{ id: "yilan", label: "Yilan", range: "Dec 9–12", color: "taiwan" }],
    3: [],
    4: [],
  };

  const openChapterForLocation = (id: string) => {
    if (id === "xiaoliuqiu") setPage("xiaoliuqiu");
    if (id === "onna") setPage("onna");
    if (id === "nago") setPage("nago");
    if (id === "nanjo") setPage("nanjo");
    if (id === "naha") setPage("naha");
  };

  const chapterNav = (current: PageName) => (
    <div className="mb-10 flex items-start justify-between gap-4">
      <div className="flex flex-col items-start gap-3">
        <button type="button" onClick={() => setPage("map")} className="rounded-full border border-white/30 px-4 py-2 text-sm text-white/80 transition hover:border-white hover:text-white">
          ← Back to Map
        </button>
        <button
          type="button"
          onClick={() => {
            setIsGuestConfirmed(false);
            setShowGuestActions(true);
          }}
          className="rounded-full border border-[#9EDCFF]/25 bg-[#9EDCFF]/5 px-4 py-2 text-sm text-[#9EDCFF]/80 transition hover:border-[#9EDCFF]/50 hover:bg-[#9EDCFF]/10 hover:text-[#9EDCFF]"
        >
          ← Back to Dashboard
        </button>
      </div>
      <div className="flex flex-wrap items-center justify-end gap-3">
        {current === "xiaoliuqiu" && (
          <button type="button" onClick={() => setPage("onna")} className="rounded-full border border-[#FFD76A]/30 bg-[#FFD76A]/10 px-4 py-2 text-sm text-[#9EDCFF] transition hover:border-[#FFD76A]/60 hover:bg-[#FFD76A]/15">
            Next Chapter →
          </button>
        )}
        {current === "nago" && (
          <button type="button" onClick={() => setPage("onna")} className="rounded-full border border-white/20 bg-white/[0.04] px-4 py-2 text-sm text-white/70 transition hover:border-white/40 hover:text-white">
            ← Previous Chapter
          </button>
        )}
        {current === "nanjo" && (
          <button type="button" onClick={() => setPage("nago")} className="rounded-full border border-white/20 bg-white/[0.04] px-4 py-2 text-sm text-white/70 transition hover:border-white/40 hover:text-white">
            ← Previous Chapter
          </button>
        )}
        {current === "naha" && (
          <button type="button" onClick={() => setPage("nanjo")} className="rounded-full border border-white/20 bg-white/[0.04] px-4 py-2 text-sm text-white/70 transition hover:border-white/40 hover:text-white">
            ← Previous Chapter
          </button>
        )}
        {current === "onna" && (
          <button type="button" onClick={() => setPage("nago")} className="rounded-full border border-[#9EDCFF]/30 bg-[#9EDCFF]/10 px-4 py-2 text-sm text-[#9EDCFF] transition hover:border-[#9EDCFF]/60 hover:bg-[#9EDCFF]/15">
            Next Chapter →
          </button>
        )}
        {current === "nago" && (
          <button type="button" onClick={() => setPage("nanjo")} className="rounded-full border border-[#9EDCFF]/30 bg-[#9EDCFF]/10 px-4 py-2 text-sm text-[#9EDCFF] transition hover:border-[#9EDCFF]/60 hover:bg-[#9EDCFF]/15">
            Next Chapter →
          </button>
        )}
        {current === "nanjo" && (
          <button type="button" onClick={() => setPage("naha")} className="rounded-full border border-[#9EDCFF]/30 bg-[#9EDCFF]/10 px-4 py-2 text-sm text-[#9EDCFF] transition hover:border-[#9EDCFF]/60 hover:bg-[#9EDCFF]/15">
            Next Chapter →
          </button>
        )}
      </div>
    </div>
  );

  const infoWidgets = (
    monthLabel: string,
    nights: string,
    hotel: React.ReactNode,
    region: "japan" | "taiwan" = "japan"
  ) => {
    const isTaiwan = region === "taiwan";
    const localTime = new Intl.DateTimeFormat("en-US", {
      timeZone: isTaiwan ? "Asia/Taipei" : "Asia/Tokyo",
      hour: "numeric",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    }).format(now);
    const tempLabel = isTaiwan ? "24–28°C" : monthLabel === "November" ? "22–26°C" : "20–24°C";

    return (
      <section className="mb-10 grid grid-cols-2 gap-3 md:grid-cols-5">
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3 text-center md:p-4"><p className="mb-1 text-xl md:mb-2 md:text-2xl">{isTaiwan ? "💵" : "💴"}</p><p className="text-[10px] text-gray-400 md:text-xs">Currency</p><p className="mt-1 text-xs font-medium md:text-sm">{isTaiwan ? "TWD NT$" : "JPY ¥"}</p><p className="mt-1 text-xs text-gray-400">{isTaiwan ? `1 USD ≈ ${usdToTwd} TWD` : `1 USD ≈ ${usdToJpy} JPY`}</p><p className="mt-1 text-[9px] text-gray-500">Live rate · fallback {isTaiwan ? "32" : "150"}</p></div>
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3 text-center md:p-4"><p className="mb-1 text-xl md:mb-2 md:text-2xl">🌤️</p><p className="text-[10px] text-gray-400 md:text-xs">{monthLabel} Temp</p><p className="mt-1 text-xs font-medium md:text-sm">{tempLabel}</p></div>
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3 text-center md:p-4"><p className="mb-1 text-xl md:mb-2 md:text-2xl">🕘</p><p className="text-[10px] text-gray-400 md:text-xs">Local Time</p><p className="mt-1 text-xs font-medium md:text-sm">{localTime}</p><p className="mt-1 text-[9px] text-gray-500">{isTaiwan ? "Taiwan · CST" : "Okinawa · JST"}</p></div>
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3 text-center md:p-4"><p className="mb-1 text-xl md:mb-2 md:text-2xl">🌙</p><p className="text-[10px] text-gray-400 md:text-xs">Nights</p><p className="mt-1 text-xs font-medium md:text-sm">{nights}</p></div>
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3 text-center md:p-4"><p className="mb-1 text-xl md:mb-2 md:text-2xl">🏨</p><p className="text-[10px] text-gray-400 md:text-xs">Hotel</p>{hotel}</div>
      </section>
    );
  };

  const peopleCards = (people: [string, string][]) => (
    <section className="mb-10 rounded-3xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur-md">
      <div className="mb-5 flex items-center justify-between">
        <h2 className="text-2xl font-light">Who's Here</h2>
        <p className="text-[10px] uppercase tracking-[0.24em] text-white/35">Current Trip Segment</p>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {people.map(([name, date]) => (
          <div key={name} className="rounded-2xl border border-white/10 bg-black/20 p-4"><p className="text-sm font-medium text-white">{name}</p><p className="text-[10px] text-gray-400 md:text-xs">{date}</p></div>
        ))}
      </div>
    </section>
  );

  const Timeline = () => (
    <div className="relative z-20 mt-5 w-full px-4 md:absolute md:bottom-4 md:left-0 md:mt-0 md:px-6">
      <div className="mx-auto max-w-5xl">
        <div className="mb-2 flex items-center justify-between gap-3 px-2">
          <div className="flex flex-wrap items-center gap-1.5">
            {timelineSections.map((section) => {
              const isActive = activeTimelineSection.id === section.id;
              const isDisabled = section.id === 3 || section.id === 4;
              return (
                <button
                  key={section.id}
                  type="button"
                  disabled={isDisabled}
                  onClick={() => {
                    if (isDisabled) return;
                    setHovered(null);
                    setSelectedTimelineSectionId(section.id);
                  }}
                  className={`rounded-full border px-2.5 py-1 text-[9px] uppercase tracking-[0.16em] transition ${
                    isDisabled
                      ? "cursor-not-allowed border-white/5 bg-black/10 text-white/15"
                      : isActive
                        ? "border-white/70 bg-white/10 text-white shadow-[0_0_12px_rgba(255,255,255,0.22)]"
                        : "border-white/15 bg-black/20 text-white/35 hover:border-white/35 hover:text-white/70"
                  }`}
                >
                  {section.label}
                </button>
              );
            })}
          </div>
          <span className="shrink-0 text-[10px] uppercase tracking-[0.24em] text-white/35">
            {activeTimelineSection.start.toLocaleDateString("en-US", { month: "short", day: "numeric" })} – {activeTimelineSection.end.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
          </span>
        </div>

        <div className="mt-3 grid gap-2 md:hidden">
          {(mobileTimelineItems[activeTimelineSection.id] || []).map((item) => {
            const isTaiwan = item.color === "taiwan";
            const isActive = hovered === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setHovered(item.id);
                }}
                onDoubleClick={() => {
                  openChapterForLocation(item.id);
                }}
                onMouseEnter={() => setHovered(item.id)}
                onMouseLeave={() => setHovered(null)}
                className={`flex items-center justify-between rounded-2xl border px-4 py-3 text-left backdrop-blur-md transition ${
                  isActive
                    ? isTaiwan
                      ? "border-[#FFD76A]/70 bg-[#FFD76A]/10"
                      : "border-[#9EDCFF]/70 bg-[#9EDCFF]/10"
                    : "border-white/10 bg-white/[0.04]"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: isTaiwan ? TAIWAN_GOLD : BABY_BLUE }} />
                  <span className="text-sm font-light tracking-wide text-white">{item.label}</span>
                </div>
                <span className="text-[10px] uppercase tracking-[0.18em] text-white/45">{item.range}</span>
              </button>
            );
          })}
        </div>

        <div ref={timelineScrollRef} className="relative hidden overflow-x-auto overflow-y-hidden px-2 py-6 md:block [mask-image:linear-gradient(to_right,transparent,black_8%,black_92%,transparent)] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div className="relative h-[2px] bg-white/30" style={{ width: "100%" }}>
            {activeTimelineSection.id === 1 && (
              <>
                <div className="absolute -top-5 h-10 cursor-pointer" style={{ left: `${getSectionPercent(new Date(2026, 10, 20))}%`, width: `${getSectionPercent(new Date(2026, 10, 23)) - getSectionPercent(new Date(2026, 10, 20))}%` }} onMouseEnter={() => setHovered("xiaoliuqiu")} onMouseLeave={() => setHovered(null)} onClick={() => setPage("xiaoliuqiu")} />
                <div className="absolute -top-5 h-10 cursor-pointer" style={{ left: `${getSectionPercent(new Date(2026, 10, 23))}%`, width: `${getSectionPercent(new Date(2026, 10, 27)) - getSectionPercent(new Date(2026, 10, 23))}%` }} onMouseEnter={() => setHovered("taipei")} onMouseLeave={() => setHovered(null)} />
                <div className="absolute -top-5 h-10 cursor-pointer" style={{ left: `${getSectionPercent(new Date(2026, 10, 27))}%`, width: `${getSectionPercent(new Date(2026, 10, 30)) - getSectionPercent(new Date(2026, 10, 27))}%` }} onMouseEnter={() => setHovered("onna")} onMouseLeave={() => setHovered(null)} onClick={() => setPage("onna")} />
                <div className="absolute -top-5 h-10 cursor-pointer" style={{ left: `${getSectionPercent(new Date(2026, 10, 30))}%`, width: `${getSectionPercent(new Date(2026, 11, 2)) - getSectionPercent(new Date(2026, 10, 30))}%` }} onMouseEnter={() => setHovered("nago")} onMouseLeave={() => setHovered(null)} onClick={() => setPage("nago")} />
                <div className="absolute -top-5 h-10 cursor-pointer" style={{ left: `${getSectionPercent(new Date(2026, 11, 2))}%`, width: `${getSectionPercent(new Date(2026, 11, 4)) - getSectionPercent(new Date(2026, 11, 2))}%` }} onMouseEnter={() => setHovered("nanjo")} onMouseLeave={() => setHovered(null)} onClick={() => setPage("nanjo")} />
                <div className="absolute -top-5 h-10 cursor-pointer" style={{ left: `${getSectionPercent(new Date(2026, 11, 4))}%`, width: `${getSectionPercent(new Date(2026, 11, 6)) - getSectionPercent(new Date(2026, 11, 4))}%` }} onMouseEnter={() => setHovered("naha")} onMouseLeave={() => setHovered(null)} onClick={() => setPage("naha")} />
              </>
            )}
            {activeTimelineSection.id === 2 && (
              <div className="absolute -top-5 h-10 cursor-pointer" style={{ left: `${getSectionPercent(new Date(2026, 11, 9))}%`, width: `${getSectionPercent(new Date(2026, 11, 12)) - getSectionPercent(new Date(2026, 11, 9))}%` }} onMouseEnter={() => setHovered("yilan")} onMouseLeave={() => setHovered(null)} />
            )}

            {hovered === "taipei" && <div className="timeline-highlight top-0 h-[2px] text-[#9EDCFF]" style={{ left: `${getSectionPercent(new Date(2026, 10, 23))}%`, width: `${getSectionPercent(new Date(2026, 10, 27)) - getSectionPercent(new Date(2026, 10, 23))}%`, backgroundColor: TAIWAN_GOLD, boxShadow: TAIWAN_GOLD_SHADOW }} />}
            {hovered === "xiaoliuqiu" && <div className="timeline-highlight top-0 h-[2px] text-[#9EDCFF]" style={{ left: `${getSectionPercent(new Date(2026, 10, 20))}%`, width: `${getSectionPercent(new Date(2026, 10, 23)) - getSectionPercent(new Date(2026, 10, 20))}%`, backgroundColor: TAIWAN_GOLD, boxShadow: TAIWAN_GOLD_SHADOW }} />}
            {hovered === "yilan" && <div className="timeline-highlight top-0 h-[2px] text-[#9EDCFF]" style={{ left: `${getSectionPercent(new Date(2026, 11, 9))}%`, width: `${getSectionPercent(new Date(2026, 11, 12)) - getSectionPercent(new Date(2026, 11, 9))}%`, backgroundColor: TAIWAN_GOLD, boxShadow: TAIWAN_GOLD_SHADOW }} />}
            {isOkinawaIslandHover && <div className="timeline-highlight top-0 h-[2px] text-[#9EDCFF]" style={{ left: `${getSectionPercent(new Date(2026, 10, 27))}%`, width: `${getSectionPercent(new Date(2026, 11, 6)) - getSectionPercent(new Date(2026, 10, 27))}%`, backgroundColor: BABY_BLUE, boxShadow: BABY_BLUE_SHADOW }} />}
            {isOnnaHover && <div className="timeline-highlight top-0 h-[2px] text-[#9EDCFF]" style={{ left: `${getSectionPercent(new Date(2026, 10, 27))}%`, width: `${getSectionPercent(new Date(2026, 10, 30)) - getSectionPercent(new Date(2026, 10, 27))}%`, backgroundColor: BABY_BLUE, boxShadow: BABY_BLUE_SHADOW }} />}
            {isNagoHover && <div className="timeline-highlight top-0 h-[2px] text-[#9EDCFF]" style={{ left: `${getSectionPercent(new Date(2026, 10, 30))}%`, width: `${getSectionPercent(new Date(2026, 11, 2)) - getSectionPercent(new Date(2026, 10, 30))}%`, backgroundColor: BABY_BLUE, boxShadow: BABY_BLUE_SHADOW }} />}
            {isNanjoHover && <div className="timeline-highlight top-0 h-[2px] text-[#9EDCFF]" style={{ left: `${getSectionPercent(new Date(2026, 11, 2))}%`, width: `${getSectionPercent(new Date(2026, 11, 4)) - getSectionPercent(new Date(2026, 11, 2))}%`, backgroundColor: BABY_BLUE, boxShadow: BABY_BLUE_SHADOW }} />}
            {isNahaHover && <div className="timeline-highlight top-0 h-[2px] text-[#9EDCFF]" style={{ left: `${getSectionPercent(new Date(2026, 11, 4))}%`, width: `${getSectionPercent(new Date(2026, 11, 6)) - getSectionPercent(new Date(2026, 11, 4))}%`, backgroundColor: BABY_BLUE, boxShadow: BABY_BLUE_SHADOW }} />}

            {sectionDates.map((date, index) => {
              const isYilanRange = date.getMonth() === 11 && date.getDate() >= 9 && date.getDate() <= 12;
              const isTaipeiRange = date.getMonth() === 10 && date.getDate() >= 23 && date.getDate() <= 27;
              const isXiaoliuqiuRange = date.getMonth() === 10 && date.getDate() >= 20 && date.getDate() <= 23;
              const isOnnaRange = date.getMonth() === 10 && date.getDate() >= 27 && date.getDate() <= 30;
              const isNagoRange = (date.getMonth() === 10 && date.getDate() >= 30) || (date.getMonth() === 11 && date.getDate() <= 2);
              const isNanjoRange = date.getMonth() === 11 && date.getDate() >= 2 && date.getDate() <= 4;
              const isNahaRange = date.getMonth() === 11 && date.getDate() >= 4 && date.getDate() <= 6;
              const highlightTaiwan = (hovered === "yilan" && isYilanRange) || (hovered === "taipei" && isTaipeiRange) || (hovered === "xiaoliuqiu" && isXiaoliuqiuRange);
              const highlightOkinawa = (isOnnaHover && isOnnaRange) || (isNagoHover && isNagoRange) || (isNanjoHover && isNanjoRange) || (isNahaHover && isNahaRange);
              const highlight = highlightTaiwan || highlightOkinawa;
              const monthLabel = date.getMonth() === 10 ? "Nov" : date.getMonth() === 11 ? "Dec" : "Jan";

              return (
                <div key={`${date.getMonth()}-${date.getDate()}`} className="absolute top-1/2 -translate-y-1/2" style={{ left: `${(index / (sectionDates.length - 1)) * 100}%` }}>
                  <div className={`h-2 w-px ${highlight ? "" : "bg-white/50"}`} style={highlightTaiwan ? { backgroundColor: TAIWAN_GOLD } : highlightOkinawa ? { backgroundColor: BABY_BLUE } : undefined} />
                  <div className={`mt-2 -translate-x-1/2 whitespace-nowrap text-[12px] transition-all ${highlight ? "font-semibold" : "text-gray-500"}`} style={highlightTaiwan ? { color: TAIWAN_GOLD } : highlightOkinawa ? { color: BABY_BLUE } : undefined}>
                    {monthLabel} {date.getDate()}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );

  if (!isGuestConfirmed) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black px-6 text-white">
        <div className="w-full max-w-md rounded-[2rem] border border-white/10 bg-white/[0.04] p-8 text-center shadow-[0_0_40px_rgba(255,255,255,0.06)] backdrop-blur-xl">
          <p className="mb-3 text-xs uppercase tracking-[0.35em] text-[#9EDCFF]">Private Group Event</p>
          <h1 className="mb-4 text-3xl font-light tracking-wide">Welcome to XK Event 2026</h1>

          {!showGuestActions ? (
            <>
              <p className="mb-8 text-sm leading-6 text-white/55">Please select your party to continue.</p>
              <div className="mb-5 max-h-[280px] space-y-2 overflow-y-auto pr-1">
                {guestOptions.map((guest) => {
                  const isSelected = guestName === guest;
                  return (
                    <button
                      key={guest}
                      type="button"
                      onClick={() => {
                        setGuestName(guest);
                        if (guest === "I am just a random Guest") {
                          setIsGuestConfirmed(true);
                          setPage("map");
                          return;
                        }
                        setShowGuestActions(true);
                      }}
                      className={`w-full rounded-2xl border px-4 py-3 text-sm font-light tracking-wide transition ${
                        isSelected
                          ? "border-[#9EDCFF]/70 bg-[#9EDCFF]/10 text-white shadow-[0_0_16px_rgba(158,220,255,0.16)]"
                          : "border-white/10 bg-white/[0.03] text-white/70 hover:border-white/30 hover:bg-white/[0.05]"
                      }`}
                    >
                      {guest}
                    </button>
                  );
                })}
              </div>
            </>
          ) : (
            <>
              <div className="mb-8 rounded-3xl border border-[#9EDCFF]/20 bg-[#9EDCFF]/5 p-6 text-left shadow-[0_0_30px_rgba(158,220,255,0.08)]">
                <p className="text-sm uppercase tracking-[0.28em] text-[#9EDCFF]">Welcome</p>
                <h2 className="mt-2 text-3xl font-light tracking-wide text-white">Hello {guestName} 👋</h2>
                {guestName === "Mark Wang" && (
                  <div className="mt-5 space-y-3 text-sm leading-7 text-white/70">
                    <p className="text-xs uppercase tracking-[0.22em] text-white/35">You are joining:</p>
                    <button type="button" onClick={() => { setIsGuestConfirmed(true); setPage("xiaoliuqiu"); }} className="w-full rounded-2xl border border-[#FFD76A]/20 bg-[#FFD76A]/5 px-4 py-3 text-left transition hover:border-[#FFD76A]/50 hover:bg-[#FFD76A]/10">
                      <p className="font-medium text-[#FFD76A]">Nov 20–23 · Xiaoliuqiu</p>
                    </button>
                    <button type="button" onClick={() => { setIsGuestConfirmed(true); setPage("onna"); }} className="w-full rounded-2xl border border-[#9EDCFF]/20 bg-[#9EDCFF]/5 px-4 py-3 text-left transition hover:border-[#9EDCFF]/50 hover:bg-[#9EDCFF]/10">
                      <p className="font-medium text-[#9EDCFF]">Nov 26–30 · Onna</p>
                    </button>
                  </div>
                )}
              </div>
              <div className="space-y-5">
                <div className="grid gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => {
                      setPage("map");
                      setIsGuestConfirmed(true);
                    }}
                    className="rounded-full border border-[#9EDCFF]/50 bg-[#9EDCFF]/10 px-5 py-3 text-sm uppercase tracking-[0.22em] text-[#9EDCFF] transition hover:bg-[#9EDCFF]/15"
                  >
                    Enter Trip Site
                  </button>

                  <button type="button" disabled className="cursor-not-allowed rounded-full border border-[#FFD76A]/15 bg-[#FFD76A]/5 px-5 py-3 text-sm uppercase tracking-[0.22em] text-[#FFD76A]/35 opacity-70">
                    My Checklist
                  </button>
                </div>

                <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-4 text-left">
                  <p className="mb-4 whitespace-nowrap text-[10px] uppercase tracking-[0.18em] text-white/35 sm:text-xs sm:tracking-[0.24em]">
                    Buttons become active once trip begins
                  </p>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <button type="button" disabled className="cursor-not-allowed rounded-full border border-white/10 bg-white/[0.02] px-5 py-3 text-sm uppercase tracking-[0.22em] text-white/25 opacity-60">
                      What's Today?
                    </button>

                    <button type="button" disabled className="cursor-not-allowed rounded-full border border-white/10 bg-white/[0.02] px-5 py-3 text-sm uppercase tracking-[0.22em] text-white/25 opacity-60">
                      What's Tomorrow?
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  if (page === "overlap") {
    return (
      <div className="min-h-screen bg-black px-6 py-10 text-white">
        {chapterNav("overlap")}
        <main className="mx-auto max-w-5xl">
          <p className="mb-3 text-sm uppercase tracking-[0.35em] text-[#9EDCFF]">Group</p>
          <h1 className="mb-10 text-4xl font-light tracking-wide md:text-6xl">Overlap Timeline</h1>
          <div className="space-y-6">
            {[
              { name: "Anthony", segments: [{ left: 0, width: 14 }] },
              { name: "Xenia", segments: [{ left: 0, width: 40 }, { left: 45, width: 55 }] },
              { name: "Dave", segments: [{ left: 18, width: 45 }] },
              { name: "Mark", segments: [{ left: 0, width: 24 }] },
              { name: "Steven", segments: [{ left: 12, width: 28 }] },
              { name: "Julie", segments: [{ left: 45, width: 22 }] },
            ].map((person) => (
              <div key={person.name} className="space-y-2">
                <p className="text-sm text-white/80">{person.name}</p>
                <div className="relative h-4 w-full rounded-full bg-white/10">
                  {person.segments.map((segment, index) => (
                    <div key={`${person.name}-${index}`} className="absolute top-0 h-4 rounded-full" style={{ left: `${segment.left}%`, width: `${segment.width}%`, backgroundColor: BABY_BLUE }} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </main>
      </div>
    );
  }

  if (page === "xiaoliuqiu") {
    return (
      <div className="min-h-screen bg-black px-6 py-10 text-white">
        {chapterNav("xiaoliuqiu")}
        <main className="mx-auto max-w-5xl">
          <p className="mb-3 text-sm uppercase tracking-[0.35em] text-[#9EDCFF]">Taiwan · Xiaoliuqiu</p>
          <h1 className="mb-6 text-4xl font-light tracking-wide md:text-6xl">Scuba Dive Chapter</h1>
          {infoWidgets("November", "3 Nights", <p className="mt-1 text-sm font-medium text-[#9EDCFF]">小琉球民宿 TBD</p>, "taiwan")}
          {peopleCards([["Anthony & Christine", "Nov 20 – Nov 23 · Xiaoliuqiu"], ["Mark Wang", "Nov 20 – Nov 23 · Xiaoliuqiu"], ["Xenia & David", "Nov 21 – Nov 23 · Xiaoliuqiu"]])}
          <section className="space-y-8">
            <article className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur-md">
              <p className="mb-2 text-sm text-[#9EDCFF]">Friday, November 20, 2026</p>
              <h2 className="mb-5 text-2xl font-light">Arrival Day · Xiaoliuqiu</h2>
              <div className="space-y-4 text-sm leading-7 text-white/75">
                <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <p>🌅 Anthony, Christine & Mark arriving Xiaoliuqiu</p>
                  <p className="mt-2 text-white/50">高雄左營高鐵站 → 10:30 AM 客運 → 屏客東港總站 → 步行10分鐘東港碼頭 → 11:50 AM <a href="https://www.leucosapphire.com/" target="_blank" rel="noopener noreferrer" className="text-[#9EDCFF] hover:underline">藍白船班</a> → 與Jim碼頭集合</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <p>🤿 Open Water Lesson</p>
                  <ul className="ml-5 list-disc space-y-1 text-white/65">
                    <li>裝備組裝介紹</li>
                    <li>Close Water · Dive #1</li>
                  </ul>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <p>🍽 Dinner · TBD</p>
                </div>
              </div>
            </article>

            <article className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur-md">
              <p className="mb-2 text-sm text-[#9EDCFF]">Saturday, November 21, 2026</p>
              <h2 className="mb-5 text-2xl font-light">Open Water Dive Day</h2>
              <div className="space-y-4 text-sm leading-7 text-white/75">
                <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <p>🌊 Open Water Lessons</p>
                  <p>Dive #2 & Dive #3</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <p>⛴ Xenia & David arriving Xiaoliuqiu</p>
                  <p className="mt-2 text-sm font-medium text-white/80">Northern XLQ Visits</p>
                  <div className="mt-4 flex flex-col items-center gap-4 md:flex-row md:items-start">
                    <div className="flex-1">
                      <ul className="ml-5 list-disc space-y-2 text-white/65">
                        <li>美人洞</li>
                        <li>花瓶岩</li>
                        <li>龍蝦洞</li>
                      </ul>
                    </div>
                    <img src="/xlqmap.png" alt="Xiaoliuqiu map and ferry route" className="h-auto w-full rounded-2xl object-contain bg-black/20 p-2 md:w-1/2" />
                  </div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <p>🍜 Group Dinner · Beef Noodle Place</p>
                </div>
              </div>
            </article>

            <article className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur-md">
              <p className="mb-2 text-sm text-[#9EDCFF]">Sunday, November 22, 2026</p>
              <h2 className="mb-5 text-2xl font-light">Dive + Southern Island Day</h2>
              <div className="space-y-4 text-sm leading-7 text-white/75">
                <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <p>🤿 Open Water Lessons</p>
                  <p>Dive #4 & Dive #5</p>
                  <p className="mt-2 text-white/50">David & Anthony may join fun dives with the OW group.</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <p>👶 Toddler Group 小琉球海洋館</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <p>🌅 Southern Xiaoliuqiu Exploration</p>
                  <ul className="ml-5 list-disc space-y-1 text-white/65">
                    <li>琉行綠色隧道</li>
                    <li>烏鬼洞</li>
                    <li>落日亭 Sunset View</li>
                  </ul>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <p>🦞 OW Celebration Dinner</p>
                  <p className="text-white/50">Jim to reserve seafood restaurant.</p>
                </div>
              </div>
            </article>

            <article className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur-md">
              <p className="mb-2 text-sm text-[#9EDCFF]">Monday, November 23, 2026</p>
              <h2 className="mb-5 text-2xl font-light">Departure to Taipei</h2>
              <div className="space-y-4 text-sm leading-7 text-white/75">
                <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <p>⛴ Everyone leaving Xiaoliuqiu</p>
                  <p>11:10 AM boat departure</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <p>🍣 Lunch · 東港漁市場</p>
                  <p>🚄 Afternoon · 左營 → 台北</p>
                </div>
              </div>
            </article>
          </section>
        </main>
      </div>
    );
  }

  if (page === "onna") {
    return (
      <div className="min-h-screen bg-black px-6 py-10 text-white">
        {chapterNav("onna")}
        <main className="mx-auto max-w-4xl">
          <p className="mb-3 text-sm uppercase tracking-[0.35em] text-[#9EDCFF]">Okinawa · Onna</p>
          <h1 className="mb-6 text-4xl font-light tracking-wide md:text-6xl">Wedding Resort Chapter</h1>
          {infoWidgets("November", "3 Nights", <a href="https://www.hotelmonterey.co.jp/en/okinawa/" target="_blank" rel="noopener noreferrer" className="mt-1 block text-sm font-medium text-[#9EDCFF] hover:underline">Hotel Monterey Okinawa</a>)}
          {peopleCards([["Xenia & David", "Nov 27 – Dec 6 · Okinawa"], ["Dave & Christina", "Nov 27 – Dec 6 · Okinawa"], ["Steven Wang", "Nov 25 – Dec 6 · Okinawa"], ["Mark Wang", "Nov 25 – Nov 30 · Okinawa"], ["Mei & Emilia", "Nov 29 – Dec 6 · Okinawa"]])}

          <section className="space-y-8">
            <article className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur-md">
              <p className="mb-2 text-sm text-[#9EDCFF]">Friday, November 27, 2026</p>
              <h2 className="mb-5 text-2xl font-light">Morning Arrival · Naha</h2>
              <div className="space-y-4 text-sm leading-7 text-white/75">
                <p>✈ EVA Air BR112 · Arrive 9:15 AM at Naha Airport</p>
                <p>🚗 Pick up rental car · Rental Company TBD</p>
                <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <p className="mb-2 text-xs uppercase tracking-[0.2em] text-[#9EDCFF]">Lunch Stop</p>
                  <p>🕛 <a href="https://maps.google.com/?q=Senaga+Island+Umikaji+Terrace" target="_blank" rel="noopener noreferrer" className="text-[#9EDCFF] hover:underline">Senaga Island · Umikaji Terrace</a> stroll if weather is nice and flight is on time.</p>
                  <img src="/umikaji-terrace.png" alt="Umikaji Terrace Okinawa" className="mt-4 h-56 w-full rounded-2xl object-cover object-center" />
                  <p className="mt-4">MKCafe → ocean views, airplane takeoffs/landings, and the signature Mackerel Bitter Melon Burger 鯖魚苦瓜漢堡.</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <p className="mb-2 text-xs uppercase tracking-[0.2em] text-[#9EDCFF]">Afternoon · PART I</p>
                  <p>🛍 <a href="https://maps.google.com/?q=San-A+PARCO+CITY+Okinawa" target="_blank" rel="noopener noreferrer" className="text-[#9EDCFF] hover:underline">PARCO City</a> · biggest shopping centre with indoor toddler facilities.</p>
                  <p className="mt-2">☕ <a href="https://maps.google.com/?q=Minatogawa+Stateside+Town+Okinawa" target="_blank" rel="noopener noreferrer" className="text-[#9EDCFF] hover:underline">港川外人住宅 Minatogawa State Side Town</a> · Beans Store & canelé dessert.</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <p className="mb-2 text-xs uppercase tracking-[0.2em] text-[#9EDCFF]">Afternoon · PART II</p>
                  <p>🏖 <a href="https://maps.google.com/?q=Araha+Beach+Park+Okinawa" target="_blank" rel="noopener noreferrer" className="text-[#9EDCFF] hover:underline">Araha Beach Park</a> playground (sunny day)</p>
                  <p className="mt-2">🛒 <a href="https://maps.google.com/?q=AEON+Mall+Rycom+Okinawa" target="_blank" rel="noopener noreferrer" className="text-[#9EDCFF] hover:underline">Aeon Mall Rycom</a> for indoor play centre (rainy day) + picking up essentials and possible quick dinner.</p>
                  <p className="mt-3">🚗 <a href="https://maps.google.com/?q=Hotel+Monterey+Okinawa+Spa+%26+Resort" target="_blank" rel="noopener noreferrer" className="text-[#9EDCFF] hover:underline">Drive to resort</a> · approximately 45 minutes.</p>
                </div>
              </div>
            </article>

            <article className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur-md">
              <p className="mb-2 text-sm text-[#9EDCFF]">Saturday, November 28, 2026</p>
              <h2 className="mb-5 text-2xl font-light">Resort Day · Beach / Culture / Blue Cave</h2>
              <div className="space-y-4 text-sm leading-7 text-white/75">
                <div className="rounded-2xl border border-white/10 bg-black/20 p-4"><p>🍳 Breakfast · Hotel buffet</p></div>
                <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <p className="mb-2 text-xs uppercase tracking-[0.2em] text-[#9EDCFF]">Morning · Option 1</p>
                  <p>🤿 Blue Cave dive & snorkel 青之洞窟潛水</p>
                  <p className="text-white/50">Weather dependent</p>
                  <img src="/bluecave.png" alt="Blue Cave Okinawa" className="mt-4 h-56 w-full rounded-2xl object-cover object-center" />
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <p className="mb-2 text-xs uppercase tracking-[0.2em] text-[#9EDCFF]">Morning · Option 2</p>
                  <a href="https://www.ryukyumura.co.jp/" target="_blank" rel="noopener noreferrer" className="text-[#9EDCFF] hover:underline">🏯 Ryukyu Mura with FunPass</a>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <p className="mb-2 text-xs uppercase tracking-[0.2em] text-[#9EDCFF]">Afternoon</p>
                  <a href="https://www.hotelmonterey.co.jp/en/okinawa/activity/" target="_blank" rel="noopener noreferrer" className="text-[#9EDCFF] hover:underline">🏖 Resort & Beach Activities</a>
                  <img src="/hotel.png" alt="Hotel Monterey Okinawa" className="mt-4 h-56 w-full rounded-2xl object-cover object-center" />
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/20 p-4"><p>🍽 Dinner · TBD</p></div>
              </div>
            </article>

            <article className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur-md">
              <p className="mb-2 text-sm text-[#9EDCFF]">Sunday, November 29, 2026</p>
              <h2 className="mb-5 text-2xl font-light">Albert & Quinn Wedding Day</h2>
              <div className="space-y-3 text-sm leading-7 text-white/75">
                <p>Breakfast · Hotel buffet</p>
                <p>💍 Albert & Quinn Wedding at Hotel Monterey Okinawa Spa & Resort</p>
                <img src="/chapel.png" alt="Wedding Chapel Okinawa" className="mt-4 h-56 w-full rounded-2xl object-cover object-center" />
              </div>
            </article>
          </section>
        </main>
      </div>
    );
  }

  if (page === "nago") {
    return (
      <div className="min-h-screen bg-black px-6 py-10 text-white">
        {chapterNav("nago")}
        <main className="mx-auto max-w-5xl">
          <p className="mb-3 text-sm uppercase tracking-[0.35em] text-[#9EDCFF]">Okinawa · Nago</p>
          <h1 className="mb-6 text-4xl font-light tracking-wide md:text-6xl">Northern Okinawa Chapter</h1>
          {infoWidgets("December", "2 Nights", <p className="mt-1 text-sm font-medium text-[#9EDCFF]">TBD</p>)}
          {peopleCards([["Xenia & David", "Nov 27 – Dec 6 · Okinawa"], ["Dave & Christina", "Nov 27 – Dec 6 · Okinawa"], ["Steven Wang", "Nov 25 – Dec 6 · Okinawa"], ["Mei & Emilia", "Nov 29 – Dec 6 · Okinawa"]])}

          <section className="space-y-8">
            <article className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur-md">
              <p className="mb-2 text-sm text-[#9EDCFF]">Monday, November 30, 2026</p>
              <h2 className="mb-5 text-2xl font-light">Onna → Nago</h2>
              <div className="space-y-4 text-sm leading-7 text-white/75">
                <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <p>🍳 Breakfast · Hotel buffet</p>
                  <p>🧳 Checkout at 10:00 AM</p>
                  <a href="https://maps.google.com/?q=Cape+Manzamo+Okinawa" target="_blank" rel="noopener noreferrer" className="text-[#9EDCFF] hover:underline">🌊 Cape Manzamo quick stop (~40 min drive)</a>
                  <img src="/cape.png" alt="Cape Manzamo Okinawa" className="mt-4 h-56 w-full rounded-2xl object-cover object-center" />
                  <p className="text-white/50">If weather is not ideal, this can be swapped to the returning drive day on December 2.</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <a href="https://maps.google.com/?q=Busena+Marine+Park+Okinawa" target="_blank" rel="noopener noreferrer" className="text-[#9EDCFF] hover:underline">🌊 Busena Marine Park Underwater Observatory + Glass Boat</a>
                  <img src="/busena.png" alt="Busena Marine Park Okinawa" className="mt-4 h-56 w-full rounded-2xl object-cover object-center" />
                  <p>🍽 Lunch Options:</p>
                  <ul className="ml-5 list-disc space-y-1 text-white/65"><li>Nakamura Soba / Kintiti Soba Onna Branch 金月そば 恩納店</li><li>Nuchigusui ぬちぐすい Okinawa Cuisine</li><li>Nagumagai Restaurant 名護曲</li></ul>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <a href="https://maps.google.com/?q=Orion+Happy+Park+Nago" target="_blank" rel="noopener noreferrer" className="text-[#9EDCFF] hover:underline">🍺 14:00 – 16:00 Orion Happy Park</a>
                  <img src="/orion.png" alt="Orion Happy Park" className="mt-4 h-56 w-full rounded-2xl object-cover object-center" />
                  <ul className="ml-5 list-disc space-y-1 text-white/65"><li>參觀啤酒製作過程</li><li>了解沖繩啤酒歷史</li><li>免費試飲 Orion Beer</li></ul>
                  <p className="mt-2 text-white/50">Factory tour reservation recommended · ¥1000/person · Japanese guided tour with Chinese materials.</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <p>🥩 Dinner · <a href="https://share.google/nhtDdtE6vYP48ws81" target="_blank" rel="noopener noreferrer" className="text-[#9EDCFF] hover:underline">Restaurant Flipper</a></p>
                  <p>🛍 Optional late night shopping at MEGA Don Quijote Nago</p>
                </div>
              </div>
            </article>

            <article className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur-md">
              <p className="mb-2 text-sm text-[#9EDCFF]">Tuesday, December 1, 2026</p>
              <h2 className="mb-5 text-2xl font-light">Aquarium + Kouri Island</h2>
              <div className="space-y-4 text-sm leading-7 text-white/75">
                <div className="rounded-2xl border border-white/10 bg-black/20 p-4"><p>🚗 8:45 Leave Nago Hotel</p><p>🐠 9:30 – 13:00 Churaumi Aquarium (FunPass)</p><ul className="ml-5 list-disc space-y-1 text-white/65"><li>Whale shark mega tank</li><li>Coral reef exhibits</li><li>Dolphin area outside</li><li>Ocean Expo Park seaside lawns</li></ul></div>
                <div className="rounded-2xl border border-white/10 bg-black/20 p-4"><p>🍽 Ocean Blue Cafe lunch beside the whale shark tank</p><p className="text-white/50">Put reservation name on the waitlist immediately upon arrival.</p></div>
                <div className="rounded-2xl border border-white/10 bg-black/20 p-4"><p>🌳 Bise Fukugi Tree Road</p><p>Traditional Okinawan village scenery · ideal for photos & walking.</p></div>
                <div className="rounded-2xl border border-white/10 bg-black/20 p-4"><p>🌉 Kouri Island</p><ul className="ml-5 list-disc space-y-1 text-white/65"><li>Kouri Bridge scenic drive</li><li>Café stop</li><li>Beach walk & sunset</li><li>Optional · Kouri Ocean Tower</li></ul></div>
                <div className="rounded-2xl border border-white/10 bg-black/20 p-4"><p>🍽 Dinner · Yakiniku Kochan 焼肉こうちゃん</p></div>
              </div>
            </article>
          </section>
        </main>
      </div>
    );
  }

  if (page === "nanjo") {
    return (
      <div className="min-h-screen bg-black px-6 py-10 text-white">
        {chapterNav("nanjo")}
        <main className="mx-auto max-w-5xl">
          <p className="mb-3 text-sm uppercase tracking-[0.35em] text-[#9EDCFF]">Okinawa · Nanjo</p>
          <h1 className="mb-6 text-4xl font-light tracking-wide md:text-6xl">Southern Okinawa Chapter</h1>
          {infoWidgets("December", "2 Nights", <><a href="https://www.yuinchi.jp/heal/hot-spring/" target="_blank" rel="noopener noreferrer" className="mt-1 block text-sm font-medium text-[#9EDCFF] hover:underline">Yuinchi Hotel Nanjo</a><p className="mt-1 text-[9px] text-gray-500">Apeman Spa Natural Hot Spring</p></>)}
          {peopleCards([["Xenia & David", "Nov 27 – Dec 6 · Okinawa"], ["Dave & Christina", "Nov 27 – Dec 6 · Okinawa"], ["Steven Wang", "Nov 25 – Dec 6 · Okinawa"], ["Mei & Emilia", "Nov 29 – Dec 6 · Okinawa"]])}
          <section className="space-y-8">
            <article className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur-md"><p className="mb-2 text-sm text-[#9EDCFF]">Wednesday, December 2, 2026</p><h2 className="mb-5 text-2xl font-light">Nago → Nanjo</h2><div className="space-y-4 text-sm leading-7 text-white/75"><div className="rounded-2xl border border-white/10 bg-black/20 p-4"><p>🎢 Kids 4+ & adults · Junglia Park</p><a href="https://junglia.jp/en" target="_blank" rel="noopener noreferrer" className="text-[#9EDCFF] hover:underline">junglia.jp/en</a></div><div className="rounded-2xl border border-white/10 bg-black/20 p-4"><p>🍍 Morning backup for kids under 4 · Nago Pineapple Park OR Neo Park Zoo (FunPass)</p></div><div className="rounded-2xl border border-white/10 bg-black/20 p-4"><p>🌊 Late Afternoon · Miyagi Coast & American Village (~1 hr drive)</p><ul className="ml-5 list-disc space-y-1 text-white/65"><li>Blue Seal Ice Cream (FunPass)</li><li>Zhyvago Coffee Roastery · great vibes</li><li>Chatan Burger Base Atabii's · burgers right on the water</li></ul></div><div className="rounded-2xl border border-white/10 bg-black/20 p-4"><p>🍽 Dinner · Taco Rice Cafe Kijimuna</p><p className="text-white/50">Famous for Omutaco（蛋包塔可飯）— taco rice topped with fluffy omelet, usually a big hit with kids.</p></div><div className="rounded-2xl border border-white/10 bg-black/20 p-4"><p>🚗 Evening drive toward Nanjo (~40 min)</p><p>🛒 Optional stop · Costco Okinawa</p></div></div></article>
            <article className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur-md"><p className="mb-2 text-sm text-[#9EDCFF]">Thursday, December 3, 2026</p><h2 className="mb-5 text-2xl font-light">Nanjo · Okinawa World + Gangala Valley</h2><div className="space-y-4 text-sm leading-7 text-white/75"><div className="rounded-2xl border border-white/10 bg-black/20 p-4"><p>🍳 Breakfast · Hotel buffet</p><p>🌏 Okinawa World（玉泉洞）· FunPass · ~10 min drive from hotel</p><ul className="ml-5 list-disc space-y-1 text-white/65"><li>玉泉洞鐘乳石洞</li><li>琉球文化村</li><li>太鼓舞表演</li></ul></div><div className="rounded-2xl border border-white/10 bg-black/20 p-4"><p>🌿 Gangala Valley</p><p>Navigate to Cave Cafe or Gangala Valley. Free parking available.</p><p className="mt-2 text-white/50">A famous natural valley formed by ancient limestone cave collapse, known for forest scenery, the Minatogawa people archaeological site, and the Cave Cafe. Guided tour reservation required, approximately ¥2,500/person.</p><a href="https://book.gangala.com/?lng=zh-TW" target="_blank" rel="noopener noreferrer" className="mt-2 inline-block text-[#9EDCFF] hover:underline">Gangala Valley reservation</a></div><div className="rounded-2xl border border-white/10 bg-black/20 p-4"><p>🍽 Dinner · Hotel Japanese Dinner Buffet</p><p className="text-white/50">Alternative: private event can be arranged for Hotel Observation Lounge catering experience up to 10 people.</p></div></div></article>
          </section>
        </main>
      </div>
    );
  }
  if (page === "naha") {
    return (
      <div className="min-h-screen bg-black px-6 py-10 text-white">
        {chapterNav("naha")}
        <main className="mx-auto max-w-5xl">
          <p className="mb-3 text-sm uppercase tracking-[0.35em] text-[#9EDCFF]">Okinawa · Naha</p>
          <h1 className="mb-6 text-4xl font-light tracking-wide md:text-6xl">Final Naha Chapter</h1>
          {infoWidgets("December", "2 Nights", <><p className="mt-1 text-sm font-medium text-[#9EDCFF]">Hotel Strata Naha</p><p className="mt-1 text-[9px] text-gray-500">or Hotel JAL City Naha</p></>)}
          {peopleCards([["Xenia & David", "Nov 27 – Dec 6 · Okinawa"], ["Dave & Christina", "Nov 27 – Dec 6 · Okinawa"], ["Steven Wang", "Nov 25 – Dec 6 · Okinawa"], ["Mei & Emilia", "Nov 29 – Dec 6 · Okinawa"]])}
          <section className="space-y-8">
            <article className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur-md">
              <p className="mb-2 text-sm text-[#9EDCFF]">Friday, December 4, 2026</p>
              <h2 className="mb-5 text-2xl font-light">Nanjo → Naha</h2>
              <div className="space-y-4 text-sm leading-7 text-white/75">
                <div className="rounded-2xl border border-white/10 bg-black/20 p-4"><p>🐟 Tomari Iyumachi Fish Market Brunch · 11:00 AM</p></div>
                <div className="rounded-2xl border border-white/10 bg-black/20 p-4"><p className="mb-2 text-xs uppercase tracking-[0.2em] text-[#9EDCFF]">Afternoon · Option 1</p><p>🏯 Shuri Castle</p><p className="text-white/50">If rebuilt and reopened by Fall 2026.</p></div>
                <div className="rounded-2xl border border-white/10 bg-black/20 p-4"><p className="mb-2 text-xs uppercase tracking-[0.2em] text-[#9EDCFF]">Afternoon · Option 2</p><ul className="ml-5 list-disc space-y-1 text-white/65"><li>Kokusai 國際通</li><li>Calbee Okinawa</li><li>御果子御殿</li><li>Tsuboya Pottery Street</li></ul></div>
              </div>
            </article>
            <article className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur-md">
              <p className="mb-2 text-sm text-[#9EDCFF]">Saturday, December 5, 2026</p>
              <h2 className="mb-5 text-2xl font-light">Shopping + Aquarium Day</h2>
              <div className="space-y-4 text-sm leading-7 text-white/75">
                <div className="rounded-2xl border border-white/10 bg-black/20 p-4"><p>🍳 Hotel breakfast buffet</p><p>🧳 Checkout at 11:00 AM</p></div>
                <div className="rounded-2xl border border-white/10 bg-black/20 p-4"><ul className="ml-5 list-disc space-y-1 text-white/65"><li>🐟 Itoman Fish Market 系滿農夫市集</li><li>🛍 Ashibinaa Outlet</li><li>🐠 DMM Kariyushi Aquarium (FunPass)</li></ul></div>
              </div>
            </article>
            <article className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur-md">
              <p className="mb-2 text-sm text-[#9EDCFF]">Sunday, December 6, 2026</p>
              <h2 className="mb-5 text-2xl font-light">Departure Day</h2>
              <div className="space-y-4 text-sm leading-7 text-white/75">
                <div className="rounded-2xl border border-white/10 bg-black/20 p-4"><p>🧳 Hotel checkout at 7:15 AM</p><p>✈️ Arrive Naha Airport around 8:00 AM</p><p className="text-white/50">~20 min drive + extra ~20 min return car processing</p></div>
                <div className="rounded-2xl border border-white/10 bg-black/20 p-4"><p>✈️ EVA Air BR113</p><p>OKA 10:15 → TPE 10:55</p></div>
              </div>
            </article>
          </section>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <style>{`
        .timeline-highlight { position: absolute; }
        .timeline-highlight::after {
          content: "";
          position: absolute;
          right: -4px;
          top: 50%;
          width: 8px;
          height: 8px;
          border-radius: 9999px;
          background: currentColor;
          box-shadow: 0 0 12px currentColor;
          transform: translateY(-50%);
        }
      `}</style>
      <section className="relative flex min-h-screen flex-col items-center justify-start overflow-visible px-6 pb-10 pt-16 md:h-[90vh] md:min-h-0 md:justify-center md:overflow-hidden md:pt-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.06),transparent_55%)]" />
        <div className="relative z-10 flex w-full max-w-5xl items-center justify-center gap-6 md:gap-20">
          <div className="relative h-[300px] w-[147px] md:h-[495px] md:w-[243px]">
            <svg viewBox="0 0 140 260" className="h-full w-full object-contain opacity-90" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M110 0 L105 0 L94 12 L80 16 L69 24 L58 47 L47 57 L29 90 L10 117 L8 147 L0 173 L10 181 L16 205 L21 213 L43 230 L48 242 L47 254 L50 259 L61 254 L62 227 L68 210 L84 193 L98 163 L107 132 L113 96 L130 61 L127 36 L139 24 L134 15 L120 10 Z" />
              {isSection1Visible && <><SvgPin id="taipei" scale={0.9} labelFontSize={8} labelOffset={12} label="Taipei" cx={108} cy={18} hovered={hovered} setHovered={setHovered} activeColor={TAIWAN_GOLD} /><SvgPin id="xiaoliuqiu" scale={0.9} labelFontSize={8} labelOffset={12} label="Xiaoliuqiu" cx={39} cy={234} hovered={hovered} setHovered={setHovered} activeColor={TAIWAN_GOLD} onDoubleClick={() => setPage("xiaoliuqiu")} /></>}
              {isSection2Visible && <SvgPin id="yilan" scale={0.9} labelFontSize={8} labelOffset={12} label="Yilan" cx={120} cy={45} hovered={hovered} setHovered={setHovered} activeColor={TAIWAN_GOLD} />}
            </svg>
          </div>

          {isSection1Visible && (
            <div className="relative h-[220px] w-[220px] md:h-[335px] md:w-[335px]" style={{ transform: "translateY(-2.25rem)" }}>
              <svg viewBox="0 0 331 520" className="h-full w-full object-contain" fill="none" stroke={isOkinawaIslandHover ? BABY_BLUE : "white"} strokeWidth={isOkinawaIslandHover ? 4 : 3} style={{ opacity: isOkinawaIslandHover ? 1 : 0.9 }} strokeLinecap="round" strokeLinejoin="round">
                <path onMouseEnter={() => setHovered("okinawa")} onMouseLeave={() => setHovered(null)} d="M291 5 L282 5 L280 12 L283 27 L277 42 L262 65 L257 79 L251 83 L242 82 L239 85 L238 90 L243 93 L243 97 L237 105 L223 112 L216 127 L222 134 L213 135 L212 144 L209 147 L196 150 L192 156 L180 154 L177 160 L169 160 L162 154 L164 149 L173 147 L181 151 L185 145 L176 133 L167 132 L167 125 L154 124 L142 115 L130 115 L121 120 L113 118 L106 120 L104 136 L111 144 L108 157 L110 173 L120 186 L134 182 L141 189 L158 192 L159 204 L124 235 L120 235 L115 244 L108 240 L99 244 L89 264 L80 273 L74 287 L62 285 L53 293 L40 288 L35 291 L36 314 L54 350 L53 358 L60 367 L60 377 L52 380 L47 389 L36 391 L27 407 L19 405 L17 418 L20 426 L8 425 L5 431 L4 441 L10 448 L10 456 L19 465 L19 468 L15 470 L15 479 L20 486 L19 507 L23 514 L32 516 L41 509 L51 507 L69 484 L85 479 L89 470 L103 459 L103 450 L97 438 L92 435 L85 437 L79 449 L68 431 L79 420 L80 408 L84 400 L94 391 L90 379 L97 374 L98 369 L107 367 L102 355 L112 346 L120 361 L132 374 L140 372 L139 361 L118 333 L115 321 L108 318 L95 298 L99 294 L99 289 L111 279 L138 279 L141 284 L147 282 L150 278 L149 272 L153 269 L162 269 L175 254 L172 245 L174 240 L182 241 L194 232 L196 224 L192 217 L195 214 L221 219 L229 211 L237 209 L240 204 L239 199 L245 189 L237 183 L236 179 L244 164 L253 161 L266 166 L277 159 L286 157 L290 153 L292 142 L304 129 L311 105 L325 84 L322 73 L327 59 L322 50 L320 35 L309 24 L310 18 L298 13 Z" style={isOkinawaIslandHover ? { filter: "drop-shadow(0 0 10px rgba(158,220,255,0.9))" } : undefined} />
                <SvgPin id="naha" scale={2.25} labelFontSize={20} labelOffset={38} label="Naha" cx={34} cy={437} hovered={hovered} setHovered={setHovered} leaveTo={null} activeColor={BABY_BLUE} onDoubleClick={() => setPage("naha")} />
                <SvgPin id="onna" scale={2.25} labelFontSize={20} labelOffset={38} label="Onna" cx={50} cy={300} hovered={hovered} setHovered={setHovered} leaveTo={null} activeColor={BABY_BLUE} onDoubleClick={() => setPage("onna")} />
                <SvgPin id="nago" scale={2.25} labelFontSize={20} labelOffset={38} label="Nago" cx={152} cy={172} hovered={hovered} setHovered={setHovered} leaveTo={null} activeColor={BABY_BLUE} onDoubleClick={() => setPage("nago")} />
                <SvgPin id="nanjo" scale={2.25} labelFontSize={20} labelOffset={38} label="Nanjo" cx={70} cy={468} hovered={hovered} setHovered={setHovered} leaveTo={null} activeColor={BABY_BLUE} onDoubleClick={() => setPage("nanjo")} />
              </svg>
            </div>
          )}
        </div>

        <div className="relative z-20 mt-2 flex flex-col items-center gap-3 px-4 text-center md:absolute md:bottom-44 md:mt-0 md:flex-row md:gap-6">
          <h1 className="text-2xl font-light leading-tight tracking-wide md:text-4xl">Taiwan · Okinawa Japan</h1>
          <div className="origin-center scale-75 rounded-3xl border border-white/10 bg-white/[0.04] px-4 py-2.5 backdrop-blur-md">
            <p className="mb-3 text-xs uppercase tracking-[0.3em] text-[#9EDCFF]">Countdown to Departure</p>
            <div className="grid grid-cols-4 gap-3 text-center"><div><p className="text-xl font-light md:text-2xl">{countdownDays}</p><p className="text-[9px] text-gray-400">Days</p></div><div><p className="text-xl font-light md:text-2xl">{countdownHours}</p><p className="text-[9px] text-gray-400">Hours</p></div><div><p className="text-xl font-light md:text-2xl">{countdownMinutes}</p><p className="text-[9px] text-gray-400">Min</p></div><div><p className="text-xl font-light md:text-2xl">{countdownSeconds}</p><p className="text-[9px] text-gray-400">Sec</p></div></div>
            <p className="mt-3 text-xs text-gray-400">Nov 19 · YYZ → TPE</p>
          </div>
        </div>

        <Timeline />
      </section>
    </div>
  );
}
