"use client";

import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";

const MS_PER_DAY = 1000 * 60 * 60 * 24;
const BABY_BLUE = "#9EDCFF";
const TAIWAN_GOLD = "#FFD76A";

type PageName = "map" | "xiaoliuqiu" | "onna" | "nago" | "nanjo" | "naha" | "nahaearly" | "yilan" | "checklist";
type Region = "japan" | "taiwan";

type TimelineItem = {
  id: PageName | "taipei" | "yilan";
  label: string;
  range: string;
  color: "taiwan" | "okinawa" | "yilan";
};

type PackingSection = {
  title: string;
  items: string[];
};

type PackingChecklist = {
  title: string;
  sections: PackingSection[];
};

type Person = [string, string];
type DashboardSegment = { label: string; page: PageName; color: string };
type SignupTripKey = "morocco" | "skiMyoko" | "skiDeerValley" | "skiBig3" | "houston" | "azoresPortugal" | "similanThailand" | "disneyWorld" | "fiveStans";
type TripStatus = "Planning" | "Confirmed" | "Dreaming";
type RentalCarArrangement = {
  id: string;
  carName: string;
  capacity: number;
  notes: string | null;
  occupants: {
    personName: string;
    partyName: string;
    role: "driver" | "passenger";
  }[];
};

const GuestPartyContext = createContext("");

const MAX_PHOTO_UPLOAD_BYTES = 3.5 * 1024 * 1024;
const MAX_PHOTO_EDGE = 2560;

function formatFileSize(bytes: number) {
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function canvasToJpeg(canvas: HTMLCanvasElement, quality: number) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("This browser could not compress the photo.")), "image/jpeg", quality);
  });
}

async function compressPhoto(file: File) {
  const needsJpegConversion = /heic|heif/i.test(file.type) || /\.(heic|heif)$/i.test(file.name);
  if (file.size <= MAX_PHOTO_UPLOAD_BYTES && !needsJpegConversion) return file;

  const objectUrl = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = objectUrl;
    await image.decode();

    const initialScale = Math.min(1, MAX_PHOTO_EDGE / Math.max(image.naturalWidth, image.naturalHeight));
    let width = Math.max(1, Math.round(image.naturalWidth * initialScale));
    let height = Math.max(1, Math.round(image.naturalHeight * initialScale));
    let quality = 0.86;
    let compressed: Blob | null = null;

    for (let attempt = 0; attempt < 8; attempt += 1) {
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext("2d");
      if (!context) throw new Error("This browser could not prepare the photo for upload.");
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, width, height);
      context.drawImage(image, 0, 0, width, height);
      compressed = await canvasToJpeg(canvas, quality);
      if (compressed.size <= MAX_PHOTO_UPLOAD_BYTES) break;

      if (quality > 0.64) {
        quality -= 0.08;
      } else {
        width = Math.max(1, Math.round(width * 0.82));
        height = Math.max(1, Math.round(height * 0.82));
      }
    }

    if (!compressed || compressed.size > MAX_PHOTO_UPLOAD_BYTES) {
      throw new Error("The photo is still too large after compression.");
    }

    const jpegName = file.name.replace(/\.[^.]+$/, "") || "photo";
    return new File([compressed], `${jpegName}.jpg`, { type: "image/jpeg", lastModified: file.lastModified });
  } catch {
    throw new Error(`${file.name} could not be compressed. Try sharing a smaller copy or screenshot of this photo.`);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

function TripButton({
  location,
  subtitle,
  date,
  status,
  onClick,
}: {
  location: string;
  subtitle?: string;
  date: string;
  status: TripStatus;
  onClick: () => void;
}) {
  const statusStyles: Record<TripStatus, string> = {
    Planning: "border-[#FFD76A]/35 bg-[#FFD76A]/10 text-[#FFD76A]",
    Confirmed: "border-[#72E49A]/35 bg-[#72E49A]/10 text-[#72E49A]",
    Dreaming: "border-[#FF8FC7]/35 bg-[#FF8FC7]/10 text-[#FF8FC7]",
  };

  return (
    <button type="button" onClick={onClick} className="flex w-full items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4 text-left text-sm font-light tracking-wide text-white/75 transition hover:border-white/30 hover:bg-white/[0.05]">
      <span className="min-w-0">
        <span className="block">{location}</span>
        {subtitle && <span className="mt-1 block text-xs text-white/60">{subtitle}</span>}
        <span className="mt-1 block text-xs text-white/45">{date}</span>
      </span>
      <span className={`shrink-0 rounded-full border px-3 py-1 text-[10px] uppercase tracking-[0.18em] ${statusStyles[status]}`}>{status}</span>
    </button>
  );
}

function TripPanelTitle({
  location,
  subtitle,
  date,
  description,
}: {
  location: string;
  subtitle?: string;
  date: string;
  description?: string;
}) {
  return (
    <div className="mb-5">
      <h1 className="text-3xl font-light tracking-wide">
        <span className="block">{location}</span>
        {subtitle && <span className="mt-2 block text-base text-white/60">{subtitle}</span>}
        <span className="mt-2 block text-base text-white/45">{date}</span>
      </h1>
      {description && <p className="mt-4 text-sm leading-6 text-white/55">{description}</p>}
    </div>
  );
}

function MemoryMaker({
  albumKey,
  albumName,
  accentColor,
  guestName,
  returnChapter,
}: {
  albumKey: string;
  albumName: string;
  accentColor: string;
  guestName: string;
  returnChapter: string;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");

  const uploadFiles = async (selectedFiles: FileList | null) => {
    if (!selectedFiles?.length) return;
    const files = Array.from(selectedFiles);
    setIsLoading(true);
    setMessage("");
    const failures: string[] = [];
    let uploadedCount = 0;
    let compressedCount = 0;

    try {
      for (const [index, originalFile] of files.entries()) {
        try {
          const needsPreparation = originalFile.size > MAX_PHOTO_UPLOAD_BYTES || /heic|heif/i.test(originalFile.type) || /\.(heic|heif)$/i.test(originalFile.name);
          setMessage(`${needsPreparation ? "Preparing" : "Uploading"} photo ${index + 1} of ${files.length}...`);
          const file = await compressPhoto(originalFile);
          if (file !== originalFile) {
            compressedCount += 1;
            setMessage(`Uploading photo ${index + 1} of ${files.length} (${formatFileSize(originalFile.size)} compressed to ${formatFileSize(file.size)})...`);
          }

          const formData = new FormData();
          formData.append("album", albumKey);
          formData.append("albumName", albumName);
          formData.append("uploader", guestName || "Guest");
          formData.append("file", file);
          const response = await fetch("/api/memory-maker", { method: "POST", body: formData });
          const data = await response.json().catch(() => null) as { error?: string } | null;
          if (!response.ok) throw new Error(data?.error || `Unable to upload ${originalFile.name}.`);
          uploadedCount += 1;
        } catch (error) {
          failures.push(error instanceof Error ? error.message : `Unable to upload ${originalFile.name}.`);
        }
      }

      const compressionNote = compressedCount ? ` ${compressedCount} large ${compressedCount === 1 ? "photo was" : "photos were"} compressed automatically.` : "";
      if (failures.length) {
        setMessage(`${uploadedCount} of ${files.length} photos uploaded.${compressionNote} ${failures.join(" ")}`);
      } else {
        setMessage(`${uploadedCount} ${uploadedCount === 1 ? "photo" : "photos"} uploaded.${compressionNote}`);
      }
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
      setIsLoading(false);
    }
  };

  return (
    <section className="mb-10 rounded-3xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur-md">
      <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="mb-2 text-xs uppercase tracking-[0.3em]" style={{ color: accentColor }}>Memory Maker (photo-only)</p>
          <h2 className="text-2xl font-light">📸 {albumName} Memories</h2>
          <p className="mt-2 text-sm text-white/45">Share photos with everyone joining this trip segment.</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 md:min-w-[300px]">
          <input ref={fileInputRef} type="file" multiple accept="image/*" className="hidden" onChange={(event) => uploadFiles(event.target.files)} />
          <button type="button" disabled={isLoading} onClick={() => fileInputRef.current?.click()} className="rounded-full border border-white/20 bg-white/[0.04] px-5 py-3 text-sm uppercase tracking-[0.18em] text-white/70 transition hover:border-white/40 hover:bg-white/[0.08] disabled:cursor-wait disabled:opacity-50">Upload</button>
          <button type="button" onClick={() => window.open(`/memory-maker/${albumKey}?returnChapter=${encodeURIComponent(returnChapter)}&guest=${encodeURIComponent(guestName || "Guest")}`, "_blank", "noopener,noreferrer")} className="rounded-full border border-white/20 bg-white/[0.04] px-5 py-3 text-center text-sm uppercase tracking-[0.18em] text-white/70 transition hover:border-white/40 hover:bg-white/[0.08]">View Album</button>
        </div>
      </div>
      {message && <p className="mt-4 text-sm text-white/50">{message}</p>}
    </section>
  );
}

function buildDateRange(start: Date, end: Date): Date[] {
  const dates: Date[] = [];
  const current = new Date(start);
  while (current <= end) {
    dates.push(new Date(current));
    current.setDate(current.getDate() + 1);
  }
  return dates;
}

function getTimelinePercent(targetDate: Date, start: Date, end: Date): number {
  const totalDays = (end.getTime() - start.getTime()) / MS_PER_DAY;
  const dayOffset = (targetDate.getTime() - start.getTime()) / MS_PER_DAY;
  return (dayOffset / totalDays) * 100;
}

async function fetchTripSignupNames(tripKey: SignupTripKey): Promise<string[] | null> {
  try {
    const response = await fetch(`/api/trip-signups?trip=${tripKey}`);
    if (!response.ok) return null;
    const data = await response.json();
    return Array.isArray(data.names) ? data.names : [];
  } catch {
    return null;
  }
}

async function createTripSignup(tripKey: SignupTripKey, name: string): Promise<string[] | null> {
  try {
    const response = await fetch("/api/trip-signups", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ trip: tripKey, name }),
    });
    if (!response.ok) return null;
    const data = await response.json();
    return Array.isArray(data.names) ? data.names : [];
  } catch {
    return null;
  }
}

async function fetchChecklistProgress(guest: string): Promise<Record<string, boolean> | null> {
  if (!guest || guest === "I am just a random Guest") return null;
  try {
    const response = await fetch(`/api/checklist-progress?guest=${encodeURIComponent(guest)}`);
    if (!response.ok) return null;
    const data = await response.json();
    return data.progress && typeof data.progress === "object" ? data.progress : {};
  } catch {
    return null;
  }
}

async function saveChecklistProgress(guest: string, itemKey: string, checked: boolean): Promise<boolean> {
  if (!guest || guest === "I am just a random Guest") return false;
  try {
    const response = await fetch("/api/checklist-progress", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ guest, itemKey, checked }),
    });
    return response.ok;
  } catch {
    return false;
  }
}

function SvgPin({
  id,
  label,
  cx,
  cy,
  hovered,
  setHovered,
  activeColor,
  onDoubleClick,
  scale = 1,
  labelFontSize = 14,
  labelOffset = 28,
}: {
  id: string;
  label: string;
  cx: number;
  cy: number;
  hovered: string | null;
  setHovered: React.Dispatch<React.SetStateAction<string | null>>;
  activeColor: string;
  onDoubleClick?: () => void;
  scale?: number;
  labelFontSize?: number;
  labelOffset?: number;
}) {
  const active = hovered === id;
  return (
    <g
      onMouseEnter={() => setHovered(id)}
      onMouseLeave={() => setHovered(null)}
      onTouchStart={() => setHovered(id)}
      onDoubleClick={(event) => {
        event.stopPropagation();
        onDoubleClick?.();
      }}
      style={{ cursor: onDoubleClick ? "pointer" : "default" }}
    >
      <circle cx={cx} cy={cy} r={11 * scale} fill="transparent" stroke="none" />
      <circle
        cx={cx}
        cy={cy}
        r={5.2 * scale}
        fill={active ? activeColor : "white"}
        stroke="none"
        style={{
          filter: active ? `drop-shadow(0 0 8px ${activeColor})` : "none",
          transition: "all 160ms ease-out",
        }}
      />
      {active && (
        <g pointerEvents="none">
          <rect
            x={cx - label.length * labelFontSize * 0.35 - 12}
            y={cy - labelOffset - labelFontSize - 14}
            width={label.length * labelFontSize * 0.7 + 24}
            height={labelFontSize + 16}
            rx={8}
            fill="rgba(0,0,0,0.84)"
            stroke="none"
          />
          <text
            x={cx}
            y={cy - labelOffset - 12}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize={labelFontSize}
            fill="#F3F4F6"
            stroke="none"
            style={{ fontWeight: 400, letterSpacing: "0.01em", fontFamily: "Inter, -apple-system, BlinkMacSystemFont, Arial, sans-serif" }}
          >
            {label}
          </text>
        </g>
      )}
    </g>
  );
}

export default function TravelSite() {
  const [hovered, setHovered] = useState<string | null>(null);
  const [page, setPage] = useState<PageName>("map");
  const [guestName, setGuestName] = useState("");
  const [isGuestConfirmed, setIsGuestConfirmed] = useState(false);
  const [isInitialRouteReady, setIsInitialRouteReady] = useState(false);
  const [showGuestActions, setShowGuestActions] = useState(false);
  const [selectedTrip, setSelectedTrip] = useState<"" | "morocco" | "taiwan" | "okinawaJapan" | "skiMyoko" | "skiDeerValley" | "skiBig3" | "houston" | "azoresPortugal" | "similanThailand" | "disneyWorld" | "fiveStans">("");
  const [moroccoInterestedNames, setMoroccoInterestedNames] = useState<string[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      return JSON.parse(window.localStorage.getItem("moroccoInterestedNames") || "[]");
    } catch {
      return [];
    }
  });
  const [showMoroccoNameInput, setShowMoroccoNameInput] = useState(false);
  const [moroccoNameInput, setMoroccoNameInput] = useState("");
  const [skiMyokoInterestedNames, setSkiMyokoInterestedNames] = useState<string[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      return JSON.parse(window.localStorage.getItem("skiMyokoInterestedNames") || "[]");
    } catch {
      return [];
    }
  });
  const [showSkiMyokoNameInput, setShowSkiMyokoNameInput] = useState(false);
  const [skiMyokoNameInput, setSkiMyokoNameInput] = useState("");
  const [skiDeerValleyInterestedNames, setSkiDeerValleyInterestedNames] = useState<string[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      return JSON.parse(window.localStorage.getItem("skiDeerValleyInterestedNames") || "[]");
    } catch {
      return [];
    }
  });
  const [showSkiDeerValleyNameInput, setShowSkiDeerValleyNameInput] = useState(false);
  const [skiDeerValleyNameInput, setSkiDeerValleyNameInput] = useState("");
  const [skiBig3InterestedNames, setSkiBig3InterestedNames] = useState<string[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      return JSON.parse(window.localStorage.getItem("skiBig3InterestedNames") || "[]");
    } catch {
      return [];
    }
  });
  const [showSkiBig3NameInput, setShowSkiBig3NameInput] = useState(false);
  const [skiBig3NameInput, setSkiBig3NameInput] = useState("");
  const [houstonInterestedNames, setHoustonInterestedNames] = useState<string[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      return JSON.parse(window.localStorage.getItem("houstonInterestedNames") || "[]");
    } catch {
      return [];
    }
  });
  const [showHoustonNameInput, setShowHoustonNameInput] = useState(false);
  const [houstonNameInput, setHoustonNameInput] = useState("");
  const [azoresInterestedNames, setAzoresInterestedNames] = useState<string[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      return JSON.parse(window.localStorage.getItem("azoresInterestedNames") || "[]");
    } catch {
      return [];
    }
  });
  const [showAzoresNameInput, setShowAzoresNameInput] = useState(false);
  const [azoresNameInput, setAzoresNameInput] = useState("");
  const [similanInterestedNames, setSimilanInterestedNames] = useState<string[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      return JSON.parse(window.localStorage.getItem("similanInterestedNames") || "[]");
    } catch {
      return [];
    }
  });
  const [showSimilanNameInput, setShowSimilanNameInput] = useState(false);
  const [similanNameInput, setSimilanNameInput] = useState("");
  const [disneyWorldInterestedNames, setDisneyWorldInterestedNames] = useState<string[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      return JSON.parse(window.localStorage.getItem("disneyWorldInterestedNames") || "[]");
    } catch {
      return [];
    }
  });
  const [showDisneyWorldNameInput, setShowDisneyWorldNameInput] = useState(false);
  const [disneyWorldNameInput, setDisneyWorldNameInput] = useState("");
  const [fiveStansInterestedNames, setFiveStansInterestedNames] = useState<string[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      return JSON.parse(window.localStorage.getItem("fiveStansInterestedNames") || "[]");
    } catch {
      return [];
    }
  });
  const [showFiveStansNameInput, setShowFiveStansNameInput] = useState(false);
  const [fiveStansNameInput, setFiveStansNameInput] = useState("");
  const [checkedPackingItems, setCheckedPackingItems] = useState<Record<string, boolean>>({});
  const [now, setNow] = useState(new Date());
  const [usdToJpy, setUsdToJpy] = useState("150");
  const [usdToTwd, setUsdToTwd] = useState("32");
  const [selectedTimelineSectionId, setSelectedTimelineSectionId] = useState(1);

  const septOctGuestOptions = [
    "I am just a random Guest",
    "Xenia & David & Naomi (3)",
    "Jeff & Irene",
    "Gladys",
    "Vicky",
    "Dylan & Sharon",
  ];

  const guestOptions = [
    "I am just a random Guest",
    "Xenia & David & Naomi (3)",
    "Anthony & Christine & Mona (1)",
    "Jenn & Hiroshi & Masashi (6) & Miyari (3)",
    "Heather & Jack & Aizen (8) & Kaien (3)",
    "Steven Wang",
    "Mark Wang",
    "Mei & Emilia (8)",
    "Julie & Adrian & Ethan (4) & Tyrell (1)",
    "Dave & Christina & Xixi (2)",
  ];

  const filterDashboardSegments = (segments: DashboardSegment[]) => {
    if (selectedTrip === "taiwan") {
      return segments.filter((segment) => ["xiaoliuqiu", "yilan"].includes(segment.page));
    }
    if (selectedTrip === "okinawaJapan") {
      return segments.filter((segment) => ["nahaearly", "onna", "nago", "nanjo", "naha"].includes(segment.page));
    }
    return segments;
  };

  const CountrySegmentButtons = ({ segments, setIsGuestConfirmed, setPage }: { segments: DashboardSegment[]; setIsGuestConfirmed: React.Dispatch<React.SetStateAction<boolean>>; setPage: React.Dispatch<React.SetStateAction<PageName>> }) => (
    <SegmentButtons segments={filterDashboardSegments(segments)} setIsGuestConfirmed={setIsGuestConfirmed} setPage={setPage} />
  );

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const chapter = searchParams.get("chapter");
    const returningGuest = searchParams.get("guest");
    if (["xiaoliuqiu", "onna", "nago", "nanjo", "naha", "nahaearly", "yilan"].includes(chapter || "")) {
      setPage(chapter as PageName);
      if (returningGuest) setGuestName(returningGuest);
      setSelectedTrip(chapter === "xiaoliuqiu" || chapter === "yilan" ? "taiwan" : "okinawaJapan");
      setIsGuestConfirmed(true);
    }
    setIsInitialRouteReady(true);
  }, []);

  useEffect(() => {
    async function loadTripSignups() {
      const [moroccoNames, skiMyokoNames, skiDeerValleyNames, skiBig3Names, houstonNames, azoresNames, similanNames, disneyWorldNames, fiveStansNames] = await Promise.all([
        fetchTripSignupNames("morocco"),
        fetchTripSignupNames("skiMyoko"),
        fetchTripSignupNames("skiDeerValley"),
        fetchTripSignupNames("skiBig3"),
        fetchTripSignupNames("houston"),
        fetchTripSignupNames("azoresPortugal"),
        fetchTripSignupNames("similanThailand"),
        fetchTripSignupNames("disneyWorld"),
        fetchTripSignupNames("fiveStans"),
      ]);
      if (moroccoNames) setMoroccoInterestedNames(moroccoNames);
      if (skiMyokoNames) setSkiMyokoInterestedNames(skiMyokoNames);
      if (skiDeerValleyNames) setSkiDeerValleyInterestedNames(skiDeerValleyNames);
      if (skiBig3Names) setSkiBig3InterestedNames(skiBig3Names);
      if (houstonNames) setHoustonInterestedNames(houstonNames);
      if (azoresNames) setAzoresInterestedNames(azoresNames);
      if (similanNames) setSimilanInterestedNames(similanNames);
      if (disneyWorldNames) setDisneyWorldInterestedNames(disneyWorldNames);
      if (fiveStansNames) setFiveStansInterestedNames(fiveStansNames);
    }
    loadTripSignups();
  }, []);

  useEffect(() => {
    if (!guestName) return;
    const storageKey = `checklistProgress-${guestName}`;
    try {
      const localProgress = JSON.parse(window.localStorage.getItem(storageKey) || "{}");
      if (localProgress && typeof localProgress === "object") {
        setCheckedPackingItems((current) => ({ ...current, ...localProgress }));
      }
    } catch {
      // Keep the default empty checklist when local data is malformed.
    }

    async function loadChecklistProgress() {
      const savedProgress = await fetchChecklistProgress(guestName);
      if (savedProgress) {
        setCheckedPackingItems((current) => ({ ...current, ...savedProgress }));
      }
    }
    loadChecklistProgress();
  }, [guestName]);

  useEffect(() => {
    window.localStorage.setItem("moroccoInterestedNames", JSON.stringify(moroccoInterestedNames));
  }, [moroccoInterestedNames]);

  useEffect(() => {
    window.localStorage.setItem("skiMyokoInterestedNames", JSON.stringify(skiMyokoInterestedNames));
  }, [skiMyokoInterestedNames]);

  useEffect(() => {
    window.localStorage.setItem("skiDeerValleyInterestedNames", JSON.stringify(skiDeerValleyInterestedNames));
  }, [skiDeerValleyInterestedNames]);

  useEffect(() => {
    window.localStorage.setItem("skiBig3InterestedNames", JSON.stringify(skiBig3InterestedNames));
  }, [skiBig3InterestedNames]);

  useEffect(() => {
    window.localStorage.setItem("houstonInterestedNames", JSON.stringify(houstonInterestedNames));
  }, [houstonInterestedNames]);

  useEffect(() => {
    window.localStorage.setItem("azoresInterestedNames", JSON.stringify(azoresInterestedNames));
  }, [azoresInterestedNames]);

  useEffect(() => {
    window.localStorage.setItem("similanInterestedNames", JSON.stringify(similanInterestedNames));
  }, [similanInterestedNames]);

  useEffect(() => {
    window.localStorage.setItem("disneyWorldInterestedNames", JSON.stringify(disneyWorldInterestedNames));
  }, [disneyWorldInterestedNames]);

  useEffect(() => {
    window.localStorage.setItem("fiveStansInterestedNames", JSON.stringify(fiveStansInterestedNames));
  }, [fiveStansInterestedNames]);

  useEffect(() => {
    async function fetchRates() {
      try {
        const response = await fetch("https://open.er-api.com/v6/latest/USD");
        const data = await response.json();
        if (data?.rates?.JPY) setUsdToJpy(Math.round(data.rates.JPY).toString());
        if (data?.rates?.TWD) setUsdToTwd(Math.round(data.rates.TWD).toString());
      } catch {
        setUsdToJpy("150");
        setUsdToTwd("32");
      }
    }
    fetchRates();
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

  const activeTimelineSection = timelineSections.find((section) => section.id === selectedTimelineSectionId) || timelineSections[0];
  const sectionDates = useMemo(() => buildDateRange(activeTimelineSection.start, activeTimelineSection.end), [activeTimelineSection]);
  const getSectionPercent = (date: Date) => getTimelinePercent(date, activeTimelineSection.start, activeTimelineSection.end);

  const mobileTimelineItems: Record<number, TimelineItem[]> = {
    1: [
      { id: "xiaoliuqiu", label: "Xiaoliuqiu", range: "Nov 20–23", color: "taiwan" },
      { id: "taipei", label: "Taipei", range: "Nov 23–27", color: "taiwan" },
      { id: "onna", label: "Onna", range: "Nov 27–30", color: "okinawa" },
      { id: "nago", label: "Nago", range: "Nov 30–Dec 2", color: "okinawa" },
      { id: "nanjo", label: "Nanjo", range: "Dec 2–4", color: "okinawa" },
      { id: "naha", label: "Naha", range: "Dec 4–6", color: "okinawa" },
    ],
    2: [{ id: "yilan", label: "Yilan", range: "Dec 8–11", color: "yilan" }],
    3: [],
    4: [],
  };

  const openChapterForLocation = (id: string) => {
    if (["xiaoliuqiu", "nahaearly", "onna", "nago", "nanjo", "naha", "yilan"].includes(id)) setPage(id as PageName);
  };

  const getGuestChapterOrder = (guest: string): PageName[] => {
    const fullOrder: PageName[] = ["xiaoliuqiu", "nahaearly", "onna", "nago", "nanjo", "naha", "yilan"];
    const guestRoutes: Record<string, PageName[]> = {
      "I am just a random Guest": fullOrder,
      "Xenia & David & Naomi (3)": ["xiaoliuqiu", "onna", "nago", "nanjo", "naha", "yilan"],
      "Anthony & Christine & Mona (1)": ["xiaoliuqiu"],
      "Heather & Jack & Aizen (8) & Kaien (3)": ["onna", "nago", "yilan"],
      "Steven Wang": ["nahaearly", "onna", "nago"],
      "Mark Wang": ["xiaoliuqiu", "nahaearly", "onna"],
      "Mei & Emilia (8)": ["nago", "nanjo", "naha", "yilan"],
      "Dave & Christina & Xixi (2)": ["onna", "nago", "nanjo", "naha", "yilan"],
    };
    const guestRoute = guestRoutes[guest] || [];
    if (selectedTrip === "taiwan") {
      return guestRoute.filter((chapter) => ["xiaoliuqiu", "yilan"].includes(chapter));
    }
    if (selectedTrip === "okinawaJapan") {
      return guestRoute.filter((chapter) => ["nahaearly", "onna", "nago", "nanjo", "naha"].includes(chapter));
    }
    return guestRoute;
  };

  const getPackingChecklist = (guest: string): PackingChecklist => {
    const essentials = [
      "Passport / travel documents",
      "Travel insurance documents",
      "Credit cards + cash",
      "International/local eSIM or roaming setup",
    ];
    const clothes = [
      "Underwear",
      "Socks",
      "Shirts",
      "Jeans + shorts",
      "Light jacket / rain gear",
      "Walking shoes + sandals",
      "Slippers or flipflops",
      "Swimsuit",
    ];
    const personal = [
      "Phone charger + power bank",
      "Headphones",
      "Sunglasses / hat",
      "Laptop/Tablet + charger",
      "Toiletries (toothbrush, toothpaste, hairbrush, skincare, nailcare, shaving supplies)",
      "Reusable water bottle",
      "Sunscreen",
      "Medications",
      "Contact lenses",
    ];
    const xiaoliuqiuDive = [
      "Dry bag",
      "Dive certification / course documents",
      "Motion sickness medicine",
      "Scuba mask",
      "Dive computer + charger",
      "Action camera + charger",
    ];
    const okinawaSegment = ["Wedding attire", "Resort casual outfit", "International driving permit / car documents"];
    const babyToddlerItems = [
      "Formula / milk / snacks",
      "Diapers / wipes / rash cream / small plastic bags",
      "Baby Tylenol, medications, thermometer, band-aids",
      "Pack 2 outfits per day + 2–3 extra outfits (including socks)",
      "Light jackets & vests",
      "Swimsuit + swim diapers",
      "Walking shoes + water shoes + sandals",
      "Sippy cup, bottles",
      "Favorite toy, blanket, pacifier",
      "Sunscreen and sun hat",
      "Car seat, stroller, carrier",
      "Portable travel water kettle",
      "Baby utensils and bottle detergent / cleaning brush",
      "Portable fan",
      "Tablet charged & loaded with offline videos",
      "Baby shower gel & shampoo",
      "Small bottle of baby laundry detergent",
    ];
    const standardSections: PackingSection[] = [
      { title: "Essentials", items: essentials },
      { title: "Clothes", items: clothes },
      { title: "Personal", items: personal },
    ];

    if (guest === "Mark Wang") {
      return { title: "Mark's Packing Checklist", sections: [...standardSections, { title: "Xiaoliuqiu Dive Segment", items: xiaoliuqiuDive }, { title: "Okinawa Wedding Segment", items: okinawaSegment }] };
    }
    if (["Xenia & David & Naomi (3)", "Heather & Jack & Aizen (8) & Kaien (3)"].includes(guest)) {
      return { title: `${guest} Packing Checklist`, sections: [...standardSections, { title: "Okinawa Segment", items: okinawaSegment }, { title: "Baby / Toddler Items", items: babyToddlerItems }] };
    }
    if (guest === "Mei & Emilia (8)") {
      return { title: `${guest} Packing Checklist`, sections: standardSections };
    }
    if (guest === "Dave & Christina & Xixi (2)") {
      return { title: `${guest} Packing Checklist`, sections: [...standardSections, { title: "Baby / Toddler Items", items: babyToddlerItems }] };
    }
    if (guest === "Mei & Emilia (8)") return { title: `${guest} Packing Checklist`, sections: standardSections };
    if (["Jenn & Hiroshi & Masashi (6) & Miyari (3)", "Julie & Adrian & Ethan (4) & Tyrell (1)"].includes(guest)) return { title: `${guest} Packing Checklist`, sections: [...standardSections, { title: "Baby / Toddler Items", items: babyToddlerItems }] };
    if (guest === "Anthony & Christine & Mona (1)") return { title: `${guest} Packing Checklist`, sections: [...standardSections, { title: "Xiaoliuqiu Dive Segment", items: xiaoliuqiuDive }, { title: "Baby / Toddler Items", items: babyToddlerItems }] };
    return { title: `${guest || "Guest"} Packing Checklist`, sections: [...standardSections, { title: "Trip Items", items: okinawaSegment }] };
  };

  const chapterNav = (current: PageName) => {
    const chapterOrder = getGuestChapterOrder(guestName || "I am just a random Guest");
    const currentIndex = chapterOrder.indexOf(current);
    const previousChapter = currentIndex > 0 ? chapterOrder[currentIndex - 1] : null;
    const nextChapter = currentIndex >= 0 && currentIndex < chapterOrder.length - 1 ? chapterOrder[currentIndex + 1] : null;
    const chapterLabels: Partial<Record<PageName, string>> = {
      xiaoliuqiu: "Scuba Dive",
      nahaearly: "Naha + Okinawa World",
      onna: "Onna",
      nago: "Nago",
      nanjo: "Nanjo",
      naha: "Naha",
      yilan: "Yilan",
    };

    return (
      <div className="mb-10 flex items-start justify-between gap-4">
        <div className="flex flex-col items-start gap-3">
          <button type="button" onClick={() => setPage("map")} className="rounded-full border border-white/30 px-4 py-2 text-sm text-white/80 transition hover:border-white hover:text-white">← Back to Map</button>
          {guestName && guestName !== "I am just a random Guest" && (
            <button type="button" onClick={() => { setIsGuestConfirmed(false); setShowGuestActions(true); }} className="rounded-full border border-white/20 bg-white/[0.04] px-4 py-2 text-sm text-white/70 transition hover:border-white/40 hover:bg-white/[0.08] hover:text-white">← Back to Dashboard</button>
          )}
        </div>
        <div className="flex flex-wrap justify-end gap-3">
          {previousChapter && (
            <button type="button" onClick={() => setPage(previousChapter)} className="rounded-full border border-white/20 bg-white/[0.04] px-4 py-2 text-sm text-white/70">← Previous Chapter<span className="hidden sm:inline"> · {chapterLabels[previousChapter]}</span></button>
          )}
          {nextChapter && (
            <button type="button" onClick={() => setPage(nextChapter)} className="rounded-full border border-white/20 bg-white/[0.04] px-4 py-2 text-sm text-white/70">Next Chapter<span className="hidden sm:inline"> · {chapterLabels[nextChapter]}</span> →</button>
          )}
        </div>
      </div>
    );
  };

  const infoWidgets = (monthLabel: string, nights: string, hotel: React.ReactNode, region: Region = "japan") => {
    const isTaiwan = region === "taiwan";
    const localTime = new Intl.DateTimeFormat("en-US", { timeZone: isTaiwan ? "Asia/Taipei" : "Asia/Tokyo", hour: "numeric", minute: "2-digit", second: "2-digit", hour12: true }).format(now);
    const tempLabel = isTaiwan ? "24–28°C" : monthLabel === "November" ? "22–26°C" : "20–24°C";
    return (
      <section className="mb-10 grid grid-cols-2 gap-3 md:grid-cols-4">
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3 text-center md:p-4"><p className="mb-1 text-xl md:text-2xl">{isTaiwan ? "💵" : "💴"}</p><p className="text-[10px] text-gray-400 md:text-xs">Currency</p><p className="mt-1 text-xs font-medium md:text-sm">{isTaiwan ? "TWD NT$" : "JPY ¥"}</p><p className="mt-1 text-xs text-gray-400">{isTaiwan ? `1 USD ≈ ${usdToTwd} TWD` : `1 USD ≈ ${usdToJpy} JPY`}</p></div>
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3 text-center md:p-4"><p className="mb-1 text-xl md:text-2xl">🌤️</p><p className="text-[10px] text-gray-400 md:text-xs">{monthLabel} Temp</p><p className="mt-1 text-xs font-medium md:text-sm">{tempLabel}</p></div>
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3 text-center md:p-4"><p className="mb-1 text-xl md:text-2xl">🕘</p><p className="text-[10px] text-gray-400 md:text-xs">Local Time</p><p className="mt-1 text-xs font-medium md:text-sm">{localTime}</p><p className="mt-1 text-[9px] text-gray-500">{isTaiwan ? "Taiwan · CST" : "Okinawa · JST"}</p></div>
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3 text-center md:p-4"><p className="mb-1 text-xl md:text-2xl">🌙 🏨</p><p className="text-[10px] text-gray-400 md:text-xs">Stay</p><p className="mt-1 text-xs font-medium md:text-sm">{nights}</p>{hotel}</div>
      </section>
    );
  };

  const peopleCards = (people: Person[]) => (
    <section className="mt-10 rounded-3xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur-md">
      <h2 className="mb-5 text-2xl font-light">Who's Here</h2>
      <div className="grid gap-3 md:grid-cols-2">{people.map(([name, date]) => <div key={name} className="rounded-2xl border border-white/10 bg-black/20 p-4"><p className="text-sm font-medium text-white">{name}</p><p className="text-[10px] text-gray-400 md:text-xs">{date}</p></div>)}</div>
    </section>
  );

  const linkedImage = (src: string, alt: string) => <img src={src} alt={alt} className="mt-4 h-56 w-full rounded-2xl object-cover object-center" />;
  const card = (children: React.ReactNode) => <div className="rounded-2xl border border-white/10 bg-black/20 p-4">{children}</div>;

  const Timeline = () => (
    <div className="relative z-20 mt-5 w-full px-4 md:absolute md:bottom-4 md:left-0 md:mt-0 md:px-6">
      <div className="mx-auto max-w-5xl">
        <div className="mb-2 flex items-center justify-between gap-3 px-2">
          <div className="flex flex-wrap items-center gap-1.5">
            {timelineSections.map((section) => {
              const disabled = section.id === 3 || section.id === 4;
              const active = selectedTimelineSectionId === section.id;
              return <button key={section.id} type="button" disabled={disabled} onClick={() => !disabled && setSelectedTimelineSectionId(section.id)} className={`rounded-full border px-2.5 py-1 text-[9px] uppercase tracking-[0.16em] transition ${disabled ? "cursor-not-allowed border-white/5 bg-black/10 text-white/15" : active ? "border-white/70 bg-white/10 text-white" : "border-white/15 bg-black/20 text-white/35"}`}>{section.label}</button>;
            })}
          </div>
          <span className="shrink-0 text-[10px] uppercase tracking-[0.24em] text-white/35">{activeTimelineSection.start.toLocaleDateString("en-US", { month: "short", day: "numeric" })} – {activeTimelineSection.end.toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
        </div>

        <div className="mt-3 grid gap-2 md:hidden">
          {(mobileTimelineItems[selectedTimelineSectionId] || []).map((item) => {
            const isTaiwan = item.color === "taiwan";
            const isYilan = item.color === "yilan";
            const active = hovered === item.id;
            return (
              <button key={item.id} type="button" onClick={() => setHovered(item.id)} onDoubleClick={() => openChapterForLocation(item.id)} className={`flex items-center justify-between rounded-2xl border px-4 py-3 text-left transition ${active ? isYilan ? "border-[#72E49A]/70 bg-[#72E49A]/10" : isTaiwan ? "border-[#FFD76A]/70 bg-[#FFD76A]/10" : "border-[#9EDCFF]/70 bg-[#9EDCFF]/10" : "border-white/10 bg-white/[0.04]"}`}>
                <span className="flex items-center gap-3"><span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: isYilan ? "#72E49A" : isTaiwan ? TAIWAN_GOLD : BABY_BLUE }} /><span className="text-sm font-light tracking-wide text-white">{item.label}</span></span>
                <span className="text-[10px] uppercase tracking-[0.18em] text-white/45">{item.range}</span>
              </button>
            );
          })}
        </div>

        <div className="relative hidden overflow-visible px-2 py-6 md:block">
          <div className="relative h-[2px] bg-white/30">
            {selectedTimelineSectionId === 1 && (
              <>
                {[
                  { id: "xiaoliuqiu", page: "xiaoliuqiu", start: new Date(2026, 10, 20), end: new Date(2026, 10, 23), color: TAIWAN_GOLD },
                  { id: "onna", page: "onna", start: new Date(2026, 10, 27), end: new Date(2026, 10, 30), color: BABY_BLUE },
                  { id: "nago", page: "nago", start: new Date(2026, 10, 30), end: new Date(2026, 11, 2), color: BABY_BLUE },
                  { id: "nanjo", page: "nanjo", start: new Date(2026, 11, 2), end: new Date(2026, 11, 4), color: BABY_BLUE },
                  { id: "naha", page: "naha", start: new Date(2026, 11, 4), end: new Date(2026, 11, 6), color: BABY_BLUE },
                ].map((segment) => {
                  const left = getSectionPercent(segment.start);
                  const width = getSectionPercent(segment.end) - left;
                  const active = hovered === segment.id;
                  return (
                    <div key={segment.id}>
                      <div className="pointer-events-none absolute top-1/2 h-[5px] -translate-y-1/2 rounded-full transition-all duration-150" style={{ left: `${left}%`, width: `${width}%`, backgroundColor: active ? segment.color : "transparent", boxShadow: active ? `0 0 14px ${segment.color}` : "none" }} />
                      <div className="absolute -top-5 h-10 cursor-pointer" style={{ left: `${left}%`, width: `${width}%` }} onMouseEnter={() => setHovered(segment.id)} onMouseLeave={() => setHovered(null)} onClick={() => setPage(segment.page as PageName)} />
                    </div>
                  );
                })}
              </>
            )}
            {selectedTimelineSectionId === 2 && (
              <>
                {[
                  { id: "yilan", page: "yilan", start: new Date(2026, 11, 8), end: new Date(2026, 11, 11), color: "#72E49A" },
                ].map((segment) => {
                  const left = getSectionPercent(segment.start);
                  const width = getSectionPercent(segment.end) - left;
                  const active = hovered === segment.id;
                  return (
                    <div key={segment.id}>
                      <div className="pointer-events-none absolute top-1/2 h-[5px] -translate-y-1/2 rounded-full transition-all duration-150" style={{ left: `${left}%`, width: `${width}%`, backgroundColor: active ? segment.color : "transparent", boxShadow: active ? `0 0 14px ${segment.color}` : "none" }} />
                      <div className="absolute -top-5 h-10 cursor-pointer" style={{ left: `${left}%`, width: `${width}%` }} onMouseEnter={() => setHovered(segment.id)} onMouseLeave={() => setHovered(null)} onClick={() => setPage("yilan")} />
                    </div>
                  );
                })}
              </>
            )}
            {sectionDates.map((date, index) => <div key={`${date.getMonth()}-${date.getDate()}`} className="absolute top-1/2 -translate-y-1/2" style={{ left: `${(index / Math.max(sectionDates.length - 1, 1)) * 100}%` }}><div className="h-2 w-px bg-white/50" /><div className="mt-2 -translate-x-1/2 whitespace-nowrap text-[12px] text-gray-500">{date.toLocaleDateString("en-US", { month: "short", day: "numeric" })}</div></div>)}
          </div>
        </div>
      </div>
    </div>
  );

  const saveInterestedName = async (
    tripKey: SignupTripKey,
    name: string,
    setNames: React.Dispatch<React.SetStateAction<string[]>>
  ) => {
    const savedNames = await createTripSignup(tripKey, name);
    if (savedNames) {
      setNames(savedNames);
      return;
    }
    setNames((current) => current.includes(name) ? current : [...current, name]);
  };

  const addMoroccoInterestedName = async () => {
    const nextName = moroccoNameInput.trim();
    if (!nextName) return;
    await saveInterestedName("morocco", nextName, setMoroccoInterestedNames);
    setMoroccoNameInput("");
    setShowMoroccoNameInput(false);
  };

  const addSkiMyokoInterestedName = async () => {
    const nextName = skiMyokoNameInput.trim();
    if (!nextName) return;
    await saveInterestedName("skiMyoko", nextName, setSkiMyokoInterestedNames);
    setSkiMyokoNameInput("");
    setShowSkiMyokoNameInput(false);
  };

  const addSkiDeerValleyInterestedName = async () => {
    const nextName = skiDeerValleyNameInput.trim();
    if (!nextName) return;
    await saveInterestedName("skiDeerValley", nextName, setSkiDeerValleyInterestedNames);
    setSkiDeerValleyNameInput("");
    setShowSkiDeerValleyNameInput(false);
  };

  const addSkiBig3InterestedName = async () => {
    const nextName = skiBig3NameInput.trim();
    if (!nextName) return;
    await saveInterestedName("skiBig3", nextName, setSkiBig3InterestedNames);
    setSkiBig3NameInput("");
    setShowSkiBig3NameInput(false);
  };

  const addHoustonInterestedName = async () => {
    const nextName = houstonNameInput.trim();
    if (!nextName) return;
    await saveInterestedName("houston", nextName, setHoustonInterestedNames);
    setHoustonNameInput("");
    setShowHoustonNameInput(false);
  };

  const addAzoresInterestedName = async () => {
    const nextName = azoresNameInput.trim();
    if (!nextName) return;
    await saveInterestedName("azoresPortugal", nextName, setAzoresInterestedNames);
    setAzoresNameInput("");
    setShowAzoresNameInput(false);
  };

  const addSimilanInterestedName = async () => {
    const nextName = similanNameInput.trim();
    if (!nextName) return;
    await saveInterestedName("similanThailand", nextName, setSimilanInterestedNames);
    setSimilanNameInput("");
    setShowSimilanNameInput(false);
  };

  const addDisneyWorldInterestedName = async () => {
    const nextName = disneyWorldNameInput.trim();
    if (!nextName) return;
    await saveInterestedName("disneyWorld", nextName, setDisneyWorldInterestedNames);
    setDisneyWorldNameInput("");
    setShowDisneyWorldNameInput(false);
  };

  const addFiveStansInterestedName = async () => {
    const nextName = fiveStansNameInput.trim();
    if (!nextName) return;
    await saveInterestedName("fiveStans", nextName, setFiveStansInterestedNames);
    setFiveStansNameInput("");
    setShowFiveStansNameInput(false);
  };

  const togglePackingItem = (itemKey: string, checked: boolean) => {
    const nextChecked = !checked;
    setCheckedPackingItems((current) => ({ ...current, [itemKey]: nextChecked }));

    if (guestName) {
      const storageKey = `checklistProgress-${guestName}`;
      try {
        const localProgress = JSON.parse(window.localStorage.getItem(storageKey) || "{}");
        window.localStorage.setItem(storageKey, JSON.stringify({ ...localProgress, [itemKey]: nextChecked }));
      } catch {
        window.localStorage.setItem(storageKey, JSON.stringify({ [itemKey]: nextChecked }));
      }
      saveChecklistProgress(guestName, itemKey, nextChecked);
    }
  };

  if (!isInitialRouteReady) {
    return <div className="min-h-screen bg-black" />;
  }

  if (!isGuestConfirmed) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black px-6 text-white">
        <div className="w-full max-w-md rounded-[2rem] border border-white/10 bg-white/[0.04] p-8 text-center shadow-[0_0_40px_rgba(255,255,255,0.06)] backdrop-blur-xl">
          <p className="mb-3 text-xs uppercase tracking-[0.35em] text-white/70">Private Group Event</p>
          {!selectedTrip ? (
            <>
              <h1 className="mb-4 text-3xl font-light tracking-wide">
                <span className="block">Welcome,</span>
                <span className="block">Where are we going?</span>
              </h1>
              <p className="mb-8 text-sm leading-6 text-white/55">Please select your trip.</p>
              <div className="space-y-3">
                <TripButton location="Morocco" date="Sept 3 - Sept 12 2026" status="Planning" onClick={() => setSelectedTrip("morocco")} />
                <TripButton location="Taiwan" date="Nov 21 - Dec 21 2026" status="Confirmed" onClick={() => setSelectedTrip("taiwan")} />
                <TripButton location="Okinawa Japan" date="Nov 25 - Dec 6 2026" status="Confirmed" onClick={() => setSelectedTrip("okinawaJapan")} />
                <TripButton location="Ski Shiga Kogen & Nagano Japan" date="Jan 23 - Jan 31 2027" status="Dreaming" onClick={() => setSelectedTrip("skiMyoko")} />
                <TripButton location="Ski Deer Valley UT USA" date="Feb 2027" status="Dreaming" onClick={() => setSelectedTrip("skiDeerValley")} />
                <TripButton location="SkiBig3 AB Canada" date="Mar 2027" status="Dreaming" onClick={() => setSelectedTrip("skiBig3")} />
                <TripButton location="Houston & Galveston TX USA" subtitle="FRC & Disney Cruise" date="April 28 - May 7 2027" status="Dreaming" onClick={() => setSelectedTrip("houston")} />
                <TripButton location="Azores Portugal" date="Sept 2027" status="Dreaming" onClick={() => setSelectedTrip("azoresPortugal")} />
                <TripButton location="Similan & Phuket Thailand" subtitle="Scuba Diving Liveaboard" date="Mar 2028" status="Dreaming" onClick={() => setSelectedTrip("similanThailand")} />
                <TripButton location="Orlando FL USA" subtitle="Disney World" date="Nov 2028" status="Dreaming" onClick={() => setSelectedTrip("disneyWorld")} />
                <TripButton location="The 5 Stans & Silk Road" date="TBD" status="Dreaming" onClick={() => setSelectedTrip("fiveStans")} />
              </div>
            </>
          ) : selectedTrip === "morocco" ? (
            <>
              <button type="button" onClick={() => { setSelectedTrip(""); setShowMoroccoNameInput(false); setMoroccoNameInput(""); }} className="mb-5 rounded-full border border-white/15 bg-white/[0.03] px-4 py-2 text-xs uppercase tracking-[0.18em] text-white/45">All Trips</button>
              <TripPanelTitle location="Morocco" date="Sept 3 - Sept 12 2026" description="A late-summer group adventure through Morocco with time for culture, scenery, food, and slow wandering." />
              <div className="space-y-3">
                <button type="button" disabled className="w-full cursor-not-allowed rounded-2xl border border-white/10 bg-white/[0.02] px-4 py-4 text-sm font-light uppercase tracking-[0.18em] text-white/25 opacity-60">Itinerary</button>
                <button type="button" onClick={() => setShowMoroccoNameInput(true)} className="w-full rounded-2xl border border-[#FF8FC7]/35 bg-[#FF8FC7]/10 px-4 py-4 text-sm font-light uppercase tracking-[0.18em] text-[#FF8FC7] transition hover:border-[#FF8FC7]/60 hover:bg-[#FF8FC7]/15">I am interested</button>
              </div>

              {showMoroccoNameInput && (
                <form onSubmit={(event) => { event.preventDefault(); addMoroccoInterestedName(); }} className="mt-5 rounded-3xl border border-white/10 bg-white/[0.03] p-4 text-left">
                  <label className="mb-2 block text-xs uppercase tracking-[0.22em] text-white/45" htmlFor="morocco-interest-name">Name</label>
                  <input id="morocco-interest-name" value={moroccoNameInput} onChange={(event) => setMoroccoNameInput(event.target.value)} autoFocus className="mb-3 w-full rounded-2xl border border-white/15 bg-black/30 px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/25 focus:border-white/40" placeholder="Enter your name" />
                  <button type="submit" className="w-full rounded-2xl border border-[#72E49A]/35 bg-[#72E49A]/10 px-4 py-3 text-sm uppercase tracking-[0.18em] text-[#72E49A] transition hover:bg-[#72E49A]/15">Add to list</button>
                </form>
              )}

              <section className="mt-6 rounded-3xl border border-white/10 bg-black/20 p-5 text-left">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <h2 className="text-sm uppercase tracking-[0.24em] text-white/55">Who signed up</h2>
                  <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-white/45">{moroccoInterestedNames.length}</span>
                </div>
                {moroccoInterestedNames.length ? (
                  <div className="space-y-2">
                    {moroccoInterestedNames.map((name) => (
                      <p key={name} className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white/75">{name}</p>
                    ))}
                  </div>
                ) : (
                  <p className="rounded-2xl border border-white/10 bg-white/[0.02] px-4 py-4 text-sm text-white/35">No names added yet.</p>
                )}
              </section>
            </>
          ) : selectedTrip === "skiMyoko" ? (
            <>
              <button type="button" onClick={() => { setSelectedTrip(""); setShowSkiMyokoNameInput(false); setSkiMyokoNameInput(""); }} className="mb-5 rounded-full border border-white/15 bg-white/[0.03] px-4 py-2 text-xs uppercase tracking-[0.18em] text-white/45">All Trips</button>
              <TripPanelTitle location="Ski Shiga Kogen & Nagano Japan" date="Jan 23 - Jan 31 2027" description="A winter ski week in the Nagano mountains with onsen time, snow days, and cozy Japanese food." />
              <div className="space-y-3">
                <button type="button" disabled className="w-full cursor-not-allowed rounded-2xl border border-white/10 bg-white/[0.02] px-4 py-4 text-sm font-light uppercase tracking-[0.18em] text-white/25 opacity-60">Itinerary</button>
                <button type="button" onClick={() => setShowSkiMyokoNameInput(true)} className="w-full rounded-2xl border border-[#FF8FC7]/35 bg-[#FF8FC7]/10 px-4 py-4 text-sm font-light uppercase tracking-[0.18em] text-[#FF8FC7] transition hover:border-[#FF8FC7]/60 hover:bg-[#FF8FC7]/15">I am interested</button>
              </div>

              {showSkiMyokoNameInput && (
                <form onSubmit={(event) => { event.preventDefault(); addSkiMyokoInterestedName(); }} className="mt-5 rounded-3xl border border-white/10 bg-white/[0.03] p-4 text-left">
                  <label className="mb-2 block text-xs uppercase tracking-[0.22em] text-white/45" htmlFor="ski-myoko-interest-name">Name</label>
                  <input id="ski-myoko-interest-name" value={skiMyokoNameInput} onChange={(event) => setSkiMyokoNameInput(event.target.value)} autoFocus className="mb-3 w-full rounded-2xl border border-white/15 bg-black/30 px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/25 focus:border-white/40" placeholder="Enter your name" />
                  <button type="submit" className="w-full rounded-2xl border border-[#72E49A]/35 bg-[#72E49A]/10 px-4 py-3 text-sm uppercase tracking-[0.18em] text-[#72E49A] transition hover:bg-[#72E49A]/15">Add to list</button>
                </form>
              )}

              <section className="mt-6 rounded-3xl border border-white/10 bg-black/20 p-5 text-left">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <h2 className="text-sm uppercase tracking-[0.24em] text-white/55">Who signed up</h2>
                  <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-white/45">{skiMyokoInterestedNames.length}</span>
                </div>
                {skiMyokoInterestedNames.length ? (
                  <div className="space-y-2">
                    {skiMyokoInterestedNames.map((name) => (
                      <p key={name} className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white/75">{name}</p>
                    ))}
                  </div>
                ) : (
                  <p className="rounded-2xl border border-white/10 bg-white/[0.02] px-4 py-4 text-sm text-white/35">No names added yet.</p>
                )}
              </section>
            </>
          ) : selectedTrip === "skiDeerValley" ? (
            <>
              <button type="button" onClick={() => { setSelectedTrip(""); setShowSkiDeerValleyNameInput(false); setSkiDeerValleyNameInput(""); }} className="mb-5 rounded-full border border-white/15 bg-white/[0.03] px-4 py-2 text-xs uppercase tracking-[0.18em] text-white/45">All Trips</button>
              <TripPanelTitle location="Ski Deer Valley UT USA" date="Feb 2027" description="A polished Utah ski escape built around groomed runs, mountain views, and relaxed resort evenings." />
              <div className="space-y-3">
                <button type="button" disabled className="w-full cursor-not-allowed rounded-2xl border border-white/10 bg-white/[0.02] px-4 py-4 text-sm font-light uppercase tracking-[0.18em] text-white/25 opacity-60">Itinerary</button>
                <button type="button" onClick={() => setShowSkiDeerValleyNameInput(true)} className="w-full rounded-2xl border border-[#FF8FC7]/35 bg-[#FF8FC7]/10 px-4 py-4 text-sm font-light uppercase tracking-[0.18em] text-[#FF8FC7] transition hover:border-[#FF8FC7]/60 hover:bg-[#FF8FC7]/15">I am interested</button>
              </div>

              {showSkiDeerValleyNameInput && (
                <form onSubmit={(event) => { event.preventDefault(); addSkiDeerValleyInterestedName(); }} className="mt-5 rounded-3xl border border-white/10 bg-white/[0.03] p-4 text-left">
                  <label className="mb-2 block text-xs uppercase tracking-[0.22em] text-white/45" htmlFor="ski-deer-valley-interest-name">Name</label>
                  <input id="ski-deer-valley-interest-name" value={skiDeerValleyNameInput} onChange={(event) => setSkiDeerValleyNameInput(event.target.value)} autoFocus className="mb-3 w-full rounded-2xl border border-white/15 bg-black/30 px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/25 focus:border-white/40" placeholder="Enter your name" />
                  <button type="submit" className="w-full rounded-2xl border border-[#72E49A]/35 bg-[#72E49A]/10 px-4 py-3 text-sm uppercase tracking-[0.18em] text-[#72E49A] transition hover:bg-[#72E49A]/15">Add to list</button>
                </form>
              )}

              <section className="mt-6 rounded-3xl border border-white/10 bg-black/20 p-5 text-left">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <h2 className="text-sm uppercase tracking-[0.24em] text-white/55">Who signed up</h2>
                  <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-white/45">{skiDeerValleyInterestedNames.length}</span>
                </div>
                {skiDeerValleyInterestedNames.length ? (
                  <div className="space-y-2">
                    {skiDeerValleyInterestedNames.map((name) => (
                      <p key={name} className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white/75">{name}</p>
                    ))}
                  </div>
                ) : (
                  <p className="rounded-2xl border border-white/10 bg-white/[0.02] px-4 py-4 text-sm text-white/35">No names added yet.</p>
                )}
              </section>
            </>
          ) : selectedTrip === "skiBig3" ? (
            <>
              <button type="button" onClick={() => { setSelectedTrip(""); setShowSkiBig3NameInput(false); setSkiBig3NameInput(""); }} className="mb-5 rounded-full border border-white/15 bg-white/[0.03] px-4 py-2 text-xs uppercase tracking-[0.18em] text-white/45">All Trips</button>
              <TripPanelTitle location="SkiBig3 AB Canada" date="Mar 2027" description="A Canadian Rockies ski trip across Banff's big mountain terrain, with plenty of alpine scenery between runs." />
              <div className="space-y-3">
                <button type="button" disabled className="w-full cursor-not-allowed rounded-2xl border border-white/10 bg-white/[0.02] px-4 py-4 text-sm font-light uppercase tracking-[0.18em] text-white/25 opacity-60">Itinerary</button>
                <button type="button" onClick={() => setShowSkiBig3NameInput(true)} className="w-full rounded-2xl border border-[#FF8FC7]/35 bg-[#FF8FC7]/10 px-4 py-4 text-sm font-light uppercase tracking-[0.18em] text-[#FF8FC7] transition hover:border-[#FF8FC7]/60 hover:bg-[#FF8FC7]/15">I am interested</button>
              </div>

              {showSkiBig3NameInput && (
                <form onSubmit={(event) => { event.preventDefault(); addSkiBig3InterestedName(); }} className="mt-5 rounded-3xl border border-white/10 bg-white/[0.03] p-4 text-left">
                  <label className="mb-2 block text-xs uppercase tracking-[0.22em] text-white/45" htmlFor="ski-big3-interest-name">Name</label>
                  <input id="ski-big3-interest-name" value={skiBig3NameInput} onChange={(event) => setSkiBig3NameInput(event.target.value)} autoFocus className="mb-3 w-full rounded-2xl border border-white/15 bg-black/30 px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/25 focus:border-white/40" placeholder="Enter your name" />
                  <button type="submit" className="w-full rounded-2xl border border-[#72E49A]/35 bg-[#72E49A]/10 px-4 py-3 text-sm uppercase tracking-[0.18em] text-[#72E49A] transition hover:bg-[#72E49A]/15">Add to list</button>
                </form>
              )}

              <section className="mt-6 rounded-3xl border border-white/10 bg-black/20 p-5 text-left">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <h2 className="text-sm uppercase tracking-[0.24em] text-white/55">Who signed up</h2>
                  <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-white/45">{skiBig3InterestedNames.length}</span>
                </div>
                {skiBig3InterestedNames.length ? (
                  <div className="space-y-2">
                    {skiBig3InterestedNames.map((name) => (
                      <p key={name} className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white/75">{name}</p>
                    ))}
                  </div>
                ) : (
                  <p className="rounded-2xl border border-white/10 bg-white/[0.02] px-4 py-4 text-sm text-white/35">No names added yet.</p>
                )}
              </section>
            </>
          ) : selectedTrip === "houston" ? (
            <>
              <button type="button" onClick={() => { setSelectedTrip(""); setShowHoustonNameInput(false); setHoustonNameInput(""); }} className="mb-5 rounded-full border border-white/15 bg-white/[0.03] px-4 py-2 text-xs uppercase tracking-[0.18em] text-white/45">All Trips</button>
              <TripPanelTitle location="Houston & Galveston TX USA" subtitle="FRC & Disney Cruise" date="April 28 - May 7 2027" description="Arriving Houston to witness the exciting First Robotics Competition at the George R. Brown Convention Center from April 28 - May 1; followed by Mark's birthday celebration on May 1. On May 2, we board Disney Magic from Galveston for a 5-night Western Caribbean Disney cruise." />
              <div className="space-y-3">
                <button type="button" disabled className="w-full cursor-not-allowed rounded-2xl border border-white/10 bg-white/[0.02] px-4 py-4 text-sm font-light uppercase tracking-[0.18em] text-white/25 opacity-60">Itinerary</button>
                <button type="button" onClick={() => setShowHoustonNameInput(true)} className="w-full rounded-2xl border border-[#FF8FC7]/35 bg-[#FF8FC7]/10 px-4 py-4 text-sm font-light uppercase tracking-[0.18em] text-[#FF8FC7] transition hover:border-[#FF8FC7]/60 hover:bg-[#FF8FC7]/15">I am interested</button>
              </div>

              {showHoustonNameInput && (
                <form onSubmit={(event) => { event.preventDefault(); addHoustonInterestedName(); }} className="mt-5 rounded-3xl border border-white/10 bg-white/[0.03] p-4 text-left">
                  <label className="mb-2 block text-xs uppercase tracking-[0.22em] text-white/45" htmlFor="houston-interest-name">Name</label>
                  <input id="houston-interest-name" value={houstonNameInput} onChange={(event) => setHoustonNameInput(event.target.value)} autoFocus className="mb-3 w-full rounded-2xl border border-white/15 bg-black/30 px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/25 focus:border-white/40" placeholder="Enter your name" />
                  <button type="submit" className="w-full rounded-2xl border border-[#72E49A]/35 bg-[#72E49A]/10 px-4 py-3 text-sm uppercase tracking-[0.18em] text-[#72E49A] transition hover:bg-[#72E49A]/15">Add to list</button>
                </form>
              )}

              <section className="mt-6 rounded-3xl border border-white/10 bg-black/20 p-5 text-left">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <h2 className="text-sm uppercase tracking-[0.24em] text-white/55">Who signed up</h2>
                  <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-white/45">{houstonInterestedNames.length}</span>
                </div>
                {houstonInterestedNames.length ? (
                  <div className="space-y-2">
                    {houstonInterestedNames.map((name) => (
                      <p key={name} className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white/75">{name}</p>
                    ))}
                  </div>
                ) : (
                  <p className="rounded-2xl border border-white/10 bg-white/[0.02] px-4 py-4 text-sm text-white/35">No names added yet.</p>
                )}
              </section>
            </>
          ) : selectedTrip === "azoresPortugal" ? (
            <>
              <button type="button" onClick={() => { setSelectedTrip(""); setShowAzoresNameInput(false); setAzoresNameInput(""); }} className="mb-5 rounded-full border border-white/15 bg-white/[0.03] px-4 py-2 text-xs uppercase tracking-[0.18em] text-white/45">All Trips</button>
              <TripPanelTitle location="Azores Portugal" date="Sept 2027" description="An island nature trip with volcanic landscapes, ocean views, hot springs, and unhurried Atlantic days." />
              <div className="space-y-3">
                <button type="button" disabled className="w-full cursor-not-allowed rounded-2xl border border-white/10 bg-white/[0.02] px-4 py-4 text-sm font-light uppercase tracking-[0.18em] text-white/25 opacity-60">Itinerary</button>
                <button type="button" onClick={() => setShowAzoresNameInput(true)} className="w-full rounded-2xl border border-[#FF8FC7]/35 bg-[#FF8FC7]/10 px-4 py-4 text-sm font-light uppercase tracking-[0.18em] text-[#FF8FC7] transition hover:border-[#FF8FC7]/60 hover:bg-[#FF8FC7]/15">I am interested</button>
              </div>

              {showAzoresNameInput && (
                <form onSubmit={(event) => { event.preventDefault(); addAzoresInterestedName(); }} className="mt-5 rounded-3xl border border-white/10 bg-white/[0.03] p-4 text-left">
                  <label className="mb-2 block text-xs uppercase tracking-[0.22em] text-white/45" htmlFor="azores-interest-name">Name</label>
                  <input id="azores-interest-name" value={azoresNameInput} onChange={(event) => setAzoresNameInput(event.target.value)} autoFocus className="mb-3 w-full rounded-2xl border border-white/15 bg-black/30 px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/25 focus:border-white/40" placeholder="Enter your name" />
                  <button type="submit" className="w-full rounded-2xl border border-[#72E49A]/35 bg-[#72E49A]/10 px-4 py-3 text-sm uppercase tracking-[0.18em] text-[#72E49A] transition hover:bg-[#72E49A]/15">Add to list</button>
                </form>
              )}

              <section className="mt-6 rounded-3xl border border-white/10 bg-black/20 p-5 text-left">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <h2 className="text-sm uppercase tracking-[0.24em] text-white/55">Who signed up</h2>
                  <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-white/45">{azoresInterestedNames.length}</span>
                </div>
                {azoresInterestedNames.length ? (
                  <div className="space-y-2">
                    {azoresInterestedNames.map((name) => (
                      <p key={name} className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white/75">{name}</p>
                    ))}
                  </div>
                ) : (
                  <p className="rounded-2xl border border-white/10 bg-white/[0.02] px-4 py-4 text-sm text-white/35">No names added yet.</p>
                )}
              </section>
            </>
          ) : selectedTrip === "similanThailand" ? (
            <>
              <button type="button" onClick={() => { setSelectedTrip(""); setShowSimilanNameInput(false); setSimilanNameInput(""); }} className="mb-5 rounded-full border border-white/15 bg-white/[0.03] px-4 py-2 text-xs uppercase tracking-[0.18em] text-white/45">All Trips</button>
              <TripPanelTitle location="Similan & Phuket Thailand" subtitle="Scuba Diving Liveaboard" date="Mar 2028" description="A warm-water dive adventure centered on liveaboard days, reefs, beaches, and Phuket time before or after the boat." />
              <div className="space-y-3">
                <button type="button" disabled className="w-full cursor-not-allowed rounded-2xl border border-white/10 bg-white/[0.02] px-4 py-4 text-sm font-light uppercase tracking-[0.18em] text-white/25 opacity-60">Itinerary</button>
                <button type="button" onClick={() => setShowSimilanNameInput(true)} className="w-full rounded-2xl border border-[#FF8FC7]/35 bg-[#FF8FC7]/10 px-4 py-4 text-sm font-light uppercase tracking-[0.18em] text-[#FF8FC7] transition hover:border-[#FF8FC7]/60 hover:bg-[#FF8FC7]/15">I am interested</button>
              </div>

              {showSimilanNameInput && (
                <form onSubmit={(event) => { event.preventDefault(); addSimilanInterestedName(); }} className="mt-5 rounded-3xl border border-white/10 bg-white/[0.03] p-4 text-left">
                  <label className="mb-2 block text-xs uppercase tracking-[0.22em] text-white/45" htmlFor="similan-interest-name">Name</label>
                  <input id="similan-interest-name" value={similanNameInput} onChange={(event) => setSimilanNameInput(event.target.value)} autoFocus className="mb-3 w-full rounded-2xl border border-white/15 bg-black/30 px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/25 focus:border-white/40" placeholder="Enter your name" />
                  <button type="submit" className="w-full rounded-2xl border border-[#72E49A]/35 bg-[#72E49A]/10 px-4 py-3 text-sm uppercase tracking-[0.18em] text-[#72E49A] transition hover:bg-[#72E49A]/15">Add to list</button>
                </form>
              )}

              <section className="mt-6 rounded-3xl border border-white/10 bg-black/20 p-5 text-left">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <h2 className="text-sm uppercase tracking-[0.24em] text-white/55">Who signed up</h2>
                  <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-white/45">{similanInterestedNames.length}</span>
                </div>
                {similanInterestedNames.length ? (
                  <div className="space-y-2">
                    {similanInterestedNames.map((name) => (
                      <p key={name} className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white/75">{name}</p>
                    ))}
                  </div>
                ) : (
                  <p className="rounded-2xl border border-white/10 bg-white/[0.02] px-4 py-4 text-sm text-white/35">No names added yet.</p>
                )}
              </section>
            </>
          ) : selectedTrip === "disneyWorld" ? (
            <>
              <button type="button" onClick={() => { setSelectedTrip(""); setShowDisneyWorldNameInput(false); setDisneyWorldNameInput(""); }} className="mb-5 rounded-full border border-white/15 bg-white/[0.03] px-4 py-2 text-xs uppercase tracking-[0.18em] text-white/45">All Trips</button>
              <TripPanelTitle location="Orlando FL USA" subtitle="Disney World" date="Nov 2028" description="A Disney World holiday with park days, character moments, resort downtime, and room for family pacing." />
              <div className="space-y-3">
                <button type="button" disabled className="w-full cursor-not-allowed rounded-2xl border border-white/10 bg-white/[0.02] px-4 py-4 text-sm font-light uppercase tracking-[0.18em] text-white/25 opacity-60">Itinerary</button>
                <button type="button" onClick={() => setShowDisneyWorldNameInput(true)} className="w-full rounded-2xl border border-[#FF8FC7]/35 bg-[#FF8FC7]/10 px-4 py-4 text-sm font-light uppercase tracking-[0.18em] text-[#FF8FC7] transition hover:border-[#FF8FC7]/60 hover:bg-[#FF8FC7]/15">I am interested</button>
              </div>

              {showDisneyWorldNameInput && (
                <form onSubmit={(event) => { event.preventDefault(); addDisneyWorldInterestedName(); }} className="mt-5 rounded-3xl border border-white/10 bg-white/[0.03] p-4 text-left">
                  <label className="mb-2 block text-xs uppercase tracking-[0.22em] text-white/45" htmlFor="disney-world-interest-name">Name</label>
                  <input id="disney-world-interest-name" value={disneyWorldNameInput} onChange={(event) => setDisneyWorldNameInput(event.target.value)} autoFocus className="mb-3 w-full rounded-2xl border border-white/15 bg-black/30 px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/25 focus:border-white/40" placeholder="Enter your name" />
                  <button type="submit" className="w-full rounded-2xl border border-[#72E49A]/35 bg-[#72E49A]/10 px-4 py-3 text-sm uppercase tracking-[0.18em] text-[#72E49A] transition hover:bg-[#72E49A]/15">Add to list</button>
                </form>
              )}

              <section className="mt-6 rounded-3xl border border-white/10 bg-black/20 p-5 text-left">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <h2 className="text-sm uppercase tracking-[0.24em] text-white/55">Who signed up</h2>
                  <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-white/45">{disneyWorldInterestedNames.length}</span>
                </div>
                {disneyWorldInterestedNames.length ? (
                  <div className="space-y-2">
                    {disneyWorldInterestedNames.map((name) => (
                      <p key={name} className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white/75">{name}</p>
                    ))}
                  </div>
                ) : (
                  <p className="rounded-2xl border border-white/10 bg-white/[0.02] px-4 py-4 text-sm text-white/35">No names added yet.</p>
                )}
              </section>
            </>
          ) : selectedTrip === "fiveStans" ? (
            <>
              <button type="button" onClick={() => { setSelectedTrip(""); setShowFiveStansNameInput(false); setFiveStansNameInput(""); }} className="mb-5 rounded-full border border-white/15 bg-white/[0.03] px-4 py-2 text-xs uppercase tracking-[0.18em] text-white/45">All Trips</button>
              <TripPanelTitle location="The 5 Stans & Silk Road" date="TBD" description="Trace the legendary Silk Road across five nations: Kyrgyzstan, Kazakhstan, Tajikistan, Turkmenistan, Uzbekistan. This is Central Asia in full, gloriously unfiltered widescreen. Gonna be gorgeous and totally unforgettable." />
              <div className="space-y-3">
                <button type="button" disabled className="w-full cursor-not-allowed rounded-2xl border border-white/10 bg-white/[0.02] px-4 py-4 text-sm font-light uppercase tracking-[0.18em] text-white/25 opacity-60">Itinerary</button>
                <button type="button" onClick={() => setShowFiveStansNameInput(true)} className="w-full rounded-2xl border border-[#FF8FC7]/35 bg-[#FF8FC7]/10 px-4 py-4 text-sm font-light uppercase tracking-[0.18em] text-[#FF8FC7] transition hover:border-[#FF8FC7]/60 hover:bg-[#FF8FC7]/15">I am interested</button>
              </div>

              {showFiveStansNameInput && (
                <form onSubmit={(event) => { event.preventDefault(); addFiveStansInterestedName(); }} className="mt-5 rounded-3xl border border-white/10 bg-white/[0.03] p-4 text-left">
                  <label className="mb-2 block text-xs uppercase tracking-[0.22em] text-white/45" htmlFor="five-stans-interest-name">Name</label>
                  <input id="five-stans-interest-name" value={fiveStansNameInput} onChange={(event) => setFiveStansNameInput(event.target.value)} autoFocus className="mb-3 w-full rounded-2xl border border-white/15 bg-black/30 px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/25 focus:border-white/40" placeholder="Enter your name" />
                  <button type="submit" className="w-full rounded-2xl border border-[#72E49A]/35 bg-[#72E49A]/10 px-4 py-3 text-sm uppercase tracking-[0.18em] text-[#72E49A] transition hover:bg-[#72E49A]/15">Add to list</button>
                </form>
              )}

              <section className="mt-6 rounded-3xl border border-white/10 bg-black/20 p-5 text-left">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <h2 className="text-sm uppercase tracking-[0.24em] text-white/55">Who signed up</h2>
                  <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-white/45">{fiveStansInterestedNames.length}</span>
                </div>
                {fiveStansInterestedNames.length ? (
                  <div className="space-y-2">
                    {fiveStansInterestedNames.map((name) => (
                      <p key={name} className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white/75">{name}</p>
                    ))}
                  </div>
                ) : (
                  <p className="rounded-2xl border border-white/10 bg-white/[0.02] px-4 py-4 text-sm text-white/35">No names added yet.</p>
                )}
              </section>
            </>
          ) : selectedTrip !== "taiwan" && selectedTrip !== "okinawaJapan" ? (
            <>
              <button type="button" onClick={() => setSelectedTrip("")} className="mb-5 rounded-full border border-white/15 bg-white/[0.03] px-4 py-2 text-xs uppercase tracking-[0.18em] text-white/45">← Back</button>
              <h1 className="mb-4 text-3xl font-light tracking-wide">Welcome to TBD 2026</h1>
              <p className="mb-8 text-sm leading-6 text-white/55">Party selection placeholders will become active later.</p>
              <div className="mb-5 max-h-[280px] space-y-2 overflow-y-auto pr-1">
                {septOctGuestOptions.map((guest) => (
                  <button key={guest} type="button" disabled className="w-full cursor-not-allowed rounded-2xl border border-white/10 bg-white/[0.02] px-4 py-3 text-sm font-light tracking-wide text-white/25 opacity-60">
                    {guest}
                  </button>
                ))}
              </div>
            </>
          ) : !showGuestActions ? (
            <>
              <button type="button" onClick={() => { setSelectedTrip(""); setShowGuestActions(false); setGuestName(""); }} className="mb-5 rounded-full border border-white/15 bg-white/[0.03] px-4 py-2 text-xs uppercase tracking-[0.18em] text-white/45">All Trips</button>
              <h1 className="mb-4 text-3xl font-light tracking-wide">{selectedTrip === "taiwan" ? "Taiwan 2026" : "Okinawa Japan 2026"}</h1>
              <p className="mb-8 text-sm leading-6 text-white/55">Please select your party to continue.</p>
              <div className="mb-5 max-h-[280px] space-y-2 overflow-y-auto pr-1">
                {guestOptions.filter((guest) => {
                  if (guest === "I am just a random Guest") return false;
                  if (selectedTrip === "taiwan") return guest !== "Steven Wang";
                  if (selectedTrip === "okinawaJapan") return !["Anthony & Christine & Mona (1)", "Jenn & Hiroshi & Masashi (6) & Miyari (3)", "Julie & Adrian & Ethan (4) & Tyrell (1)"].includes(guest);
                  return true;
                }).map((guest) => <button key={guest} type="button" onClick={() => { setGuestName(guest); if (guest === "I am just a random Guest") { setIsGuestConfirmed(true); setPage("map"); return; } setShowGuestActions(true); }} className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm font-light tracking-wide text-white/70 transition hover:border-white/30 hover:bg-white/[0.05]">{guest}</button>)}
              </div>
            </>
          ) : (
            <>
              <div className="mb-5 grid grid-cols-2 gap-3">
                <button type="button" onClick={() => { setShowGuestActions(false); setGuestName(""); }} className="rounded-full border border-white/15 bg-white/[0.03] px-4 py-2 text-xs uppercase tracking-[0.18em] text-white/45 transition hover:border-white/30 hover:bg-white/[0.05]">Back</button>
                <button type="button" onClick={() => { setSelectedTrip(""); setShowGuestActions(false); setGuestName(""); }} className="rounded-full border border-white/15 bg-white/[0.03] px-4 py-2 text-xs uppercase tracking-[0.18em] text-white/45 transition hover:border-white/30 hover:bg-white/[0.05]">All Trips</button>
              </div>
              <div className="mb-8 rounded-3xl border border-white/10 bg-white/[0.04] p-6 text-left shadow-[0_0_30px_rgba(255,255,255,0.05)]">
                <p className="text-sm uppercase tracking-[0.28em] text-white/70">Welcome</p>
                <h2 className="mt-2 text-3xl font-light tracking-wide text-white">Hello {guestName} 👋</h2>
                {guestName === "Xenia & David & Naomi (3)" && <CountrySegmentButtons segments={[{ label: "Nov 21–23 · Xiaoliuqiu", page: "xiaoliuqiu", color: TAIWAN_GOLD }, { label: "Nov 27–30 · Onna", page: "onna", color: BABY_BLUE }, { label: "Nov 30–Dec 2 · Nago", page: "nago", color: BABY_BLUE }, { label: "Dec 2–4 · Nanjo", page: "nanjo", color: BABY_BLUE }, { label: "Dec 4–6 · Naha", page: "naha", color: BABY_BLUE }, { label: "Dec 8–11 · Yilan", page: "yilan", color: "#72E49A" }]} setIsGuestConfirmed={setIsGuestConfirmed} setPage={setPage} />}
                {guestName === "Mark Wang" && <CountrySegmentButtons segments={[{ label: "Nov 20–23 · Xiaoliuqiu", page: "xiaoliuqiu", color: TAIWAN_GOLD }, { label: "Nov 25–27 · Naha + Okinawa World", page: "nahaearly", color: BABY_BLUE }, { label: "Nov 27–30 · Onna", page: "onna", color: BABY_BLUE }]} setIsGuestConfirmed={setIsGuestConfirmed} setPage={setPage} />}
                {guestName === "Anthony & Christine & Mona (1)" && <CountrySegmentButtons segments={[{ label: "Nov 20–23 · Xiaoliuqiu", page: "xiaoliuqiu", color: TAIWAN_GOLD }]} setIsGuestConfirmed={setIsGuestConfirmed} setPage={setPage} />}
                {guestName === "Mei & Emilia (8)" && <CountrySegmentButtons segments={[{ label: "Nov 29–Dec 2 · Nago", page: "nago", color: BABY_BLUE }, { label: "Dec 2–4 · Nanjo", page: "nanjo", color: BABY_BLUE }, { label: "Dec 4–6 · Naha", page: "naha", color: BABY_BLUE }, { label: "Dec 8–11 · Yilan", page: "yilan", color: "#72E49A" }]} setIsGuestConfirmed={setIsGuestConfirmed} setPage={setPage} />}
                {guestName === "Steven Wang" && <CountrySegmentButtons segments={[{ label: "Nov 25–27 · Naha + Okinawa World", page: "nahaearly", color: BABY_BLUE }, { label: "Nov 27–30 · Onna", page: "onna", color: BABY_BLUE }, { label: "Nov 30–Dec 2 · Nago", page: "nago", color: BABY_BLUE }]} setIsGuestConfirmed={setIsGuestConfirmed} setPage={setPage} />}
                {guestName === "Dave & Christina & Xixi (2)" && <CountrySegmentButtons segments={[{ label: "Nov 27–30 · Onna", page: "onna", color: BABY_BLUE }, { label: "Nov 30–Dec 2 · Nago", page: "nago", color: BABY_BLUE }, { label: "Dec 2–4 · Nanjo", page: "nanjo", color: BABY_BLUE }, { label: "Dec 4–6 · Naha", page: "naha", color: BABY_BLUE }, { label: "Dec 8–11 · Yilan", page: "yilan", color: "#72E49A" }]} setIsGuestConfirmed={setIsGuestConfirmed} setPage={setPage} />}
                {guestName === "Heather & Jack & Aizen (8) & Kaien (3)" && <CountrySegmentButtons segments={[{ label: "Nov 27–30 · Onna", page: "onna", color: BABY_BLUE }, { label: "Nov 30–Dec 2 · Nago", page: "nago", color: BABY_BLUE }, { label: "Dec 8–11 · Yilan", page: "yilan", color: "#72E49A" }]} setIsGuestConfirmed={setIsGuestConfirmed} setPage={setPage} />}
                {!["Xenia & David & Naomi (3)", "Mark Wang", "Anthony & Christine & Mona (1)", "Mei & Emilia (8)", "Steven Wang", "Dave & Christina & Xixi (2)", "Heather & Jack & Aizen (8) & Kaien (3)"].includes(guestName) && (
                  <div className="mt-5 rounded-2xl border border-amber-300/20 bg-amber-300/5 p-4">
                    <p className="text-sm leading-6 text-amber-100/80">
                      No trip segment found, please confirm your trip with Xenia ASAP.
                    </p>
                  </div>
                )}
              </div>
              <div className="space-y-5">
                <div className="grid gap-3 sm:grid-cols-2">
                  <button type="button" onClick={() => { setPage("map"); setIsGuestConfirmed(true); }} className="rounded-full border border-white/30 bg-white/[0.05] px-5 py-3 text-sm uppercase tracking-[0.22em] text-white transition hover:border-white/60 hover:bg-white/[0.08]">Map View</button>
                  <button type="button" onClick={() => { setPage("checklist"); setIsGuestConfirmed(true); }} className="rounded-full border border-white/30 bg-white/[0.05] px-5 py-3 text-sm uppercase tracking-[0.22em] text-white transition hover:border-white/60 hover:bg-white/[0.08]">My Checklist</button>
                </div>
                <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-4 text-left"><p className="mb-4 whitespace-nowrap text-[10px] uppercase tracking-[0.18em] text-white/35 sm:text-xs sm:tracking-[0.24em]">Active once trip begins</p><div className="grid gap-3 sm:grid-cols-2"><button type="button" disabled className="cursor-not-allowed rounded-full border border-white/10 bg-white/[0.02] px-5 py-3 text-sm uppercase tracking-[0.22em] text-white/25 opacity-60">What's Today?</button><button type="button" disabled className="cursor-not-allowed rounded-full border border-white/10 bg-white/[0.02] px-5 py-3 text-sm uppercase tracking-[0.22em] text-white/25 opacity-60">What's Tomorrow?</button></div></div>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  if (page === "checklist") {
    const checklist = getPackingChecklist(guestName);
    const totalItems = checklist.sections.reduce((sum, section) => sum + section.items.length, 0);
    const completedItems = checklist.sections.reduce((sum, section) => sum + section.items.filter((item) => checkedPackingItems[`${guestName}-${section.title}-${item}`]).length, 0);
    return (
      <div className="min-h-screen bg-black px-6 py-10 text-white">
        {chapterNav("checklist")}
        <main className="mx-auto max-w-4xl">
          <p className="mb-3 text-sm uppercase tracking-[0.35em] text-[#FFD76A]">Personal Travel Prep</p>
          <h1 className="mb-4 text-4xl font-light tracking-wide md:text-6xl">{checklist.title}</h1>
          <p className="mb-8 text-sm text-white/50">{completedItems} of {totalItems} items packed</p>
          <div className="mb-10 h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-[#72E49A] transition-all" style={{ width: `${totalItems ? (completedItems / totalItems) * 100 : 0}%` }} /></div>
          <section className="space-y-6">
            {checklist.sections.map((section) => <article key={section.title} className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur-md"><h2 className="mb-5 text-2xl font-light">{section.title}</h2><div className="grid gap-3">{section.items.map((item) => { const key = `${guestName}-${section.title}-${item}`; const checked = Boolean(checkedPackingItems[key]); return <button key={key} type="button" onClick={() => togglePackingItem(key, checked)} className={`flex items-center gap-3 rounded-2xl border px-4 py-3 text-left transition ${checked ? "border-[#72E49A]/50 bg-[#72E49A]/10 text-white" : "border-white/10 bg-black/20 text-white/70 hover:border-white/25"}`}><span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-xs ${checked ? "border-[#72E49A] bg-[#72E49A] text-black" : "border-white/25 text-transparent"}`}>✓</span><span className={checked ? "text-white line-through decoration-[#72E49A]/70" : "text-white/75"}>{item}</span></button>; })}</div></article>)}
          </section>
        </main>
      </div>
    );
  }

  const chapterPeople: Record<PageName, Person[]> = {
    map: [],
    checklist: [],
    yilan: [["Xenia & David & Naomi (3)", "Dec 8 – Dec 11 · Yilan"], ["Mei & Emilia (8)", "Dec 8 – Dec 11 · Yilan"], ["Dave & Christina & Xixi (2)", "Dec 8 – Dec 11 · Yilan"], ["Heather & Jack & Aizen (8) & Kaien (3)", "Dec 8 – Dec 11 · Yilan"]],
    xiaoliuqiu: [["Anthony & Christine & Mona (1)", "Nov 20 – Nov 23 · Xiaoliuqiu"], ["Mark Wang", "Nov 20 – Nov 23 · Xiaoliuqiu"], ["Xenia & David & Naomi (3)", "Nov 21 – Nov 23 · Xiaoliuqiu"]],
    onna: [["Xenia & David & Naomi (3)", "Nov 27 – Dec 6 · Okinawa"], ["Dave & Christina & Xixi (2)", "Nov 27 – Dec 6 · Okinawa"], ["Steven Wang", "Nov 25 – Dec 2 · Okinawa"], ["Mark Wang", "Nov 25 – Nov 30 · Okinawa"], ["Mei & Emilia (8)", "Nov 29 – Dec 6 · Okinawa"], ["Heather & Jack & Aizen (8) & Kaien (3)", "Nov 26 – Dec 2 · Okinawa"]],
    nago: [["Xenia & David & Naomi (3)", "Nov 27 – Dec 6 · Okinawa"], ["Dave & Christina & Xixi (2)", "Nov 27 – Dec 6 · Okinawa"], ["Steven Wang", "Nov 25 – Dec 2 · Okinawa"], ["Mei & Emilia (8)", "Nov 29 – Dec 6 · Okinawa"], ["Heather & Jack & Aizen (8) & Kaien (3)", "Nov 26 – Dec 2 · Okinawa"]],
    nanjo: [["Xenia & David & Naomi (3)", "Nov 27 – Dec 6 · Okinawa"], ["Dave & Christina & Xixi (2)", "Nov 27 – Dec 6 · Okinawa"], ["Mei & Emilia (8)", "Nov 29 – Dec 6 · Okinawa"]],
    naha: [["Xenia & David & Naomi (3)", "Nov 27 – Dec 6 · Okinawa"], ["Dave & Christina & Xixi (2)", "Nov 27 – Dec 6 · Okinawa"], ["Mei & Emilia (8)", "Nov 29 – Dec 6 · Okinawa"]],
    nahaearly: [["Steven Wang", "Nov 25 – Dec 2 · Okinawa"], ["Mark Wang", "Nov 25 – Nov 30 · Okinawa"]],
  };

  const renderChapter = (chapter: PageName, eyebrow: string, title: string, album: string, month: string, nights: string, hotel: React.ReactNode, region: Region, accentColor: string, children: React.ReactNode) => (
    <div className="min-h-screen bg-black px-6 py-10 text-white" style={{ "--chapter-accent": accentColor } as React.CSSProperties}>
      {chapterNav(chapter)}
      <main className="mx-auto max-w-5xl">
        <p className="mb-3 text-sm uppercase tracking-[0.35em]" style={{ color: accentColor }}>{eyebrow}</p>
        <h1 className="mb-6 text-4xl font-light tracking-wide md:text-6xl">{title}</h1>
        <MemoryMaker key={chapter === "xiaoliuqiu" ? "taiwanNovember" : chapter === "yilan" ? "taiwanDecember" : "japanNovember"} albumKey={chapter === "xiaoliuqiu" ? "taiwanNovember" : chapter === "yilan" ? "taiwanDecember" : "japanNovember"} albumName={chapter === "xiaoliuqiu" ? "Taiwan November" : chapter === "yilan" ? "Taiwan December" : "Japan November"} accentColor={accentColor} guestName={guestName} returnChapter={chapter} />
        {infoWidgets(month, nights, hotel, region)}
        <GuestPartyContext.Provider value={guestName}>
          <section className="space-y-8">{children}</section>
        </GuestPartyContext.Provider>
        {peopleCards(chapterPeople[chapter])}
      </main>
    </div>
  );

  if (page === "xiaoliuqiu") return renderChapter("xiaoliuqiu", "Taiwan · Xiaoliuqiu", "Scuba Dive Chapter", "Taiwan November", "November", "3 Nights", <p className="mt-1 text-sm font-medium" style={{ color: TAIWAN_GOLD }}>小琉球民宿 TBD</p>, "taiwan", TAIWAN_GOLD, <XiaoliuqiuContent card={card} />);
  if (page === "onna") return renderChapter("onna", "Okinawa · Onna", "Wedding Resort Chapter", "Okinawa Japan", "November", "3 Nights", <a href="https://www.hotelmonterey.co.jp/en/okinawa/" target="_blank" rel="noopener noreferrer" className="mt-1 block text-sm font-medium hover:underline" style={{ color: BABY_BLUE }}>Hotel Monterey Okinawa</a>, "japan", BABY_BLUE, <OnnaContent card={card} linkedImage={linkedImage} />);
  if (page === "nago") return renderChapter("nago", "Okinawa · Nago", "Northern Okinawa Chapter", "Okinawa Japan", "December", "2 Nights", <p className="mt-1 text-sm font-medium" style={{ color: BABY_BLUE }}>TBD</p>, "japan", BABY_BLUE, <NagoContent card={card} linkedImage={linkedImage} />);
  if (page === "nanjo") return renderChapter("nanjo", "Okinawa · Nanjo", "Southern Okinawa Chapter", "Okinawa Japan", "December", "2 Nights", <><a href="https://www.yuinchi.jp/heal/hot-spring/" target="_blank" rel="noopener noreferrer" className="mt-1 block text-sm font-medium hover:underline" style={{ color: BABY_BLUE }}>Yuinchi Hotel Nanjo</a><p className="mt-1 text-[9px] text-gray-500">Apeman Spa Natural Hot Spring</p></>, "japan", BABY_BLUE, <NanjoContent card={card} />);
  if (page === "naha") return renderChapter("naha", "Okinawa · Naha", "Final Naha Chapter", "Okinawa Japan", "December", "2 Nights", <><p className="mt-1 text-sm font-medium" style={{ color: BABY_BLUE }}>Hotel Strata Naha</p><p className="mt-1 text-[9px] text-gray-500">or Hotel JAL City Naha</p></>, "japan", BABY_BLUE, <NahaContent card={card} />);
  if (page === "nahaearly") return renderChapter("nahaearly", "Okinawa · Naha", "Naha + Okinawa World Chapter", "Okinawa Japan", "November", "2 Nights", <p className="mt-1 text-sm font-medium" style={{ color: BABY_BLUE }}>Hotel Strata Naha</p>, "japan", BABY_BLUE, <NahaEarlyContent card={card} linkedImage={linkedImage} />);
  if (page === "yilan") return renderChapter("yilan", "Taiwan · Yilan", "Yilan Family Chapter", "Taiwan December", "December", "3 Nights", <><p className="mt-1 text-sm font-medium text-[#72E49A]">瓏山林蘇澳冷熱泉度假飯店 (1)</p><p className="mt-1 text-sm font-medium text-[#72E49A]">礁溪寒沐酒店 (2)</p></>, "taiwan", "#72E49A", <YilanContent card={card} />);

  const isTaiwanMap = selectedTrip === "taiwan";
  const departureDate = isTaiwanMap ? new Date(2026, 10, 21) : new Date(2026, 10, 25);
  const mapLocations: TimelineItem[] = isTaiwanMap
    ? [
        { id: "xiaoliuqiu", label: "Xiaoliuqiu", range: "Nov 21–23", color: "taiwan" },
        { id: "taipei", label: "Taipei", range: "Nov 23–Dec 8", color: "taiwan" },
        { id: "yilan", label: "Yilan", range: "Dec 8–11", color: "yilan" },
      ]
    : [
        { id: "naha", label: "Naha", range: "Nov 25–27 · Dec 4–6", color: "okinawa" },
        { id: "onna", label: "Onna", range: "Nov 27–30", color: "okinawa" },
        { id: "nago", label: "Nago", range: "Nov 30–Dec 2", color: "okinawa" },
        { id: "nanjo", label: "Nanjo", range: "Dec 2–4", color: "okinawa" },
      ];
  const diff = Math.max(departureDate.getTime() - now.getTime(), 0);
  const countdownDays = Math.floor(diff / MS_PER_DAY);
  const countdownHours = Math.floor((diff % MS_PER_DAY) / (1000 * 60 * 60));
  const countdownMinutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const countdownSeconds = Math.floor((diff % (1000 * 60)) / 1000);

  return (
    <div className="min-h-screen bg-black text-white">
      <section className="relative flex min-h-screen flex-col items-center justify-start overflow-visible px-6 pb-10 pt-16 md:h-[90vh] md:min-h-0 md:justify-center md:overflow-hidden md:pt-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.06),transparent_55%)]" />
        <button type="button" onClick={() => { setIsGuestConfirmed(false); setSelectedTrip(""); setShowGuestActions(false); setGuestName(""); setPage("map"); window.history.replaceState({}, "", "/"); }} className="absolute right-5 top-5 z-30 rounded-full border border-white/25 bg-black/30 px-4 py-2 text-xs uppercase tracking-[0.18em] text-white/75 backdrop-blur-md transition hover:border-white/50 hover:bg-white/10">All Trips</button>
        {guestName && guestName !== "I am just a random Guest" && <button type="button" onClick={() => { setIsGuestConfirmed(false); setShowGuestActions(true); }} className="absolute left-5 top-5 z-30 rounded-full border border-white/25 bg-black/30 px-4 py-2 text-xs uppercase tracking-[0.18em] text-white/75 backdrop-blur-md">← Back to Dashboard</button>}
        <div className="relative z-10 flex w-full max-w-5xl items-center justify-center gap-8 md:gap-20">
          {isTaiwanMap && <svg viewBox="0 0 140 260" className="h-[340px] w-[166px] opacity-90 md:h-[520px] md:w-[255px]" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M110 0 L105 0 L94 12 L80 16 L69 24 L58 47 L47 57 L29 90 L10 117 L8 147 L0 173 L10 181 L16 205 L21 213 L43 230 L48 242 L47 254 L50 259 L61 254 L62 227 L68 210 L84 193 L98 163 L107 132 L113 96 L130 61 L127 36 L139 24 L134 15 L120 10 Z" />
            <SvgPin id="taipei" label="Taipei" cx={108} cy={18} hovered={hovered} setHovered={setHovered} activeColor={TAIWAN_GOLD} scale={0.9} labelFontSize={8} labelOffset={12} />
            <SvgPin id="xiaoliuqiu" label="Xiaoliuqiu" cx={39} cy={234} hovered={hovered} setHovered={setHovered} activeColor={TAIWAN_GOLD} scale={0.9} labelFontSize={8} labelOffset={12} onDoubleClick={() => setPage("xiaoliuqiu")} />
            <SvgPin id="yilan" label="Yilan" cx={120} cy={45} hovered={hovered} setHovered={setHovered} activeColor="#72E49A" scale={0.9} labelFontSize={8} labelOffset={12} onDoubleClick={() => setPage("yilan")} />
          </svg>}
          {!isTaiwanMap && <svg viewBox="0 0 331 520" className="h-[350px] w-[350px] md:h-[520px] md:w-[520px]" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M291 5 L282 5 L280 12 L283 27 L277 42 L262 65 L257 79 L251 83 L242 82 L239 85 L238 90 L243 93 L243 97 L237 105 L223 112 L216 127 L222 134 L213 135 L212 144 L209 147 L196 150 L192 156 L180 154 L177 160 L169 160 L162 154 L164 149 L173 147 L181 151 L185 145 L176 133 L167 132 L167 125 L154 124 L142 115 L130 115 L121 120 L113 118 L106 120 L104 136 L111 144 L108 157 L110 173 L120 186 L134 182 L141 189 L158 192 L159 204 L124 235 L120 235 L115 244 L108 240 L99 244 L89 264 L80 273 L74 287 L62 285 L53 293 L40 288 L35 291 L36 314 L54 350 L53 358 L60 367 L60 377 L52 380 L47 389 L36 391 L27 407 L19 405 L17 418 L20 426 L8 425 L5 431 L4 441 L10 448 L10 456 L19 465 L19 468 L15 470 L15 479 L20 486 L19 507 L23 514 L32 516 L41 509 L51 507 L69 484 L85 479 L89 470 L103 459 L103 450 L97 438 L92 435 L85 437 L79 449 L68 431 L79 420 L80 408 L84 400 L94 391 L90 379 L97 374 L98 369 L107 367 L102 355 L112 346 L120 361 L132 374 L140 372 L139 361 L118 333 L115 321 L108 318 L95 298 L99 294 L99 289 L111 279 L138 279 L141 284 L147 282 L150 278 L149 272 L153 269 L162 269 L175 254 L172 245 L174 240 L182 241 L194 232 L196 224 L192 217 L195 214 L221 219 L229 211 L237 209 L240 204 L239 199 L245 189 L237 183 L236 179 L244 164 L253 161 L266 166 L277 159 L286 157 L290 153 L292 142 L304 129 L311 105 L325 84 L322 73 L327 59 L322 50 L320 35 L309 24 L310 18 L298 13 Z" /><SvgPin id="naha" label="Naha" cx={34} cy={437} hovered={hovered} setHovered={setHovered} activeColor={BABY_BLUE} scale={2.25} labelFontSize={20} labelOffset={38} onDoubleClick={() => setPage("naha")} /><SvgPin id="onna" label="Onna" cx={50} cy={300} hovered={hovered} setHovered={setHovered} activeColor={BABY_BLUE} scale={2.25} labelFontSize={20} labelOffset={38} onDoubleClick={() => setPage("onna")} /><SvgPin id="nago" label="Nago" cx={152} cy={172} hovered={hovered} setHovered={setHovered} activeColor={BABY_BLUE} scale={2.25} labelFontSize={20} labelOffset={38} onDoubleClick={() => setPage("nago")} /><SvgPin id="nanjo" label="Nanjo" cx={70} cy={468} hovered={hovered} setHovered={setHovered} activeColor={BABY_BLUE} scale={2.25} labelFontSize={20} labelOffset={38} onDoubleClick={() => setPage("nanjo")} /></svg>}
        </div>
        <div className="relative z-20 mt-2 flex flex-col items-center gap-3 px-4 text-center md:absolute md:bottom-44 md:mt-0 md:flex-row md:gap-6">
          <h1 className="text-2xl font-light leading-tight tracking-wide md:text-4xl">{isTaiwanMap ? "Taiwan" : "Okinawa Japan"}</h1>
          <div className="rounded-3xl border border-white/10 bg-white/[0.04] px-4 py-2.5 backdrop-blur-md">
            <p className="mb-2 text-xs uppercase tracking-[0.3em] text-white/70">Countdown to Departure</p>
            <div className="grid grid-cols-4 gap-3 text-center">
              <div><p className="text-2xl font-light">{countdownDays}</p><p className="text-[10px] text-gray-400">Days</p></div>
              <div><p className="text-2xl font-light">{countdownHours}</p><p className="text-[10px] text-gray-400">Hours</p></div>
              <div><p className="text-2xl font-light">{countdownMinutes}</p><p className="text-[10px] text-gray-400">Min</p></div>
              <div><p className="text-2xl font-light">{countdownSeconds}</p><p className="text-[10px] text-gray-400">Sec</p></div>
            </div>
            <p className="mt-2 text-xs text-gray-400">{isTaiwanMap ? "Nov 21 · Taiwan trip begins" : "Nov 25 · Okinawa trip begins"}</p>
          </div>
        </div>
        <div className="relative z-20 mt-5 grid w-full max-w-5xl gap-2 px-4 sm:grid-cols-2 md:absolute md:bottom-4 md:left-1/2 md:-translate-x-1/2 md:grid-cols-4 md:px-6">
          {mapLocations.map((item) => <button key={item.id} type="button" onClick={() => item.id !== "taipei" && openChapterForLocation(item.id)} className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-left transition hover:border-white/30"><span className="flex items-center gap-3"><span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color === "yilan" ? "#72E49A" : item.color === "taiwan" ? TAIWAN_GOLD : BABY_BLUE }} /><span className="text-sm font-light tracking-wide text-white">{item.label}</span></span><span className="text-[10px] uppercase tracking-[0.12em] text-white/45">{item.range}</span></button>)}
        </div>
      </section>
    </div>
  );
}

function SegmentButtons({ segments, setIsGuestConfirmed, setPage }: { segments: { label: string; page: PageName; color: string }[]; setIsGuestConfirmed: React.Dispatch<React.SetStateAction<boolean>>; setPage: React.Dispatch<React.SetStateAction<PageName>> }) {
  return <div className="mt-5 space-y-3 text-sm leading-7 text-white/70"><p className="text-xs uppercase tracking-[0.22em] text-white/35">You are joining:</p>{segments.map((segment) => <button key={segment.label} type="button" onClick={() => { setIsGuestConfirmed(true); setPage(segment.page); }} className="w-full rounded-2xl border px-4 py-3 text-left transition" style={{ borderColor: `${segment.color}44`, backgroundColor: `${segment.color}12` }}><p className="font-medium" style={{ color: segment.color }}>{segment.label}</p></button>)}</div>;
}

function RentalCarPlanner({ date, dateLabel }: { date: string; dateLabel: string }) {
  const guestPartyName = useContext(GuestPartyContext);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [arrangements, setArrangements] = useState<RentalCarArrangement[]>([]);
  const [dayStatus, setDayStatus] = useState<"planned" | "pending" | "not_required">("pending");
  const [dayNotes, setDayNotes] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  const openPlanner = async () => {
    setIsOpen(true);
    setIsLoading(true);
    setMessage("");
    try {
      const response = await fetch(`/api/rental-car-arrangements?date=${encodeURIComponent(date)}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to load rental car arrangements.");
      setDayStatus(data.status || "pending");
      setDayNotes(typeof data.notes === "string" ? data.notes : null);
      setArrangements(Array.isArray(data.arrangements) ? data.arrangements : []);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to load rental car arrangements.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <button type="button" onClick={openPlanner} aria-label={`View rental car seating for ${dateLabel}`} title="Rental car seating" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/15 bg-black/20 text-base transition hover:border-white/35 hover:bg-white/[0.08]">🚗</button>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label={`Rental car seating for ${dateLabel}`}>
          <div className="max-h-[88vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-white/15 bg-[#111] p-5 shadow-2xl sm:p-7">
            <div className="mb-6 flex items-start justify-between gap-5 border-b border-white/10 pb-5">
              <div>
                <p className="mb-2 text-xs uppercase tracking-[0.24em] text-[var(--chapter-accent)]">Rental Car Seating</p>
                <h3 className="text-2xl font-light text-white">{dateLabel}</h3>
              </div>
              <button type="button" onClick={() => setIsOpen(false)} aria-label="Close rental car seating" title="Close" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/15 text-lg text-white/65 transition hover:border-white/35 hover:text-white">×</button>
            </div>

            {isLoading && <p className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-8 text-center text-sm text-white/40">Loading arrangements...</p>}
            {!isLoading && message && <p className="rounded-xl border border-red-300/20 bg-red-300/5 px-4 py-4 text-sm text-red-100/75">{message}</p>}
            {!isLoading && !message && dayStatus === "not_required" && <p className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-8 text-center text-sm text-white/55">No rental car arrangement is required for this day.</p>}
            {!isLoading && !message && dayStatus === "pending" && <p className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-8 text-center text-sm text-white/45">Rental car seating has not been arranged for this day yet.</p>}
            {!isLoading && !message && dayStatus === "planned" && !arrangements.length && <p className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-8 text-center text-sm text-white/45">No cars have been added to this day's plan yet.</p>}
            {!isLoading && !message && arrangements.length > 0 && (
              <div className="space-y-4">
                {arrangements.map((arrangement) => {
                  const isGuestPartyCar = Boolean(guestPartyName) && arrangement.occupants.some(
                    (occupant) => occupant.partyName.trim().toLowerCase() === guestPartyName.trim().toLowerCase()
                  );
                  return (
                    <section
                      key={arrangement.id}
                      className={`rounded-xl border p-5 transition ${isGuestPartyCar ? "border-[#9EDCFF]/70 bg-[#9EDCFF]/10 shadow-[0_0_24px_rgba(158,220,255,0.18)]" : "border-white/10 bg-white/[0.04]"}`}
                    >
                      <div className="mb-4 flex items-start justify-between gap-4">
                        <h4 className="text-lg font-medium text-white">{arrangement.carName}</h4>
                        <span className="shrink-0 rounded-full border border-white/10 px-3 py-1 text-xs text-white/45">{arrangement.occupants.length}/{arrangement.capacity} seats</span>
                      </div>
                      <div className="grid gap-2 sm:grid-cols-2">
                        {arrangement.occupants.map((occupant) => <p key={occupant.personName} className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-white/70">{occupant.personName}{occupant.role === "driver" ? " · Driver" : ""}</p>)}
                      </div>
                      {arrangement.notes && <p className="mt-4 border-t border-white/10 pt-4 text-sm leading-6 text-white/45">{arrangement.notes}</p>}
                    </section>
                  );
                })}
                {dayNotes && <p className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-4 text-sm leading-6 text-white/45">{dayNotes}</p>}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

function DayArticle({ date, title, rentalCarDate, children }: { date: string; title: string; rentalCarDate?: string; children: React.ReactNode }) {
  return <article className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur-md"><div className="mb-5 flex items-start justify-between gap-4"><div><p className="mb-2 text-sm text-[var(--chapter-accent)]">{date}</p><h2 className="text-2xl font-light">{title}</h2></div>{rentalCarDate && <RentalCarPlanner date={rentalCarDate} dateLabel={date} />}</div><div className="space-y-4 text-sm leading-7 text-white/75">{children}</div></article>;
}

function XiaoliuqiuContent({ card }: { card: (children: React.ReactNode) => React.ReactNode }) {
  return <><DayArticle date="Friday, November 20, 2026" title="Arrival Day · Xiaoliuqiu">{card(<><p>🌅 Anthony, Christine, Mona & Mark arriving Xiaoliuqiu</p><p className="mt-2 text-white/50">高雄左營高鐵站 → 10:30 AM 客運 → 屏客東港總站 → 步行10分鐘東港碼頭 → 11:50 AM <a href="https://www.leucosapphire.com/" target="_blank" rel="noopener noreferrer" className="text-[var(--chapter-accent)] hover:underline">藍白船班</a> → 與Jim碼頭集合</p></>)}{card(<><p>🤿 Open Water Lesson</p><ul className="ml-5 list-disc text-white/65"><li>裝備組裝介紹</li><li>Close Water · Dive #1</li></ul></>)}{card(<p>🍽 Dinner · TBD</p>)}</DayArticle><DayArticle date="Saturday, November 21, 2026" title="Open Water Dive Day">{card(<><p>🌊 Open Water Lessons</p><p>Dive #2 & Dive #3</p></>)}{card(<><p>⛴ Xenia, David & Naomi arriving Xiaoliuqiu</p><p className="mt-2 text-sm font-medium text-white/80">Northern XLQ Visits</p><div className="mt-4 flex flex-col gap-4 md:flex-row"><ul className="ml-5 flex-1 list-disc space-y-2 text-white/65"><li>美人洞</li><li>花瓶岩</li><li>龍蝦洞</li></ul><img src="/xlqmap.png" alt="Xiaoliuqiu map" className="h-auto w-full rounded-2xl object-contain bg-black/20 p-2 md:w-1/2" /></div></>)}</DayArticle><DayArticle date="Sunday, November 22, 2026" title="Dive + Southern Island Day">{card(<><p>🤿 Open Water Lessons</p><p>Dive #4 & Dive #5</p><p className="mt-2 text-white/50">David & Anthony may join fun dives with the OW group.</p></>)}{card(<p>👶 Toddler Group 小琉球海洋館</p>)}{card(<><p>🌅 Southern Xiaoliuqiu Exploration</p><ul className="ml-5 list-disc text-white/65"><li>琉行綠色隧道</li><li>烏鬼洞</li><li>落日亭 Sunset View</li></ul></>)}</DayArticle><DayArticle date="Monday, November 23, 2026" title="Departure to Taipei">{card(<><p>⛴ Everyone leaving Xiaoliuqiu · 11:10 AM boat</p><p>🍣 Lunch · 東港漁市場</p><p>🚄 Afternoon · 左營 → 台北</p></>)}</DayArticle></>;
}

function OnnaContent({ card, linkedImage }: { card: (children: React.ReactNode) => React.ReactNode; linkedImage: (src: string, alt: string) => React.ReactNode }) {
  return <><DayArticle date="Friday, November 27, 2026" rentalCarDate="2026-11-27" title="Morning Arrival · Naha">{card(<><p>✈ EVA Air BR112 · Arrive 9:15 AM at Naha Airport</p><p>🚗 Pick up rental car · Rental Company TBD</p></>)}{card(<><p>🕛 <a href="https://maps.google.com/?q=Senaga+Island+Umikaji+Terrace" target="_blank" rel="noopener noreferrer" className="text-[var(--chapter-accent)] hover:underline">Senaga Island · Umikaji Terrace</a></p>{linkedImage("/umikaji-terrace.png", "Umikaji Terrace Okinawa")}<p className="mt-4">MKCafe → ocean views and Mackerel Bitter Melon Burger.</p></>)}{card(<><p className="text-[var(--chapter-accent)]">Afternoon · PART I</p><p>🛍 <a href="https://maps.google.com/?q=San-A+PARCO+CITY+Okinawa" target="_blank" rel="noopener noreferrer" className="text-[var(--chapter-accent)] hover:underline">PARCO City</a></p><p>☕ <a href="https://maps.google.com/?q=Minatogawa+Stateside+Town+Okinawa" target="_blank" rel="noopener noreferrer" className="text-[var(--chapter-accent)] hover:underline">港川外人住宅 Minatogawa State Side Town</a></p></>)}{card(<><p className="text-[var(--chapter-accent)]">Afternoon · PART II</p><p>🏖 <a href="https://maps.google.com/?q=Araha+Beach+Park+Okinawa" target="_blank" rel="noopener noreferrer" className="text-[var(--chapter-accent)] hover:underline">Araha Beach Park</a></p><p>🛒 <a href="https://maps.google.com/?q=AEON+Mall+Rycom+Okinawa" target="_blank" rel="noopener noreferrer" className="text-[var(--chapter-accent)] hover:underline">Aeon Mall Rycom</a></p><p>🚗 <a href="https://maps.google.com/?q=Hotel+Monterey+Okinawa+Spa+%26+Resort" target="_blank" rel="noopener noreferrer" className="text-[var(--chapter-accent)] hover:underline">Drive to resort</a> · approximately 45 minutes.</p></>)}</DayArticle><DayArticle date="Saturday, November 28, 2026" rentalCarDate="2026-11-28" title="Resort Day · Beach / Culture / Blue Cave">{card(<p>🍳 Breakfast · Hotel buffet</p>)}{card(<><p>🤿 Blue Cave dive & snorkel 青之洞窟潛水</p><p className="text-white/50">Weather dependent</p>{linkedImage("/bluecave.png", "Blue Cave Okinawa")}</>)}{card(<a href="https://www.ryukyumura.co.jp/" target="_blank" rel="noopener noreferrer" className="text-[var(--chapter-accent)] hover:underline">🏯 Ryukyu Mura with FunPass</a>)}{card(<><a href="https://www.hotelmonterey.co.jp/en/okinawa/activity/" target="_blank" rel="noopener noreferrer" className="text-[var(--chapter-accent)] hover:underline">🏖 Resort & Beach Activities</a>{linkedImage("/hotel.png", "Hotel Monterey Okinawa")}</>)}{card(<p>🍽 Dinner · TBD</p>)}</DayArticle><DayArticle date="Sunday, November 29, 2026" rentalCarDate="2026-11-29" title="Albert & Quinn Wedding Day">{card(<><p>Breakfast · Hotel buffet</p><p>💍 Albert & Quinn Wedding at Hotel Monterey Okinawa Spa & Resort</p>{linkedImage("/chapel.png", "Wedding Chapel Okinawa")}</>)}</DayArticle></>;
}

function NagoContent({ card, linkedImage }: { card: (children: React.ReactNode) => React.ReactNode; linkedImage: (src: string, alt: string) => React.ReactNode }) {
  return <><DayArticle date="Monday, November 30, 2026" rentalCarDate="2026-11-30" title="Onna → Nago">{card(<><p>🍳 Breakfast · Hotel buffet</p><p>🧳 Checkout at 10:00 AM</p><a href="https://maps.google.com/?q=Cape+Manzamo+Okinawa" target="_blank" rel="noopener noreferrer" className="text-[var(--chapter-accent)] hover:underline">🌊 Cape Manzamo quick stop</a>{linkedImage("/cape.png", "Cape Manzamo Okinawa")}</>)}{card(<><a href="https://maps.google.com/?q=Busena+Marine+Park+Okinawa" target="_blank" rel="noopener noreferrer" className="text-[var(--chapter-accent)] hover:underline">🌊 Busena Marine Park Underwater Observatory + Glass Boat</a>{linkedImage("/busena.png", "Busena Marine Park")}</>)}{card(<><a href="https://maps.google.com/?q=Orion+Happy+Park+Nago" target="_blank" rel="noopener noreferrer" className="text-[var(--chapter-accent)] hover:underline">🍺 14:00 – 16:00 Orion Happy Park</a>{linkedImage("/orion.png", "Orion Happy Park")}</>)}{card(<><p>🥩 Dinner · <a href="https://share.google/nhtDdtE6vYP48ws81" target="_blank" rel="noopener noreferrer" className="text-[var(--chapter-accent)] hover:underline">Restaurant Flipper</a></p><p>🛍 <a href="https://maps.google.com/?q=MEGA+Don+Quijote+Nago" target="_blank" rel="noopener noreferrer" className="text-[var(--chapter-accent)] hover:underline">MEGA Don Quijote Nago</a></p></>)}</DayArticle><DayArticle date="Tuesday, December 1, 2026" rentalCarDate="2026-12-01" title="Aquarium + Kouri Island">{card(<><p><a href="https://maps.google.com/?q=Okinawa+Churaumi+Aquarium" target="_blank" rel="noopener noreferrer" className="text-[var(--chapter-accent)] hover:underline">🐠 9:30 – 13:00 Churaumi Aquarium</a></p>{linkedImage("/aquarium.png", "Churaumi Aquarium")}</>)}{card(<><p><a href="https://maps.google.com/?q=Bise+Fukugi+Tree+Road+Okinawa" target="_blank" rel="noopener noreferrer" className="text-[var(--chapter-accent)] hover:underline">🌳 Bise Fukugi Tree Road</a></p>{linkedImage("/tree.png", "Bise Fukugi Tree Road")}</>)}{card(<><p><a href="https://maps.google.com/?q=Kouri+Island+Okinawa" target="_blank" rel="noopener noreferrer" className="text-[var(--chapter-accent)] hover:underline">🌉 Kouri Island</a></p>{linkedImage("/kouri.png", "Kouri Island")}</>)}{card(<p>🍽 Dinner · <a href="https://maps.google.com/?q=Yakiniku+Kochan+Nago" target="_blank" rel="noopener noreferrer" className="text-[var(--chapter-accent)] hover:underline">Yakiniku Kochan 焼肉こうちゃん</a></p>)}</DayArticle></>;
}

function YilanContent({ card }: { card: (children: React.ReactNode) => React.ReactNode }) {
  return (
    <>
      <DayArticle date="Tuesday, December 8, 2026" title="Taipei → Yilan South 蘇澳">
        {card(<><p>🚗 10:00 AM 台北出發前往宜蘭 · 約 1.5 小時車程</p><p>🦆 Lunch · <a href="https://maps.google.com/?q=鴨寮故事館" target="_blank" rel="noopener noreferrer" className="text-[var(--chapter-accent)] hover:underline">鴨寮故事館 Duck Shack Museum</a></p><p className="text-white/50">桌菜須先電話預約 03-9504646</p><img src="/yaya.png" alt="Duck Shack Museum" className="mt-4 h-56 w-full rounded-2xl object-cover object-center" /></>)}
        {card(<><p>🖍️ Afternoon · <a href="https://luckyart.com.tw/art/guide" target="_blank" rel="noopener noreferrer" className="text-[var(--chapter-accent)] hover:underline">蠟藝蠟筆城堡</a></p><p>Optional · 南方澳觀景臺 & 宜蘭赫蒂法莊</p><img src="/crayon.png" alt="Crayon Castle" className="mt-4 h-56 w-full rounded-2xl object-cover object-center" /></>)}
        {card(<><p>🏨 Hotel · <a href="https://suao.rslhotel.com/fac/" target="_blank" rel="noopener noreferrer" className="text-[var(--chapter-accent)] hover:underline">瓏山林蘇澳冷熱泉度假飯店</a></p></>)}
      </DayArticle>

      <DayArticle date="Wednesday, December 9, 2026" title="Yilan Central 羅東">
        {card(<><p>🍳 Breakfast · Hotel buffet</p><p>🧳 Checkout</p></>)}
        {card(<><p>Morning & Lunch · <a href="https://www.anyomuseum.com/" target="_blank" rel="noopener noreferrer" className="text-[var(--chapter-accent)] hover:underline">安永心食館</a></p></>)}
        {card(<><p>🐐 Afternoon · <a href="https://zhangmeiama.weebly.com/" target="_blank" rel="noopener noreferrer" className="text-[var(--chapter-accent)] hover:underline">張美阿嬤農場</a></p><p>Rain option · <a href="https://maps.google.com/?q=宜蘭木育森林" target="_blank" rel="noopener noreferrer" className="text-[var(--chapter-accent)] hover:underline">宜蘭木育森林</a></p><img src="/ama.png" alt="Zhang Mei Ama Farm" className="mt-4 h-56 w-full rounded-2xl object-cover object-center" /></>)}
        {card(<><p>🍽 Dinner · <a href="https://maps.google.com/?q=羅東夜市" target="_blank" rel="noopener noreferrer" className="text-[var(--chapter-accent)] hover:underline">羅東夜市</a></p><p>🏨 Hotel · 礁溪寒沐酒店</p></>)}
      </DayArticle>

      <DayArticle date="Thursday, December 10, 2026" title="Yilan North 礁溪">
        {card(<><p>🍳 Breakfast · Hotel buffet</p><ul className="ml-5 list-disc text-white/65"><li><a href="https://maps.google.com/?q=龍潭湖風景區" target="_blank" rel="noopener noreferrer" className="text-[var(--chapter-accent)] hover:underline">龍潭湖風景區</a></li><li>大碗公溜滑梯</li><li>Herbelle Tea 湖畔茶屋</li><li>環湖步道</li><li>觀眺望平台步道</li><li>龍潭湖畔悠活園區</li><li>Optional · 潭酵天地</li></ul><img src="/long.png" alt="Longtan Lake" className="mt-4 h-56 w-full rounded-2xl object-cover object-center" /></>)}
        {card(<><p>Rain option · <a href="https://maps.google.com/?q=九號溫泉魚釣蝦池" target="_blank" rel="noopener noreferrer" className="text-[var(--chapter-accent)] hover:underline">九號溫泉魚釣蝦池</a> / <a href="https://maps.google.com/?q=金車生物科技水產養殖研發中心" target="_blank" rel="noopener noreferrer" className="text-[var(--chapter-accent)] hover:underline">金車生物科技水產養殖研發中心</a></p><p>Late Afternoon · Enjoy hotel facilities</p><p>🍽 Dinner · Hotel restaurant</p><p>🏨 Hotel · 礁溪寒沐酒店</p></>)}
      </DayArticle>

      <DayArticle date="Friday, December 11, 2026" title="Yilan 頭城 → Taipei 內湖">
        {card(<><p>🍳 Breakfast · Hotel buffet</p><p>🧳 Checkout</p><p>Morning · <a href="https://maps.google.com/?q=二龍之心親子公園" target="_blank" rel="noopener noreferrer" className="text-[var(--chapter-accent)] hover:underline">二龍之心親子公園</a> or ♨️ <a href="https://maps.google.com/?q=礁溪溫泉公園" target="_blank" rel="noopener noreferrer" className="text-[var(--chapter-accent)] hover:underline">礁溪溫泉公園</a></p><img src="/yilannorth.png" alt="Yilan North Morning" className="mt-4 h-56 w-full rounded-2xl object-cover object-center" /></>)}
        {card(<><p>Lunch & Afternoon · <a href="https://maps.google.com/?q=頭城老街" target="_blank" rel="noopener noreferrer" className="text-[var(--chapter-accent)] hover:underline">頭城老街</a></p><img src="/tou.png" alt="Toucheng Old Street" className="mt-4 h-56 w-full rounded-2xl object-cover object-center" /><p>🚗 頭城 → 內湖 · 約 50 分鐘車程</p><p>🏨 Hotel · 內湖區</p></>)}
      </DayArticle>
    </>
  );
}

function NanjoContent({ card }: { card: (children: React.ReactNode) => React.ReactNode }) {
  return <><DayArticle date="Wednesday, December 2, 2026" rentalCarDate="2026-12-02" title="Nago → Nanjo">{card(<><p className="text-[var(--chapter-accent)]">Morning & Day</p><p>🎢 Option 1 · Kids age 4+ & adults</p><p><a href="https://junglia.jp/en" target="_blank" rel="noopener noreferrer" className="text-[var(--chapter-accent)] hover:underline">Junglia Park</a></p><div className="mt-4" /><p>🦁 Option 2 · Kids age 1–3</p><p><a href="https://maps.google.com/?q=Nago+Pineapple+Park" target="_blank" rel="noopener noreferrer" className="text-[var(--chapter-accent)] hover:underline">Nago Pineapple Park</a> or <a href="https://maps.google.com/?q=Neo+Park+Okinawa" target="_blank" rel="noopener noreferrer" className="text-[var(--chapter-accent)] hover:underline">Neo Park Zoo</a></p></>)}{card(<><p className="text-[var(--chapter-accent)]">Afternoon · 3:00 PM</p><p>🚗 Leaving Nago and drive approximately 1 hour toward <a href="https://maps.google.com/?q=Miyagi+Coast+Okinawa" target="_blank" rel="noopener noreferrer" className="text-[var(--chapter-accent)] hover:underline">Miyagi Coast</a> & American Village</p><img src="/america.png" alt="American Village Okinawa" className="mt-4 h-56 w-full rounded-2xl object-cover object-center" /><p className="mt-4">🍽 Dinner · <a href="https://maps.app.goo.gl/PXMBGjZ1AsTNkSVT9" target="_blank" rel="noopener noreferrer" className="text-[var(--chapter-accent)] hover:underline">Taco Rice Cafe Kijimuna</a></p><p>🚗 Evening drive to hotel · <a href="https://maps.google.com/?q=Yuinchi+Hotel+Nanjo" target="_blank" rel="noopener noreferrer" className="text-[var(--chapter-accent)] hover:underline">Yuinchi Hotel Nanjo</a></p></>)} </DayArticle><DayArticle date="Thursday, December 3, 2026" rentalCarDate="2026-12-03" title="Nanjo · Okinawa World + Gangala Valley">{card(<><p>🍳 Breakfast · Hotel buffet</p><p>🌏 <a href="https://maps.google.com/?q=Okinawa+World" target="_blank" rel="noopener noreferrer" className="text-[var(--chapter-accent)] hover:underline">Okinawa World（玉泉洞）</a> · FunPass</p><img src="/cave.png" alt="Okinawa World Cave" className="mt-4 h-56 w-full rounded-2xl object-cover object-center" /></>)}{card(<><p>🌿 Gangala Valley</p><img src="/gangala.png" alt="Gangala Valley" className="mt-4 h-56 w-full rounded-2xl object-cover object-center" /><a href="https://book.gangala.com/?lng=zh-TW" target="_blank" rel="noopener noreferrer" className="mt-4 inline-block text-[var(--chapter-accent)] hover:underline">Gangala Valley reservation</a></>)}</DayArticle></>;
}

function NahaEarlyContent({ card, linkedImage }: { card: (children: React.ReactNode) => React.ReactNode; linkedImage: (src: string, alt: string) => React.ReactNode }) {
  return <><DayArticle date="Wednesday, November 25, 2026" rentalCarDate="2026-11-25" title="Morning Arrival · Naha">{card(<><p>✈ EVA Air BR112 · Arrive 9:15 AM at Naha Airport</p><p>🚗 Pick up rental car</p></>)}{card(<><p>🕛 Lunch · <a href="https://okinawa.letsgojp.com/archives/405500/" target="_blank" rel="noopener noreferrer" className="text-[var(--chapter-accent)] hover:underline">Senaga Island · Umikaji Terrace</a></p><p>如果天氣好 + 飛機準時，可前往瀨長島散步。</p><p>🍔 MKCafe · Ocean view & Mackerel Bitter Melon Burger</p></>)}{card(<><p>🏯 Shuri Castle if reopened</p><p>🛍 Kokusai dori 國際通 · Calbee Okinawa · 御果子御殿 · Tsuboya Pottery Street</p><img src="/shop.png" alt="Naha Shopping" className="mt-4 h-56 w-full rounded-2xl object-cover object-center" /></>)} </DayArticle><DayArticle date="Thursday, November 26, 2026" rentalCarDate="2026-11-26" title="Okinawa World + Gangala Valley">{card(<><p>🐟 10:00 AM · Tomari Iyumachi Fish Market Brunch</p></>)}{card(<><p>🌏 <a href="https://maps.google.com/?q=Okinawa+World" target="_blank" rel="noopener noreferrer" className="text-[var(--chapter-accent)] hover:underline">沖繩世界（玉泉洞） Okinawa World</a> · Fun Pass</p><ul className="ml-5 list-disc text-white/65"><li>玉泉洞鐘乳石洞</li><li>琉球文化村</li><li>太鼓舞表演</li></ul><img src="/cave.png" alt="Okinawa World Cave" className="mt-4 h-56 w-full rounded-2xl object-cover object-center" /></>)}{card(<><p>🌿 Gangala之谷</p><p>導航可搜尋「Cave Cafe」或「Gangala之谷」，附免費停車場。</p><p className="text-white/60">沖繩南部熱門自然景點，以鐘乳石洞穴崩塌形成的森林山谷聞名。</p><p className="text-white/60">導覽需事先預約，每人約 2,500 日圓。</p><a href="https://book.gangala.com/?lng=zh-TW" target="_blank" rel="noopener noreferrer" className="text-[var(--chapter-accent)] hover:underline">Gangala Valley Reservation</a><img src="/gangala.png" alt="Gangala Valley" className="mt-4 h-56 w-full rounded-2xl object-cover object-center" /></>)}{card(<p>🍽 Dinner · TBD</p>)} </DayArticle></>;
}

function NahaContent({ card }: { card: (children: React.ReactNode) => React.ReactNode }) {
  return <><DayArticle date="Friday, December 4, 2026" rentalCarDate="2026-12-04" title="Nanjo → Naha">{card(<><p>🧳 9:00 AM · Checkout hotel</p><p>🚗 Drive from Nanjo → Naha · approximately 30 min</p><p>✈️ Drop off Steven at <a href="https://maps.google.com/?q=Naha+Airport" target="_blank" rel="noopener noreferrer" className="text-[var(--chapter-accent)] hover:underline">Naha Airport</a></p></>)}{card(<><p>🐟 11:00 AM · Tomari Iyumachi Fish Market Brunch</p></>)}{card(<><p>🏯 Shuri Castle if reopened</p><p>🛍 Kokusai dori 國際通 · Calbee Okinawa · 御果子御殿 · Tsuboya Pottery Street</p><img src="/shop.png" alt="Kokusai Dori Shopping" className="mt-4 h-56 w-full rounded-2xl object-cover object-center" /></>)} </DayArticle><DayArticle date="Saturday, December 5, 2026" rentalCarDate="2026-12-05" title="Shopping + Aquarium Day">{card(<><p>🍳 Hotel breakfast buffet</p><p>🧳 Checkout at 11:00 AM</p><p>🐟 Itoman Fish Market · Ashibinaa Outlet · DMM Kariyushi Aquarium</p></>)}</DayArticle><DayArticle date="Sunday, December 6, 2026" rentalCarDate="2026-12-06" title="Departure Day">{card(<><p>🧳 Hotel checkout at 7:15 AM</p><p>✈️ EVA Air BR113 · OKA 10:15 → TPE 10:55</p></>)}</DayArticle></>;
}
