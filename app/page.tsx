"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";

const MS_PER_DAY = 1000 * 60 * 60 * 24;
const BABY_BLUE = "#9EDCFF";
const BABY_BLUE_SHADOW = "0 0 12px rgba(158,220,255,0.9)";
const TAIWAN_GOLD = "#FFD76A";
const TAIWAN_GOLD_SHADOW = "0 0 14px rgba(255,215,106,0.95)";

type PageName = "map" | "onna" | "overlap";

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
  scale?: number;
  onTouchStart?: () => void;
  labelFontSize?: number;
  labelOffset?: number;
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
  scale = 1,
  onTouchStart,
  labelFontSize = 14,
  labelOffset = 28,
}: SvgPinProps) {
  const isActive = hovered === id;
  const active = activeColor || "white";
  const pinGlow =
    activeColor === BABY_BLUE
      ? "drop-shadow(0 0 4px rgba(158,220,255,0.85)) drop-shadow(0 0 10px rgba(158,220,255,0.45))"
      : "drop-shadow(0 0 4px rgba(255,255,255,0.75)) drop-shadow(0 0 10px rgba(255,255,255,0.35))";

  return (
    <g
      style={{ cursor: onClick ? "pointer" : "default" }}
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
      onTouchStart={(event) => {
        event.stopPropagation();
        setHovered(id);
        onTouchStart?.();
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
  const [now, setNow] = useState(new Date());
  const [selectedTimelineSectionId, setSelectedTimelineSectionId] = useState(1);
  const timelineScrollRef = useRef<HTMLDivElement | null>(null);

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
  const timelineEnd = useMemo(() => new Date(2027, 0, 31), []);
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
  const yilanTripStart = getTimelinePercent(new Date(2026, 11, 9), timelineStart, timelineEnd);
  const yilanTripEnd = getTimelinePercent(new Date(2026, 11, 12), timelineStart, timelineEnd);

  const isOkinawaIslandHover = hovered === "okinawa";
  const isOnnaHover = hovered === "onna";
  const isNagoHover = hovered === "nago";
  const isNanjoHover = hovered === "nanjo";
  const isNahaHover = hovered === "naha";
  const showFullOkinawaTimeline = isOkinawaIslandHover;

  const timelineSections = [
    { id: 1, label: "Section 1", start: new Date(2026, 10, 20), end: new Date(2026, 11, 8) },
    { id: 2, label: "Section 2", start: new Date(2026, 11, 8), end: new Date(2026, 11, 26) },
    { id: 3, label: "Section 3", start: new Date(2026, 11, 26), end: new Date(2027, 0, 13) },
    { id: 4, label: "Section 4", start: new Date(2027, 0, 13), end: new Date(2027, 0, 31) },
  ];

  const visibleTimelineDays = 18;
  const timelineTotalDays = (timelineEnd.getTime() - timelineStart.getTime()) / MS_PER_DAY;
  const timelineInnerWidthPercent = 100;

  const activeTimelineRange = (() => {
    if (hovered === "taipei") {
      return {
        start: getTimelinePercent(new Date(2026, 10, 23), timelineStart, timelineEnd),
        end: getTimelinePercent(new Date(2026, 10, 27), timelineStart, timelineEnd),
      };
    }

    if (hovered === "xiaoliuqiu") return { start: xiaoliuqiuStart, end: xiaoliuqiuEnd };
    if (showFullOkinawaTimeline) return { start: okinawaStart, end: okinawaEnd };
    if (isOnnaHover) return { start: onnaStart, end: onnaEnd };
    if (isNagoHover) return { start: nagoStart, end: nagoEnd };
    if (isNanjoHover) return { start: nanjoStart, end: nanjoEnd };
    if (isNahaHover) return { start: nahaStart, end: nahaEnd };
    return null;
  })();

  const hoverTimelineSection = (() => {
    if (!hovered) return null;

    if (hovered === "yilan") return timelineSections[1];

    if (["taipei", "xiaoliuqiu", "okinawa", "onna", "nago", "nanjo", "naha"].includes(hovered)) {
      return timelineSections[0];
    }

    return null;
  })();

  const selectedTimelineSection = timelineSections.find((section) => section.id === selectedTimelineSectionId) || timelineSections[0];
  const activeTimelineSection = hoverTimelineSection || selectedTimelineSection;
  const sectionDates = useMemo(
    () => buildDateRange(activeTimelineSection.start, activeTimelineSection.end),
    [activeTimelineSection.start, activeTimelineSection.end]
  );

  const getSectionPercent = (targetDate: Date) => getTimelinePercent(targetDate, activeTimelineSection.start, activeTimelineSection.end);

  useEffect(() => {
    const timeline = timelineScrollRef.current;
    if (!timeline) return;

    timeline.scrollTo({
      left: 0,
      behavior: "smooth",
    });
  }, [activeTimelineSection.id, timelineStart, timelineEnd]);

  const departureDate = new Date(2026, 10, 19, 0, 0, 0);
  const countdownMs = Math.max(departureDate.getTime() - now.getTime(), 0);
  const countdownDays = Math.floor(countdownMs / MS_PER_DAY);
  const countdownHours = Math.floor((countdownMs % MS_PER_DAY) / (1000 * 60 * 60));
  const countdownMinutes = Math.floor((countdownMs % (1000 * 60 * 60)) / (1000 * 60));
  const countdownSeconds = Math.floor((countdownMs % (1000 * 60)) / 1000);

  const mobileTimelineItems = {
    1: [
      { id: "xiaoliuqiu", label: "Xiaoliuqiu", range: "Nov 20–23", color: "taiwan" },
      { id: "taipei", label: "Taipei", range: "Nov 23–27", color: "taiwan" },
      { id: "onna", label: "Onna", range: "Nov 27–30", color: "okinawa" },
      { id: "nago", label: "Nago", range: "Nov 30–Dec 2", color: "okinawa" },
      { id: "nanjo", label: "Nanjo", range: "Dec 2–4", color: "okinawa" },
      { id: "naha", label: "Naha", range: "Dec 4–6", color: "okinawa" },
    ],
    2: [
      { id: "yilan", label: "Yilan", range: "Dec 9–12", color: "taiwan" },
    ],
    3: [],
    4: [],
  };

  const Timeline = () => (
    <div className="absolute bottom-4 left-0 w-full px-4 md:px-6">
      <div className="mx-auto max-w-5xl">
        <div className="mb-2 flex items-center justify-between gap-3 px-2">
          <div className="flex flex-wrap items-center gap-1.5">
            {timelineSections.map((section) => {
              const isActive = activeTimelineSection.id === section.id;
              return (
                <button
                  key={section.id}
                  type="button"
                  onClick={() => {
                    setHovered(null);
                    setSelectedTimelineSectionId(section.id);
                  }}
                  className={`rounded-full border px-2.5 py-1 text-[9px] uppercase tracking-[0.16em] transition ${
                    isActive
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
          {(mobileTimelineItems[activeTimelineSection.id as keyof typeof mobileTimelineItems] || []).map((item) => {
            const isTaiwan = item.color === "taiwan";
            const isActive = hovered === item.id;

            return (
              <button
                key={item.id}
                type="button"
                onTouchStart={() => setHovered(item.id)}
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
                  <div
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: isTaiwan ? TAIWAN_GOLD : BABY_BLUE }}
                  />
                  <span className="text-sm font-light tracking-wide text-white">
                    {item.label}
                  </span>
                </div>

                <span className="text-[10px] uppercase tracking-[0.18em] text-white/45">
                  {item.range}
                </span>
              </button>
            );
          })}
        </div>

        <div
          ref={timelineScrollRef}
          className="relative hidden overflow-x-auto overflow-y-hidden px-2 py-6 md:block [mask-image:linear-gradient(to_right,transparent,black_8%,black_92%,transparent)] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          <div className="relative h-[2px] bg-white/30" style={{ width: `${timelineInnerWidthPercent}%` }}>
            <div
              className="absolute -top-5 h-10 cursor-pointer"
              style={{ left: `${getSectionPercent(new Date(2026, 10, 20))}%`, width: `${getSectionPercent(new Date(2026, 10, 23)) - getSectionPercent(new Date(2026, 10, 20))}%` }}
              onMouseEnter={() => setHovered("xiaoliuqiu")}
              onMouseLeave={() => setHovered(null)}
              onTouchStart={(event) => {
                event.stopPropagation();
                setHovered("xiaoliuqiu");
              }}
              aria-label="Highlight Xiaoliuqiu Nov 20 to Nov 23"
            />

            <div
              className="absolute -top-5 h-10 cursor-pointer"
              style={{ left: `${getSectionPercent(new Date(2026, 10, 23))}%`, width: `${getSectionPercent(new Date(2026, 10, 27)) - getSectionPercent(new Date(2026, 10, 23))}%` }}
              onMouseEnter={() => setHovered("taipei")}
              onMouseLeave={() => setHovered(null)}
              onTouchStart={(event) => {
                event.stopPropagation();
                setHovered("taipei");
              }}
              aria-label="Highlight Taipei Nov 23 to Nov 27"
            />

            <div
              className="absolute -top-5 h-10 cursor-pointer"
              style={{ left: `${getSectionPercent(new Date(2026, 11, 9))}%`, width: `${getSectionPercent(new Date(2026, 11, 12)) - getSectionPercent(new Date(2026, 11, 9))}%` }}
              onMouseEnter={() => setHovered("yilan")}
              onMouseLeave={() => setHovered(null)}
              onTouchStart={(event) => {
                event.stopPropagation();
                setHovered("yilan");
              }}
              aria-label="Highlight Yilan Dec 9 to Dec 12"
            />

            <div
              className="absolute -top-5 h-10 cursor-pointer"
              style={{ left: `${getSectionPercent(new Date(2026, 10, 27))}%`, width: `${getSectionPercent(new Date(2026, 10, 30)) - getSectionPercent(new Date(2026, 10, 27))}%` }}
              onMouseEnter={() => setHovered("onna")}
              onMouseLeave={() => setHovered(null)}
              onTouchStart={(event) => {
                event.stopPropagation();
                setHovered("onna");
              }}
              aria-label="Highlight Onna Nov 27 to Nov 30"
            />

            <div
              className="absolute -top-5 h-10 cursor-pointer"
              style={{ left: `${getSectionPercent(new Date(2026, 10, 30))}%`, width: `${getSectionPercent(new Date(2026, 11, 2)) - getSectionPercent(new Date(2026, 10, 30))}%` }}
              onMouseEnter={() => setHovered("nago")}
              onMouseLeave={() => setHovered(null)}
              onTouchStart={(event) => {
                event.stopPropagation();
                setHovered("nago");
              }}
              aria-label="Highlight Nago Nov 30 to Dec 2"
            />

            <div
              className="absolute -top-5 h-10 cursor-pointer"
              style={{ left: `${getSectionPercent(new Date(2026, 11, 2))}%`, width: `${getSectionPercent(new Date(2026, 11, 4)) - getSectionPercent(new Date(2026, 11, 2))}%` }}
              onMouseEnter={() => setHovered("nanjo")}
              onMouseLeave={() => setHovered(null)}
              onTouchStart={(event) => {
                event.stopPropagation();
                setHovered("nanjo");
              }}
              aria-label="Highlight Nanjo Dec 2 to Dec 4"
            />

            <div
              className="absolute -top-5 h-10 cursor-pointer"
              style={{ left: `${getSectionPercent(new Date(2026, 11, 4))}%`, width: `${getSectionPercent(new Date(2026, 11, 6)) - getSectionPercent(new Date(2026, 11, 4))}%` }}
              onMouseEnter={() => setHovered("naha")}
              onMouseLeave={() => setHovered(null)}
              onTouchStart={(event) => {
                event.stopPropagation();
                setHovered("naha");
              }}
              aria-label="Highlight Naha Dec 4 to Dec 6"
            />

            {hovered === "taipei" && (
              <div
                className="timeline-highlight top-0 h-[2px] text-[#FFD76A]"
                style={{ left: `${getSectionPercent(new Date(2026, 10, 23))}%`, width: `${getSectionPercent(new Date(2026, 10, 27)) - getSectionPercent(new Date(2026, 10, 23))}%`, backgroundColor: TAIWAN_GOLD, boxShadow: TAIWAN_GOLD_SHADOW }}
              />
            )}

            {hovered === "xiaoliuqiu" && (
              <div
                className="timeline-highlight top-0 h-[2px] text-[#FFD76A]"
                style={{ left: `${getSectionPercent(new Date(2026, 10, 20))}%`, width: `${getSectionPercent(new Date(2026, 10, 23)) - getSectionPercent(new Date(2026, 10, 20))}%`, backgroundColor: TAIWAN_GOLD, boxShadow: TAIWAN_GOLD_SHADOW }}
              />
            )}

            {hovered === "yilan" && (
              <div
                className="timeline-highlight top-0 h-[2px] text-[#9EDCFF]"
                style={{ left: `${getSectionPercent(new Date(2026, 11, 9))}%`, width: `${getSectionPercent(new Date(2026, 11, 12)) - getSectionPercent(new Date(2026, 11, 9))}%`, backgroundColor: TAIWAN_GOLD, boxShadow: TAIWAN_GOLD_SHADOW }}
              />
            )}

            {showFullOkinawaTimeline && (
              <div
                className="timeline-highlight top-0 h-[2px] text-[#9EDCFF]"
                style={{ left: `${getSectionPercent(new Date(2026, 10, 27))}%`, width: `${getSectionPercent(new Date(2026, 11, 6)) - getSectionPercent(new Date(2026, 10, 27))}%`, backgroundColor: BABY_BLUE, boxShadow: BABY_BLUE_SHADOW }}
              />
            )}

            {isOnnaHover && (
              <div
                className="timeline-highlight top-0 h-[2px] text-[#9EDCFF]"
                style={{ left: `${getSectionPercent(new Date(2026, 10, 27))}%`, width: `${getSectionPercent(new Date(2026, 10, 30)) - getSectionPercent(new Date(2026, 10, 27))}%`, backgroundColor: BABY_BLUE, boxShadow: BABY_BLUE_SHADOW }}
              />
            )}

            {isNagoHover && (
              <div
                className="timeline-highlight top-0 h-[2px] text-[#9EDCFF]"
                style={{ left: `${getSectionPercent(new Date(2026, 10, 30))}%`, width: `${getSectionPercent(new Date(2026, 11, 2)) - getSectionPercent(new Date(2026, 10, 30))}%`, backgroundColor: BABY_BLUE, boxShadow: BABY_BLUE_SHADOW }}
              />
            )}

            {isNanjoHover && (
              <div
                className="timeline-highlight top-0 h-[2px] text-[#9EDCFF]"
                style={{ left: `${getSectionPercent(new Date(2026, 11, 2))}%`, width: `${getSectionPercent(new Date(2026, 11, 4)) - getSectionPercent(new Date(2026, 11, 2))}%`, backgroundColor: BABY_BLUE, boxShadow: BABY_BLUE_SHADOW }}
              />
            )}

            {isNahaHover && (
              <div
                className="timeline-highlight top-0 h-[2px] text-[#9EDCFF]"
                style={{ left: `${getSectionPercent(new Date(2026, 11, 4))}%`, width: `${getSectionPercent(new Date(2026, 11, 6)) - getSectionPercent(new Date(2026, 11, 4))}%`, backgroundColor: BABY_BLUE, boxShadow: BABY_BLUE_SHADOW }}
              />
            )}

            {sectionDates.map((date, index) => {
              const isOkinawaRange =
                (date.getMonth() === 10 && date.getDate() >= 27) ||
                (date.getMonth() === 11 && date.getDate() <= 6);
              const isOnnaRange = date.getMonth() === 10 && date.getDate() >= 27 && date.getDate() <= 30;
              const isNagoRange =
                (date.getMonth() === 10 && date.getDate() >= 30) ||
                (date.getMonth() === 11 && date.getDate() <= 2);
              const isNanjoRange = date.getMonth() === 11 && date.getDate() >= 2 && date.getDate() <= 4;
              const isNahaRange = date.getMonth() === 11 && date.getDate() >= 4 && date.getDate() <= 6;
              const isYilanRange = date.getMonth() === 11 && date.getDate() >= 9 && date.getDate() <= 12;
              const highlightYilan = hovered === "yilan" && isYilanRange;
              const isTaipeiRange = date.getMonth() === 10 && date.getDate() >= 23 && date.getDate() <= 27;
              const highlightTaipei = hovered === "taipei" && isTaipeiRange;
              const isXiaoliuqiuRange = date.getMonth() === 10 && date.getDate() >= 20 && date.getDate() <= 23;
              const highlightXiaoliuqiu = hovered === "xiaoliuqiu" && isXiaoliuqiuRange;
              const highlightOkinawa = showFullOkinawaTimeline && isOkinawaRange;
              const highlightOnna = isOnnaHover && isOnnaRange;
              const highlightNago = isNagoHover && isNagoRange;
              const highlightNanjo = isNanjoHover && isNanjoRange;
              const highlightNaha = isNahaHover && isNahaRange;
              const highlightTimeline = highlightOkinawa || highlightOnna || highlightNago || highlightNanjo || highlightNaha || highlightYilan || highlightTaipei || highlightXiaoliuqiu;
              const monthLabel = date.getMonth() === 10 ? "Nov" : date.getMonth() === 11 ? "Dec" : "Jan";
              const label = `${monthLabel} ${date.getDate()}`;

              return (
                <div
                  key={`${date.getMonth()}-${date.getDate()}`}
                  className="absolute top-1/2 -translate-y-1/2"
                  style={{ left: `${(index / (sectionDates.length - 1)) * 100}%` }}
                >
                  <div
                    className={`h-2 w-px ${highlightTimeline ? "" : "bg-white/50"}`}
                    style={
                      highlightYilan || highlightTaipei || highlightXiaoliuqiu
                        ? { backgroundColor: TAIWAN_GOLD }
                        : highlightTimeline
                          ? { backgroundColor: BABY_BLUE }
                          : undefined
                    }
                  />
                  <div
                    className={`mt-2 -translate-x-1/2 whitespace-nowrap text-[8px] transition-all ${highlightTimeline ? "font-semibold" : "text-gray-500"}`}
                    style={
                        highlightYilan || highlightTaipei || highlightXiaoliuqiu
                          ? { color: TAIWAN_GOLD }
                          : highlightTimeline
                            ? { color: BABY_BLUE }
                            : undefined
                      }
                  >
                    {label}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );

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
                    <div
                      key={`${person.name}-${index}`}
                      className="absolute top-0 h-4 rounded-full"
                      style={{ left: `${segment.left}%`, width: `${segment.width}%`, backgroundColor: BABY_BLUE }}
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
            </article>

            <article className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur-md">
              <p className="mb-2 text-sm text-[#9EDCFF]">Saturday, November 28, 2026</p>
              <h2 className="mb-5 text-2xl font-light">Resort Day · Beach / Culture / Blue Cave</h2>
              <div className="space-y-3 text-sm leading-7 text-white/75">
                <p>Breakfast · Hotel buffet</p>
                <p>Option 1 · Resort & beach activities</p>
                <p>Option 2 · Ryukyu Mura with FunPass</p>
                <p>Option 3 · Blue Cave dive / snorkel 青之洞窟潛水 if weather permits</p>
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
      <style>{`
        .timeline-highlight {
          position: absolute;
        }

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

      <section className="relative flex h-[90vh] items-center justify-center overflow-hidden px-6">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.06),transparent_55%)]" />

        <div className="relative z-10 flex w-full max-w-5xl items-center justify-center gap-10 md:gap-20">
          <div className="relative h-[426px] w-[208px] md:h-[495px] md:w-[243px]">
            <svg viewBox="0 0 140 260" className="h-full w-full object-contain opacity-90" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M110 0 L105 0 L94 12 L80 16 L69 24 L58 47 L47 57 L29 90 L10 117 L8 147 L0 173 L10 181 L16 205 L21 213 L43 230 L48 242 L47 254 L50 259 L61 254 L62 227 L68 210 L84 193 L98 163 L107 132 L113 96 L130 61 L127 36 L139 24 L134 15 L120 10 Z" />
              <SvgPin id="taipei" scale={0.5} labelFontSize={8} labelOffset={12} label="Taipei" cx={108} cy={18} hovered={hovered} setHovered={setHovered} />
              <SvgPin id="xiaoliuqiu" scale={0.5} labelFontSize={8} labelOffset={12} label="Xiaoliuqiu" cx={39} cy={234} hovered={hovered} setHovered={setHovered} />
              <SvgPin id="yilan" scale={0.5} labelFontSize={8} labelOffset={12} label="Yilan" cx={120} cy={45} hovered={hovered} setHovered={setHovered} />
            </svg>
          </div>

          <div
            className="relative h-[275px] w-[275px] md:h-[335px] md:w-[335px]"
            style={{ transform: "translateY(-5.5rem)" }}
          >
            <svg
              viewBox="0 0 331 520"
              className="h-full w-full object-contain"
              fill="none"
              stroke={isOkinawaIslandHover ? BABY_BLUE : "white"}
              strokeWidth={isOkinawaIslandHover ? 4 : 3}
              style={{ opacity: isOkinawaIslandHover ? 1 : 0.9 }}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path
                onMouseEnter={() => setHovered("okinawa")}
                onMouseLeave={() => setHovered(null)}
                d="M291 5 L282 5 L280 12 L283 27 L277 42 L262 65 L257 79 L251 83 L242 82 L239 85 L238 90 L243 93 L243 97 L237 105 L223 112 L216 127 L222 134 L213 135 L212 144 L209 147 L196 150 L192 156 L180 154 L177 160 L169 160 L162 154 L164 149 L173 147 L181 151 L185 145 L176 133 L167 132 L167 125 L154 124 L142 115 L130 115 L121 120 L113 118 L106 120 L104 136 L111 144 L108 157 L110 173 L120 186 L134 182 L141 189 L158 192 L159 204 L124 235 L120 235 L115 244 L108 240 L99 244 L89 264 L80 273 L74 287 L62 285 L53 293 L40 288 L35 291 L36 314 L54 350 L53 358 L60 367 L60 377 L52 380 L47 389 L36 391 L27 407 L19 405 L17 418 L20 426 L8 425 L5 431 L4 441 L10 448 L10 456 L19 465 L19 468 L15 470 L15 479 L20 486 L19 507 L23 514 L32 516 L41 509 L51 507 L69 484 L85 479 L89 470 L103 459 L103 450 L97 438 L92 435 L85 437 L79 449 L68 431 L79 420 L80 408 L84 400 L94 391 L90 379 L97 374 L98 369 L107 367 L102 355 L112 346 L120 361 L132 374 L140 372 L139 361 L118 333 L115 321 L108 318 L95 298 L99 294 L99 289 L111 279 L138 279 L141 284 L147 282 L150 278 L149 272 L153 269 L162 269 L175 254 L172 245 L174 240 L182 241 L194 232 L196 224 L192 217 L195 214 L221 219 L229 211 L237 209 L240 204 L239 199 L245 189 L237 183 L236 179 L244 164 L253 161 L266 166 L277 159 L286 157 L290 153 L292 142 L304 129 L311 105 L325 84 L322 73 L327 59 L322 50 L320 35 L309 24 L310 18 L298 13 Z"
                style={isOkinawaIslandHover ? { filter: "drop-shadow(0 0 10px rgba(158,220,255,0.9))" } : undefined}
              />
              <SvgPin id="naha" scale={1.5} labelFontSize={20} labelOffset={38} label="Naha" cx={34} cy={437} hovered={hovered} setHovered={setHovered} leaveTo={null} activeColor={BABY_BLUE} />
              <SvgPin id="onna" scale={1.5} labelFontSize={20} labelOffset={38} label="Onna" cx={50} cy={300} hovered={hovered} setHovered={setHovered} leaveTo={null} activeColor={BABY_BLUE} onClick={() => setPage("onna")} />
              <SvgPin id="nago" scale={1.5} labelFontSize={20} labelOffset={38} label="Nago" cx={152} cy={172} hovered={hovered} setHovered={setHovered} leaveTo={null} activeColor={BABY_BLUE} />
              <SvgPin id="nanjo" scale={1.5} labelFontSize={20} labelOffset={38} label="Nanjo" cx={70} cy={468} hovered={hovered} setHovered={setHovered} leaveTo={null} activeColor={BABY_BLUE} />
            </svg>
          </div>
        </div>

        <div className="absolute bottom-40 z-20 flex flex-col items-center gap-3 px-4 text-center md:bottom-44 md:flex-row md:gap-6">
          <h1 className="text-2xl font-light leading-tight tracking-wide md:text-4xl">
            Taiwan · Okinawa Japan
          </h1>

          <div className="origin-center scale-75 rounded-3xl border border-white/10 bg-white/[0.04] px-4 py-2.5 backdrop-blur-md">
            <p className="mb-3 text-xs uppercase tracking-[0.3em] text-[#9EDCFF]">Countdown to Departure</p>
            <div className="grid grid-cols-4 gap-3 text-center">
              <div><p className="text-xl font-light md:text-2xl">{countdownDays}</p><p className="text-[9px] text-gray-400">Days</p></div>
              <div><p className="text-xl font-light md:text-2xl">{countdownHours}</p><p className="text-[9px] text-gray-400">Hours</p></div>
              <div><p className="text-xl font-light md:text-2xl">{countdownMinutes}</p><p className="text-[9px] text-gray-400">Min</p></div>
              <div><p className="text-xl font-light md:text-2xl">{countdownSeconds}</p><p className="text-[9px] text-gray-400">Sec</p></div>
            </div>
            <p className="mt-3 text-xs text-gray-400">Nov 19 · YYZ → TPE</p>
          </div>
        </div>

        <Timeline />
      </section>
    </div>
  );
}
