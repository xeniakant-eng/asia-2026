"use client";

import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

const MS_PER_DAY = 1000 * 60 * 60 * 24;
const BABY_BLUE = "#9EDCFF";
const TAIWAN_GOLD = "#72E49A";
const MOROCCO_BROWN = "#D6B48C";
const VIETNAM_GOLD = "#F6C65B";

type PageName = "map" | "xiaoliuqiu" | "taipei" | "onna" | "nago" | "nanjo" | "naha" | "nahaearly" | "yilan" | "checklist";
type Region = "japan" | "taiwan";
type TripKey = "morocco" | "vietnam" | "taiwan" | "okinawaJapan" | "skiMyoko" | "skiDeerValley" | "skiBig3" | "panama" | "houston" | "azoresPortugal" | "similanThailand" | "centralVietnam" | "mexicoPlaya" | "taiwanApril" | "hawaii" | "alaskaCruise" | "disneyWorld" | "fiveStans";
type MainPageView = "active" | "ski" | "future" | "archive";

const TRIP_PATHS: Record<TripKey, string> = {
  morocco: "morocco",
  vietnam: "vietnam",
  taiwan: "taiwan",
  okinawaJapan: "okinawa-japan",
  skiMyoko: "ski-shiga-kogen",
  skiDeerValley: "ski-deer-valley",
  skiBig3: "skibig3",
  panama: "panama",
  houston: "houston-galveston",
  azoresPortugal: "azores-portugal",
  similanThailand: "similan-thailand",
  centralVietnam: "central-vietnam",
  mexicoPlaya: "mexico-playa-del-carmen",
  taiwanApril: "taiwan-april",
  hawaii: "hawaii-maui-big-island",
  alaskaCruise: "alaska-cruise",
  disneyWorld: "disney-world",
  fiveStans: "five-stans",
};

const TRIP_KEYS_BY_PATH = Object.fromEntries(Object.entries(TRIP_PATHS).map(([key, path]) => [path, key])) as Record<string, TripKey>;

const GUEST_NAME_ALIASES: Record<string, string> = {
  "Heather & Jack & Aizen (8) & Kaien (3)": "Heather & Jack & Aizen (8) & Kaien (3) & Norma",
};

function ViewportPortal({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  return mounted ? createPortal(children, document.body) : null;
}

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
type SignupTripKey = "morocco" | "vietnam" | "skiMyoko" | "skiDeerValley" | "skiBig3" | "panama" | "houston" | "azoresPortugal" | "similanThailand" | "centralVietnam" | "mexicoPlaya" | "taiwanApril" | "hawaii" | "alaskaCruise" | "disneyWorld" | "fiveStans";
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

type MoroccoExpense = {
  id: string;
  description: string;
  amountCad: number | null;
  amountLocal: number | null;
  amountUsd: number | null;
  exchangeRateToCad: number | null;
  convertedAmountCad: number | null;
  paidBy: string;
  paidFor: string;
  createdAt: string;
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

function formatTripDateLine(date: string, duration?: string) {
  if (!duration) return date;
  if (date.toLowerCase() === "tbd") return `${duration}, dates TBD`;
  return `${duration} in ${date}`;
}

function TripButton({
  location,
  subtitle,
  date,
  duration,
  status,
  onClick,
  heroOverlay = false,
}: {
  location: string;
  subtitle?: string;
  date: string;
  duration?: string;
  status: TripStatus;
  onClick: () => void;
  heroOverlay?: boolean;
}) {
  const statusStyles: Record<TripStatus, string> = {
    Planning: "border-[#FFD76A]/35 bg-[#FFD76A]/10 text-[#FFD76A]",
    Confirmed: "border-[#72E49A]/35 bg-[#72E49A]/10 text-[#72E49A]",
    Dreaming: "border-[#FF8FC7]/35 bg-[#FF8FC7]/10 text-[#FF8FC7]",
  };
  const dateLine = formatTripDateLine(date, duration);

  return (
    <button type="button" onClick={onClick} className={`flex w-full items-center justify-between gap-4 rounded-2xl border px-4 py-4 text-left text-sm font-light tracking-wide text-white/75 backdrop-blur-md transition ${heroOverlay ? "border-white/20 bg-black/40 hover:border-white/40 hover:bg-black/55" : "border-white/10 bg-white/[0.03] hover:border-white/30 hover:bg-white/[0.05]"}`}>
      <span className="min-w-0">
        <span className="block">{location}</span>
        {subtitle && <span className="mt-1 block text-xs text-white/60">{subtitle}</span>}
        <span className="mt-1 block text-xs text-white/45">{dateLine}</span>
      </span>
      <span className={`shrink-0 rounded-full border px-3 py-1 text-[10px] uppercase tracking-[0.18em] ${statusStyles[status]}`}>{status}</span>
    </button>
  );
}

function MainHubButton({
  title,
  subtitle,
  onClick,
}: {
  title: string;
  subtitle: string;
  onClick: () => void;
}) {
  return (
    <button type="button" onClick={onClick} className="w-full rounded-2xl border border-white/15 bg-white/[0.04] px-4 py-4 text-left transition hover:border-white/35 hover:bg-white/[0.08]">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-light uppercase tracking-[0.18em] text-white/85">{title}</p>
          <p className="mt-1 text-xs text-white/40">{subtitle}</p>
        </div>
        <span className="text-lg text-white/35">→</span>
      </div>
    </button>
  );
}

function TripPanelTitle({
  location,
  subtitle,
  date,
  duration,
  description,
}: {
  location: string;
  subtitle?: string;
  date: string;
  duration?: string;
  description?: string;
}) {
  const dateLine = formatTripDateLine(date, duration);

  return (
    <div className="mb-5">
      <h1 className="text-3xl font-light tracking-wide">
        <span className="block">{location}</span>
        {subtitle && <span className="mt-2 block text-base text-white/60">{subtitle}</span>}
        <span className="mt-2 block text-base text-white/45">{dateLine}</span>
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
  onViewAlbum,
  compact = false,
  inlineButtons = false,
  inlineMode = "both",
  uploadLabel = "Upload Photos",
  viewLabel = "View Album",
  solidButtons = false,
}: {
  albumKey: string;
  albumName: string;
  accentColor: string;
  guestName: string;
  returnChapter: string;
  onViewAlbum?: (albumUrl: string) => void;
  compact?: boolean;
  inlineButtons?: boolean;
  inlineMode?: "both" | "upload" | "view";
  uploadLabel?: string;
  viewLabel?: string;
  solidButtons?: boolean;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");
  const isReadOnlyGuest = guestName === "Guest";
  const albumUrl = `/memory-maker/${albumKey}?returnChapter=${encodeURIComponent(returnChapter)}&guest=${encodeURIComponent(guestName || "Guest")}`;
  const viewAlbum = () => {
    if (onViewAlbum) {
      onViewAlbum(albumUrl);
      return;
    }
    window.open(albumUrl, "_blank", "noopener,noreferrer");
  };

  const uploadFiles = async (selectedFiles: FileList | null) => {
    if (isReadOnlyGuest) {
      setMessage("Guest access is view-only.");
      return;
    }
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

  const compactButtonStyle = {
    borderColor: solidButtons ? `${accentColor}8C` : `${accentColor}59`,
    backgroundColor: solidButtons ? "rgba(4, 8, 10, 0.43)" : `${accentColor}18`,
  };
  const compactUploadButton = (
    <button type="button" disabled={isLoading || isReadOnlyGuest} onClick={() => fileInputRef.current?.click()} className="flex min-h-14 items-center justify-center gap-3 rounded-2xl border px-4 py-3 text-center backdrop-blur-md transition disabled:cursor-not-allowed disabled:opacity-35" style={compactButtonStyle}>
      <span className="text-xl">📤</span>
      <span className="text-xs font-light uppercase tracking-[0.16em]" style={{ color: accentColor }}>{uploadLabel}</span>
    </button>
  );
  const compactAlbumButton = (
    <button type="button" onClick={viewAlbum} className="flex min-h-14 items-center justify-center gap-3 rounded-2xl border px-4 py-3 text-center backdrop-blur-md transition" style={compactButtonStyle}>
      <span className="text-xl">🖼️</span>
      <span className="text-xs font-light uppercase tracking-[0.16em]" style={{ color: accentColor }}>{viewLabel}</span>
    </button>
  );

  if (inlineButtons) {
    return (
      <>
        <input ref={fileInputRef} type="file" multiple accept="image/*" className="hidden" onChange={(event) => uploadFiles(event.target.files)} />
        {(inlineMode === "both" || inlineMode === "upload") && compactUploadButton}
        {(inlineMode === "both" || inlineMode === "view") && compactAlbumButton}
        {message && <p className="col-span-full text-sm text-white/50">{message}</p>}
      </>
    );
  }

  if (compact) {
    return (
      <div>
        <div className="grid gap-3 sm:grid-cols-2">
          <input ref={fileInputRef} type="file" multiple accept="image/*" className="hidden" onChange={(event) => uploadFiles(event.target.files)} />
          {compactUploadButton}
          {compactAlbumButton}
        </div>
        {message && <p className="mt-3 text-sm text-white/50">{message}</p>}
      </div>
    );
  }

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
          <button type="button" disabled={isLoading || isReadOnlyGuest} onClick={() => fileInputRef.current?.click()} className="rounded-full border border-white/20 bg-white/[0.04] px-5 py-3 text-sm uppercase tracking-[0.18em] text-white/70 transition hover:border-white/40 hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-35">Upload</button>
          <button type="button" onClick={viewAlbum} className="rounded-full border border-white/20 bg-white/[0.04] px-5 py-3 text-center text-sm uppercase tracking-[0.18em] text-white/70 transition hover:border-white/40 hover:bg-white/[0.08]">View Album</button>
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
  if (!guest || guest === "Guest" || guest === "I am just a random Guest") return null;
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
  if (!guest || guest === "Guest" || guest === "I am just a random Guest") return false;
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

async function fetchReservationChecklistProgress(trip: string, guest: string): Promise<Record<string, boolean> | null> {
  if (!trip || !guest || guest === "Guest" || guest === "I am just a random Guest") return null;
  try {
    const response = await fetch(`/api/reservation-checklist-progress?trip=${encodeURIComponent(trip)}&guest=${encodeURIComponent(guest)}`);
    if (!response.ok) return null;
    const data = await response.json();
    return data.progress && typeof data.progress === "object" ? data.progress : {};
  } catch {
    return null;
  }
}

async function saveReservationChecklistProgress(trip: string, guest: string, itemKey: string, checked: boolean): Promise<boolean> {
  if (!trip || !guest || guest === "Guest" || guest === "I am just a random Guest") return false;
  try {
    const response = await fetch("/api/reservation-checklist-progress", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ trip, guest, itemKey, checked }),
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
  const [siteAccessMode, setSiteAccessMode] = useState<"loading" | "guest" | "member">("loading");
  const [hovered, setHovered] = useState<string | null>(null);
  const [page, setPage] = useState<PageName>("map");
  const [guestName, setGuestName] = useState("");
  const [isGuestConfirmed, setIsGuestConfirmed] = useState(false);
  const [isInitialRouteReady, setIsInitialRouteReady] = useState(false);
  const [showGuestActions, setShowGuestActions] = useState(false);
  const [selectedTrip, setSelectedTrip] = useState<"" | TripKey>("");
  const [mainPageView, setMainPageView] = useState<MainPageView>("active");
  const [albumPopupUrl, setAlbumPopupUrl] = useState("");
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
  const [showMoroccoBudget, setShowMoroccoBudget] = useState(false);
  const [showMoroccoUsefulInfo, setShowMoroccoUsefulInfo] = useState(false);
  const [showMoroccoMap, setShowMoroccoMap] = useState(false);
  const [showVietnamItinerary, setShowVietnamItinerary] = useState(false);
  const [showVietnamRouteMap, setShowVietnamRouteMap] = useState(false);
  const [showVietnamFlightSummary, setShowVietnamFlightSummary] = useState(false);
  const [showTaipeiMrtMap, setShowTaipeiMrtMap] = useState(false);
  const [showTaipeiFoodieList, setShowTaipeiFoodieList] = useState(false);
  const [showOkinawaBudget, setShowOkinawaBudget] = useState(false);
  const [showOkinawaReservationChecklist, setShowOkinawaReservationChecklist] = useState(false);
  const [taiwanDashboardAlbumMode, setTaiwanDashboardAlbumMode] = useState<"" | "upload" | "view">("");
  const [checkedTaipeiFoodieItems, setCheckedTaipeiFoodieItems] = useState<string[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      return JSON.parse(window.localStorage.getItem("checkedTaipeiFoodieItems") || "[]");
    } catch {
      return [];
    }
  });
  const [showMoroccoChecklist, setShowMoroccoChecklist] = useState(false);
  const [showMoroccoItinerary, setShowMoroccoItinerary] = useState(false);
  const [showMoroccoCostTracker, setShowMoroccoCostTracker] = useState(false);
  const [activeBillTabTrip, setActiveBillTabTrip] = useState<"morocco" | "taiwan" | "okinawaJapan" | "vietnam">("morocco");
  const [showMoroccoAccountingSummary, setShowMoroccoAccountingSummary] = useState(false);
  const [moroccoExpenses, setMoroccoExpenses] = useState<MoroccoExpense[]>([]);
  const [moroccoExpenseDescription, setMoroccoExpenseDescription] = useState("");
  const [moroccoExpenseAmount, setMoroccoExpenseAmount] = useState("");
  const [moroccoExpenseCurrency, setMoroccoExpenseCurrency] = useState<"CAD" | "MAD" | "JPY" | "TWD" | "VND" | "USD">("MAD");
  const [moroccoExpensePaidBy, setMoroccoExpensePaidBy] = useState("");
  const [moroccoExpensePaidFor, setMoroccoExpensePaidFor] = useState<string[]>(["Everyone"]);
  const [moroccoEditingExpenseId, setMoroccoEditingExpenseId] = useState("");
  const [moroccoExpenseAdminPassword, setMoroccoExpenseAdminPassword] = useState("");
  const [moroccoExpenseMessage, setMoroccoExpenseMessage] = useState("");
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
  const [centralVietnamInterestedNames, setCentralVietnamInterestedNames] = useState<string[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      return JSON.parse(window.localStorage.getItem("centralVietnamInterestedNames") || "[]");
    } catch {
      return [];
    }
  });
  const [showCentralVietnamNameInput, setShowCentralVietnamNameInput] = useState(false);
  const [centralVietnamNameInput, setCentralVietnamNameInput] = useState("");
  const [mexicoPlayaInterestedNames, setMexicoPlayaInterestedNames] = useState<string[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      return JSON.parse(window.localStorage.getItem("mexicoPlayaInterestedNames") || "[]");
    } catch {
      return [];
    }
  });
  const [showMexicoPlayaNameInput, setShowMexicoPlayaNameInput] = useState(false);
  const [mexicoPlayaNameInput, setMexicoPlayaNameInput] = useState("");
  const [taiwanAprilInterestedNames, setTaiwanAprilInterestedNames] = useState<string[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      return JSON.parse(window.localStorage.getItem("taiwanAprilInterestedNames") || "[]");
    } catch {
      return [];
    }
  });
  const [showTaiwanAprilNameInput, setShowTaiwanAprilNameInput] = useState(false);
  const [taiwanAprilNameInput, setTaiwanAprilNameInput] = useState("");
  const [hawaiiInterestedNames, setHawaiiInterestedNames] = useState<string[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      return JSON.parse(window.localStorage.getItem("hawaiiInterestedNames") || "[]");
    } catch {
      return [];
    }
  });
  const [showHawaiiNameInput, setShowHawaiiNameInput] = useState(false);
  const [hawaiiNameInput, setHawaiiNameInput] = useState("");
  const [alaskaCruiseInterestedNames, setAlaskaCruiseInterestedNames] = useState<string[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      return JSON.parse(window.localStorage.getItem("alaskaCruiseInterestedNames") || "[]");
    } catch {
      return [];
    }
  });
  const [showAlaskaCruiseNameInput, setShowAlaskaCruiseNameInput] = useState(false);
  const [alaskaCruiseNameInput, setAlaskaCruiseNameInput] = useState("");
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
  const [panamaInterestedNames, setPanamaInterestedNames] = useState<string[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      return JSON.parse(window.localStorage.getItem("panamaInterestedNames") || "[]");
    } catch {
      return [];
    }
  });
  const [showPanamaNameInput, setShowPanamaNameInput] = useState(false);
  const [panamaNameInput, setPanamaNameInput] = useState("");
  const [vietnamInterestedNames, setVietnamInterestedNames] = useState<string[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      return JSON.parse(window.localStorage.getItem("vietnamInterestedNames") || "[]");
    } catch {
      return [];
    }
  });
  const [showVietnamNameInput, setShowVietnamNameInput] = useState(false);
  const [vietnamNameInput, setVietnamNameInput] = useState("");
  const [checkedPackingItems, setCheckedPackingItems] = useState<Record<string, boolean>>({});
  const [checkedReservationItems, setCheckedReservationItems] = useState<Record<string, boolean>>({});
  const isSiteGuestAccess = siteAccessMode === "guest";
  const [now, setNow] = useState(new Date());
  const [cadToJpy, setCadToJpy] = useState("110");
  const [cadToTwd, setCadToTwd] = useState("23");
  const [usdToMad, setUsdToMad] = useState("10");
  const [cadToMad, setCadToMad] = useState("7.35");
  const [cadToVnd, setCadToVnd] = useState("19000");
  const [usdToVnd, setUsdToVnd] = useState("26000");
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
    "Jim",
    "Anthony & Christine & Mona (1)",
    "Jenn & Hiroshi & Masashi (6) & Miyari (3)",
    "Heather & Jack & Aizen (8) & Kaien (3) & Norma",
    "Steven Wang",
    "Mark Wang",
    "Mei & Emilia (8)",
    "Julie & Adrian & Ethan (4) & Tyrell (1)",
    "Dave & Christina & Xixi (2)",
  ];
  const vietnamConfirmedParties = [
    "Xenia & David & Naomi (3)",
    "Jenn & Hiroshi & Masashi (6) & Miyari (3)",
  ];
  const vietnamItineraryDays = [
    {
      date: "Thu Nov 12",
      location: "Hanoi",
      title: "Arrival in Hanoi",
      items: [
        "Vietnam Airlines flight from Taipei (TPE) to Hanoi (HAN), 1:25 PM-3:40 PM.",
        "Transfer from airport to Airbnb (40 min drive), check in, easy dinner, and rest.",
      ],
      stay: "Heart of Hoan Kiem Homestay Airbnb, 23C Phố Tông Đản, Hoàn Kiếm, Hà Nội",
    },
    {
      date: "Fri Nov 13",
      location: "Hanoi",
      title: "Hanoi City Day",
      items: [
        "Train Street cafe stop.",
        "Visit Temple of Literature, Old Quarter, Hoan Kiem Lake, and Ngoc Son Temple.",
        "Try egg coffee.",
        "Evening Water Puppet Show.",
      ],
      stay: "Heart of Hoan Kiem Homestay Airbnb, 23C Phố Tông Đản, Hoàn Kiếm, Hà Nội",
    },
    {
      date: "Sat Nov 14",
      location: "Peony Cruises",
      title: "Ha Long Bay & Lan Ha Bay Peony Cruise",
      items: [
        "8:30 AM: Pre-arranged van transfer pickup from Hanoi Airbnb to Tuan Chau Marina (2.5 hrs ride).",
        "Noon: Board 2 day 1 night Peony Cruise.",
        "Afternoon: Tuan Chau - Ha Long Bay - Lan Ha Bay.",
      ],
      links: [
        {
          label: "2D1N Cruise Itinerary",
          href: "https://drive.google.com/file/d/1v5NbCUyXsXEukv5fq-0mk74ojoMTv6DV/view",
        },
      ],
      stay: "Peony Cruise",
    },
    {
      date: "Sun Nov 15",
      location: "Ninh Binh",
      title: "Check-in Ninh Binh",
      items: [
        "6:45 AM: Breakfast.",
        "7:30 AM: Tour of Cat Ba World Biosphere (Cat Ba Island Caves).",
        "11:00 AM: Disembark the Peony Cruise.",
        "Noon: Pre-arranged van transfer from Tuan Chau Marina to Ninh Binh Xuan Son Lakeside Bungalow (3 hr ride).",
        "Evening: Check in, relax, dinner on site.",
      ],
      stay: "Xuan Son Lakeside Bungalow",
    },
    {
      date: "Mon Nov 16",
      location: "Ninh Binh",
      title: "Grottoes & Mountains & Architectures",
      items: [
        "Trang An boat ride in the morning.",
        "Afternoon: Bich Dong Pagoda or countryside rest.",
        "Optional: Hang Mua viewpoint if adults want the climb and the kids still have energy.",
      ],
      stay: "Xuan Son Lakeside Bungalow",
    },
    {
      date: "Tue Nov 17",
      location: "Ho Chi Minh City",
      title: "North to South",
      items: [
        "Early private van from Ninh Binh to Hanoi airport.",
        "Vietjet nonstop flight Hanoi (HAN) to Ho Chi Minh City (SGN), 11:30 AM-1:40 PM, 2 hr 10 min. Fare shown: CA$84.",
        "Afternoon / evening: Ben Thanh Market and Nguyen Hue Walking Street.",
      ],
      stay: "Airbnb TBD",
    },
    {
      date: "Wed Nov 18",
      location: "Ho Chi Minh City",
      title: "Saigon City Tour",
      items: [
        "Independence Palace.",
        "Central Post Office.",
        "Notre Dame area.",
        "Lunch.",
        "War Remnants Museum.",
      ],
      stay: "Airbnb TBD",
    },
    {
      date: "Thu Nov 19",
      location: "Ho Chi Minh City",
      title: "Ben Tre Mekong Tour",
      items: [
        "Shorter private Ben Tre Mekong Tour with early pickup.",
        "Target return by 5:00-6:00 PM.",
        "Relaxed evening after returning to the city.",
      ],
      stay: "Airbnb TBD",
    },
    {
      date: "Fri Nov 20",
      location: "Ho Chi Minh City",
      title: "Cu Chi Tunnels",
      items: [
        "Cu Chi Tunnels half-day tour.",
        "Relaxed afternoon / early dinner after returning to the city.",
        "Pack and sleep early.",
      ],
      stay: "Airbnb TBD",
    },
    {
      date: "Sat Nov 21",
      location: "Depart",
      title: "Ho Chi Minh City to Kaohsiung",
      items: [
        "VietJet Ho Chi Minh City to Kaohsiung, 7:35 AM-11:45 AM, nonstop.",
        "Leave hotel around 4:30-5:00 AM.",
      ],
    },
  ];
  type VietnamBookingCost = { category: string; detail: string | string[]; amountCad: number | null };
  const vietnamFlightSummary = [
    {
      date: "Thu Nov 12, 2026",
      route: "Taipei to Hanoi",
      airline: "Vietnam Airlines",
      time: "1:25 PM - 3:40 PM",
      notes: "Arrive in Hanoi, then transfer to Airbnb.",
    },
    {
      date: "Tue Nov 17, 2026",
      route: "Hanoi to Ho Chi Minh City",
      airline: "VietJet",
      time: "11:30 AM - 1:40 PM",
      notes: "Nonstop HAN to SGN, 2 hr 10 min.",
    },
    {
      date: "Sat Nov 21, 2026",
      route: "Ho Chi Minh City to Kaohsiung",
      airline: "VietJet",
      time: "7:35 AM - 11:45 AM",
      notes: "Nonstop flight. Leave hotel around 4:30-5:00 AM.",
    },
  ];
  const getVietnamBookingCostsForGuest = (guest: string): VietnamBookingCost[] => {
    if (guest.startsWith("Jenn")) {
      return [
        {
          category: "Accommodations (10 nights)",
          detail: [
            "Nov 12-13 Hanoi stay at Heart of Hoan Kiem Homestay Airbnb (reserved): Total = $258.30 CAD, Half = $129.15 CAD.",
            "Nov 14 Peony Cruise Deluxe Balcony Cabin for Jenn's family, 2 adults + 2 kids: $552 USD (approx. $756.24 CAD).",
            "Nov 15-16 Ninh Binh stay at Xuan Son Lakeside Bungalow: Total = $400 CAD, Half = $200 CAD.",
            "Nov 17-20 Ho Chi Minh City Airbnb: TBD.",
          ],
          amountCad: 1085.39,
        },
        {
          category: "Flights (3 flights)",
          detail: [
            "Nov 12 Vietnam Airlines Taipei to Hanoi: $177 CAD x 4 people = $708 CAD.",
            "Nov 17 VietJet Hanoi to Ho Chi Minh City: $84 CAD x 4 people = $336 CAD.",
            "Nov 21 VietJet Ho Chi Minh City to Kaohsiung: $180 CAD x 4 people = $720 CAD.",
          ],
          amountCad: 1764.00,
        },
        {
          category: "Tours & Attraction Tickets",
          detail: [
            "Nov 13 Hanoi city sights and Water Puppet Show: TBD.",
            "Nov 16 Ninh Binh activities: TBD.",
            "Nov 18 Ho Chi Minh City sights: TBD.",
            "Nov 19 Ben Tre Mekong Tour: TBD.",
            "Nov 20 Cu Chi Tunnels half-day tour: TBD.",
          ],
          amountCad: null,
        },
        {
          category: "Transfers",
          detail: [
            "Nov 12 7-seater van from Hanoi airport to Airbnb: Total = 450,000 VND (approx. $24 CAD), Half = approx. $12 CAD.",
            "Nov 14-15 cruise transfers between Hanoi, Tuan Chau Marina, and Ninh Binh: Total = $240 USD (approx. $328.80 CAD), Jenn's share 4/7 = approx. $187.89 CAD.",
            "Nov 17 Ninh Binh to Hanoi airport transfer: TBD.",
            "Nov 21 Ho Chi Minh City Airbnb to airport transfer: TBD.",
          ],
          amountCad: 199.89,
        },
      ];
    }

    if (guest.startsWith("Xenia")) {
      return [
        {
          category: "Accommodations (10 nights)",
          detail: [
            "Nov 12-13 Hanoi stay at Heart of Hoan Kiem Homestay Airbnb (reserved): Total = $258.30 CAD, Half = $129.15 CAD.",
            "Nov 14 Peony Cruise Deluxe Balcony Cabin for Xenia's family, 2 adults + 1 kid: $385 USD (approx. $527.45 CAD).",
            "Nov 15-16 Ninh Binh stay at Xuan Son Lakeside Bungalow: Total = $400 CAD, Half = $200 CAD.",
            "Nov 17-20 Ho Chi Minh City Airbnb: TBD.",
          ],
          amountCad: 856.60,
        },
        {
          category: "Flights (3 flights)",
          detail: [
            "Nov 12 Vietnam Airlines Taipei to Hanoi: $177 CAD x 3 people = $531 CAD.",
            "Nov 17 VietJet Hanoi to Ho Chi Minh City: $84 CAD x 3 people + $16 CAD checked bag = $268 CAD.",
            "Nov 21 VietJet Ho Chi Minh City to Kaohsiung: $180 CAD x 3 people + $45 CAD checked bag = $585 CAD.",
          ],
          amountCad: 1384.00,
        },
        {
          category: "Tours & Attraction Tickets",
          detail: [
            "Nov 13 Hanoi city sights and Water Puppet Show: TBD.",
            "Nov 16 Ninh Binh activities: TBD.",
            "Nov 18 Ho Chi Minh City sights: TBD.",
            "Nov 19 Ben Tre Mekong Tour: TBD.",
            "Nov 20 Cu Chi Tunnels half-day tour: TBD.",
          ],
          amountCad: null,
        },
        {
          category: "Transfers",
          detail: [
            "Nov 12 7-seater van from Hanoi airport to Airbnb: Total = 450,000 VND (approx. $24 CAD), Half = approx. $12 CAD.",
            "Nov 14-15 cruise transfers between Hanoi, Tuan Chau Marina, and Ninh Binh: Total = $240 USD (approx. $328.80 CAD), Xenia's share 3/7 = approx. $140.91 CAD.",
            "Nov 17 Ninh Binh to Hanoi airport transfer: TBD.",
            "Nov 21 Ho Chi Minh City Airbnb to airport transfer: TBD.",
          ],
          amountCad: 152.91,
        },
      ];
    }

    return [];
  };

  const filterDashboardSegments = (segments: DashboardSegment[]) => {
    if (selectedTrip === "taiwan") {
      return segments.filter((segment) => ["xiaoliuqiu", "taipei", "yilan"].includes(segment.page));
    }
    if (selectedTrip === "okinawaJapan") {
      return segments.filter((segment) => ["nahaearly", "onna", "nago", "nanjo", "naha"].includes(segment.page));
    }
    return segments;
  };

  const CountrySegmentButtons = ({ segments }: { segments: DashboardSegment[]; setIsGuestConfirmed?: React.Dispatch<React.SetStateAction<boolean>>; setPage?: React.Dispatch<React.SetStateAction<PageName>> }) => (
    <SegmentButtons segments={filterDashboardSegments(segments).map((segment) => selectedTrip === "taiwan" ? { ...segment, color: TAIWAN_GOLD } : segment)} onOpenSegment={openChapterPage} />
  );

  const getVisibleGuestOptions = () => guestOptions.filter((guest) => {
    if (guest === "I am just a random Guest") return false;
    if (selectedTrip === "taiwan") return !["Steven Wang", "Heather & Jack & Aizen (8) & Kaien (3) & Norma"].includes(guest);
    if (selectedTrip === "okinawaJapan") return !["Jim", "Anthony & Christine & Mona (1)", "Jenn & Hiroshi & Masashi (6) & Miyari (3)", "Julie & Adrian & Ethan (4) & Tyrell (1)"].includes(guest);
    return true;
  }).sort((firstGuest, secondGuest) => {
    if (selectedTrip === "okinawaJapan") {
      const okinawaPartyOrder = ["Xenia & David & Naomi (3)", "Dave & Christina & Xixi (2)", "Heather & Jack & Aizen (8) & Kaien (3) & Norma", "Steven Wang", "Mark Wang", "Mei & Emilia (8)"];
      return okinawaPartyOrder.indexOf(firstGuest) - okinawaPartyOrder.indexOf(secondGuest);
    }
    if (selectedTrip !== "taiwan") return 0;
    const taiwanPartyOrder = ["Xenia & David & Naomi (3)", "Jim", "Jenn & Hiroshi & Masashi (6) & Miyari (3)", "Anthony & Christine & Mona (1)", "Mark Wang", "Dave & Christina & Xixi (2)", "Mei & Emilia (8)", "Julie & Adrian & Ethan (4) & Tyrell (1)"];
    return taiwanPartyOrder.indexOf(firstGuest) - taiwanPartyOrder.indexOf(secondGuest);
  });

  const getBillTabPartyOptions = (trip: "morocco" | "taiwan" | "okinawaJapan" | "vietnam") => {
    if (trip === "morocco") return moroccoInterestedNames;
    if (trip === "vietnam") return vietnamConfirmedParties;
    const previousSelectedTrip = selectedTrip;
    if (previousSelectedTrip === trip) return getVisibleGuestOptions();
    return guestOptions.filter((guest) => {
      if (guest === "I am just a random Guest") return false;
      if (trip === "taiwan") return !["Steven Wang", "Heather & Jack & Aizen (8) & Kaien (3) & Norma"].includes(guest);
      return !["Jim", "Anthony & Christine & Mona (1)", "Jenn & Hiroshi & Masashi (6) & Miyari (3)", "Julie & Adrian & Ethan (4) & Tyrell (1)"].includes(guest);
    });
  };

  const getBillTabConfig = (trip: "morocco" | "taiwan" | "okinawaJapan" | "vietnam") => {
    if (trip === "taiwan") return { trip, label: "Taiwan 2026", accent: TAIWAN_GOLD, localCurrency: "TWD" as const, localLabel: "TWD", localSymbol: "NT$", parties: getBillTabPartyOptions(trip) };
    if (trip === "okinawaJapan") return { trip, label: "Okinawa Japan 2026", accent: BABY_BLUE, localCurrency: "JPY" as const, localLabel: "JPY", localSymbol: "¥", parties: getBillTabPartyOptions(trip) };
    if (trip === "vietnam") return { trip, label: "Vietnam 2026", accent: VIETNAM_GOLD, localCurrency: "VND" as const, localLabel: "VND", localSymbol: "₫", parties: getBillTabPartyOptions(trip) };
    return { trip, label: "Morocco 2026", accent: MOROCCO_BROWN, localCurrency: "MAD" as const, localLabel: "MAD", localSymbol: "", parties: getBillTabPartyOptions(trip) };
  };

  const buildTripUrl = (trip: TripKey, options: { guest?: string; view?: "map" | "checklist" | "itinerary"; chapter?: PageName } = {}) => {
    const searchParams = new URLSearchParams();
    if (options.guest) searchParams.set("guest", options.guest);
    if (options.view) searchParams.set("view", options.view);
    if (options.chapter) searchParams.set("chapter", options.chapter);
    const query = searchParams.toString();
    return `/trip/${TRIP_PATHS[trip]}${query ? `?${query}` : ""}`;
  };

  const setBrowserRoute = (url: string, replace = false) => {
    if (window.location.pathname + window.location.search === url) return;
    if (replace) {
      window.history.replaceState({}, "", url);
    } else {
      window.history.pushState({}, "", url);
    }
  };

  const openTripPage = (trip: TripKey) => {
    setGuestName("");
    setShowGuestActions(false);
    setIsGuestConfirmed(false);
    setMainPageView("active");
    setShowMoroccoItinerary(false);
    setShowMoroccoChecklist(false);
    setShowVietnamItinerary(false);
    setShowVietnamRouteMap(false);
    setShowVietnamFlightSummary(false);
    setSelectedTrip(trip);
    setBrowserRoute(buildTripUrl(trip));
  };

  const openTripDashboard = (guest: string, replace = false) => {
    if (!selectedTrip) return;
    setGuestName(guest);
    setShowGuestActions(selectedTrip !== "morocco");
    setIsGuestConfirmed(false);
    setShowMoroccoItinerary(false);
    setShowMoroccoChecklist(false);
    setShowVietnamItinerary(false);
    setShowVietnamRouteMap(false);
    setShowVietnamFlightSummary(false);
    setBrowserRoute(buildTripUrl(selectedTrip, { guest }), replace);
  };

  const openTripView = (nextView: "map" | "checklist" | "itinerary", replace = false) => {
    if (!selectedTrip) return;
    if (nextView === "itinerary" && selectedTrip === "morocco") {
      setShowMoroccoItinerary(true);
      setBrowserRoute(buildTripUrl(selectedTrip, { guest: guestName || "Guest", view: "itinerary" }), replace);
      return;
    }
    if (nextView === "itinerary" && selectedTrip === "vietnam") {
      setShowVietnamItinerary(true);
      setBrowserRoute(buildTripUrl(selectedTrip, { guest: guestName || "Guest", view: "itinerary" }), replace);
      return;
    }
    setPage(nextView === "checklist" ? "checklist" : "map");
    setIsGuestConfirmed(true);
    setShowGuestActions(true);
    setShowMoroccoItinerary(false);
    setShowVietnamItinerary(false);
    setShowVietnamRouteMap(false);
    setShowVietnamFlightSummary(false);
    setBrowserRoute(buildTripUrl(selectedTrip, { guest: guestName || "Guest", view: nextView }), replace);
  };

  const openChapterPage = (chapter: PageName, replace = false) => {
    if (!selectedTrip) return;
    setPage(chapter);
    setIsGuestConfirmed(true);
    setShowGuestActions(true);
    setBrowserRoute(buildTripUrl(selectedTrip, { guest: guestName || "Guest", chapter }), replace);
  };

  const goToMainPage = () => {
    setIsGuestConfirmed(false);
    setSelectedTrip("");
    setShowGuestActions(false);
    setGuestName("");
    setMainPageView("active");
    setPage("map");
    setShowMoroccoItinerary(false);
    setShowMoroccoNameInput(false);
    setMoroccoNameInput("");
    setShowMoroccoBudget(false);
    setShowMoroccoUsefulInfo(false);
    setShowMoroccoMap(false);
    setShowMoroccoChecklist(false);
    setShowVietnamItinerary(false);
    setShowVietnamRouteMap(false);
    setShowVietnamFlightSummary(false);
    setTaiwanDashboardAlbumMode("");
    setAlbumPopupUrl("");
    setBrowserRoute("/");
  };

  const switchSiteAccess = async () => {
    await fetch("/api/site-auth", { method: "DELETE" }).catch(() => null);
    window.location.href = "/login?from=%2F";
  };

  const goToFutureTrips = () => {
    setIsGuestConfirmed(false);
    setSelectedTrip("");
    setShowGuestActions(false);
    setGuestName("");
    setMainPageView("future");
    setPage("map");
    setBrowserRoute("/");
  };

  const goToSkiTrips = () => {
    setIsGuestConfirmed(false);
    setSelectedTrip("");
    setShowGuestActions(false);
    setGuestName("");
    setMainPageView("ski");
    setPage("map");
    setBrowserRoute("/");
  };

  const applyRouteFromLocation = () => {
    const searchParams = new URLSearchParams(window.location.search);
    const chapter = searchParams.get("chapter");
    const view = searchParams.get("view");
    const guestFromUrl = searchParams.get("guest") || "";
    const returningGuest = GUEST_NAME_ALIASES[guestFromUrl] || guestFromUrl;
    const tripPath = window.location.pathname.match(/^\/trip\/([^/]+)\/?$/)?.[1];
    const tripFromUrl = tripPath ? TRIP_KEYS_BY_PATH[tripPath] : null;
    const chapterPages = ["xiaoliuqiu", "taipei", "onna", "nago", "nanjo", "naha", "nahaearly", "yilan"];

    setAlbumPopupUrl("");
    setTaiwanDashboardAlbumMode("");
    setShowMoroccoBudget(false);
    setShowMoroccoUsefulInfo(false);
    setShowMoroccoMap(false);
    setShowMoroccoChecklist(false);
    setShowVietnamItinerary(false);
    setShowVietnamRouteMap(false);
    setShowVietnamFlightSummary(false);

    if (tripFromUrl) {
      setSelectedTrip(tripFromUrl);
      setGuestName(returningGuest);
      setPage("map");
      setShowMoroccoItinerary(false);
      if (tripFromUrl === "morocco") {
        setShowGuestActions(false);
        setIsGuestConfirmed(false);
        if (view === "itinerary") setShowMoroccoItinerary(true);
        return;
      }
      if (tripFromUrl === "vietnam" && view === "itinerary") {
        setShowGuestActions(false);
        setIsGuestConfirmed(false);
        setShowVietnamItinerary(true);
        return;
      }
      if (chapter && chapterPages.includes(chapter)) {
        setPage(chapter as PageName);
        setShowGuestActions(true);
        setIsGuestConfirmed(true);
        return;
      }
      if (view === "map" || view === "checklist") {
        setPage(view);
        setShowGuestActions(true);
        setIsGuestConfirmed(true);
        return;
      }
      setShowGuestActions(Boolean(returningGuest));
      setIsGuestConfirmed(false);
      return;
    }

    if (chapter === "morocco") {
      if (returningGuest) setGuestName(returningGuest);
      setSelectedTrip("morocco");
      setShowMoroccoItinerary(true);
      return;
    }
    if (chapterPages.includes(chapter || "")) {
      setPage(chapter as PageName);
      if (returningGuest) setGuestName(returningGuest);
      setSelectedTrip(chapter === "xiaoliuqiu" || chapter === "taipei" || chapter === "yilan" ? "taiwan" : "okinawaJapan");
      setIsGuestConfirmed(true);
      setShowGuestActions(true);
      return;
    }

    setIsGuestConfirmed(false);
    setSelectedTrip("");
    setShowGuestActions(false);
    setGuestName("");
    setPage("map");
    setShowMoroccoItinerary(false);
  };

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    async function loadSiteAccessMode() {
      try {
        const response = await fetch("/api/site-auth", { cache: "no-store" });
        const data = await response.json() as { mode?: string };
        setSiteAccessMode(data.mode === "guest" ? "guest" : "member");
      } catch {
        setSiteAccessMode("member");
      }
    }
    loadSiteAccessMode();
  }, []);

  useEffect(() => {
    if (siteAccessMode !== "guest" || !selectedTrip || !guestName || guestName === "Guest") return;
    if (["morocco", "taiwan", "okinawaJapan", "vietnam"].includes(selectedTrip)) {
      openTripDashboard("Guest", true);
    }
  }, [siteAccessMode, selectedTrip, guestName]);

  useEffect(() => {
    const dashboardHeroByTrip: Partial<Record<TripKey, string>> = {
      morocco: "/morocco-dashboard-hero.webp",
      taiwan: "/taiwan-dashboard-hero.webp",
      okinawaJapan: "/okinawa-dashboard-hero.webp",
      vietnam: "/vietnam-dashboard-hero.webp",
    };
    const heroUrl = selectedTrip ? dashboardHeroByTrip[selectedTrip] : undefined;
    if (!heroUrl) return;

    const existingPreload = document.head.querySelector<HTMLLinkElement>(`link[data-dashboard-hero="${heroUrl}"]`);
    if (existingPreload) return;

    const preload = document.createElement("link");
    preload.rel = "preload";
    preload.as = "image";
    preload.href = heroUrl;
    preload.type = "image/webp";
    preload.dataset.dashboardHero = heroUrl;
    document.head.appendChild(preload);

    return () => preload.remove();
  }, [selectedTrip]);

  useEffect(() => {
    applyRouteFromLocation();
    const handlePopState = () => applyRouteFromLocation();
    window.addEventListener("popstate", handlePopState);
    setIsInitialRouteReady(true);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  useEffect(() => {
    async function loadTripSignups() {
      const [moroccoNames, vietnamNames, skiMyokoNames, skiDeerValleyNames, skiBig3Names, panamaNames, houstonNames, azoresNames, similanNames, centralVietnamNames, mexicoPlayaNames, taiwanAprilNames, hawaiiNames, alaskaCruiseNames, disneyWorldNames, fiveStansNames] = await Promise.all([
        fetchTripSignupNames("morocco"),
        fetchTripSignupNames("vietnam"),
        fetchTripSignupNames("skiMyoko"),
        fetchTripSignupNames("skiDeerValley"),
        fetchTripSignupNames("skiBig3"),
        fetchTripSignupNames("panama"),
        fetchTripSignupNames("houston"),
        fetchTripSignupNames("azoresPortugal"),
        fetchTripSignupNames("similanThailand"),
        fetchTripSignupNames("centralVietnam"),
        fetchTripSignupNames("mexicoPlaya"),
        fetchTripSignupNames("taiwanApril"),
        fetchTripSignupNames("hawaii"),
        fetchTripSignupNames("alaskaCruise"),
        fetchTripSignupNames("disneyWorld"),
        fetchTripSignupNames("fiveStans"),
      ]);
      if (moroccoNames) setMoroccoInterestedNames(moroccoNames);
      if (vietnamNames) setVietnamInterestedNames(vietnamNames);
      if (skiMyokoNames) setSkiMyokoInterestedNames(skiMyokoNames);
      if (skiDeerValleyNames) setSkiDeerValleyInterestedNames(skiDeerValleyNames);
      if (skiBig3Names) setSkiBig3InterestedNames(skiBig3Names);
      if (panamaNames) setPanamaInterestedNames(panamaNames);
      if (houstonNames) setHoustonInterestedNames(houstonNames);
      if (azoresNames) setAzoresInterestedNames(azoresNames);
      if (similanNames) setSimilanInterestedNames(similanNames);
      if (centralVietnamNames) setCentralVietnamInterestedNames(centralVietnamNames);
      if (mexicoPlayaNames) setMexicoPlayaInterestedNames(mexicoPlayaNames);
      if (taiwanAprilNames) setTaiwanAprilInterestedNames(taiwanAprilNames);
      if (hawaiiNames) setHawaiiInterestedNames(hawaiiNames);
      if (alaskaCruiseNames) setAlaskaCruiseInterestedNames(alaskaCruiseNames);
      if (disneyWorldNames) setDisneyWorldInterestedNames(disneyWorldNames);
      if (fiveStansNames) setFiveStansInterestedNames(fiveStansNames);
    }
    loadTripSignups();
  }, []);

  useEffect(() => {
    if (!guestName || guestName === "Guest") return;
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
    if (!selectedTrip || !guestName || guestName === "Guest") return;
    const storageKey = `reservationChecklistProgress-${selectedTrip}-${guestName}`;
    try {
      const localProgress = JSON.parse(window.localStorage.getItem(storageKey) || "{}");
      if (localProgress && typeof localProgress === "object") {
        setCheckedReservationItems((current) => ({ ...current, ...localProgress }));
      }
    } catch {
      // Keep the default empty reservation checklist when local data is malformed.
    }

    async function loadReservationChecklistProgress() {
      const savedProgress = await fetchReservationChecklistProgress(selectedTrip, guestName);
      if (savedProgress) {
        const keyedProgress = Object.entries(savedProgress).reduce<Record<string, boolean>>((result, [itemKey, checked]) => {
          result[`${selectedTrip}-${guestName}-${itemKey}`] = Boolean(checked);
          return result;
        }, {});
        setCheckedReservationItems((current) => ({ ...current, ...keyedProgress }));
      }
    }
    loadReservationChecklistProgress();
  }, [selectedTrip, guestName]);

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
    window.localStorage.setItem("centralVietnamInterestedNames", JSON.stringify(centralVietnamInterestedNames));
  }, [centralVietnamInterestedNames]);

  useEffect(() => {
    window.localStorage.setItem("mexicoPlayaInterestedNames", JSON.stringify(mexicoPlayaInterestedNames));
  }, [mexicoPlayaInterestedNames]);

  useEffect(() => {
    window.localStorage.setItem("taiwanAprilInterestedNames", JSON.stringify(taiwanAprilInterestedNames));
  }, [taiwanAprilInterestedNames]);

  useEffect(() => {
    window.localStorage.setItem("hawaiiInterestedNames", JSON.stringify(hawaiiInterestedNames));
  }, [hawaiiInterestedNames]);

  useEffect(() => {
    window.localStorage.setItem("alaskaCruiseInterestedNames", JSON.stringify(alaskaCruiseInterestedNames));
  }, [alaskaCruiseInterestedNames]);

  useEffect(() => {
    window.localStorage.setItem("disneyWorldInterestedNames", JSON.stringify(disneyWorldInterestedNames));
  }, [disneyWorldInterestedNames]);

  useEffect(() => {
    window.localStorage.setItem("fiveStansInterestedNames", JSON.stringify(fiveStansInterestedNames));
  }, [fiveStansInterestedNames]);

  useEffect(() => {
    window.localStorage.setItem("panamaInterestedNames", JSON.stringify(panamaInterestedNames));
  }, [panamaInterestedNames]);

  useEffect(() => {
    window.localStorage.setItem("vietnamInterestedNames", JSON.stringify(vietnamInterestedNames));
  }, [vietnamInterestedNames]);

  useEffect(() => {
    async function fetchRates() {
      try {
        const [usdResponse, cadResponse] = await Promise.all([
          fetch("https://open.er-api.com/v6/latest/USD"),
          fetch("https://open.er-api.com/v6/latest/CAD"),
        ]);
        const usdData = await usdResponse.json();
        const cadData = await cadResponse.json();
        if (usdData?.rates?.MAD) setUsdToMad(Number(usdData.rates.MAD).toFixed(2));
        if (usdData?.rates?.VND) setUsdToVnd(Math.round(usdData.rates.VND).toLocaleString("en-CA"));
        if (cadData?.rates?.JPY) setCadToJpy(Math.round(cadData.rates.JPY).toString());
        if (cadData?.rates?.TWD) setCadToTwd(Math.round(cadData.rates.TWD).toString());
        if (cadData?.rates?.MAD) setCadToMad(Number(cadData.rates.MAD).toFixed(2));
        if (cadData?.rates?.VND) setCadToVnd(Math.round(cadData.rates.VND).toLocaleString("en-CA"));
      } catch {
        setCadToJpy("110");
        setCadToTwd("23");
        setUsdToMad("10");
        setCadToMad("7.35");
        setCadToVnd("19000");
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
    if (["xiaoliuqiu", "taipei", "nahaearly", "onna", "nago", "nanjo", "naha", "yilan"].includes(id)) openChapterPage(id as PageName);
  };

  const getGuestChapterOrder = (guest: string): PageName[] => {
    const fullOrder: PageName[] = ["xiaoliuqiu", "taipei", "nahaearly", "onna", "nago", "nanjo", "naha", "yilan"];
    const guestRoutes: Record<string, PageName[]> = {
      "I am just a random Guest": fullOrder,
      "Guest": fullOrder,
      "Xenia & David & Naomi (3)": ["xiaoliuqiu", "taipei", "onna", "nago", "nanjo", "naha", "yilan"],
      "Jim": ["xiaoliuqiu"],
      "Anthony & Christine & Mona (1)": ["xiaoliuqiu", "taipei"],
      "Jenn & Hiroshi & Masashi (6) & Miyari (3)": ["xiaoliuqiu", "taipei"],
      "Heather & Jack & Aizen (8) & Kaien (3) & Norma": ["onna", "nago", "nanjo"],
      "Steven Wang": ["nahaearly", "onna", "nago", "nanjo"],
      "Mark Wang": ["xiaoliuqiu", "taipei", "nahaearly", "onna"],
      "Mei & Emilia (8)": ["taipei", "nago", "nanjo", "naha", "yilan"],
      "Dave & Christina & Xixi (2)": ["taipei", "onna", "nago", "nanjo", "naha", "yilan"],
      "Julie & Adrian & Ethan (4) & Tyrell (1)": ["taipei"],
    };
    const guestRoute = guestRoutes[guest] || [];
    if (selectedTrip === "taiwan") {
      return guestRoute.filter((chapter) => ["xiaoliuqiu", "taipei", "yilan"].includes(chapter));
    }
    if (selectedTrip === "okinawaJapan") {
      return guestRoute.filter((chapter) => ["nahaearly", "onna", "nago", "nanjo", "naha"].includes(chapter));
    }
    return guestRoute;
  };

  const getPackingChecklist = (guest: string): PackingChecklist => {
    const internationalDriversLicense = "International Drivers License";
    const essentials = [
      "Passport / travel documents",
      "Travel insurance documents",
      "Credit cards + cash",
      "International/local eSIM or roaming setup",
      ...(selectedTrip === "okinawaJapan" ? [internationalDriversLicense] : []),
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
      "Sunglasses / hat",
    ];
    const personal = [
      "Phone charger + power bank",
      "Headphones",
      "Laptop/Tablet + charger",
      "Toiletries (toothbrush, toothpaste, hairbrush, skincare, nailcare, shaving supplies)",
      "Reusable water bottle",
      "Sunscreen",
      "Medications",
      "Contact lenses",
      ...(selectedTrip === "morocco" ? ["Hairdryer", "Camera gear + charger", "Power outlet converter"] : []),
    ];
    const xiaoliuqiuDive = [
      "Dry bag",
      "Dive certification / course documents",
      "Motion sickness medicine",
      "Scuba mask",
      "Dive computer + charger",
      "Action camera + charger",
    ];
    const okinawaSegment = ["Wedding attire", "Resort casual outfit"];
    const okinawaFunPassThree = "Purchase Okinawa FunPASS Churaumi 3 in 1 for 2 adults + 1 child (For Churaumi Aquarium + Pinappleland + Okinawa World + Shopping Discount)";
    const okinawaFunPassFour = "Purchase Okinawa FunPASS Churaumi 3 in 1 for 3 adults + 2 child (For Churaumi Aquarium + Pinappleland + Okinawa World + Shopping Discount)";
    const okinawaFunPassTwo = "Purchase Okinawa FunPASS Churaumi 3 in 1 for 1 adult + 1 child (For Churaumi Aquarium + Pinappleland + Okinawa World + Shopping Discount)";
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
    const sectionsWithEssentials = (extraEssentials: string[]): PackingSection[] => [
      { title: "Essentials", items: [...essentials, ...extraEssentials] },
      { title: "Clothes", items: clothes },
      { title: "Personal", items: personal },
    ];

    if (guest === "Mark Wang") {
      return { title: "Mark's Packing Checklist", sections: [...standardSections, { title: "Xiaoliuqiu Dive Segment", items: xiaoliuqiuDive }, { title: "Okinawa Wedding Segment", items: okinawaSegment }] };
    }
    if (guest === "Xenia & David & Naomi (3)") {
      return { title: `${guest} Packing Checklist`, sections: [...sectionsWithEssentials([okinawaFunPassThree]), { title: "Okinawa Segment", items: okinawaSegment }, { title: "Baby / Toddler Items", items: babyToddlerItems }] };
    }
    if (guest === "Heather & Jack & Aizen (8) & Kaien (3) & Norma") {
      return { title: `${guest} Packing Checklist`, sections: [...sectionsWithEssentials([okinawaFunPassFour]), { title: "Okinawa Segment", items: okinawaSegment }, { title: "Baby / Toddler Items", items: babyToddlerItems }] };
    }
    if (guest === "Mei & Emilia (8)") {
      return { title: `${guest} Packing Checklist`, sections: sectionsWithEssentials([okinawaFunPassTwo]) };
    }
    if (guest === "Dave & Christina & Xixi (2)") {
      return { title: `${guest} Packing Checklist`, sections: [...sectionsWithEssentials([okinawaFunPassThree]), { title: "Baby / Toddler Items", items: babyToddlerItems }] };
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
      taipei: "Taipei",
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
          {current !== "checklist" && <button type="button" onClick={() => openTripView("map")} className="rounded-full border border-white/30 px-4 py-2 text-sm text-white/80 transition hover:border-white hover:text-white">← Back to Map Itinerary</button>}
          {guestName && guestName !== "I am just a random Guest" && (
            <button type="button" onClick={() => openTripDashboard(guestName)} className="rounded-full border border-white/20 bg-white/[0.04] px-4 py-2 text-sm text-white/70 transition hover:border-white/40 hover:bg-white/[0.08] hover:text-white">← Back to Dashboard</button>
          )}
        </div>
        <div className="flex flex-wrap justify-end gap-3">
          {previousChapter && (
            <button type="button" onClick={() => openChapterPage(previousChapter)} className="rounded-full border border-white/20 bg-white/[0.04] px-4 py-2 text-sm text-white/70">← Previous Chapter<span className="hidden sm:inline"> · {chapterLabels[previousChapter]}</span></button>
          )}
          {nextChapter && (
            <button type="button" onClick={() => openChapterPage(nextChapter)} className="rounded-full border border-white/20 bg-white/[0.04] px-4 py-2 text-sm text-white/70">Next Chapter<span className="hidden sm:inline"> · {chapterLabels[nextChapter]}</span> →</button>
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
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3 text-center md:p-4"><p className="mb-1 text-xl md:text-2xl">{isTaiwan ? "💵" : "💴"}</p><p className="text-[10px] text-gray-400 md:text-xs">Currency</p><p className="mt-1 text-xs font-medium md:text-sm">{isTaiwan ? "TWD NT$" : "JPY ¥"}</p><p className="mt-1 text-xs text-gray-400">{isTaiwan ? `1 CAD ≈ ${cadToTwd} TWD` : `1 CAD ≈ ${cadToJpy} JPY`}</p></div>
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

  const renderTripDashboardActions = () => {
    if (selectedTrip !== "taiwan" && selectedTrip !== "okinawaJapan") return null;
    const accentColor = selectedTrip === "taiwan" ? TAIWAN_GOLD : BABY_BLUE;
    const actionStyle = { borderColor: `${accentColor}8C`, backgroundColor: "rgba(3, 12, 17, 0.43)", color: accentColor };
    const actionClass = "flex min-h-14 items-center justify-center gap-3 rounded-2xl border px-4 py-3 text-center backdrop-blur-md transition";
    const showXeniaOkinawaExtras = selectedTrip === "okinawaJapan" && guestName === "Xenia & David & Naomi (3)";
    if (guestName === "Guest") {
      return (
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <button type="button" onClick={() => openTripView("map")} className={actionClass} style={actionStyle}><span className="text-xl">🗺️</span><span className="text-xs font-light uppercase tracking-[0.16em]">Map Itinerary</span></button>
          {selectedTrip === "taiwan" ? (
            <button type="button" onClick={() => setTaiwanDashboardAlbumMode("view")} className={actionClass} style={actionStyle}><span className="text-xl">🖼️</span><span className="text-xs font-light uppercase tracking-[0.16em]">View Album</span></button>
          ) : (
            <MemoryMaker albumKey="japanNovember" albumName="Japan November" accentColor={accentColor} guestName={guestName} returnChapter="map" onViewAlbum={openAlbumPopup} inlineButtons inlineMode="view" viewLabel="View Album" solidButtons />
          )}
        </div>
      );
    }
    return (
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <button type="button" onClick={() => openTripView("map")} className={actionClass} style={actionStyle}><span className="text-xl">🗺️</span><span className="text-xs font-light uppercase tracking-[0.16em]">Map Itinerary</span></button>
        <button type="button" disabled={guestName === "Jim"} onClick={() => openTripView("checklist")} className={guestName === "Jim" ? `${actionClass} cursor-not-allowed opacity-45` : actionClass} style={actionStyle}><span className="text-xl">🎒</span><span className="text-xs font-light uppercase tracking-[0.16em]">Packing List</span></button>
        {showXeniaOkinawaExtras && (
          <>
            <button type="button" onClick={() => setShowOkinawaBudget(true)} className={actionClass} style={actionStyle}><span className="text-xl">🧾</span><span className="text-xs font-light uppercase tracking-[0.16em]">Budget</span></button>
            <button type="button" onClick={() => setShowOkinawaReservationChecklist(true)} className={actionClass} style={actionStyle}><span className="text-xl">📋</span><span className="text-xs font-light uppercase tracking-[0.16em]">Reservation Checklist</span></button>
          </>
        )}
        <button type="button" disabled className={`${actionClass} cursor-not-allowed opacity-45`} style={actionStyle}><span className="text-xl">☀️</span><span className="text-xs font-light uppercase tracking-[0.16em]">What's Today?</span></button>
        <button type="button" onClick={() => openMoroccoCostTracker(selectedTrip)} className={actionClass} style={actionStyle}><span className="text-xl">💰</span><span className="text-xs font-light uppercase tracking-[0.16em]">BillTab</span></button>
        {selectedTrip === "taiwan" ? (
          <>
            <button type="button" onClick={() => setTaiwanDashboardAlbumMode("upload")} className={actionClass} style={actionStyle}><span className="text-xl">📤</span><span className="text-xs font-light uppercase tracking-[0.16em]">Upload Photos</span></button>
            <button type="button" onClick={() => setTaiwanDashboardAlbumMode("view")} className={actionClass} style={actionStyle}><span className="text-xl">🖼️</span><span className="text-xs font-light uppercase tracking-[0.16em]">View Album</span></button>
          </>
        ) : (
          <MemoryMaker albumKey="japanNovember" albumName="Japan November" accentColor={accentColor} guestName={guestName} returnChapter="map" onViewAlbum={openAlbumPopup} inlineButtons solidButtons />
        )}
      </div>
    );
  };

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
              <button key={item.id} type="button" onClick={() => setHovered(item.id)} onDoubleClick={() => openChapterForLocation(item.id)} className={`flex items-center justify-between rounded-2xl border px-4 py-3 text-left transition ${active ? isYilan || isTaiwan ? "border-[#72E49A]/70 bg-[#72E49A]/10" : "border-[#9EDCFF]/70 bg-[#9EDCFF]/10" : "border-white/10 bg-white/[0.04]"}`}>
                <span className="flex items-center gap-3"><span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: isYilan || isTaiwan ? TAIWAN_GOLD : BABY_BLUE }} /><span className="text-sm font-light tracking-wide text-white">{item.label}</span></span>
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
                      <div className="absolute -top-5 h-10 cursor-pointer" style={{ left: `${left}%`, width: `${width}%` }} onMouseEnter={() => setHovered(segment.id)} onMouseLeave={() => setHovered(null)} onClick={() => openChapterPage(segment.page as PageName)} />
                    </div>
                  );
                })}
              </>
            )}
            {selectedTimelineSectionId === 2 && (
              <>
                {[
                  { id: "yilan", page: "yilan", start: new Date(2026, 11, 8), end: new Date(2026, 11, 11), color: TAIWAN_GOLD },
                ].map((segment) => {
                  const left = getSectionPercent(segment.start);
                  const width = getSectionPercent(segment.end) - left;
                  const active = hovered === segment.id;
                  return (
                    <div key={segment.id}>
                      <div className="pointer-events-none absolute top-1/2 h-[5px] -translate-y-1/2 rounded-full transition-all duration-150" style={{ left: `${left}%`, width: `${width}%`, backgroundColor: active ? segment.color : "transparent", boxShadow: active ? `0 0 14px ${segment.color}` : "none" }} />
                      <div className="absolute -top-5 h-10 cursor-pointer" style={{ left: `${left}%`, width: `${width}%` }} onMouseEnter={() => setHovered(segment.id)} onMouseLeave={() => setHovered(null)} onClick={() => openChapterPage("yilan")} />
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

  const addCentralVietnamInterestedName = async () => {
    const nextName = centralVietnamNameInput.trim();
    if (!nextName) return;
    await saveInterestedName("centralVietnam", nextName, setCentralVietnamInterestedNames);
    setCentralVietnamNameInput("");
    setShowCentralVietnamNameInput(false);
  };

  const addMexicoPlayaInterestedName = async () => {
    const nextName = mexicoPlayaNameInput.trim();
    if (!nextName) return;
    await saveInterestedName("mexicoPlaya", nextName, setMexicoPlayaInterestedNames);
    setMexicoPlayaNameInput("");
    setShowMexicoPlayaNameInput(false);
  };

  const addTaiwanAprilInterestedName = async () => {
    const nextName = taiwanAprilNameInput.trim();
    if (!nextName) return;
    await saveInterestedName("taiwanApril", nextName, setTaiwanAprilInterestedNames);
    setTaiwanAprilNameInput("");
    setShowTaiwanAprilNameInput(false);
  };

  const addHawaiiInterestedName = async () => {
    const nextName = hawaiiNameInput.trim();
    if (!nextName) return;
    await saveInterestedName("hawaii", nextName, setHawaiiInterestedNames);
    setHawaiiNameInput("");
    setShowHawaiiNameInput(false);
  };

  const addAlaskaCruiseInterestedName = async () => {
    const nextName = alaskaCruiseNameInput.trim();
    if (!nextName) return;
    await saveInterestedName("alaskaCruise", nextName, setAlaskaCruiseInterestedNames);
    setAlaskaCruiseNameInput("");
    setShowAlaskaCruiseNameInput(false);
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

  const addPanamaInterestedName = async () => {
    const nextName = panamaNameInput.trim();
    if (!nextName) return;
    await saveInterestedName("panama", nextName, setPanamaInterestedNames);
    setPanamaNameInput("");
    setShowPanamaNameInput(false);
  };

  const addVietnamInterestedName = async () => {
    const nextName = vietnamNameInput.trim();
    if (!nextName) return;
    await saveInterestedName("vietnam", nextName, setVietnamInterestedNames);
    setVietnamNameInput("");
    setShowVietnamNameInput(false);
  };

  const togglePackingItem = (itemKey: string, checked: boolean) => {
    if (guestName === "Guest") return;
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

  const toggleReservationItem = (trip: TripKey, item: string, checked: boolean) => {
    if (!guestName || guestName === "Guest") return;
    const itemKey = item;
    const stateKey = `${trip}-${guestName}-${itemKey}`;
    const nextChecked = !checked;
    setCheckedReservationItems((current) => ({ ...current, [stateKey]: nextChecked }));

    const storageKey = `reservationChecklistProgress-${trip}-${guestName}`;
    try {
      const localProgress = JSON.parse(window.localStorage.getItem(storageKey) || "{}");
      window.localStorage.setItem(storageKey, JSON.stringify({ ...localProgress, [stateKey]: nextChecked }));
    } catch {
      window.localStorage.setItem(storageKey, JSON.stringify({ [stateKey]: nextChecked }));
    }
    saveReservationChecklistProgress(trip, guestName, itemKey, nextChecked);
  };

  const parseMoroccoPaidFor = (value: string) => {
    if (!value || value === "Everyone") return ["Everyone"];
    return value.split(",").map((name) => name.trim()).filter(Boolean);
  };

  const activeBillTabConfig = getBillTabConfig(activeBillTabTrip);
  const activeBillTabParties = activeBillTabConfig.parties;
  const moroccoSelectedPaidForParties = moroccoExpensePaidFor.includes("Everyone")
    ? activeBillTabParties
    : moroccoExpensePaidFor.filter((name) => activeBillTabParties.includes(name));
  const moroccoAllPaidForSelected = activeBillTabParties.length > 0 && moroccoSelectedPaidForParties.length === activeBillTabParties.length;
  const moroccoPaidForPayload = moroccoAllPaidForSelected ? "Everyone" : moroccoSelectedPaidForParties.join(", ");

  const toggleMoroccoPaidForEveryone = (checked: boolean) => {
    setMoroccoExpensePaidFor(checked ? ["Everyone"] : []);
  };

  const toggleMoroccoPaidForParty = (name: string, checked: boolean) => {
    const current = moroccoExpensePaidFor.includes("Everyone")
      ? activeBillTabParties
      : moroccoExpensePaidFor.filter((partyName) => activeBillTabParties.includes(partyName));
    const next = checked ? [...current, name] : current.filter((partyName) => partyName !== name);
    const uniqueNext = Array.from(new Set(next));
    setMoroccoExpensePaidFor(uniqueNext.length === activeBillTabParties.length ? ["Everyone"] : uniqueNext);
  };

  const openMoroccoCostTracker = async (trip: "morocco" | "taiwan" | "okinawaJapan" | "vietnam" = "morocco") => {
    const config = getBillTabConfig(trip);
    setActiveBillTabTrip(trip);
    setShowMoroccoCostTracker(true);
    setMoroccoExpenseCurrency(config.localCurrency);
    setMoroccoExpensePaidBy((current) => config.parties.includes(current) ? current : guestName && config.parties.includes(guestName) ? guestName : config.parties[0] || "");
    setMoroccoExpensePaidFor(["Everyone"]);
    setMoroccoExpenseMessage("");
    try {
      const response = await fetch(`/api/trip-expenses?trip=${encodeURIComponent(trip)}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to load expenses.");
      setMoroccoExpenses(Array.isArray(data.expenses) ? data.expenses : []);
    } catch (error) {
      setMoroccoExpenseMessage(error instanceof Error ? error.message : "Unable to load expenses.");
    }
  };

  const addMoroccoExpense = async () => {
    const amount = Number(moroccoExpenseAmount);
    if (!moroccoExpenseDescription.trim() || !Number.isFinite(amount) || amount <= 0 || !moroccoExpensePaidBy || !moroccoPaidForPayload) return;
    setMoroccoExpenseMessage("Saving expense...");
    try {
      const response = await fetch("/api/trip-expenses", {
        method: moroccoEditingExpenseId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trip: activeBillTabTrip, id: moroccoEditingExpenseId, description: moroccoExpenseDescription.trim(), amount, currency: moroccoExpenseCurrency, paidBy: moroccoExpensePaidBy, paidFor: moroccoPaidForPayload, password: moroccoExpenseAdminPassword }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to save expense.");
      setMoroccoExpenses(Array.isArray(data.expenses) ? data.expenses : []);
      setMoroccoExpenseDescription("");
      setMoroccoExpenseAmount("");
      setMoroccoExpensePaidFor(["Everyone"]);
      setMoroccoExpenseCurrency(activeBillTabConfig.localCurrency);
      setMoroccoEditingExpenseId("");
      setMoroccoExpenseAdminPassword("");
      setMoroccoExpenseMessage("");
    } catch (error) {
      setMoroccoExpenseMessage(error instanceof Error ? error.message : "Unable to save expense.");
    }
  };

  const editMoroccoExpense = (expense: MoroccoExpense) => {
    const password = window.prompt("Enter the administrator password to edit this expense:");
    if (password === null) return;
    setMoroccoExpenseAdminPassword(password);
    setMoroccoEditingExpenseId(expense.id);
    setMoroccoExpenseDescription(expense.description);
    setMoroccoExpensePaidBy(expense.paidBy);
    setMoroccoExpensePaidFor(parseMoroccoPaidFor(expense.paidFor || "Everyone"));
    if (expense.amountCad !== null) {
      setMoroccoExpenseAmount(expense.amountCad.toString());
      setMoroccoExpenseCurrency("CAD");
    } else if (expense.amountUsd !== null) {
      setMoroccoExpenseAmount(expense.amountUsd.toString());
      setMoroccoExpenseCurrency("USD");
    } else {
      setMoroccoExpenseAmount(expense.amountLocal?.toString() || "");
      setMoroccoExpenseCurrency(activeBillTabConfig.localCurrency);
    }
    setMoroccoExpenseMessage("Editing expense. Update the fields and save changes.");
  };

  const cancelMoroccoExpenseEdit = () => {
    setMoroccoEditingExpenseId("");
    setMoroccoExpenseAdminPassword("");
    setMoroccoExpenseDescription("");
    setMoroccoExpenseAmount("");
    setMoroccoExpensePaidFor(["Everyone"]);
    setMoroccoExpenseCurrency(activeBillTabConfig.localCurrency);
    setMoroccoExpenseMessage("");
  };

  const deleteMoroccoExpense = async (expense: MoroccoExpense) => {
    const password = window.prompt(`Enter the administrator password to delete "${expense.description}":`);
    if (password === null) return;
    setMoroccoExpenseMessage("Deleting expense...");
    try {
      const response = await fetch("/api/trip-expenses", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trip: activeBillTabTrip, id: expense.id, password }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to delete expense.");
      setMoroccoExpenses(Array.isArray(data.expenses) ? data.expenses : []);
      if (moroccoEditingExpenseId === expense.id) cancelMoroccoExpenseEdit();
      setMoroccoExpenseMessage("");
    } catch (error) {
      setMoroccoExpenseMessage(error instanceof Error ? error.message : "Unable to delete expense.");
    }
  };

  const moroccoExpenseTotal = moroccoExpenses.reduce((sum, expense) => sum + (expense.convertedAmountCad ?? expense.amountCad ?? 0), 0);
  const getExpensePaidForParties = (expense: MoroccoExpense) => {
    if (!expense.paidFor || expense.paidFor === "Everyone") return activeBillTabParties;
    return expense.paidFor.split(",").map((name) => name.trim()).filter((name) => activeBillTabParties.includes(name));
  };
  const billTabBalances = activeBillTabParties.map((name) => ({ name, balance: 0 }));
  const billTabBalanceByName = new Map(billTabBalances.map((party) => [party.name, party]));
  moroccoExpenses.forEach((expense) => {
    const amountCad = expense.convertedAmountCad ?? expense.amountCad ?? 0;
    if (!amountCad) return;
    const paidForParties = getExpensePaidForParties(expense);
    if (!paidForParties.length) return;
    const payer = billTabBalanceByName.get(expense.paidBy);
    if (payer) payer.balance += amountCad;
    const share = amountCad / paidForParties.length;
    paidForParties.forEach((partyName) => {
      const party = billTabBalanceByName.get(partyName);
      if (party) party.balance -= share;
    });
  });
  const billTabSettlements: { from: string; to: string; amount: number }[] = [];
  const billTabDebtors = billTabBalances.filter((party) => party.balance < -0.01).map((party) => ({ name: party.name, amount: -party.balance }));
  const billTabCreditors = billTabBalances.filter((party) => party.balance > 0.01).map((party) => ({ name: party.name, amount: party.balance }));
  let debtorIndex = 0;
  let creditorIndex = 0;
  while (debtorIndex < billTabDebtors.length && creditorIndex < billTabCreditors.length) {
    const debtor = billTabDebtors[debtorIndex];
    const creditor = billTabCreditors[creditorIndex];
    const amount = Math.min(debtor.amount, creditor.amount);
    if (amount > 0.01) billTabSettlements.push({ from: debtor.name, to: creditor.name, amount });
    debtor.amount -= amount;
    creditor.amount -= amount;
    if (debtor.amount <= 0.01) debtorIndex += 1;
    if (creditor.amount <= 0.01) creditorIndex += 1;
  }
  const renderMoroccoPaidForSelector = () => (
    <fieldset className="grid gap-2 text-xs text-white/45 sm:col-span-2">
      <legend>Paid For</legend>
      <div className="grid gap-2 rounded-xl border border-white/15 bg-black/20 p-3 sm:grid-cols-2">
        <label className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white/75">
          <input type="checkbox" checked={moroccoAllPaidForSelected} onChange={(event) => toggleMoroccoPaidForEveryone(event.target.checked)} className="h-4 w-4 accent-[#D6B48C]" />
          <span>Everyone</span>
        </label>
        {activeBillTabParties.map((name) => (
          <label key={name} className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white/75">
            <input type="checkbox" checked={moroccoSelectedPaidForParties.includes(name)} onChange={(event) => toggleMoroccoPaidForParty(name, event.target.checked)} className="h-4 w-4 accent-[#D6B48C]" />
            <span>{name}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );

  const moroccoCostTrackerPopup = showMoroccoCostTracker ? (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label={`${activeBillTabConfig.label} BillTab`}>
      <section className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-white/15 bg-[#111] shadow-2xl">
        <div className="flex items-start justify-between gap-5 border-b border-white/10 px-5 py-5 sm:px-7">
          <div><p className="mb-2 text-xs uppercase tracking-[0.24em]" style={{ color: activeBillTabConfig.accent }}>{activeBillTabConfig.label}</p><h2 className="text-2xl font-light">BillTab</h2><p className="mt-2 text-sm text-white/45">Converted total: ${moroccoExpenseTotal.toFixed(2)} CAD</p></div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => setShowMoroccoAccountingSummary(true)} className="rounded-full border px-3 py-2 text-[10px] uppercase tracking-[0.12em] transition" style={{ borderColor: `${activeBillTabConfig.accent}59`, backgroundColor: `${activeBillTabConfig.accent}18`, color: activeBillTabConfig.accent }}>Accounting Summary</button>
            <button type="button" onClick={() => setShowMoroccoCostTracker(false)} aria-label="Close BillTab" title="Close" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/15 text-lg text-white/65">x</button>
          </div>
        </div>
        <div className="min-h-0 overflow-y-auto p-5 sm:p-7">
          <form onSubmit={(event) => { event.preventDefault(); addMoroccoExpense(); }} className="mb-6 grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1.5 text-xs text-white/45 sm:col-span-2">
              Expense Item
              <input value={moroccoExpenseDescription} onChange={(event) => setMoroccoExpenseDescription(event.target.value)} placeholder="Expense description" className="rounded-xl border border-white/15 bg-black/30 px-4 py-3 text-sm text-white outline-none focus:border-[#D6B48C]/60" />
            </label>
            <label className="grid gap-1.5 text-xs text-white/45">
              Amount
              <input value={moroccoExpenseAmount} onChange={(event) => setMoroccoExpenseAmount(event.target.value)} type="number" min="0.01" step="0.01" placeholder="0.00" className="rounded-xl border border-white/15 bg-black/30 px-4 py-3 text-sm text-white outline-none focus:border-[#D6B48C]/60" />
            </label>
            <fieldset className="grid gap-1.5 text-xs text-white/45">
              <legend className="mb-1.5">Currency</legend>
              <div className="grid grid-cols-3 rounded-xl border border-white/15 bg-black/30 p-1">
                {(["CAD", activeBillTabConfig.localCurrency, "USD"] as const).map((currency) => <button key={currency} type="button" onClick={() => setMoroccoExpenseCurrency(currency)} className={`rounded-lg px-3 py-2 text-sm transition ${moroccoExpenseCurrency === currency ? "text-black" : "text-white/55 hover:text-white"}`} style={moroccoExpenseCurrency === currency ? { backgroundColor: activeBillTabConfig.accent } : undefined}>{currency}</button>)}
              </div>
            </fieldset>
            {renderMoroccoPaidForSelector()}
            <label className="grid gap-1.5 text-xs text-white/45">
              Paid By
              <select value={moroccoExpensePaidBy} onChange={(event) => setMoroccoExpensePaidBy(event.target.value)} className="rounded-xl border border-white/15 bg-[#111] px-4 py-3 text-sm text-white outline-none focus:border-[#D6B48C]/60">
                <option value="" disabled>Select a party</option>
                {activeBillTabParties.map((name) => <option key={name} value={name}>{name}</option>)}
              </select>
            </label>
            <div className="grid gap-2 sm:self-end">
              <button type="submit" className="rounded-xl border px-5 py-3 text-sm uppercase tracking-[0.16em]" style={{ borderColor: `${activeBillTabConfig.accent}59`, backgroundColor: `${activeBillTabConfig.accent}18`, color: activeBillTabConfig.accent }}>{moroccoEditingExpenseId ? "Save Changes" : "Add Expense"}</button>
              {moroccoEditingExpenseId && <button type="button" onClick={cancelMoroccoExpenseEdit} className="text-xs text-white/40 transition hover:text-white/70">Cancel Edit</button>}
            </div>
          </form>
          {moroccoExpenseMessage && <p className="mb-4 text-sm text-white/50">{moroccoExpenseMessage}</p>}
          <div className="space-y-3">
            {moroccoExpenses.map((expense) => <div key={expense.id} className={`flex items-start justify-between gap-4 rounded-xl border bg-white/[0.04] px-4 py-3 ${moroccoEditingExpenseId === expense.id ? "" : "border-white/10"}`} style={moroccoEditingExpenseId === expense.id ? { borderColor: `${activeBillTabConfig.accent}99` } : undefined}><div className="min-w-0"><p className="truncate text-sm text-white/80">{expense.description}</p><p className="mt-1 text-xs text-white/40">{new Intl.DateTimeFormat("en-CA", { year: "numeric", month: "short", day: "numeric" }).format(new Date(expense.createdAt))} · Paid By {expense.paidBy} · Paid For {expense.paidFor || "Everyone"}</p>{expense.exchangeRateToCad !== null && expense.amountCad === null && <p className="mt-1 text-[11px] text-white/30">1 {expense.amountUsd !== null ? "USD" : activeBillTabConfig.localLabel} = {expense.exchangeRateToCad.toFixed(4)} CAD</p>}</div><div className="shrink-0 text-right"><p className="text-sm font-medium" style={{ color: activeBillTabConfig.accent }}>{expense.amountCad !== null ? `$${expense.amountCad.toFixed(2)} CAD` : expense.amountUsd !== null ? `$${expense.amountUsd.toFixed(2)} USD` : `${activeBillTabConfig.localSymbol}${expense.amountLocal?.toFixed(2)} ${activeBillTabConfig.localLabel}`}</p>{expense.convertedAmountCad !== null && expense.amountCad === null && <p className="mt-1 text-xs text-white/40">≈ ${expense.convertedAmountCad.toFixed(2)} CAD</p>}<div className="mt-2 flex justify-end gap-3"><button type="button" onClick={() => editMoroccoExpense(expense)} className="text-[10px] uppercase tracking-[0.12em] transition" style={{ color: activeBillTabConfig.accent }}>Edit</button><button type="button" onClick={() => deleteMoroccoExpense(expense)} className="text-[10px] uppercase tracking-[0.12em] text-red-300/60 transition hover:text-red-300">Delete</button></div></div></div>)}
            {!moroccoExpenses.length && !moroccoExpenseMessage && <p className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-8 text-center text-sm text-white/40">No shared expenses yet. Add the first expense above when the trip starts.</p>}
          </div>
        </div>
      </section>
    </div>
  ) : null;

  const moroccoAccountingSummaryPopup = showMoroccoAccountingSummary ? (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label={`${activeBillTabConfig.label} accounting summary`}>
      <section className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-white/15 bg-[#111] shadow-2xl">
        <div className="flex items-start justify-between gap-5 border-b border-white/10 p-6">
          <div><p className="mb-2 text-xs uppercase tracking-[0.24em]" style={{ color: activeBillTabConfig.accent }}>{activeBillTabConfig.label}</p><h2 className="text-2xl font-light">Accounting Summary</h2><p className="mt-3 text-sm leading-6 text-white/45">Approximate settlement based on each expense's converted CAD value.</p></div>
          <button type="button" onClick={() => setShowMoroccoAccountingSummary(false)} aria-label="Close accounting summary" title="Close" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/15 text-lg text-white/65">x</button>
        </div>
        <div className="min-h-0 overflow-y-auto p-6">
          {!moroccoExpenses.length ? (
            <p className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-8 text-center text-sm leading-6 text-white/40">No shared expenses yet. Add expenses in BillTab to generate settlement suggestions.</p>
          ) : (
            <div className="space-y-5">
              <section>
                <h3 className="mb-3 text-xs uppercase tracking-[0.2em] text-white/45">Suggested Payments</h3>
                {billTabSettlements.length ? (
                  <div className="space-y-2">
                    {billTabSettlements.map((settlement) => (
                      <div key={`${settlement.from}-${settlement.to}-${settlement.amount}`} className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3">
                        <p className="text-sm text-white/75"><span className="text-white">{settlement.from}</span> pays <span className="text-white">{settlement.to}</span></p>
                        <p className="mt-1 text-sm font-medium" style={{ color: activeBillTabConfig.accent }}>${settlement.amount.toFixed(2)} CAD</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-5 text-sm text-white/45">Everyone is settled based on the current entries.</p>
                )}
              </section>
              <section>
                <h3 className="mb-3 text-xs uppercase tracking-[0.2em] text-white/45">Party Balances</h3>
                <div className="space-y-2">
                  {billTabBalances.map((party) => (
                    <div key={party.name} className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm">
                      <span className="min-w-0 truncate text-white/70">{party.name}</span>
                      <span className={party.balance >= 0 ? "text-emerald-200/80" : "text-rose-200/80"}>{party.balance >= 0 ? "+" : "-"}${Math.abs(party.balance).toFixed(2)} CAD</span>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          )}
        </div>
      </section>
    </div>
  ) : null;

  const openAlbumPopup = (albumUrl: string) => setAlbumPopupUrl(albumUrl);

  const albumPopup = albumPopupUrl ? (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/85 p-2 backdrop-blur-sm sm:p-4" role="dialog" aria-modal="true" aria-label="Photo album">
      <section className="flex h-[calc(100vh-1rem)] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-white/15 bg-[#111] shadow-2xl sm:h-[92vh]">
        <div className="flex shrink-0 items-center justify-between border-b border-white/10 px-4 py-3 sm:px-5">
          <h2 className="text-sm font-light uppercase tracking-[0.18em] text-white/60">Photo Album</h2>
          <button type="button" onClick={() => setAlbumPopupUrl("")} aria-label="Close photo album" title="Close" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/15 text-lg text-white/65 transition hover:border-white/35 hover:text-white">x</button>
        </div>
        <iframe src={albumPopupUrl} title="Photo album" className="min-h-0 w-full flex-1 border-0 bg-black" />
      </section>
    </div>
  ) : null;

  const taiwanDashboardAlbumPopup = taiwanDashboardAlbumMode ? (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Choose Taiwan photo album">
      <section className="w-full max-w-md rounded-2xl border border-white/15 bg-[#111] p-5 text-left shadow-2xl sm:p-6">
        <div className="mb-5 flex items-start justify-between gap-4 border-b border-white/10 pb-4">
          <div>
            <p className="mb-2 text-xs uppercase tracking-[0.24em]" style={{ color: TAIWAN_GOLD }}>Taiwan 2026</p>
            <h2 className="text-2xl font-light text-white">{taiwanDashboardAlbumMode === "upload" ? "Upload Photos" : "View Album"}</h2>
            <p className="mt-2 text-sm text-white/45">Choose which Taiwan album to use.</p>
          </div>
          <button type="button" onClick={() => setTaiwanDashboardAlbumMode("")} aria-label="Close Taiwan album selection" title="Close" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/15 text-lg text-white/65 transition hover:border-white/35 hover:text-white">x</button>
        </div>
        <div className="grid gap-3">
          <MemoryMaker albumKey="taiwanNovember" albumName="Taiwan November" accentColor={TAIWAN_GOLD} guestName={guestName} returnChapter="map" onViewAlbum={(url) => { setTaiwanDashboardAlbumMode(""); openAlbumPopup(url); }} inlineButtons inlineMode={taiwanDashboardAlbumMode} uploadLabel="Taiwan November" viewLabel="Taiwan November" />
          <MemoryMaker albumKey="taiwanDecember" albumName="Taiwan December" accentColor={TAIWAN_GOLD} guestName={guestName} returnChapter="map" onViewAlbum={(url) => { setTaiwanDashboardAlbumMode(""); openAlbumPopup(url); }} inlineButtons inlineMode={taiwanDashboardAlbumMode} uploadLabel="Taiwan December" viewLabel="Taiwan December" />
        </div>
      </section>
    </div>
  ) : null;

  const okinawaXeniaReservationItems = [
    "Airfare",
    "Okinawa FunPass Churaumi 3 in 1",
    "11/27 - 12/6 Car Rental",
    "11/27 - 11/30 Onna Hotel",
    "11/28 Blue Cave Scuba/Snorkel Booking",
    "11/30 - 12/2 Nago Hotel",
    "11/30 Orion Happy Park Admission Reservation",
    "11/30 Yakiniku Kochan Dinner Reservation",
    "12/1 Restaurant Flipper Dinner Reservation",
    "12/2 - 12/4 Nanjo Hotel",
    "12/3 Gangala Cave Tour Reservation",
    "12/3 Dinner Private Event Arrangement at the Hotel",
    "12/4 - 12/6 Naha Hotel",
    "12/5 Naha Dinner Reservation",
  ];
  const okinawaXeniaReservationCompleted = okinawaXeniaReservationItems.filter((item) => checkedReservationItems[`okinawaJapan-${guestName}-${item}`]).length;

  const okinawaBudgetPopup = showOkinawaBudget ? (
    <div className="fixed inset-0 z-[60] flex items-stretch justify-center bg-black/80 p-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-[max(0.5rem,env(safe-area-inset-top))] backdrop-blur-sm sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-label="Okinawa budget">
      <section className="flex h-[calc(100dvh-1rem)] max-h-[calc(100dvh-1rem)] w-full max-w-md flex-col overflow-hidden rounded-2xl border border-white/15 bg-[#111] text-left shadow-2xl sm:h-[88dvh] sm:max-h-[760px]">
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-white/10 p-5 sm:p-6">
          <div>
            <p className="mb-2 text-xs uppercase tracking-[0.24em]" style={{ color: BABY_BLUE }}>Okinawa Japan 2026</p>
            <h2 className="text-2xl font-light text-white">Budget</h2>
            <p className="mt-2 text-sm text-white/45">Xenia & David & Naomi</p>
          </div>
          <button type="button" onClick={() => setShowOkinawaBudget(false)} aria-label="Close Okinawa budget" title="Close" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/15 text-lg text-white/65 transition hover:border-white/35 hover:text-white">x</button>
        </div>
        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain p-4 text-sm leading-6 text-white/65 sm:p-6">
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <p className="text-xs uppercase tracking-[0.18em]" style={{ color: BABY_BLUE }}>Accommodation</p>
              <p className="text-xs text-white/45">7 nights</p>
            </div>
            <div className="space-y-3">
              {[
                ["11/27-11/30", "3 nights at Hotel Monterey Okinawa", "¥96,186"],
                ["11/30-12/2", "2 nights at Yugaf Inn Okinawa", "¥31,050"],
                ["12/2-12/4", "2 nights at Yuinchi Hotel Nanjo", "¥39,400"],
              ].map(([dates, label, amount]) => (
                <div key={dates} className="rounded-xl border border-white/10 bg-black/20 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-[0.14em] text-white/40">{dates}</p>
                      <p className="mt-1 text-sm text-white/75">{label}</p>
                    </div>
                    <p className="shrink-0 text-sm font-medium text-white">{amount}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-3">
              <p className="text-xs uppercase tracking-[0.18em] text-white/45">Accommodation Total</p>
              <p className="text-sm font-medium text-white">¥166,636</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  ) : null;

  const okinawaReservationChecklistPopup = showOkinawaReservationChecklist ? (
    <div className="fixed inset-0 z-[60] flex items-stretch justify-center bg-black/80 p-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-[max(0.5rem,env(safe-area-inset-top))] backdrop-blur-sm sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-label="Okinawa reservation checklist">
      <section className="flex h-[calc(100dvh-1rem)] max-h-[calc(100dvh-1rem)] w-full max-w-md flex-col overflow-hidden rounded-2xl border border-white/15 bg-[#111] text-left shadow-2xl sm:h-[88dvh] sm:max-h-[760px]">
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-white/10 p-5 sm:p-6">
          <div>
            <p className="mb-2 text-xs uppercase tracking-[0.24em]" style={{ color: BABY_BLUE }}>Okinawa Japan 2026</p>
            <h2 className="text-2xl font-light text-white">Reservation Checklist</h2>
            <p className="mt-2 text-sm text-white/45">{okinawaXeniaReservationCompleted} of {okinawaXeniaReservationItems.length} completed</p>
          </div>
          <button type="button" onClick={() => setShowOkinawaReservationChecklist(false)} aria-label="Close Okinawa reservation checklist" title="Close" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/15 text-lg text-white/65 transition hover:border-white/35 hover:text-white">x</button>
        </div>
        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain p-4 text-sm leading-6 text-white/65 sm:p-6">
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
            <p className="mb-3 text-xs uppercase tracking-[0.18em]" style={{ color: BABY_BLUE }}>Reservations</p>
            <div className="grid gap-2">
              {okinawaXeniaReservationItems.map((item) => {
                const stateKey = `okinawaJapan-${guestName}-${item}`;
                const checked = Boolean(checkedReservationItems[stateKey]);
                return (
                  <button key={item} type="button" onClick={() => toggleReservationItem("okinawaJapan", item, checked)} className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition ${checked ? "border-[#9EDCFF]/45 bg-[#9EDCFF]/10 text-white" : "border-white/10 bg-black/20 text-white/75 hover:border-white/25"}`}>
                    <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[10px] ${checked ? "border-[#9EDCFF] bg-[#9EDCFF] text-black" : "border-white/20 text-transparent"}`}>✓</span>
                    <span className={checked ? "text-sm text-white line-through decoration-[#9EDCFF]/70" : "text-sm text-white/75"}>{item}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </section>
    </div>
  ) : null;

  if (!isInitialRouteReady) {
    return <div className="min-h-screen bg-black" />;
  }

  if (showMoroccoItinerary && guestName) {
    const moroccoLocalTime = new Intl.DateTimeFormat("en-US", { timeZone: "Africa/Casablanca", hour: "numeric", minute: "2-digit", second: "2-digit", hour12: true }).format(now);
    return (
      <div className="min-h-screen bg-black px-6 py-10 text-white" style={{ "--chapter-accent": MOROCCO_BROWN } as React.CSSProperties}>
        <header className="mx-auto mb-10 flex max-w-5xl flex-wrap items-center justify-between gap-3">
          <button type="button" onClick={() => openTripDashboard(guestName || "Guest")} className="rounded-full border border-white/20 bg-white/[0.04] px-4 py-2 text-sm text-white/70 transition hover:border-white/40 hover:text-white">← Back to Dashboard</button>
          <button type="button" onClick={goToMainPage} className="rounded-full border border-white/20 bg-white/[0.04] px-4 py-2 text-sm text-white/70 transition hover:border-white/40 hover:text-white">Main Page</button>
        </header>
        <main className="mx-auto max-w-5xl">
          <p className="mb-3 text-sm uppercase tracking-[0.35em]" style={{ color: MOROCCO_BROWN }}>Morocco · G-Adventures</p>
          <h1 className="mb-6 text-4xl font-light tracking-wide md:text-6xl">Trip Itinerary</h1>
          <section className="mb-10 grid grid-cols-2 gap-3 md:grid-cols-4">
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3 text-center md:p-4"><p className="mb-1 text-xl md:text-2xl">💵</p><p className="text-[10px] text-gray-400 md:text-xs">Currency</p><p className="mt-1 text-xs font-medium md:text-sm">1 CAD ≈ {cadToMad} MAD</p><p className="mt-1 text-xs text-gray-400">Live exchange rate</p></div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3 text-center md:p-4"><p className="mb-1 text-xl md:text-2xl">🌤️</p><p className="text-[10px] text-gray-400 md:text-xs">September Temp</p><p className="mt-1 text-xs font-medium md:text-sm">18–32°C</p><p className="mt-1 text-[9px] text-gray-500">Live forecast once trip begins</p></div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3 text-center md:p-4"><p className="mb-1 text-xl md:text-2xl">🕘</p><p className="text-[10px] text-gray-400 md:text-xs">Local Time</p><p className="mt-1 text-xs font-medium md:text-sm">{moroccoLocalTime}</p><p className="mt-1 text-[9px] text-gray-500">Morocco · Casablanca</p></div>
            <button type="button" onClick={() => setShowMoroccoMap(true)} className="rounded-2xl border border-[#D6B48C]/30 bg-[#D6B48C]/10 p-3 text-center transition hover:border-[#D6B48C]/60 hover:bg-[#D6B48C]/15 md:p-4"><p className="mb-1 text-xl md:text-2xl">🗺️</p><p className="text-[10px] text-[#D6B48C]/75 md:text-xs">Map View</p><p className="mt-1 text-xs font-medium text-[#D6B48C] md:text-sm">Morocco Route</p><p className="mt-1 text-[9px] text-white/40">Casablanca to Marrakech</p></button>
          </section>
          <section className="space-y-8">
            <MoroccoItineraryContent card={(children) => <div className="rounded-2xl border border-white/10 bg-black/20 p-4">{children}</div>} />
          </section>
        </main>
        {showMoroccoMap && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Morocco route map">
            <section className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-white/15 bg-[#111] shadow-2xl">
              <div className="flex items-start justify-between gap-5 border-b border-white/10 px-5 py-4 sm:px-7">
                <div>
                  <p className="mb-1 text-xs uppercase tracking-[0.24em]" style={{ color: MOROCCO_BROWN }}>Morocco 2026</p>
                  <h2 className="text-xl font-light text-white">Route Map</h2>
                </div>
                <button type="button" onClick={() => setShowMoroccoMap(false)} aria-label="Close Morocco route map" title="Close" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/15 text-lg text-white/65 transition hover:border-white/35 hover:text-white">x</button>
              </div>
              <div className="min-h-0 overflow-auto bg-white p-2 sm:p-4">
                <img src="/morocco-route-map.png" alt="G Adventures Morocco route from Casablanca to Marrakech" className="mx-auto h-auto max-h-[75vh] w-auto max-w-full object-contain" />
              </div>
            </section>
          </div>
        )}
        {showMoroccoCostTracker && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Morocco BillTab">
            <section className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-white/15 bg-[#111] shadow-2xl">
              <div className="flex items-start justify-between gap-5 border-b border-white/10 px-5 py-5 sm:px-7">
                <div><p className="mb-2 text-xs uppercase tracking-[0.24em]" style={{ color: MOROCCO_BROWN }}>Morocco 2026</p><h2 className="text-2xl font-light">BillTab</h2><p className="mt-2 text-sm text-white/45">Converted total: ${moroccoExpenseTotal.toFixed(2)} CAD</p></div>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => setShowMoroccoAccountingSummary(true)} className="rounded-full border border-[#D6B48C]/35 bg-[#D6B48C]/10 px-3 py-2 text-[10px] uppercase tracking-[0.12em] text-[#D6B48C] transition hover:border-[#D6B48C]/60">Accounting Summary</button>
                  <button type="button" onClick={() => setShowMoroccoCostTracker(false)} aria-label="Close BillTab" title="Close" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/15 text-lg text-white/65">×</button>
                </div>
              </div>
              <div className="min-h-0 overflow-y-auto p-5 sm:p-7">
                <form onSubmit={(event) => { event.preventDefault(); addMoroccoExpense(); }} className="mb-6 grid gap-3 sm:grid-cols-2">
                  <label className="grid gap-1.5 text-xs text-white/45 sm:col-span-2">
                    Expense Item
                    <input value={moroccoExpenseDescription} onChange={(event) => setMoroccoExpenseDescription(event.target.value)} placeholder="Expense description" className="rounded-xl border border-white/15 bg-black/30 px-4 py-3 text-sm text-white outline-none focus:border-[#D6B48C]/60" />
                  </label>
                  <label className="grid gap-1.5 text-xs text-white/45">
                    Amount
                    <input value={moroccoExpenseAmount} onChange={(event) => setMoroccoExpenseAmount(event.target.value)} type="number" min="0.01" step="0.01" placeholder="0.00" className="rounded-xl border border-white/15 bg-black/30 px-4 py-3 text-sm text-white outline-none focus:border-[#D6B48C]/60" />
                  </label>
                  <fieldset className="grid gap-1.5 text-xs text-white/45">
                    <legend className="mb-1.5">Currency</legend>
                    <div className="grid grid-cols-3 rounded-xl border border-white/15 bg-black/30 p-1">
                      {(["CAD", "MAD", "USD"] as const).map((currency) => <button key={currency} type="button" onClick={() => setMoroccoExpenseCurrency(currency)} className={`rounded-lg px-3 py-2 text-sm transition ${moroccoExpenseCurrency === currency ? "bg-[#D6B48C] text-black" : "text-white/55 hover:text-white"}`}>{currency}</button>)}
                    </div>
                  </fieldset>
                  {renderMoroccoPaidForSelector()}
                  <label className="grid gap-1.5 text-xs text-white/45">
                    Paid By
                    <select value={moroccoExpensePaidBy} onChange={(event) => setMoroccoExpensePaidBy(event.target.value)} className="rounded-xl border border-white/15 bg-[#111] px-4 py-3 text-sm text-white outline-none focus:border-[#D6B48C]/60">
                      <option value="" disabled>Select a party</option>
                      {moroccoInterestedNames.map((name) => <option key={name} value={name}>{name}</option>)}
                    </select>
                  </label>
                  <div className="grid gap-2 sm:self-end">
                    <button type="submit" className="rounded-xl border border-[#D6B48C]/35 bg-[#D6B48C]/10 px-5 py-3 text-sm uppercase tracking-[0.16em] text-[#D6B48C]">{moroccoEditingExpenseId ? "Save Changes" : "Add Expense"}</button>
                    {moroccoEditingExpenseId && <button type="button" onClick={cancelMoroccoExpenseEdit} className="text-xs text-white/40 transition hover:text-white/70">Cancel Edit</button>}
                  </div>
                </form>
                {moroccoExpenseMessage && <p className="mb-4 text-sm text-white/50">{moroccoExpenseMessage}</p>}
                <div className="space-y-3">
                  {moroccoExpenses.map((expense) => <div key={expense.id} className={`flex items-start justify-between gap-4 rounded-xl border bg-white/[0.04] px-4 py-3 ${moroccoEditingExpenseId === expense.id ? "border-[#D6B48C]/60" : "border-white/10"}`}><div className="min-w-0"><p className="truncate text-sm text-white/80">{expense.description}</p><p className="mt-1 text-xs text-white/40">{new Intl.DateTimeFormat("en-CA", { year: "numeric", month: "short", day: "numeric" }).format(new Date(expense.createdAt))} · Paid By {expense.paidBy} · Paid For {expense.paidFor || "Everyone"}</p>{expense.exchangeRateToCad !== null && expense.amountCad === null && <p className="mt-1 text-[11px] text-white/30">1 {expense.amountUsd !== null ? "USD" : "MAD"} = {expense.exchangeRateToCad.toFixed(4)} CAD</p>}</div><div className="shrink-0 text-right"><p className="text-sm font-medium" style={{ color: MOROCCO_BROWN }}>{expense.amountCad !== null ? `$${expense.amountCad.toFixed(2)} CAD` : expense.amountUsd !== null ? `$${expense.amountUsd.toFixed(2)} USD` : `${expense.amountLocal?.toFixed(2)} MAD`}</p>{expense.convertedAmountCad !== null && expense.amountCad === null && <p className="mt-1 text-xs text-white/40">≈ ${expense.convertedAmountCad.toFixed(2)} CAD</p>}<div className="mt-2 flex justify-end gap-3"><button type="button" onClick={() => editMoroccoExpense(expense)} className="text-[10px] uppercase tracking-[0.12em] text-[#D6B48C]/75 transition hover:text-[#D6B48C]">Edit</button><button type="button" onClick={() => deleteMoroccoExpense(expense)} className="text-[10px] uppercase tracking-[0.12em] text-red-300/60 transition hover:text-red-300">Delete</button></div></div></div>)}
                  {!moroccoExpenses.length && !moroccoExpenseMessage && <p className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-8 text-center text-sm text-white/40">No shared expenses yet. Add the first expense above when the trip starts.</p>}
                </div>
              </div>
            </section>
          </div>
        )}
        {showMoroccoAccountingSummary && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Morocco accounting summary">
            <section className="w-full max-w-lg rounded-2xl border border-white/15 bg-[#111] p-6 shadow-2xl">
              <div className="flex items-start justify-between gap-5">
                <div><p className="mb-2 text-xs uppercase tracking-[0.24em]" style={{ color: MOROCCO_BROWN }}>Morocco 2026</p><h2 className="text-2xl font-light">Accounting Summary</h2><p className="mt-3 text-sm leading-6 text-white/45">Who owes whom and settlement amounts will appear here once expense-sharing rules are added.</p></div>
                <button type="button" onClick={() => setShowMoroccoAccountingSummary(false)} aria-label="Close accounting summary" title="Close" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/15 text-lg text-white/65">×</button>
              </div>
            </section>
          </div>
        )}
        {albumPopup}
      </div>
    );
  }

  if (showVietnamItinerary && guestName) {
    const vietnamBudgetCostsForGuest = getVietnamBookingCostsForGuest(guestName);
    const vietnamBudgetTotalForGuest = vietnamBudgetCostsForGuest.reduce((total, cost) => total + (cost.amountCad ?? 0), 0);
    const vietnamLocalTime = new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Ho_Chi_Minh", hour: "numeric", minute: "2-digit", second: "2-digit", hour12: true }).format(now);
    const hanoiAccommodationName = "Heart of Hoan Kiem Homestay Airbnb";
    const hanoiAccommodationAddress = "23C Phố Tông Đản, Hoàn Kiếm, Hà Nội";
    const hanoiAccommodationMapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(hanoiAccommodationAddress)}`;
    return (
      <div className="min-h-screen bg-black px-6 py-10 text-white" style={{ "--chapter-accent": VIETNAM_GOLD } as React.CSSProperties}>
        <header className="mx-auto mb-10 flex max-w-5xl flex-wrap items-center justify-between gap-3">
          <button type="button" onClick={() => openTripDashboard(guestName || "Guest")} className="rounded-full border border-white/20 bg-white/[0.04] px-4 py-2 text-sm text-white/70 transition hover:border-white/40 hover:text-white">← Back to Dashboard</button>
          <button type="button" onClick={goToMainPage} className="rounded-full border border-white/20 bg-white/[0.04] px-4 py-2 text-sm text-white/70 transition hover:border-white/40 hover:text-white">Main Page</button>
        </header>
        <main className="mx-auto max-w-5xl">
          <p className="mb-3 text-sm uppercase tracking-[0.35em]" style={{ color: VIETNAM_GOLD }}>Vietnam · North & South</p>
          <h1 className="mb-3 text-4xl font-light tracking-wide md:text-6xl">Trip Itinerary</h1>
          <p className="mb-6 text-sm text-white/45">Nov 12 - Nov 21 2026</p>
          <section className="mb-10 grid grid-cols-2 gap-3 md:grid-cols-4">
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3 text-center md:p-4"><p className="mb-1 text-xl md:text-2xl">💵</p><p className="text-[10px] text-gray-400 md:text-xs">Currency</p><p className="mt-1 text-xs font-medium md:text-sm">1 CAD ≈ {cadToVnd} VND</p><p className="mt-1 text-xs text-gray-400">Live exchange rate</p></div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3 text-center md:p-4"><p className="mb-1 text-xl md:text-2xl">🌤️</p><p className="text-[10px] text-gray-400 md:text-xs">November Temp</p><p className="mt-1 text-xs font-medium md:text-sm">22-31°C</p><p className="mt-1 text-[9px] text-gray-500">Live forecast once trip begins</p></div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3 text-center md:p-4"><p className="mb-1 text-xl md:text-2xl">🕘</p><p className="text-[10px] text-gray-400 md:text-xs">Local Time</p><p className="mt-1 text-xs font-medium md:text-sm">{vietnamLocalTime}</p><p className="mt-1 text-[9px] text-gray-500">Vietnam · ICT</p></div>
            <button type="button" onClick={() => setShowVietnamRouteMap(true)} className="rounded-2xl border border-[#F6C65B]/30 bg-[#F6C65B]/10 p-3 text-center transition hover:border-[#F6C65B]/60 hover:bg-[#F6C65B]/15 md:p-4"><p className="mb-1 text-xl md:text-2xl">🗺️</p><p className="text-[10px] text-[#F6C65B]/75 md:text-xs">Map Route</p><p className="mt-1 text-xs font-medium text-[#F6C65B] md:text-sm">North & South</p><p className="mt-1 text-[9px] text-white/40">Route overview</p></button>
          </section>
          <section className="space-y-5">
            {vietnamItineraryDays.map((day) => (
              <article key={day.date} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <div className="mb-4">
                  <p className="text-xs uppercase tracking-[0.2em]" style={{ color: VIETNAM_GOLD }}>{day.date}</p>
                  <h2 className="mt-1 text-2xl font-light text-white">{day.title}</h2>
                  <p className="mt-1 text-sm uppercase tracking-[0.16em] text-white/40">{day.location}</p>
                </div>
                <ul className="space-y-2 text-sm leading-6 text-white/70">
                  {day.items.map((item) => (
                    <li key={item} className="flex gap-2">
                      <span className="shrink-0" style={{ color: VIETNAM_GOLD }}>•</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
                {"links" in day && day.links && day.stay !== "Peony Cruise" && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {day.links.map((link) => (
                      <a key={link.href} href={link.href} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center rounded-full border border-[#F6C65B]/35 bg-[#F6C65B]/10 px-4 py-2 text-xs uppercase tracking-[0.14em] text-[#F6C65B] transition hover:border-[#F6C65B]/60 hover:bg-[#F6C65B]/15">
                        {link.label}
                      </a>
                    ))}
                  </div>
                )}
                {day.stay && (
                  <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.04] p-3">
                    <p className="text-[10px] uppercase tracking-[0.18em] text-white/40">Nightly Accommodation</p>
                    {day.stay.startsWith(hanoiAccommodationName) ? (
                      <div className="mt-1 space-y-1">
                        <p className="text-sm text-white/75">{hanoiAccommodationName}</p>
                        <a href={hanoiAccommodationMapUrl} target="_blank" rel="noreferrer" className="block text-sm text-[#F6C65B] underline decoration-[#F6C65B]/35 underline-offset-4 transition hover:text-[#FFE19A]">
                          {hanoiAccommodationAddress}
                        </a>
                      </div>
                    ) : (
                      <p className="mt-1 text-sm text-white/75">{day.stay}</p>
                    )}
                    {"links" in day && day.links && day.stay === "Peony Cruise" && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {day.links.map((link) => (
                          <a key={link.href} href={link.href} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center rounded-full border border-[#F6C65B]/35 bg-[#F6C65B]/10 px-4 py-2 text-xs uppercase tracking-[0.14em] text-[#F6C65B] transition hover:border-[#F6C65B]/60 hover:bg-[#F6C65B]/15">
                            {link.label}
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </article>
            ))}
          </section>
        </main>
        {showMoroccoBudget && (
          <div className="fixed inset-0 z-50 flex items-stretch justify-center bg-black/80 p-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-[max(0.5rem,env(safe-area-inset-top))] backdrop-blur-sm sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-label="Vietnam party budget">
            <section className="flex h-[calc(100dvh-1rem)] max-h-[calc(100dvh-1rem)] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-white/15 bg-[#111] text-left shadow-2xl sm:h-[82dvh] sm:max-h-[760px]">
              <div className="flex shrink-0 items-start justify-between gap-4 border-b border-white/10 px-4 py-3 sm:px-6 sm:py-5">
                <div>
                  <p className="mb-2 text-xs uppercase tracking-[0.24em]" style={{ color: VIETNAM_GOLD }}>Vietnam 2026</p>
                  <h2 className="text-xl font-light text-white sm:text-2xl">Trip Budget</h2>
                  <p className="mt-1 text-xs text-white/45">{guestName}</p>
                </div>
                <button type="button" onClick={() => setShowMoroccoBudget(false)} aria-label="Close Vietnam party budget" title="Close" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/15 text-lg text-white/65 transition hover:border-white/35 hover:text-white">×</button>
              </div>
              <div className="min-h-0 flex-1 space-y-3 overflow-y-scroll overscroll-contain p-3 pb-[max(1rem,env(safe-area-inset-bottom))] sm:p-6">
                <div className="rounded-xl border border-[#F6C65B]/30 bg-[#F6C65B]/10 p-4 text-sm text-[#F6C65B]">
                  Known party total = ${vietnamBudgetTotalForGuest.toLocaleString("en-CA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} CAD
                </div>
                {vietnamBudgetCostsForGuest.map((cost) => (
                  <article key={cost.category} className="rounded-xl border border-white/10 bg-white/[0.04] p-3 sm:p-4">
                    <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-start sm:gap-4">
                      <div>
                        <h3 className="text-base font-light text-white">{cost.category}</h3>
                        {Array.isArray(cost.detail) ? (
                          <ul className="mt-2 space-y-1.5 text-sm leading-6 text-white/60">
                            {cost.detail.map((detail) => (
                              <li key={detail} className="flex gap-2">
                                <span className="shrink-0 text-[#F6C65B]">•</span>
                                <span>{detail}</span>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="mt-2 text-sm leading-6 text-white/60">{cost.detail}</p>
                        )}
                      </div>
                      <p className="text-sm text-[#F6C65B] sm:text-right">{cost.amountCad === null ? "TBD" : `$${cost.amountCad.toLocaleString("en-CA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} CAD`}</p>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          </div>
        )}
        {showVietnamRouteMap && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3 backdrop-blur-sm sm:p-4" role="dialog" aria-modal="true" aria-label="Vietnam route map">
            <section className="flex max-h-[92dvh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-white/15 bg-[#111] shadow-2xl">
              <div className="flex shrink-0 items-start justify-between gap-4 border-b border-white/10 px-4 py-3 sm:px-6 sm:py-4">
                <div>
                  <p className="mb-1 text-xs uppercase tracking-[0.24em]" style={{ color: VIETNAM_GOLD }}>Vietnam 2026</p>
                  <h2 className="text-xl font-light text-white sm:text-2xl">Map Route</h2>
                </div>
                <button type="button" onClick={() => setShowVietnamRouteMap(false)} aria-label="Close Vietnam route map" title="Close" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/15 text-lg text-white/65 transition hover:border-white/35 hover:text-white">×</button>
              </div>
              <div className="min-h-0 flex-1 overflow-auto bg-white p-2 sm:p-4">
                <img src="/nsviet.png" alt="Vietnam north and south trip route map" className="mx-auto h-auto max-h-[78dvh] w-auto max-w-full object-contain" />
              </div>
            </section>
          </div>
        )}
        {showMoroccoUsefulInfo && (
          <ViewportPortal>
          <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden bg-black/80 p-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-[max(0.5rem,env(safe-area-inset-top))] backdrop-blur-sm sm:p-4" role="dialog" aria-modal="true" aria-label="Vietnam useful information">
            <section className="flex h-[calc(100dvh-1rem)] max-h-[760px] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-white/15 bg-[#111] text-left shadow-2xl sm:h-[min(760px,calc(100dvh-2rem))]">
              <div className="sticky top-0 z-10 flex shrink-0 items-start justify-between gap-4 border-b border-white/10 bg-[#111] px-4 py-3 sm:px-7 sm:py-5">
                <div>
                  <p className="mb-2 text-xs uppercase tracking-[0.24em]" style={{ color: VIETNAM_GOLD }}>Vietnam 2026</p>
                  <h2 className="text-xl font-light text-white sm:text-2xl">Useful Information</h2>
                </div>
                <button type="button" onClick={() => setShowMoroccoUsefulInfo(false)} aria-label="Close Vietnam useful information" title="Close" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/15 text-lg text-white/65 transition hover:border-white/35 hover:text-white">×</button>
              </div>
              <div className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain p-3 pb-[max(1rem,env(safe-area-inset-bottom))] sm:p-7">
                {[
                  ["Power", "Vietnam commonly uses 220V power with Type A, C, and F plugs."],
                  ["Transportation", "Uber is not available in Vietnam. The equivalent ride-share app is Grab, which is fully operational across major cities."],
                  ["Tourist Visa", "Canadian passport holders require a tourist visa and may apply online for a single- or multiple-entry e-visa valid for up to 90 days. The passport should be valid for at least 6 months beyond the planned departure from Vietnam."],
                  ["Payment", "Cards are useful in larger hotels and restaurants. Cash is still important for markets, smaller shops, taxis, and local food."],
                  ["Local Currency", `Vietnamese dong (VND). Approximate live rates: 1 CAD ≈ ${cadToVnd} VND and 1 USD ≈ ${usdToVnd} VND. For the best exchange rates, use a major bank or authorized currency exchange counter in Hanoi or Ho Chi Minh City. Bank ATMs are a convenient alternative. Exchange only a small arrival amount at the airport, where rates are usually less favourable.`],
                  ["SIM / eSIM", "Local SIM and eSIM options are widely available for Hanoi and central Vietnam."],
                ].map(([title, text]) => (
                  <div key={title} className="rounded-xl border border-white/10 bg-white/[0.04] p-3 sm:p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-white/40">{title}</p>
                    <p className="mt-2 text-sm leading-6 text-white/75">{text}</p>
                  </div>
                ))}
              </div>
            </section>
          </div>
          </ViewportPortal>
        )}
        {albumPopup}
      </div>
    );
  }

  if (!isGuestConfirmed) {
    const isPosterHeroSelection = selectedTrip === "morocco" || selectedTrip === "okinawaJapan" || selectedTrip === "taiwan" || selectedTrip === "vietnam";
    const isConfirmedTripAppCard = selectedTrip === "morocco" || selectedTrip === "taiwan" || selectedTrip === "okinawaJapan" || selectedTrip === "vietnam";
    const isSplitTripDashboard = showGuestActions && (selectedTrip === "taiwan" || selectedTrip === "okinawaJapan");
    const isMainSubmenu = !selectedTrip && mainPageView !== "active";
    const selectedTripAccent = selectedTrip === "taiwan" ? TAIWAN_GOLD : selectedTrip === "okinawaJapan" ? BABY_BLUE : selectedTrip === "vietnam" ? VIETNAM_GOLD : MOROCCO_BROWN;
    const selectedTripDashboardLabel = selectedTrip === "taiwan" ? "Taiwan 2026" : selectedTrip === "okinawaJapan" ? "Okinawa Japan 2026" : selectedTrip === "vietnam" ? "Vietnam 2026" : "Morocco · G-Adventures";
    const okinawaDashboardDates: Record<string, string> = {
      "Xenia & David & Naomi (3)": "Nov 27 - Dec 6 2026",
      "Dave & Christina & Xixi (2)": "Nov 27 - Dec 6 2026",
      "Heather & Jack & Aizen (8) & Kaien (3) & Norma": "Nov 26 - Dec 4 2026",
      "Steven Wang": "Nov 25 - Dec 3 2026",
      "Mark Wang": "Nov 25 - Nov 30 2026",
      "Mei & Emilia (8)": "Nov 29 - Dec 6 2026",
      Guest: "Nov 25 - Dec 6 2026",
    };
    const selectedTripDashboardDate = selectedTrip === "taiwan" ? "Nov 21 - Dec 21 2026" : selectedTrip === "okinawaJapan" ? okinawaDashboardDates[guestName] || "Nov 25 - Dec 6 2026" : selectedTrip === "vietnam" ? "Nov 12 - Nov 21 2026" : "Sept 4 - Sept 16 2026";
    const vietnamDashboardBudgetCosts = getVietnamBookingCostsForGuest(guestName);
    const vietnamDashboardBudgetTotal = vietnamDashboardBudgetCosts.reduce((total, cost) => total + (cost.amountCad ?? 0), 0);
    return (
      <div className="flex min-h-screen items-center justify-center bg-black px-6 text-white">
        <div className={`w-full max-w-md rounded-[2rem] border border-white/10 text-center backdrop-blur-xl ${isConfirmedTripAppCard || isMainSubmenu ? "flex h-[min(760px,calc(100dvh-2rem))] flex-col overflow-hidden" : ""} ${isPosterHeroSelection ? `overflow-hidden ${selectedTrip === "taiwan" || selectedTrip === "morocco" || selectedTrip === "vietnam" ? "bg-black" : "bg-[#020B18]"} shadow-[0_0_44px_rgba(158,220,255,0.16)]` : isMainSubmenu ? "bg-black shadow-[0_0_44px_rgba(255,255,255,0.1)]" : "bg-white/[0.04] p-8 shadow-[0_0_40px_rgba(255,255,255,0.06)]"}`}>
          {!isSplitTripDashboard && <p className={isPosterHeroSelection || isMainSubmenu ? "relative z-20 shrink-0 px-8 pt-8 pb-3 text-xs uppercase tracking-[0.35em] text-white/75" : "mb-3 text-xs uppercase tracking-[0.35em] text-white/70"}>Private Group Event</p>}
          {!selectedTrip ? (
            <>
              {mainPageView === "active" ? (
                <>
                  <h1 className="mb-5 text-white">
                  <>
                    <span className="block font-serif text-[2.65rem] italic leading-none tracking-normal text-white/95">Welcome,</span>
                    <span className="mt-2 block font-serif text-[1.8rem] leading-tight tracking-normal text-white/90">where are we going?</span>
                  </>
                  </h1>
                  <div className="space-y-3">
                    <TripButton location="Morocco" date="Sept 4 - Sept 16 2026" status="Confirmed" onClick={() => openTripPage("morocco")} />
                    <TripButton location="Vietnam" date="Nov 12 - Nov 21 2026" status="Confirmed" onClick={() => openTripPage("vietnam")} />
                    <TripButton location="Taiwan" date="Nov 21 - Dec 21 2026" status="Confirmed" onClick={() => openTripPage("taiwan")} />
                    <TripButton location="Okinawa Japan" date="Nov 25 - Dec 6 2026" status="Confirmed" onClick={() => openTripPage("okinawaJapan")} />
                    <div className="space-y-3 pt-3">
                      <MainHubButton title="2026/2027 Ski Season" subtitle="View Shiga Kogen, Deer Valley, and SkiBig3" onClick={() => setMainPageView("ski")} />
                      <MainHubButton title="Sign Up for Future Trips" subtitle="Dreaming-stage trips collecting interest" onClick={() => setMainPageView("future")} />
                      <MainHubButton title="Archived Trips" subtitle="Completed trips will live here" onClick={() => setMainPageView("archive")} />
                    </div>
                  </div>
                  {isSiteGuestAccess && (
                    <button type="button" onClick={switchSiteAccess} className="mt-5 w-full rounded-full border border-white/15 bg-white/[0.03] px-4 py-2.5 text-xs uppercase tracking-[0.18em] text-white/45 transition hover:border-white/30 hover:bg-white/[0.06] hover:text-white/70">
                      Member Login
                    </button>
                  )}
                </>
              ) : (
                <section className="relative flex min-h-0 flex-1 flex-col overflow-hidden text-left">
                  {mainPageView !== "archive" && (
                    <img
                      src={mainPageView === "ski" ? "/ski-season-menu-hero.webp" : "/future-trips-menu-hero.webp"}
                      alt=""
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-0 h-full w-full object-cover object-center"
                    />
                  )}
                  <div className={`pointer-events-none absolute inset-0 ${mainPageView === "ski" ? "bg-gradient-to-b from-[#06111f]/65 via-black/48 to-black/88" : mainPageView === "future" ? "bg-gradient-to-b from-black/58 via-[#02101c]/52 to-black/90" : "bg-black"}`} />
                  <div className="relative z-10 shrink-0 px-5 pb-4 pt-2 text-center">
                    <h1 className="text-2xl font-light tracking-wide text-white">
                      {mainPageView === "ski" ? "2026/2027 Ski Season" : mainPageView === "future" ? "Sign Up for Future Trips" : "Archived Trips"}
                    </h1>
                    <button type="button" onClick={() => setMainPageView("active")} className="mt-4 w-full rounded-full border border-white/30 bg-black/70 px-4 py-2 text-xs uppercase tracking-[0.18em] text-white/70 backdrop-blur-md transition hover:border-white/45 hover:bg-black/80 hover:text-white">Back</button>
                  </div>
                  <div className="relative z-10 min-h-0 flex-1 space-y-3 overflow-y-auto px-5 pb-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                    {mainPageView === "ski" && (
                      <>
                        <TripButton location="Ski Shiga Kogen & Nagano Japan" date="Jan 23 - Jan 31 2027" status="Dreaming" heroOverlay onClick={() => openTripPage("skiMyoko")} />
                        <TripButton location="Ski Deer Valley UT USA" date="Feb 2027" status="Dreaming" heroOverlay onClick={() => openTripPage("skiDeerValley")} />
                        <TripButton location="SkiBig3 AB Canada" date="Mar 2027" status="Dreaming" heroOverlay onClick={() => openTripPage("skiBig3")} />
                      </>
                    )}
                    {mainPageView === "future" && (
                      <>
                        <TripButton location="Panama (18+)" date="March 2027" duration="7 days" status="Dreaming" heroOverlay onClick={() => openTripPage("panama")} />
                        <TripButton location="Houston & Galveston TX USA" subtitle="FRC & Disney Cruise" date="April 28 - May 7 2027" status="Dreaming" heroOverlay onClick={() => openTripPage("houston")} />
                        <TripButton location="Alaska Cruise" date="June 2027" duration="8 days" status="Dreaming" heroOverlay onClick={() => openTripPage("alaskaCruise")} />
                        <TripButton location="Azores Portugal" date="Sept 2027" duration="9 days" status="Dreaming" heroOverlay onClick={() => openTripPage("azoresPortugal")} />
                        <TripButton location="Mexico" subtitle="Playa del Carmen" date="Nov 2027" duration="9 days" status="Dreaming" heroOverlay onClick={() => openTripPage("mexicoPlaya")} />
                        <TripButton location="Similan & Phuket Thailand" subtitle="Scuba Diving Liveaboard" date="Mar 2028" duration="9 days" status="Dreaming" heroOverlay onClick={() => openTripPage("similanThailand")} />
                        <TripButton location="Central Vietnam" date="Mar 2028" duration="6 days" status="Dreaming" heroOverlay onClick={() => openTripPage("centralVietnam")} />
                        <TripButton location="Taiwan" date="April 2028" duration="14 days" status="Dreaming" heroOverlay onClick={() => openTripPage("taiwanApril")} />
                        <TripButton location="Hawaii" subtitle="Maui & Big Island" date="May 2028" duration="9 days" status="Dreaming" heroOverlay onClick={() => openTripPage("hawaii")} />
                        <TripButton location="Orlando FL USA" subtitle="Disney World" date="Nov 2028" duration="7 days" status="Dreaming" heroOverlay onClick={() => openTripPage("disneyWorld")} />
                        <TripButton location="The 5 Stans & Silk Road (18+)" date="TBD" duration="16 days" status="Dreaming" heroOverlay onClick={() => openTripPage("fiveStans")} />
                      </>
                    )}
                    {mainPageView === "archive" && (
                      <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-5 text-center text-sm text-white/40">
                        Completed trips will be added here.
                      </div>
                    )}
                  </div>
                </section>
              )}
            </>
          ) : selectedTrip === "morocco" ? (
            <>
              {guestName ? (
                <>
                  <section className="relative flex min-h-0 flex-1 flex-col overflow-hidden bg-[#120D09] px-5 pb-5 text-left">
                    <img src="/morocco-dashboard-hero.webp" alt="" aria-hidden="true" className="absolute inset-x-0 bottom-0 top-20 h-[calc(100%-5rem)] w-full object-cover object-center" />
                    <div className="absolute inset-0 bg-gradient-to-b from-black/46 via-black/52 to-black/78" />
                    <div className="relative z-10 mb-5 grid grid-cols-2 gap-2">
                      <button type="button" onClick={() => { setGuestName(""); setShowMoroccoChecklist(false); setBrowserRoute(buildTripUrl("morocco")); }} className="rounded-full border border-white/30 bg-black/70 px-3 py-2 text-[10px] uppercase tracking-[0.14em] text-white/80 backdrop-blur-md transition hover:border-white/45 hover:bg-black/85">Back</button>
                      <button type="button" onClick={goToMainPage} className="rounded-full border border-white/30 bg-black/70 px-3 py-2 text-[10px] uppercase tracking-[0.14em] text-white/80 backdrop-blur-md transition hover:border-white/45 hover:bg-black/85">Main Page</button>
                    </div>
                    <div className="relative z-10 flex min-h-0 flex-1 flex-col justify-center space-y-5 overflow-y-auto">
                    <div>
                      <p className="text-xs uppercase tracking-[0.28em] text-[#D6B48C]/80">Morocco · G-Adventures</p>
                      <h2 className="mt-2 text-3xl font-light tracking-wide text-white">Hello {guestName}</h2>
                      <p className="mt-2 text-sm text-white/45">Sept 4 - Sept 16 2026</p>
                    </div>
                    {guestName === "Guest" ? (
                    <div className="grid gap-3 sm:grid-cols-2">
                      <button type="button" onClick={() => openTripView("itinerary")} className="flex min-h-14 items-center justify-center gap-3 rounded-2xl border border-[#D6B48C]/55 bg-[#140E0A]/45 px-4 py-3 text-center backdrop-blur-md transition hover:border-[#D6B48C]/75 hover:bg-[#1C140E]/55"><span className="text-xl">🗓️</span><span className="text-xs font-light uppercase tracking-[0.16em] text-[#D6B48C]">Trip Itinerary</span></button>
                      <button type="button" onClick={() => openAlbumPopup(`/memory-maker/moroccoSeptember?returnChapter=morocco&guest=${encodeURIComponent("Guest")}`)} className="flex min-h-14 items-center justify-center gap-3 rounded-2xl border border-[#D6B48C]/55 bg-[#140E0A]/45 px-4 py-3 text-center backdrop-blur-md transition hover:border-[#D6B48C]/75 hover:bg-[#1C140E]/55"><span className="text-xl">🖼️</span><span className="text-xs font-light uppercase tracking-[0.16em] text-[#D6B48C]">View Album</span></button>
                    </div>
                    ) : (
                    <>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <button type="button" onClick={() => openTripView("itinerary")} className="flex min-h-14 items-center justify-center gap-3 rounded-2xl border border-[#D6B48C]/55 bg-[#140E0A]/45 px-4 py-3 text-center backdrop-blur-md transition hover:border-[#D6B48C]/75 hover:bg-[#1C140E]/55 sm:col-span-2"><span className="text-xl">🗓️</span><span className="text-xs font-light uppercase tracking-[0.16em] text-[#D6B48C]">Trip Itinerary</span></button>
                      <button type="button" onClick={() => setShowMoroccoChecklist(true)} className="flex min-h-14 items-center justify-center gap-3 rounded-2xl border border-[#D6B48C]/55 bg-[#140E0A]/45 px-4 py-3 text-center backdrop-blur-md transition hover:border-[#D6B48C]/75 hover:bg-[#1C140E]/55">
                        <span className="text-xl">🎒</span>
                        <span className="text-xs font-light uppercase tracking-[0.16em] text-[#D6B48C]">Packing List</span>
                      </button>
                      <button type="button" onClick={() => openMoroccoCostTracker("morocco")} className="flex min-h-14 items-center justify-center gap-3 rounded-2xl border border-[#D6B48C]/55 bg-[#140E0A]/45 px-4 py-3 text-center backdrop-blur-md transition hover:border-[#D6B48C]/75 hover:bg-[#1C140E]/55">
                        <span className="text-xl">💰</span>
                        <span className="text-xs font-light uppercase tracking-[0.16em] text-[#D6B48C]">BillTab</span>
                      </button>
                    </div>
                    <MemoryMaker albumKey="moroccoSeptember" albumName="Morocco" accentColor={MOROCCO_BROWN} guestName={guestName} returnChapter="morocco" onViewAlbum={openAlbumPopup} compact solidButtons />
                    </>
                    )}
                    </div>
                  </section>
                </>
              ) : (
                <div className="relative min-h-0 flex-1 overflow-hidden bg-[#100D16]">
                  <div className="relative z-10 px-5 pb-5">
                    <div className="mb-3 grid grid-cols-2 gap-2">
                      <button type="button" onClick={goToMainPage} className="rounded-full border border-white/20 bg-white/[0.06] px-3 py-2 text-[10px] uppercase tracking-[0.14em] text-white/65 transition hover:border-white/35 hover:bg-white/[0.1]">Main Page</button>
                      <button type="button" onClick={() => setShowMoroccoUsefulInfo(true)} className="rounded-full border border-[#D6B48C]/35 bg-[#D6B48C]/10 px-3 py-2 text-[10px] uppercase tracking-[0.14em] text-[#D6B48C] transition hover:border-[#D6B48C]/60 hover:bg-[#D6B48C]/15">Useful Info</button>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <button type="button" onClick={() => setShowMoroccoBudget(true)} className="rounded-full border border-[#D6B48C]/35 bg-[#D6B48C]/10 px-3 py-2 text-[10px] uppercase tracking-[0.14em] text-[#D6B48C] transition hover:border-[#D6B48C]/60 hover:bg-[#D6B48C]/15">Budget</button>
                      <button type="button" onClick={() => setShowMoroccoMap(true)} className="rounded-full border border-[#D6B48C]/35 bg-[#D6B48C]/10 px-3 py-2 text-[10px] uppercase tracking-[0.14em] text-[#D6B48C] transition hover:border-[#D6B48C]/60 hover:bg-[#D6B48C]/15">Route Map</button>
                    </div>
                  </div>
                  <img src="/morocco-2026-poster.png" alt="Morocco 2026 travel poster" className="absolute inset-x-0 bottom-0 top-20 h-[calc(100%-5rem)] w-full object-cover" />
                  <div className="absolute inset-x-0 bottom-0 grid grid-cols-[2fr_1fr] gap-2 bg-gradient-to-t from-black via-black/72 to-transparent px-4 pb-4 pt-20">
                    <select
                      defaultValue=""
                      disabled={isSiteGuestAccess || siteAccessMode === "loading"}
                      onChange={(event) => {
                        const selectedGuest = event.target.value;
                        if (!selectedGuest) return;
                        openTripDashboard(selectedGuest);
                      }}
                      className="min-w-0 rounded-2xl border border-white/25 bg-black/75 px-4 py-3 text-sm font-light tracking-wide text-white outline-none backdrop-blur-md transition focus:border-[#D6B48C]/70 disabled:cursor-not-allowed disabled:border-white/10 disabled:text-white/30"
                    >
                      <option value="" disabled>{isSiteGuestAccess ? "Members only" : "Select your party"}</option>
                      {moroccoInterestedNames.map((name) => <option key={name} value={name}>{name}</option>)}
                    </select>
                    <button type="button" onClick={() => openTripDashboard("Guest")} className="rounded-2xl border border-[#D6B48C]/40 bg-black/75 px-3 py-3 text-sm font-light uppercase tracking-[0.12em] text-[#D6B48C] outline-none backdrop-blur-md transition hover:border-[#D6B48C]/70 hover:bg-[#D6B48C]/10">Guest</button>
                  </div>
                </div>
              )}
              {showMoroccoBudget && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Morocco trip budget">
                  <section className="max-h-[88vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-white/15 bg-[#111] p-6 text-left shadow-2xl sm:p-7">
                    <div className="mb-6 flex items-start justify-between gap-5 border-b border-white/10 pb-5">
                      <div>
                        <p className="mb-2 text-xs uppercase tracking-[0.24em]" style={{ color: MOROCCO_BROWN }}>Morocco 2026</p>
                        <h2 className="text-2xl font-light text-white">Trip Budget</h2>
                      </div>
                      <button type="button" onClick={() => setShowMoroccoBudget(false)} aria-label="Close Morocco budget" title="Close" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/15 text-lg text-white/65 transition hover:border-white/35 hover:text-white">×</button>
                    </div>
                    <div className="space-y-3">
                      <div className="rounded-xl border border-white/10 bg-white/[0.04] p-4">
                        <p className="text-xs uppercase tracking-[0.18em] text-white/40">Flight</p>
                        <p className="mt-2 text-sm leading-6 text-white/75">Royal Air Maroc direct round trip</p>
                        <p className="mt-2 text-sm font-medium text-white">$1,261.22 CAD</p>
                      </div>
                      <div className="rounded-xl border border-white/10 bg-white/[0.04] p-4">
                        <p className="text-xs uppercase tracking-[0.18em] text-white/40">G Adventures Tour</p>
                        <p className="mt-2 text-sm leading-6 text-white/75">Morocco: Historic Cities & Sand Dunes of the Sahara</p>
                        <p className="mt-2 text-sm font-medium text-white">$1,835 CAD</p>
                      </div>
                      <div className="rounded-xl border border-white/10 bg-white/[0.04] p-4">
                        <p className="text-xs uppercase tracking-[0.18em] text-white/40">Additional Allowance</p>
                        <p className="mt-2 text-sm leading-6 text-white/75">Some meals, guide/driver tips, airport/hotel transfers</p>
                        <p className="mt-2 text-sm font-medium text-white">$600 CAD</p>
                      </div>
                      <div className="rounded-xl border border-[#D6B48C]/35 bg-[#D6B48C]/10 p-5">
                        <p className="whitespace-nowrap text-center text-[10px] font-medium uppercase tracking-[0.08em] text-[#D6B48C] sm:text-xs sm:tracking-[0.18em]">Estimated Total = $3,700 CAD</p>
                      </div>
                    </div>
                  </section>
                </div>
              )}
              {showMoroccoUsefulInfo && (
                <div className="fixed inset-0 z-50 flex items-stretch justify-center bg-black/80 p-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-[max(0.5rem,env(safe-area-inset-top))] backdrop-blur-sm sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-label="Morocco useful information">
                  <section className="flex h-[calc(100dvh-1rem)] max-h-[calc(100dvh-1rem)] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-white/15 bg-[#111] text-left shadow-2xl sm:h-[82dvh] sm:max-h-[760px]">
                    <div className="flex shrink-0 items-start justify-between gap-4 border-b border-white/10 px-4 py-3 sm:px-7 sm:py-5">
                      <div>
                        <p className="mb-2 text-xs uppercase tracking-[0.24em]" style={{ color: MOROCCO_BROWN }}>Morocco 2026</p>
                        <h2 className="text-xl font-light text-white sm:text-2xl">Useful Information</h2>
                      </div>
                      <button type="button" onClick={() => setShowMoroccoUsefulInfo(false)} aria-label="Close Morocco useful information" title="Close" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/15 text-lg text-white/65 transition hover:border-white/35 hover:text-white">×</button>
                    </div>
                    <div className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain p-3 pb-[max(1rem,env(safe-area-inset-bottom))] sm:p-7">
                      <div className="rounded-xl border border-white/10 bg-white/[0.04] p-3 sm:p-4">
                        <p className="text-xs uppercase tracking-[0.18em] text-white/40">Power</p>
                        <img src="/poweradapter.png" alt="Power adapter suitable for Morocco" className="mt-3 max-h-28 w-full rounded-xl border border-white/10 bg-white object-contain sm:max-h-56" />
                        <p className="mt-2 text-sm leading-6 text-white/75">Morocco uses 220V / 50Hz power with Type C and Type E plugs. A European-style Type C/E adapter is recommended.</p>
                      </div>
                      <div className="rounded-xl border border-white/10 bg-white/[0.04] p-3 sm:p-4">
                        <p className="text-xs uppercase tracking-[0.18em] text-white/40">Uber</p>
                        <p className="mt-2 text-sm leading-6 text-white/75">Available in Casablanca & Marrakesh.</p>
                      </div>
                      <div className="rounded-xl border border-white/10 bg-white/[0.04] p-3 sm:p-4">
                        <p className="text-xs uppercase tracking-[0.18em] text-white/40">Tipping</p>
                        <p className="mt-2 text-sm leading-6 text-white/75">Tipping is customary for guides, drivers, hotel staff, restaurants, and small services. Keep small MAD bills handy throughout the trip.</p>
                      </div>
                      <div className="rounded-xl border border-white/10 bg-white/[0.04] p-3 sm:p-4">
                        <p className="text-xs uppercase tracking-[0.18em] text-white/40">Visa</p>
                        <p className="mt-2 text-sm leading-6 text-white/75">Canadian passport holders do not need a tourist visa for stays under 90 days.</p>
                      </div>
                      <div className="rounded-xl border border-white/10 bg-white/[0.04] p-3 sm:p-4">
                        <p className="text-xs uppercase tracking-[0.18em] text-white/40">Payment</p>
                        <p className="mt-2 text-sm leading-6 text-white/75">Credit cards are useful at hotels, larger restaurants, and bigger shops. Cash is still important for markets, taxis, tips, smaller restaurants, and rural stops.</p>
                      </div>
                      <div className="rounded-xl border border-white/10 bg-white/[0.04] p-3 sm:p-4">
                        <p className="text-xs uppercase tracking-[0.18em] text-white/40">SIM Card</p>
                        <p className="mt-2 text-sm leading-6 text-white/75">Maroc Telecom, Orange Morocco, and Inwi are the main local networks. For broad trip coverage, Maroc Telecom is a strong first choice; Orange is also tourist-friendly and widely available. Buy at the airport or an official shop and bring your passport.</p>
                      </div>
                    </div>
                  </section>
                </div>
              )}
              {showMoroccoMap && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Morocco route map">
                  <section className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-white/15 bg-[#111] shadow-2xl">
                    <div className="flex items-start justify-between gap-5 border-b border-white/10 px-5 py-4 sm:px-7">
                      <div>
                        <p className="mb-1 text-xs uppercase tracking-[0.24em]" style={{ color: MOROCCO_BROWN }}>Morocco 2026</p>
                        <h2 className="text-xl font-light text-white">Route Map</h2>
                      </div>
                      <button type="button" onClick={() => setShowMoroccoMap(false)} aria-label="Close Morocco route map" title="Close" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/15 text-lg text-white/65 transition hover:border-white/35 hover:text-white">×</button>
                    </div>
                    <div className="min-h-0 overflow-auto bg-white p-2 sm:p-4">
                      <img src="/morocco-route-map.png" alt="G Adventures Morocco route from Casablanca to Marrakech" className="mx-auto h-auto max-h-[75vh] w-auto max-w-full object-contain" />
                    </div>
                  </section>
                </div>
              )}
              {showMoroccoChecklist && guestName && (
                <div className="fixed inset-0 z-50 flex items-stretch justify-center bg-black/80 p-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-[max(0.5rem,env(safe-area-inset-top))] backdrop-blur-sm sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-label={`${guestName} Morocco packing checklist`}>
                  <section className="flex h-[calc(100dvh-1rem)] max-h-[calc(100dvh-1rem)] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-white/15 bg-[#111] text-left shadow-2xl sm:h-[88dvh] sm:max-h-[760px]">
                    <div className="flex shrink-0 items-start justify-between gap-4 border-b border-white/10 px-4 py-3 sm:px-7 sm:py-4">
                      <div>
                        <p className="mb-2 text-xs uppercase tracking-[0.24em]" style={{ color: MOROCCO_BROWN }}>Morocco 2026</p>
                        <h2 className="text-xl font-light text-white sm:text-2xl">Packing List</h2>
                        <p className="mt-1 text-xs text-white/45 sm:mt-2 sm:text-sm">{guestName}</p>
                      </div>
                      <button type="button" onClick={() => setShowMoroccoChecklist(false)} aria-label="Close Morocco checklist" title="Close" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/15 text-lg text-white/65 transition hover:border-white/35 hover:text-white">×</button>
                    </div>
                    <div className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain p-3 pb-[max(1rem,env(safe-area-inset-bottom))] sm:space-y-4 sm:p-7">
                      {getPackingChecklist(guestName).sections.filter((section) => ["Essentials", "Clothes", "Personal"].includes(section.title)).map((section) => (
                        <article key={section.title} className="rounded-xl border border-white/10 bg-white/[0.04] p-3 sm:p-4">
                          <h3 className="mb-3 text-base font-light text-white sm:mb-4 sm:text-lg">{section.title}</h3>
                          <div className="grid gap-2">
                            {section.items.map((item) => {
                              const key = `Morocco-${guestName}-${section.title}-${item}`;
                              const checked = Boolean(checkedPackingItems[key]);
                              return (
                                <button key={key} type="button" onClick={() => togglePackingItem(key, checked)} className={`flex items-center gap-3 rounded-xl border px-3 py-2 text-left text-sm transition sm:py-2.5 ${checked ? "border-[#D6B48C]/55 bg-[#D6B48C]/10 text-white" : "border-white/10 bg-black/20 text-white/70 hover:border-white/25"}`}>
                                  <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-xs ${checked ? "border-[#D6B48C] bg-[#D6B48C] text-black" : "border-white/25 text-transparent"}`}>✓</span>
                                  <span className={checked ? "line-through decoration-[#D6B48C]/70" : ""}>{item}</span>
                                </button>
                              );
                            })}
                          </div>
                        </article>
                      ))}
                    </div>
                  </section>
                </div>
              )}
            </>
          ) : selectedTrip === "vietnam" ? (
            <>
              {guestName ? (
                <section className="relative flex min-h-0 flex-1 flex-col overflow-hidden bg-black px-5 pb-5 text-left">
                  <img src="/vietnam-dashboard-hero.webp" alt="" aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 top-20 h-[calc(100%-5rem)] w-full object-cover object-[center_38%]" />
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/46 via-black/52 to-black/78" />
                  <div className="relative z-10 mb-5 grid grid-cols-2 gap-2">
                    <button type="button" onClick={() => { setGuestName(""); setShowGuestActions(false); setBrowserRoute(buildTripUrl("vietnam")); }} className="rounded-full border border-white/30 bg-black/70 px-3 py-2 text-[10px] uppercase tracking-[0.14em] text-white/80 backdrop-blur-md transition hover:border-white/45 hover:bg-black/85">Back</button>
                    <button type="button" onClick={goToMainPage} className="rounded-full border border-white/30 bg-black/70 px-3 py-2 text-[10px] uppercase tracking-[0.14em] text-white/80 backdrop-blur-md transition hover:border-white/45 hover:bg-black/85">Main Page</button>
                  </div>
                  <div className="relative z-10 flex min-h-0 flex-1 flex-col justify-center space-y-5 overflow-y-auto">
                    <div>
                      <p className="text-xs uppercase tracking-[0.28em]" style={{ color: VIETNAM_GOLD }}>Vietnam 2026</p>
                      <h2 className="mt-2 text-3xl font-light tracking-wide text-white">Hello {guestName}</h2>
                      <p className="mt-2 text-sm text-white/45">Nov 12 - Nov 21 2026</p>
                    </div>
                    {guestName === "Guest" ? (
                      <div className="grid gap-3 sm:grid-cols-2">
                        <button type="button" onClick={() => openTripView("itinerary")} className="flex min-h-14 items-center justify-center gap-3 rounded-2xl border border-[#F6C65B]/55 bg-[#100D08]/45 px-4 py-3 text-center backdrop-blur-md transition hover:border-[#F6C65B]/75 hover:bg-[#19140B]/55"><span className="text-xl">🗓️</span><span className="text-xs font-light uppercase tracking-[0.16em] text-[#F6C65B]">Trip Itinerary</span></button>
                        <button type="button" onClick={() => openAlbumPopup(`/memory-maker/vietnamNovember?returnChapter=vietnam&guest=${encodeURIComponent("Guest")}`)} className="flex min-h-14 items-center justify-center gap-3 rounded-2xl border border-[#F6C65B]/55 bg-[#100D08]/45 px-4 py-3 text-center backdrop-blur-md transition hover:border-[#F6C65B]/75 hover:bg-[#19140B]/55"><span className="text-xl">🖼️</span><span className="text-xs font-light uppercase tracking-[0.16em] text-[#F6C65B]">View Album</span></button>
                      </div>
                    ) : (
                      <>
                        <div className="grid gap-3 sm:grid-cols-2">
                          <button type="button" onClick={() => openTripView("itinerary")} className="flex min-h-14 items-center justify-center gap-3 rounded-2xl border border-[#F6C65B]/55 bg-[#100D08]/45 px-4 py-3 text-center backdrop-blur-md transition hover:border-[#F6C65B]/75 hover:bg-[#19140B]/55 sm:col-span-2"><span className="text-xl">🗓️</span><span className="text-xs font-light uppercase tracking-[0.16em] text-[#F6C65B]">Trip Itinerary</span></button>
                          <button type="button" onClick={() => setShowMoroccoChecklist(true)} className="flex min-h-14 items-center justify-center gap-3 rounded-2xl border border-[#F6C65B]/55 bg-[#100D08]/45 px-4 py-3 text-center backdrop-blur-md transition hover:border-[#F6C65B]/75 hover:bg-[#19140B]/55"><span className="text-xl">🎒</span><span className="text-xs font-light uppercase tracking-[0.16em] text-[#F6C65B]">Packing List</span></button>
                          <button type="button" onClick={() => setShowMoroccoBudget(true)} className="flex min-h-14 items-center justify-center gap-3 rounded-2xl border border-[#F6C65B]/55 bg-[#100D08]/45 px-4 py-3 text-center backdrop-blur-md transition hover:border-[#F6C65B]/75 hover:bg-[#19140B]/55"><span className="text-xl">🧾</span><span className="text-xs font-light uppercase tracking-[0.16em] text-[#F6C65B]">Budget</span></button>
                          <button type="button" disabled className="flex min-h-14 cursor-not-allowed items-center justify-center gap-3 rounded-2xl border border-[#F6C65B]/45 bg-[#100D08]/35 px-4 py-3 text-center backdrop-blur-md opacity-45"><span className="text-xl">☀️</span><span className="text-xs font-light uppercase tracking-[0.16em] text-[#F6C65B]">What's Today?</span></button>
                          <button type="button" onClick={() => openMoroccoCostTracker("vietnam")} className="flex min-h-14 items-center justify-center gap-3 rounded-2xl border border-[#F6C65B]/55 bg-[#100D08]/45 px-4 py-3 text-center backdrop-blur-md transition hover:border-[#F6C65B]/75 hover:bg-[#19140B]/55"><span className="text-xl">💰</span><span className="text-xs font-light uppercase tracking-[0.16em] text-[#F6C65B]">BillTab</span></button>
                        </div>
                        <MemoryMaker albumKey="vietnamNovember" albumName="Vietnam" accentColor={VIETNAM_GOLD} guestName={guestName} returnChapter="vietnam" onViewAlbum={openAlbumPopup} compact solidButtons />
                      </>
                    )}
                  </div>
                </section>
              ) : (
                <>
                  <div className="relative z-10 grid shrink-0 grid-cols-2 gap-2 px-5 pb-3">
                    <button type="button" onClick={goToMainPage} className="rounded-full border border-white/20 bg-white/[0.06] px-3 py-2 text-[10px] uppercase tracking-[0.14em] text-white/65 transition hover:border-white/35 hover:bg-white/[0.1]">Main Page</button>
                    <button type="button" onClick={() => setShowMoroccoUsefulInfo(true)} className="rounded-full border border-[#F6C65B]/35 bg-[#F6C65B]/10 px-3 py-2 text-[10px] uppercase tracking-[0.14em] text-[#F6C65B] transition hover:border-[#F6C65B]/60 hover:bg-[#F6C65B]/15">Useful Info</button>
                    <button type="button" onClick={() => setShowVietnamFlightSummary(true)} className="rounded-full border border-[#F6C65B]/35 bg-[#F6C65B]/10 px-3 py-2 text-[10px] uppercase tracking-[0.14em] text-[#F6C65B] transition hover:border-[#F6C65B]/60 hover:bg-[#F6C65B]/15">Flight Summary</button>
                    <button type="button" onClick={() => setShowVietnamRouteMap(true)} className="rounded-full border border-[#F6C65B]/35 bg-[#F6C65B]/10 px-3 py-2 text-[10px] uppercase tracking-[0.14em] text-[#F6C65B] transition hover:border-[#F6C65B]/60 hover:bg-[#F6C65B]/15">Route Map</button>
                  </div>
                  <div className="relative min-h-0 flex-1 overflow-hidden bg-black">
                    <img src="/vietnam-2026-poster.png" alt="Vietnam 2026 travel poster" className="absolute inset-0 h-full w-full object-cover object-[center_38%]" />
                    <div className="absolute inset-x-0 bottom-0 grid grid-cols-[2fr_1fr] gap-2 bg-gradient-to-t from-black via-black/75 to-transparent px-4 pb-4 pt-24">
                      <select
                        defaultValue=""
                        disabled={isSiteGuestAccess || siteAccessMode === "loading"}
                        onChange={(event) => {
                          const selectedGuest = event.target.value;
                          if (!selectedGuest) return;
                          openTripDashboard(selectedGuest);
                        }}
                        className="min-w-0 rounded-2xl border border-white/25 bg-black/75 px-4 py-3 text-sm font-light tracking-wide text-white outline-none backdrop-blur-md transition focus:border-[#F6C65B]/70 disabled:cursor-not-allowed disabled:border-white/10 disabled:text-white/30"
                      >
                        <option value="" disabled>{isSiteGuestAccess ? "Members only" : "Select your party"}</option>
                        {vietnamConfirmedParties.map((name) => <option key={name} value={name}>{name}</option>)}
                      </select>
                      <button type="button" onClick={() => openTripDashboard("Guest")} className="rounded-2xl border border-[#F6C65B]/40 bg-black/75 px-3 py-3 text-sm font-light uppercase tracking-[0.12em] text-[#F6C65B] outline-none backdrop-blur-md transition hover:border-[#F6C65B]/70 hover:bg-[#F6C65B]/10">Guest</button>
                    </div>
                  </div>
                </>
              )}
              {showGuestActions && guestName !== "Guest" && showMoroccoBudget && (
                <div className="fixed inset-0 z-50 flex items-stretch justify-center bg-black/80 p-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-[max(0.5rem,env(safe-area-inset-top))] backdrop-blur-sm sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-label="Vietnam trip budget">
                  <section className="flex h-[calc(100dvh-1rem)] max-h-[calc(100dvh-1rem)] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-white/15 bg-[#111] text-left shadow-2xl sm:h-[82dvh] sm:max-h-[760px]">
                    <div className="flex shrink-0 items-start justify-between gap-4 border-b border-white/10 px-4 py-3 sm:px-6 sm:py-5">
                      <div>
                        <p className="mb-2 text-xs uppercase tracking-[0.24em]" style={{ color: VIETNAM_GOLD }}>Vietnam 2026</p>
                        <h2 className="text-xl font-light text-white sm:text-2xl">Trip Budget</h2>
                        <p className="mt-1 text-xs text-white/45">{guestName}</p>
                      </div>
                      <button type="button" onClick={() => setShowMoroccoBudget(false)} aria-label="Close Vietnam budget" title="Close" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/15 text-lg text-white/65 transition hover:border-white/35 hover:text-white">×</button>
                    </div>
                    <div className="min-h-0 flex-1 space-y-3 overflow-y-scroll overscroll-contain p-3 pb-[max(1rem,env(safe-area-inset-bottom))] sm:p-6">
                      <div className="rounded-xl border border-[#F6C65B]/30 bg-[#F6C65B]/10 p-4 text-sm text-[#F6C65B]">
                        Known party total = ${vietnamDashboardBudgetTotal.toLocaleString("en-CA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} CAD
                      </div>
                      {vietnamDashboardBudgetCosts.map((cost) => (
                        <article key={cost.category} className="rounded-xl border border-white/10 bg-white/[0.04] p-3 sm:p-4">
                          <h3 className="text-base font-light text-white">{cost.category}</h3>
                          {Array.isArray(cost.detail) ? (
                            <ul className="mt-2 space-y-1.5 text-sm leading-6 text-white/60">
                              {cost.detail.map((detail) => (
                                <li key={detail} className="flex gap-2">
                                  <span className="shrink-0 text-[#F6C65B]">•</span>
                                  <span>{detail}</span>
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <p className="mt-2 text-sm leading-6 text-white/60">{cost.detail}</p>
                          )}
                          <div className="mt-4 border-t border-white/10 pt-3 text-right text-sm text-[#F6C65B]">
                            Category total: {cost.amountCad === null ? "TBD" : `$${cost.amountCad.toLocaleString("en-CA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} CAD`}
                          </div>
                        </article>
                      ))}
                    </div>
                  </section>
                </div>
              )}
              {showVietnamRouteMap && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3 backdrop-blur-sm sm:p-4" role="dialog" aria-modal="true" aria-label="Vietnam route map">
                  <section className="flex max-h-[92dvh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-white/15 bg-[#111] shadow-2xl">
                    <div className="flex shrink-0 items-start justify-between gap-4 border-b border-white/10 px-4 py-3 sm:px-6 sm:py-4">
                      <div>
                        <p className="mb-1 text-xs uppercase tracking-[0.24em]" style={{ color: VIETNAM_GOLD }}>Vietnam 2026</p>
                        <h2 className="text-xl font-light text-white sm:text-2xl">Route Map</h2>
                      </div>
                      <button type="button" onClick={() => setShowVietnamRouteMap(false)} aria-label="Close Vietnam route map" title="Close" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/15 text-lg text-white/65 transition hover:border-white/35 hover:text-white">×</button>
                    </div>
                    <div className="min-h-0 flex-1 overflow-auto bg-white p-2 sm:p-4">
                      <img src="/nsviet.png" alt="Vietnam north and south trip route map" className="mx-auto h-auto max-h-[78dvh] w-auto max-w-full object-contain" />
                    </div>
                  </section>
                </div>
              )}
              {showVietnamFlightSummary && (
                <div className="fixed inset-0 z-50 flex items-stretch justify-center bg-black/80 p-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-[max(0.5rem,env(safe-area-inset-top))] backdrop-blur-sm sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-label="Vietnam flight summary">
                  <section className="flex h-[calc(100dvh-1rem)] max-h-[calc(100dvh-1rem)] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-white/15 bg-[#111] text-left shadow-2xl sm:h-auto sm:max-h-[82dvh]">
                    <div className="flex shrink-0 items-start justify-between gap-4 border-b border-white/10 px-4 py-3 sm:px-6 sm:py-5">
                      <div>
                        <p className="mb-2 text-xs uppercase tracking-[0.24em]" style={{ color: VIETNAM_GOLD }}>Vietnam 2026</p>
                        <h2 className="text-xl font-light text-white sm:text-2xl">Flight Summary</h2>
                      </div>
                      <button type="button" onClick={() => setShowVietnamFlightSummary(false)} aria-label="Close Vietnam flight summary" title="Close" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/15 text-lg text-white/65 transition hover:border-white/35 hover:text-white">×</button>
                    </div>
                    <div className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain p-3 pb-[max(1rem,env(safe-area-inset-bottom))] sm:p-6">
                      {vietnamFlightSummary.map((flight) => (
                        <article key={`${flight.date}-${flight.route}`} className="rounded-xl border border-white/10 bg-white/[0.04] p-4">
                          <p className="text-xs uppercase tracking-[0.18em] text-white/40">{flight.date}</p>
                          <h3 className="mt-2 text-lg font-light text-white">{flight.route}</h3>
                          <div className="mt-3 grid gap-2 text-sm leading-6 text-white/65">
                            <p><span className="text-white/35">Airline:</span> {flight.airline}</p>
                            <p><span className="text-white/35">Time:</span> {flight.time}</p>
                            <p><span className="text-white/35">Notes:</span> {flight.notes}</p>
                          </div>
                        </article>
                      ))}
                    </div>
                  </section>
                </div>
              )}
              {showMoroccoUsefulInfo && (
                <ViewportPortal>
                <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden bg-black/80 p-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-[max(0.5rem,env(safe-area-inset-top))] backdrop-blur-sm sm:p-4" role="dialog" aria-modal="true" aria-label="Vietnam useful information">
                  <section className="flex h-[calc(100dvh-1rem)] max-h-[760px] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-white/15 bg-[#111] text-left shadow-2xl sm:h-[min(760px,calc(100dvh-2rem))]">
                    <div className="sticky top-0 z-10 flex shrink-0 items-start justify-between gap-4 border-b border-white/10 bg-[#111] px-4 py-3 sm:px-7 sm:py-5">
                      <div>
                        <p className="mb-2 text-xs uppercase tracking-[0.24em]" style={{ color: VIETNAM_GOLD }}>Vietnam 2026</p>
                        <h2 className="text-xl font-light text-white sm:text-2xl">Useful Information</h2>
                      </div>
                      <button type="button" onClick={() => setShowMoroccoUsefulInfo(false)} aria-label="Close Vietnam useful information" title="Close" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/15 text-lg text-white/65 transition hover:border-white/35 hover:text-white">×</button>
                    </div>
                    <div className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain p-3 pb-[max(1rem,env(safe-area-inset-bottom))] sm:p-7">
                      {[
                        ["Power", "Vietnam commonly uses 220V power with Type A, C, and F plugs."],
                        ["Transportation", "Uber is not available in Vietnam. The equivalent ride-share app is Grab, which is fully operational across major cities."],
                        ["Tourist Visa", "Canadian passport holders require a tourist visa and may apply online for a single- or multiple-entry e-visa valid for up to 90 days. The passport should be valid for at least 6 months beyond the planned departure from Vietnam."],
                        ["Payment", "Cards are useful in larger hotels and restaurants. Cash is still important for markets, smaller shops, taxis, and local food."],
                        ["Local Currency", `Vietnamese dong (VND). Approximate live rates: 1 CAD ≈ ${cadToVnd} VND and 1 USD ≈ ${usdToVnd} VND. For the best exchange rates, use a major bank or authorized currency exchange counter in Hanoi or Ho Chi Minh City. Bank ATMs are a convenient alternative. Exchange only a small arrival amount at the airport, where rates are usually less favourable.`],
                        ["SIM / eSIM", "Local SIM and eSIM options are widely available for Hanoi and central Vietnam."],
                      ].map(([title, text]) => (
                        <div key={title} className="rounded-xl border border-white/10 bg-white/[0.04] p-3 sm:p-4">
                          <p className="text-xs uppercase tracking-[0.18em] text-white/40">{title}</p>
                          <p className="mt-2 text-sm leading-6 text-white/75">{text}</p>
                        </div>
                      ))}
                    </div>
                  </section>
                </div>
                </ViewportPortal>
              )}
              {showMoroccoMap && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Vietnam route map">
                  <section className="flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-white/15 bg-[#111] shadow-2xl">
                    <div className="flex items-start justify-between gap-5 border-b border-white/10 px-5 py-4 sm:px-7">
                      <div>
                        <p className="mb-1 text-xs uppercase tracking-[0.24em]" style={{ color: VIETNAM_GOLD }}>Vietnam 2026</p>
                        <h2 className="text-xl font-light text-white">Map View</h2>
                      </div>
                      <button type="button" onClick={() => setShowMoroccoMap(false)} aria-label="Close Vietnam map" title="Close" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/15 text-lg text-white/65 transition hover:border-white/35 hover:text-white">×</button>
                    </div>
                    <div className="min-h-0 space-y-3 overflow-y-auto p-5 sm:p-7">
                      {["Hanoi", "Ha Long Bay", "Da Nang", "Hoi An"].map((place, index) => (
                        <div key={place} className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3">
                          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[#F6C65B]/40 text-xs text-[#F6C65B]">{index + 1}</span>
                          <span className="text-sm text-white/75">{place}</span>
                        </div>
                      ))}
                    </div>
                  </section>
                </div>
              )}
              {showMoroccoChecklist && guestName && guestName !== "Guest" && (
                <div className="fixed inset-0 z-50 flex items-stretch justify-center bg-black/80 p-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-[max(0.5rem,env(safe-area-inset-top))] backdrop-blur-sm sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-label={`${guestName} Vietnam packing checklist`}>
                  <section className="flex h-[calc(100dvh-1rem)] max-h-[calc(100dvh-1rem)] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-white/15 bg-[#111] text-left shadow-2xl sm:h-[88dvh] sm:max-h-[760px]">
                    <div className="flex shrink-0 items-start justify-between gap-4 border-b border-white/10 px-4 py-3 sm:px-7 sm:py-5">
                      <div>
                        <p className="mb-2 text-xs uppercase tracking-[0.24em]" style={{ color: VIETNAM_GOLD }}>Vietnam 2026</p>
                        <h2 className="text-xl font-light text-white sm:text-2xl">Packing List</h2>
                        <p className="mt-1 text-xs text-white/45 sm:mt-2 sm:text-sm">{guestName}</p>
                      </div>
                      <button type="button" onClick={() => setShowMoroccoChecklist(false)} aria-label="Close Vietnam checklist" title="Close" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/15 text-lg text-white/65 transition hover:border-white/35 hover:text-white">×</button>
                    </div>
                    <div className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain p-3 pb-[max(1rem,env(safe-area-inset-bottom))] sm:space-y-4 sm:p-7">
                      {getPackingChecklist(guestName).sections.filter((section) => ["Essentials", "Clothes", "Personal"].includes(section.title)).map((section) => (
                        <article key={section.title} className="rounded-xl border border-white/10 bg-white/[0.04] p-3 sm:p-4">
                          <h3 className="mb-3 text-base font-light text-white sm:mb-4 sm:text-lg">{section.title}</h3>
                          <div className="grid gap-2">
                            {section.items.map((item) => {
                              const key = `Vietnam-${guestName}-${section.title}-${item}`;
                              const checked = Boolean(checkedPackingItems[key]);
                              return (
                                <button key={key} type="button" onClick={() => togglePackingItem(key, checked)} className={`flex items-center gap-3 rounded-xl border px-3 py-2 text-left text-sm transition sm:py-2.5 ${checked ? "border-[#F6C65B]/55 bg-[#F6C65B]/10 text-white" : "border-white/10 bg-black/20 text-white/70 hover:border-white/25"}`}>
                                  <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-xs ${checked ? "border-[#F6C65B] bg-[#F6C65B] text-black" : "border-white/25 text-transparent"}`}>✓</span>
                                  <span className={checked ? "line-through decoration-[#F6C65B]/70" : ""}>{item}</span>
                                </button>
                              );
                            })}
                          </div>
                        </article>
                      ))}
                    </div>
                  </section>
                </div>
              )}
            </>
          ) : selectedTrip === "skiMyoko" ? (
            <>
              <div className="mb-5 grid grid-cols-2 gap-2">
                <button type="button" onClick={goToSkiTrips} className="rounded-full border border-white/15 bg-white/[0.03] px-4 py-2 text-xs uppercase tracking-[0.18em] text-white/45">Back</button>
                <button type="button" onClick={goToMainPage} className="rounded-full border border-white/15 bg-white/[0.03] px-4 py-2 text-xs uppercase tracking-[0.18em] text-white/45">Main Page</button>
              </div>
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
              <div className="mb-5 grid grid-cols-2 gap-2">
                <button type="button" onClick={goToSkiTrips} className="rounded-full border border-white/15 bg-white/[0.03] px-4 py-2 text-xs uppercase tracking-[0.18em] text-white/45">Back</button>
                <button type="button" onClick={goToMainPage} className="rounded-full border border-white/15 bg-white/[0.03] px-4 py-2 text-xs uppercase tracking-[0.18em] text-white/45">Main Page</button>
              </div>
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
              <div className="mb-5 grid grid-cols-2 gap-2">
                <button type="button" onClick={goToSkiTrips} className="rounded-full border border-white/15 bg-white/[0.03] px-4 py-2 text-xs uppercase tracking-[0.18em] text-white/45">Back</button>
                <button type="button" onClick={goToMainPage} className="rounded-full border border-white/15 bg-white/[0.03] px-4 py-2 text-xs uppercase tracking-[0.18em] text-white/45">Main Page</button>
              </div>
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
              <div className="mb-5 grid grid-cols-2 gap-2">
                <button type="button" onClick={goToFutureTrips} className="rounded-full border border-white/15 bg-white/[0.03] px-4 py-2 text-xs uppercase tracking-[0.18em] text-white/45">Back</button>
                <button type="button" onClick={goToMainPage} className="rounded-full border border-white/15 bg-white/[0.03] px-4 py-2 text-xs uppercase tracking-[0.18em] text-white/45">Main Page</button>
              </div>
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
              <div className="mb-5 grid grid-cols-2 gap-2">
                <button type="button" onClick={goToFutureTrips} className="rounded-full border border-white/15 bg-white/[0.03] px-4 py-2 text-xs uppercase tracking-[0.18em] text-white/45">Back</button>
                <button type="button" onClick={goToMainPage} className="rounded-full border border-white/15 bg-white/[0.03] px-4 py-2 text-xs uppercase tracking-[0.18em] text-white/45">Main Page</button>
              </div>
              <TripPanelTitle location="Azores Portugal" date="Sept 2027" duration="9 days" description="An island nature trip with volcanic landscapes, ocean views, hot springs, and unhurried Atlantic days." />
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
              <div className="mb-5 grid grid-cols-2 gap-2">
                <button type="button" onClick={goToFutureTrips} className="rounded-full border border-white/15 bg-white/[0.03] px-4 py-2 text-xs uppercase tracking-[0.18em] text-white/45">Back</button>
                <button type="button" onClick={goToMainPage} className="rounded-full border border-white/15 bg-white/[0.03] px-4 py-2 text-xs uppercase tracking-[0.18em] text-white/45">Main Page</button>
              </div>
              <TripPanelTitle location="Similan & Phuket Thailand" subtitle="Scuba Diving Liveaboard" date="Mar 2028" duration="9 days" description="A warm-water dive adventure centered on liveaboard days, reefs, beaches, and Phuket time before or after the boat." />
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
          ) : selectedTrip === "centralVietnam" ? (
            <>
              <div className="mb-5 grid grid-cols-2 gap-2">
                <button type="button" onClick={goToFutureTrips} className="rounded-full border border-white/15 bg-white/[0.03] px-4 py-2 text-xs uppercase tracking-[0.18em] text-white/45">Back</button>
                <button type="button" onClick={goToMainPage} className="rounded-full border border-white/15 bg-white/[0.03] px-4 py-2 text-xs uppercase tracking-[0.18em] text-white/45">Main Page</button>
              </div>
              <TripPanelTitle location="Central Vietnam" date="Mar 2028" duration="6 days" description="A 6-day family-oriented Central Vietnam trip centered on Da Nang, Ba Na Hills, Marble Mountains, My Khe Beach, Hoi An Ancient City, Coconut Forest basket boats, and VinWonders Hoi An, with a stay idea around Vinpearl Resort & Golf Nam Hoi An." />
              <div className="space-y-3">
                <button type="button" disabled className="w-full cursor-not-allowed rounded-2xl border border-white/10 bg-white/[0.02] px-4 py-4 text-sm font-light uppercase tracking-[0.18em] text-white/25 opacity-60">Itinerary</button>
                <button type="button" onClick={() => setShowCentralVietnamNameInput(true)} className="w-full rounded-2xl border border-[#FF8FC7]/35 bg-[#FF8FC7]/10 px-4 py-4 text-sm font-light uppercase tracking-[0.18em] text-[#FF8FC7] transition hover:border-[#FF8FC7]/60 hover:bg-[#FF8FC7]/15">I am interested</button>
              </div>

              {showCentralVietnamNameInput && (
                <form onSubmit={(event) => { event.preventDefault(); addCentralVietnamInterestedName(); }} className="mt-5 rounded-3xl border border-white/10 bg-white/[0.03] p-4 text-left">
                  <label className="mb-2 block text-xs uppercase tracking-[0.22em] text-white/45" htmlFor="central-vietnam-interest-name">Name</label>
                  <input id="central-vietnam-interest-name" value={centralVietnamNameInput} onChange={(event) => setCentralVietnamNameInput(event.target.value)} autoFocus className="mb-3 w-full rounded-2xl border border-white/15 bg-black/30 px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/25 focus:border-white/40" placeholder="Enter your name" />
                  <button type="submit" className="w-full rounded-2xl border border-[#72E49A]/35 bg-[#72E49A]/10 px-4 py-3 text-sm uppercase tracking-[0.18em] text-[#72E49A] transition hover:bg-[#72E49A]/15">Add to list</button>
                </form>
              )}

              <section className="mt-6 rounded-3xl border border-white/10 bg-black/20 p-5 text-left">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <h2 className="text-sm uppercase tracking-[0.24em] text-white/55">Who signed up</h2>
                  <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-white/45">{centralVietnamInterestedNames.length}</span>
                </div>
                {centralVietnamInterestedNames.length ? (
                  <div className="space-y-2">
                    {centralVietnamInterestedNames.map((name) => (
                      <p key={name} className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white/75">{name}</p>
                    ))}
                  </div>
                ) : (
                  <p className="rounded-2xl border border-white/10 bg-white/[0.02] px-4 py-4 text-sm text-white/35">No names added yet.</p>
                )}
              </section>
            </>
          ) : selectedTrip === "mexicoPlaya" ? (
            <>
              <div className="mb-5 grid grid-cols-2 gap-2">
                <button type="button" onClick={goToFutureTrips} className="rounded-full border border-white/15 bg-white/[0.03] px-4 py-2 text-xs uppercase tracking-[0.18em] text-white/45">Back</button>
                <button type="button" onClick={goToMainPage} className="rounded-full border border-white/15 bg-white/[0.03] px-4 py-2 text-xs uppercase tracking-[0.18em] text-white/45">Main Page</button>
              </div>
              <TripPanelTitle location="Mexico" subtitle="Playa del Carmen" date="Nov 2027" duration="9 days" description="A Caribbean coast trip idea with beach time, cenotes, easy food days, and room for nearby day trips around Playa del Carmen." />
              <div className="space-y-3">
                <button type="button" disabled className="w-full cursor-not-allowed rounded-2xl border border-white/10 bg-white/[0.02] px-4 py-4 text-sm font-light uppercase tracking-[0.18em] text-white/25 opacity-60">Itinerary</button>
                <button type="button" onClick={() => setShowMexicoPlayaNameInput(true)} className="w-full rounded-2xl border border-[#FF8FC7]/35 bg-[#FF8FC7]/10 px-4 py-4 text-sm font-light uppercase tracking-[0.18em] text-[#FF8FC7] transition hover:border-[#FF8FC7]/60 hover:bg-[#FF8FC7]/15">I am interested</button>
              </div>

              {showMexicoPlayaNameInput && (
                <form onSubmit={(event) => { event.preventDefault(); addMexicoPlayaInterestedName(); }} className="mt-5 rounded-3xl border border-white/10 bg-white/[0.03] p-4 text-left">
                  <label className="mb-2 block text-xs uppercase tracking-[0.22em] text-white/45" htmlFor="mexico-playa-interest-name">Name</label>
                  <input id="mexico-playa-interest-name" value={mexicoPlayaNameInput} onChange={(event) => setMexicoPlayaNameInput(event.target.value)} autoFocus className="mb-3 w-full rounded-2xl border border-white/15 bg-black/30 px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/25 focus:border-white/40" placeholder="Enter your name" />
                  <button type="submit" className="w-full rounded-2xl border border-[#72E49A]/35 bg-[#72E49A]/10 px-4 py-3 text-sm uppercase tracking-[0.18em] text-[#72E49A] transition hover:bg-[#72E49A]/15">Add to list</button>
                </form>
              )}

              <section className="mt-6 rounded-3xl border border-white/10 bg-black/20 p-5 text-left">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <h2 className="text-sm uppercase tracking-[0.24em] text-white/55">Who signed up</h2>
                  <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-white/45">{mexicoPlayaInterestedNames.length}</span>
                </div>
                {mexicoPlayaInterestedNames.length ? (
                  <div className="space-y-2">
                    {mexicoPlayaInterestedNames.map((name) => (
                      <p key={name} className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white/75">{name}</p>
                    ))}
                  </div>
                ) : (
                  <p className="rounded-2xl border border-white/10 bg-white/[0.02] px-4 py-4 text-sm text-white/35">No names added yet.</p>
                )}
              </section>
            </>
          ) : selectedTrip === "taiwanApril" ? (
            <>
              <div className="mb-5 grid grid-cols-2 gap-2">
                <button type="button" onClick={goToFutureTrips} className="rounded-full border border-white/15 bg-white/[0.03] px-4 py-2 text-xs uppercase tracking-[0.18em] text-white/45">Back</button>
                <button type="button" onClick={goToMainPage} className="rounded-full border border-white/15 bg-white/[0.03] px-4 py-2 text-xs uppercase tracking-[0.18em] text-white/45">Main Page</button>
              </div>
              <TripPanelTitle location="Taiwan" date="April 2028" duration="14 days" description="A spring Taiwan trip idea with family time, food, markets, day trips, and gentle island exploring." />
              <div className="space-y-3">
                <button type="button" disabled className="w-full cursor-not-allowed rounded-2xl border border-white/10 bg-white/[0.02] px-4 py-4 text-sm font-light uppercase tracking-[0.18em] text-white/25 opacity-60">Itinerary</button>
                <button type="button" onClick={() => setShowTaiwanAprilNameInput(true)} className="w-full rounded-2xl border border-[#FF8FC7]/35 bg-[#FF8FC7]/10 px-4 py-4 text-sm font-light uppercase tracking-[0.18em] text-[#FF8FC7] transition hover:border-[#FF8FC7]/60 hover:bg-[#FF8FC7]/15">I am interested</button>
              </div>

              {showTaiwanAprilNameInput && (
                <form onSubmit={(event) => { event.preventDefault(); addTaiwanAprilInterestedName(); }} className="mt-5 rounded-3xl border border-white/10 bg-white/[0.03] p-4 text-left">
                  <label className="mb-2 block text-xs uppercase tracking-[0.22em] text-white/45" htmlFor="taiwan-april-interest-name">Name</label>
                  <input id="taiwan-april-interest-name" value={taiwanAprilNameInput} onChange={(event) => setTaiwanAprilNameInput(event.target.value)} autoFocus className="mb-3 w-full rounded-2xl border border-white/15 bg-black/30 px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/25 focus:border-white/40" placeholder="Enter your name" />
                  <button type="submit" className="w-full rounded-2xl border border-[#72E49A]/35 bg-[#72E49A]/10 px-4 py-3 text-sm uppercase tracking-[0.18em] text-[#72E49A] transition hover:bg-[#72E49A]/15">Add to list</button>
                </form>
              )}

              <section className="mt-6 rounded-3xl border border-white/10 bg-black/20 p-5 text-left">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <h2 className="text-sm uppercase tracking-[0.24em] text-white/55">Who signed up</h2>
                  <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-white/45">{taiwanAprilInterestedNames.length}</span>
                </div>
                {taiwanAprilInterestedNames.length ? (
                  <div className="space-y-2">
                    {taiwanAprilInterestedNames.map((name) => (
                      <p key={name} className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white/75">{name}</p>
                    ))}
                  </div>
                ) : (
                  <p className="rounded-2xl border border-white/10 bg-white/[0.02] px-4 py-4 text-sm text-white/35">No names added yet.</p>
                )}
              </section>
            </>
          ) : selectedTrip === "hawaii" ? (
            <>
              <div className="mb-5 grid grid-cols-2 gap-2">
                <button type="button" onClick={goToFutureTrips} className="rounded-full border border-white/15 bg-white/[0.03] px-4 py-2 text-xs uppercase tracking-[0.18em] text-white/45">Back</button>
                <button type="button" onClick={goToMainPage} className="rounded-full border border-white/15 bg-white/[0.03] px-4 py-2 text-xs uppercase tracking-[0.18em] text-white/45">Main Page</button>
              </div>
              <TripPanelTitle location="Hawaii" subtitle="Maui & Big Island" date="May 2028" duration="9 days" description="A two-island Hawaii idea with beaches, volcano landscapes, scenic drives, and relaxed family-friendly days." />
              <div className="space-y-3">
                <button type="button" disabled className="w-full cursor-not-allowed rounded-2xl border border-white/10 bg-white/[0.02] px-4 py-4 text-sm font-light uppercase tracking-[0.18em] text-white/25 opacity-60">Itinerary</button>
                <button type="button" onClick={() => setShowHawaiiNameInput(true)} className="w-full rounded-2xl border border-[#FF8FC7]/35 bg-[#FF8FC7]/10 px-4 py-4 text-sm font-light uppercase tracking-[0.18em] text-[#FF8FC7] transition hover:border-[#FF8FC7]/60 hover:bg-[#FF8FC7]/15">I am interested</button>
              </div>

              {showHawaiiNameInput && (
                <form onSubmit={(event) => { event.preventDefault(); addHawaiiInterestedName(); }} className="mt-5 rounded-3xl border border-white/10 bg-white/[0.03] p-4 text-left">
                  <label className="mb-2 block text-xs uppercase tracking-[0.22em] text-white/45" htmlFor="hawaii-interest-name">Name</label>
                  <input id="hawaii-interest-name" value={hawaiiNameInput} onChange={(event) => setHawaiiNameInput(event.target.value)} autoFocus className="mb-3 w-full rounded-2xl border border-white/15 bg-black/30 px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/25 focus:border-white/40" placeholder="Enter your name" />
                  <button type="submit" className="w-full rounded-2xl border border-[#72E49A]/35 bg-[#72E49A]/10 px-4 py-3 text-sm uppercase tracking-[0.18em] text-[#72E49A] transition hover:bg-[#72E49A]/15">Add to list</button>
                </form>
              )}

              <section className="mt-6 rounded-3xl border border-white/10 bg-black/20 p-5 text-left">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <h2 className="text-sm uppercase tracking-[0.24em] text-white/55">Who signed up</h2>
                  <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-white/45">{hawaiiInterestedNames.length}</span>
                </div>
                {hawaiiInterestedNames.length ? (
                  <div className="space-y-2">
                    {hawaiiInterestedNames.map((name) => (
                      <p key={name} className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white/75">{name}</p>
                    ))}
                  </div>
                ) : (
                  <p className="rounded-2xl border border-white/10 bg-white/[0.02] px-4 py-4 text-sm text-white/35">No names added yet.</p>
                )}
              </section>
            </>
          ) : selectedTrip === "alaskaCruise" ? (
            <>
              <div className="mb-5 grid grid-cols-2 gap-2">
                <button type="button" onClick={goToFutureTrips} className="rounded-full border border-white/15 bg-white/[0.03] px-4 py-2 text-xs uppercase tracking-[0.18em] text-white/45">Back</button>
                <button type="button" onClick={goToMainPage} className="rounded-full border border-white/15 bg-white/[0.03] px-4 py-2 text-xs uppercase tracking-[0.18em] text-white/45">Main Page</button>
              </div>
              <TripPanelTitle location="Alaska Cruise" date="June 2027" duration="8 days" description="A northern cruise idea with glacier views, coastal towns, wildlife watching, and slow scenic sea days." />
              <div className="space-y-3">
                <button type="button" disabled className="w-full cursor-not-allowed rounded-2xl border border-white/10 bg-white/[0.02] px-4 py-4 text-sm font-light uppercase tracking-[0.18em] text-white/25 opacity-60">Itinerary</button>
                <button type="button" onClick={() => setShowAlaskaCruiseNameInput(true)} className="w-full rounded-2xl border border-[#FF8FC7]/35 bg-[#FF8FC7]/10 px-4 py-4 text-sm font-light uppercase tracking-[0.18em] text-[#FF8FC7] transition hover:border-[#FF8FC7]/60 hover:bg-[#FF8FC7]/15">I am interested</button>
              </div>

              {showAlaskaCruiseNameInput && (
                <form onSubmit={(event) => { event.preventDefault(); addAlaskaCruiseInterestedName(); }} className="mt-5 rounded-3xl border border-white/10 bg-white/[0.03] p-4 text-left">
                  <label className="mb-2 block text-xs uppercase tracking-[0.22em] text-white/45" htmlFor="alaska-cruise-interest-name">Name</label>
                  <input id="alaska-cruise-interest-name" value={alaskaCruiseNameInput} onChange={(event) => setAlaskaCruiseNameInput(event.target.value)} autoFocus className="mb-3 w-full rounded-2xl border border-white/15 bg-black/30 px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/25 focus:border-white/40" placeholder="Enter your name" />
                  <button type="submit" className="w-full rounded-2xl border border-[#72E49A]/35 bg-[#72E49A]/10 px-4 py-3 text-sm uppercase tracking-[0.18em] text-[#72E49A] transition hover:bg-[#72E49A]/15">Add to list</button>
                </form>
              )}

              <section className="mt-6 rounded-3xl border border-white/10 bg-black/20 p-5 text-left">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <h2 className="text-sm uppercase tracking-[0.24em] text-white/55">Who signed up</h2>
                  <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-white/45">{alaskaCruiseInterestedNames.length}</span>
                </div>
                {alaskaCruiseInterestedNames.length ? (
                  <div className="space-y-2">
                    {alaskaCruiseInterestedNames.map((name) => (
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
              <div className="mb-5 grid grid-cols-2 gap-2">
                <button type="button" onClick={goToFutureTrips} className="rounded-full border border-white/15 bg-white/[0.03] px-4 py-2 text-xs uppercase tracking-[0.18em] text-white/45">Back</button>
                <button type="button" onClick={goToMainPage} className="rounded-full border border-white/15 bg-white/[0.03] px-4 py-2 text-xs uppercase tracking-[0.18em] text-white/45">Main Page</button>
              </div>
              <TripPanelTitle location="Orlando FL USA" subtitle="Disney World" date="Nov 2028" duration="7 days" description="A Disney World holiday with park days, character moments, resort downtime, and room for family pacing." />
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
          ) : selectedTrip === "panama" ? (
            <>
              <div className="mb-5 grid grid-cols-2 gap-2">
                <button type="button" onClick={goToFutureTrips} className="rounded-full border border-white/15 bg-white/[0.03] px-4 py-2 text-xs uppercase tracking-[0.18em] text-white/45">Back</button>
                <button type="button" onClick={goToMainPage} className="rounded-full border border-white/15 bg-white/[0.03] px-4 py-2 text-xs uppercase tracking-[0.18em] text-white/45">Main Page</button>
              </div>
              <TripPanelTitle location="Panama (18+)" date="March 2027" duration="7 days" description="Hiking, diving, beach, canal." />
              <section className="mb-5 rounded-3xl border border-white/10 bg-white/[0.03] p-5 text-left">
                <h2 className="mb-4 text-sm uppercase tracking-[0.24em] text-white/55">Trip Ideas</h2>
                <ul className="ml-5 list-disc space-y-3 text-sm leading-6 text-white/65">
                  <li><span className="text-white/85">Panama Canal:</span> Experience the world-famous engineering marvel.</li>
                  <li><span className="text-white/85">Casco Viejo:</span> Wander vibrant historic colonial streets filled with rooftop bars and fine dining.</li>
                  <li><span className="text-white/85">San Blas Islands (Guna Yala):</span> Unplug completely in an indigenous Guna-governed archipelago, best explored by multi-day sailing tour.</li>
                  <li><span className="text-white/85">Coiba National Park:</span> Dive or snorkel in a pristine UNESCO World Heritage marine reserve on the Pacific side.</li>
                  <li><span className="text-white/85">Boquete:</span> Explore hiking trails, waterfalls, and ultra-premium Geisha coffee in the Chiriqui Highlands.</li>
                  <li><span className="text-white/85">Volcan Baru:</span> Hike or ride 4x4 up Panama's highest peak, where clear days can reveal both the Pacific and Caribbean oceans.</li>
                </ul>
              </section>
              <div className="space-y-3">
                <button type="button" disabled className="w-full cursor-not-allowed rounded-2xl border border-white/10 bg-white/[0.02] px-4 py-4 text-sm font-light uppercase tracking-[0.18em] text-white/25 opacity-60">Itinerary</button>
                <button type="button" onClick={() => setShowPanamaNameInput(true)} className="w-full rounded-2xl border border-[#FF8FC7]/35 bg-[#FF8FC7]/10 px-4 py-4 text-sm font-light uppercase tracking-[0.18em] text-[#FF8FC7] transition hover:border-[#FF8FC7]/60 hover:bg-[#FF8FC7]/15">I am interested</button>
              </div>

              {showPanamaNameInput && (
                <form onSubmit={(event) => { event.preventDefault(); addPanamaInterestedName(); }} className="mt-5 rounded-3xl border border-white/10 bg-white/[0.03] p-4 text-left">
                  <label className="mb-2 block text-xs uppercase tracking-[0.22em] text-white/45" htmlFor="panama-interest-name">Name</label>
                  <input id="panama-interest-name" value={panamaNameInput} onChange={(event) => setPanamaNameInput(event.target.value)} autoFocus className="mb-3 w-full rounded-2xl border border-white/15 bg-black/30 px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/25 focus:border-white/40" placeholder="Enter your name" />
                  <button type="submit" className="w-full rounded-2xl border border-[#72E49A]/35 bg-[#72E49A]/10 px-4 py-3 text-sm uppercase tracking-[0.18em] text-[#72E49A] transition hover:bg-[#72E49A]/15">Add to list</button>
                </form>
              )}

              <section className="mt-6 rounded-3xl border border-white/10 bg-black/20 p-5 text-left">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <h2 className="text-sm uppercase tracking-[0.24em] text-white/55">Who signed up</h2>
                  <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-white/45">{panamaInterestedNames.length}</span>
                </div>
                {panamaInterestedNames.length ? (
                  <div className="space-y-2">
                    {panamaInterestedNames.map((name) => (
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
              <div className="mb-5 grid grid-cols-2 gap-2">
                <button type="button" onClick={goToFutureTrips} className="rounded-full border border-white/15 bg-white/[0.03] px-4 py-2 text-xs uppercase tracking-[0.18em] text-white/45">Back</button>
                <button type="button" onClick={goToMainPage} className="rounded-full border border-white/15 bg-white/[0.03] px-4 py-2 text-xs uppercase tracking-[0.18em] text-white/45">Main Page</button>
              </div>
              <TripPanelTitle location="The 5 Stans & Silk Road" date="TBD" duration="16 days" description="Trace the legendary Silk Road across five nations: Kyrgyzstan, Kazakhstan, Tajikistan, Turkmenistan, Uzbekistan. This is Central Asia in full, gloriously unfiltered widescreen. Gonna be gorgeous and totally unforgettable." />
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
              <button type="button" onClick={goToMainPage} className={selectedTrip === "okinawaJapan" || selectedTrip === "taiwan" ? "mx-8 mb-5 shrink-0 rounded-full border border-white/20 bg-white/[0.06] px-4 py-2 text-xs uppercase tracking-[0.18em] text-white/65 transition hover:border-white/35 hover:bg-white/[0.1]" : "mb-5 rounded-full border border-white/15 bg-white/[0.03] px-4 py-2 text-xs uppercase tracking-[0.18em] text-white/45"}>Main Page</button>
              {selectedTrip === "okinawaJapan" || selectedTrip === "taiwan" ? (
                <div className={`relative min-h-0 flex-1 overflow-hidden ${selectedTrip === "taiwan" ? "bg-black" : "bg-[#020B18]"}`}>
                  <img src={selectedTrip === "taiwan" ? "/taiwan-2026-poster.png" : "/okinawa-2026-poster.png"} alt={selectedTrip === "taiwan" ? "Taiwan 2026 travel poster" : "Okinawa Japan 2026 travel poster"} className={`absolute inset-0 h-full w-full object-cover ${selectedTrip === "taiwan" ? "scale-[1.08] -translate-y-6 object-center" : "object-center"}`} />
                  <div className={`absolute inset-x-0 bottom-0 grid grid-cols-[2fr_1fr] gap-2 bg-gradient-to-t from-black px-4 pb-4 ${selectedTrip === "taiwan" ? "via-black/90 pt-28" : "via-black/72 pt-20"} to-transparent`}>
                    <select
                      defaultValue=""
                      disabled={isSiteGuestAccess || siteAccessMode === "loading"}
                      onChange={(event) => {
                        const selectedGuest = event.target.value;
                        if (!selectedGuest) return;
                        openTripDashboard(selectedGuest);
                      }}
                      className={`min-w-0 rounded-2xl border border-white/25 bg-black/75 px-4 py-3 text-sm font-light tracking-wide text-white outline-none backdrop-blur-md transition disabled:cursor-not-allowed disabled:border-white/10 disabled:text-white/30 ${selectedTrip === "taiwan" ? "focus:border-[#72E49A]/70" : "focus:border-[#9EDCFF]/70"}`}
                    >
                      <option value="" disabled>{isSiteGuestAccess ? "Members only" : "Select your party"}</option>
                      {getVisibleGuestOptions().map((guest) => <option key={guest} value={guest}>{guest}</option>)}
                    </select>
                    <button type="button" onClick={() => openTripDashboard("Guest")} className={`rounded-2xl border bg-black/75 px-3 py-3 text-sm font-light uppercase tracking-[0.12em] outline-none backdrop-blur-md transition ${selectedTrip === "taiwan" ? "border-[#72E49A]/40 text-[#72E49A] hover:border-[#72E49A]/70 hover:bg-[#72E49A]/10" : "border-[#9EDCFF]/40 text-[#9EDCFF] hover:border-[#9EDCFF]/70 hover:bg-[#9EDCFF]/10"}`}>Guest</button>
                  </div>
                </div>
              ) : (
                <>
                  <h1 className="mb-4 text-3xl font-light tracking-wide">Taiwan 2026</h1>
                  <p className="mb-8 text-sm leading-6 text-white/55">Please select your party to continue.</p>
                  <div className="mb-5 grid grid-cols-[2fr_1fr] gap-2 text-left">
                    <select
                      defaultValue=""
                      disabled={isSiteGuestAccess || siteAccessMode === "loading"}
                      onChange={(event) => {
                        const selectedGuest = event.target.value;
                        if (!selectedGuest) return;
                        openTripDashboard(selectedGuest);
                      }}
                      className="min-w-0 rounded-2xl border border-white/15 bg-[#111] px-4 py-3 text-sm font-light tracking-wide text-white/75 outline-none transition focus:border-white/35 disabled:cursor-not-allowed disabled:text-white/30"
                    >
                      <option value="" disabled>{isSiteGuestAccess ? "Members only" : "Select your party"}</option>
                      {getVisibleGuestOptions().map((guest) => <option key={guest} value={guest}>{guest}</option>)}
                    </select>
                    <button type="button" onClick={() => openTripDashboard("Guest")} className="rounded-2xl border border-white/15 bg-[#111] px-3 py-3 text-sm font-light uppercase tracking-[0.12em] text-white/65 transition hover:border-white/35 hover:text-white">Guest</button>
                  </div>
                </>
              )}
            </>
          ) : (
            <>
              <section className="relative flex min-h-0 flex-1 flex-col overflow-hidden bg-black px-5 pb-5 pt-8 text-left">
                <img
                  src={selectedTrip === "taiwan" ? "/taiwan-dashboard-hero.webp" : "/okinawa-dashboard-hero.webp"}
                  alt=""
                  aria-hidden="true"
                  className={`pointer-events-none absolute inset-x-0 bottom-0 top-20 z-0 h-[calc(100%-5rem)] w-full object-cover ${selectedTrip === "taiwan" ? "scale-[1.08] -translate-y-6 object-center" : "object-center"}`}
                />
                <div className="pointer-events-none absolute inset-0 z-0 bg-gradient-to-b from-black/46 via-black/54 to-black/82" />
                <p className="relative z-10 mb-3 text-center text-xs uppercase tracking-[0.35em] text-white/75">Private Group Event</p>
                <div className="relative z-10 mb-5 grid grid-cols-2 gap-2">
                  <button type="button" onClick={() => { setShowGuestActions(false); setGuestName(""); if (selectedTrip) setBrowserRoute(buildTripUrl(selectedTrip)); }} className="rounded-full border border-white/30 bg-black/70 px-3 py-2 text-[10px] uppercase tracking-[0.14em] text-white/80 backdrop-blur-md transition hover:border-white/45 hover:bg-black/85">Back</button>
                  <button type="button" onClick={goToMainPage} className="rounded-full border border-white/30 bg-black/70 px-3 py-2 text-[10px] uppercase tracking-[0.14em] text-white/80 backdrop-blur-md transition hover:border-white/45 hover:bg-black/85">Main Page</button>
                </div>
                <div className="relative z-10 flex min-h-0 flex-1 flex-col space-y-5 overflow-y-auto overflow-x-hidden py-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                <div>
                  <p className="text-xs uppercase tracking-[0.28em]" style={{ color: selectedTripAccent }}>{selectedTripDashboardLabel}</p>
                  <h2 className="mt-2 text-3xl font-light tracking-wide text-white">Hello {guestName}</h2>
                  <p className="mt-2 text-sm text-white/45">{selectedTripDashboardDate}</p>
                </div>
                {renderTripDashboardActions()}
                {guestName === "Xenia & David & Naomi (3)" && <CountrySegmentButtons segments={[{ label: "Nov 21–23 · Xiaoliuqiu", page: "xiaoliuqiu", color: TAIWAN_GOLD }, { label: "Day Trips · Taipei", page: "taipei", color: TAIWAN_GOLD }, { label: "Nov 27–30 · Onna", page: "onna", color: BABY_BLUE }, { label: "Nov 30–Dec 2 · Nago", page: "nago", color: BABY_BLUE }, { label: "Dec 2–4 · Nanjo", page: "nanjo", color: BABY_BLUE }, { label: "Dec 4–6 · Naha", page: "naha", color: BABY_BLUE }, { label: "Dec 8–11 · Yilan", page: "yilan", color: "#72E49A" }]} setIsGuestConfirmed={setIsGuestConfirmed} setPage={setPage} />}
                {guestName === "Jim" && <CountrySegmentButtons segments={[{ label: "Nov 20–23 · Xiaoliuqiu", page: "xiaoliuqiu", color: TAIWAN_GOLD }]} setIsGuestConfirmed={setIsGuestConfirmed} setPage={setPage} />}
                {guestName === "Mark Wang" && <CountrySegmentButtons segments={[{ label: "Nov 20–23 · Xiaoliuqiu", page: "xiaoliuqiu", color: TAIWAN_GOLD }, { label: "Day Trips · Taipei", page: "taipei", color: TAIWAN_GOLD }, { label: "Nov 25–27 · Naha + Okinawa World", page: "nahaearly", color: BABY_BLUE }, { label: "Nov 27–30 · Onna", page: "onna", color: BABY_BLUE }]} setIsGuestConfirmed={setIsGuestConfirmed} setPage={setPage} />}
                {guestName === "Anthony & Christine & Mona (1)" && <CountrySegmentButtons segments={[{ label: "Nov 20–23 · Xiaoliuqiu", page: "xiaoliuqiu", color: TAIWAN_GOLD }, { label: "Day Trips · Taipei", page: "taipei", color: TAIWAN_GOLD }]} setIsGuestConfirmed={setIsGuestConfirmed} setPage={setPage} />}
                {guestName === "Jenn & Hiroshi & Masashi (6) & Miyari (3)" && <CountrySegmentButtons segments={[{ label: "Nov 21–23 · Xiaoliuqiu", page: "xiaoliuqiu", color: TAIWAN_GOLD }, { label: "Day Trips · Taipei", page: "taipei", color: TAIWAN_GOLD }]} setIsGuestConfirmed={setIsGuestConfirmed} setPage={setPage} />}
                {guestName === "Mei & Emilia (8)" && <CountrySegmentButtons segments={[{ label: "Day Trips · Taipei", page: "taipei", color: TAIWAN_GOLD }, { label: "Nov 29–Dec 2 · Nago", page: "nago", color: BABY_BLUE }, { label: "Dec 2–4 · Nanjo", page: "nanjo", color: BABY_BLUE }, { label: "Dec 4–6 · Naha", page: "naha", color: BABY_BLUE }, { label: "Dec 8–11 · Yilan", page: "yilan", color: "#72E49A" }]} setIsGuestConfirmed={setIsGuestConfirmed} setPage={setPage} />}
                {guestName === "Steven Wang" && <CountrySegmentButtons segments={[{ label: "Nov 25–27 · Naha + Okinawa World", page: "nahaearly", color: BABY_BLUE }, { label: "Nov 27–30 · Onna", page: "onna", color: BABY_BLUE }, { label: "Nov 30–Dec 2 · Nago", page: "nago", color: BABY_BLUE }, { label: "Dec 2–3 · Nanjo", page: "nanjo", color: BABY_BLUE }]} setIsGuestConfirmed={setIsGuestConfirmed} setPage={setPage} />}
                {guestName === "Dave & Christina & Xixi (2)" && <CountrySegmentButtons segments={[{ label: "Day Trips · Taipei", page: "taipei", color: TAIWAN_GOLD }, { label: "Nov 27–30 · Onna", page: "onna", color: BABY_BLUE }, { label: "Nov 30–Dec 2 · Nago", page: "nago", color: BABY_BLUE }, { label: "Dec 2–4 · Nanjo", page: "nanjo", color: BABY_BLUE }, { label: "Dec 4–6 · Naha", page: "naha", color: BABY_BLUE }, { label: "Dec 8–11 · Yilan", page: "yilan", color: "#72E49A" }]} setIsGuestConfirmed={setIsGuestConfirmed} setPage={setPage} />}
                {guestName === "Heather & Jack & Aizen (8) & Kaien (3) & Norma" && <CountrySegmentButtons segments={[{ label: "Nov 27–30 · Onna", page: "onna", color: BABY_BLUE }, { label: "Nov 30–Dec 2 · Nago", page: "nago", color: BABY_BLUE }, { label: "Dec 2–4 · Nanjo", page: "nanjo", color: BABY_BLUE }]} setIsGuestConfirmed={setIsGuestConfirmed} setPage={setPage} />}
                {guestName === "Julie & Adrian & Ethan (4) & Tyrell (1)" && <CountrySegmentButtons segments={[{ label: "Day Trips · Taipei", page: "taipei", color: TAIWAN_GOLD }]} setIsGuestConfirmed={setIsGuestConfirmed} setPage={setPage} />}
                {guestName !== "Guest" && !["Xenia & David & Naomi (3)", "Jim", "Mark Wang", "Anthony & Christine & Mona (1)", "Jenn & Hiroshi & Masashi (6) & Miyari (3)", "Mei & Emilia (8)", "Steven Wang", "Dave & Christina & Xixi (2)", "Heather & Jack & Aizen (8) & Kaien (3) & Norma", "Julie & Adrian & Ethan (4) & Tyrell (1)"].includes(guestName) && (
                  <div className="mt-5 rounded-2xl border border-amber-300/20 bg-amber-300/5 p-4">
                    <p className="text-sm leading-6 text-amber-100/80">
                      No trip segment found, please confirm your trip with Xenia ASAP.
                    </p>
                  </div>
                )}
                </div>
              </section>
            </>
          )}
        </div>
        {albumPopup}
        {taiwanDashboardAlbumPopup}
        {okinawaBudgetPopup}
        {okinawaReservationChecklistPopup}
        {moroccoCostTrackerPopup}
        {moroccoAccountingSummaryPopup}
      </div>
    );
  }

  if (page === "checklist") {
    const checklist = getPackingChecklist(guestName);
    const isReadOnlyGuest = guestName === "Guest";
    const totalItems = checklist.sections.reduce((sum, section) => sum + section.items.length, 0);
    const completedItems = isReadOnlyGuest ? 0 : checklist.sections.reduce((sum, section) => sum + section.items.filter((item) => checkedPackingItems[`${guestName}-${section.title}-${item}`]).length, 0);
    return (
      <div className="min-h-screen bg-black px-6 py-10 text-white">
        {chapterNav("checklist")}
        <main className="mx-auto max-w-4xl">
          <p className="mb-3 text-sm uppercase tracking-[0.35em] text-[#72E49A]">Personal Travel Prep</p>
          <h1 className="mb-4 text-4xl font-light tracking-wide md:text-6xl">{checklist.title}</h1>
          <p className="mb-8 text-sm text-white/50">{isReadOnlyGuest ? "Read-only guest view" : `${completedItems} of ${totalItems} items packed`}</p>
          <div className="mb-10 h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-[#72E49A] transition-all" style={{ width: `${totalItems ? (completedItems / totalItems) * 100 : 0}%` }} /></div>
          <section className="space-y-6">
            {checklist.sections.map((section) => <article key={section.title} className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur-md"><h2 className="mb-5 text-2xl font-light">{section.title}</h2><div className="grid gap-3">{section.items.map((item) => { const key = `${guestName}-${section.title}-${item}`; const checked = !isReadOnlyGuest && Boolean(checkedPackingItems[key]); return <button key={key} type="button" disabled={isReadOnlyGuest} onClick={() => togglePackingItem(key, checked)} className={`flex items-center gap-3 rounded-2xl border px-4 py-3 text-left transition ${isReadOnlyGuest ? "cursor-not-allowed border-white/8 bg-black/20 text-white/30" : checked ? "border-[#72E49A]/50 bg-[#72E49A]/10 text-white" : "border-white/10 bg-black/20 text-white/70 hover:border-white/25"}`}><span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-xs ${checked ? "border-[#72E49A] bg-[#72E49A] text-black" : isReadOnlyGuest ? "border-white/12 text-transparent" : "border-white/25 text-transparent"}`}>✓</span><span className={checked ? "text-white line-through decoration-[#72E49A]/70" : isReadOnlyGuest ? "text-white/30" : "text-white/75"}>{item}</span></button>; })}</div></article>)}
          </section>
        </main>
      </div>
    );
  }

  const chapterPeople: Record<PageName, Person[]> = {
    map: [],
    checklist: [],
    taipei: [["Xenia & David & Naomi (3)", "Taipei · Day Trips"], ["Jenn & Hiroshi & Masashi (6) & Miyari (3)", "Taipei · Day Trips"], ["Anthony & Christine & Mona (1)", "Taipei · Day Trips"], ["Mark Wang", "Taipei · Day Trips"], ["Dave & Christina & Xixi (2)", "Taipei · Day Trips"], ["Mei & Emilia (8)", "Taipei · Day Trips"], ["Julie & Adrian & Ethan (4) & Tyrell (1)", "Taipei · Day Trips"]],
    yilan: [["Xenia & David & Naomi (3)", "Dec 8 – Dec 11 · Yilan"], ["Mei & Emilia (8)", "Dec 8 – Dec 11 · Yilan"], ["Dave & Christina & Xixi (2)", "Dec 8 – Dec 11 · Yilan"]],
    xiaoliuqiu: [["Anthony & Christine & Mona (1)", "Nov 20 – Nov 23 · Xiaoliuqiu"], ["Mark Wang", "Nov 20 – Nov 23 · Xiaoliuqiu"], ["Jim", "Nov 20 – Nov 23 · Xiaoliuqiu"], ["Xenia & David & Naomi (3)", "Nov 21 – Nov 23 · Xiaoliuqiu"], ["Jenn & Hiroshi & Masashi (6) & Miyari (3)", "Nov 21 – Nov 23 · Xiaoliuqiu"]],
    onna: [["Xenia & David & Naomi (3)", "Nov 27 – Dec 6 · Okinawa"], ["Dave & Christina & Xixi (2)", "Nov 27 – Dec 6 · Okinawa"], ["Steven Wang", "Nov 25 – Dec 3 · Okinawa"], ["Mark Wang", "Nov 25 – Nov 30 · Okinawa"], ["Mei & Emilia (8)", "Nov 29 – Dec 6 · Okinawa"], ["Heather & Jack & Aizen (8) & Kaien (3) & Norma", "Nov 26 – Dec 4 · Okinawa"]],
    nago: [["Xenia & David & Naomi (3)", "Nov 27 – Dec 6 · Okinawa"], ["Dave & Christina & Xixi (2)", "Nov 27 – Dec 6 · Okinawa"], ["Steven Wang", "Nov 25 – Dec 3 · Okinawa"], ["Mei & Emilia (8)", "Nov 29 – Dec 6 · Okinawa"], ["Heather & Jack & Aizen (8) & Kaien (3) & Norma", "Nov 26 – Dec 4 · Okinawa"]],
    nanjo: [["Xenia & David & Naomi (3)", "Nov 27 – Dec 6 · Okinawa"], ["Dave & Christina & Xixi (2)", "Nov 27 – Dec 6 · Okinawa"], ["Steven Wang", "Nov 25 – Dec 3 · Okinawa"], ["Mei & Emilia (8)", "Nov 29 – Dec 6 · Okinawa"], ["Heather & Jack & Aizen (8) & Kaien (3) & Norma", "Nov 26 – Dec 4 · Okinawa"]],
    naha: [["Xenia & David & Naomi (3)", "Nov 27 – Dec 6 · Okinawa"], ["Dave & Christina & Xixi (2)", "Nov 27 – Dec 6 · Okinawa"], ["Mei & Emilia (8)", "Nov 29 – Dec 6 · Okinawa"]],
    nahaearly: [["Steven Wang", "Nov 25 – Dec 3 · Okinawa"], ["Mark Wang", "Nov 25 – Nov 30 · Okinawa"]],
  };

  const renderChapter = (chapter: PageName, eyebrow: string, title: string, album: string, month: string, nights: string, hotel: React.ReactNode, region: Region, accentColor: string, children: React.ReactNode) => (
    <div className="min-h-screen bg-black px-6 py-10 text-white" style={{ "--chapter-accent": accentColor } as React.CSSProperties}>
      {chapterNav(chapter)}
      <main className="mx-auto max-w-5xl">
        <p className="mb-3 text-sm uppercase tracking-[0.35em]" style={{ color: accentColor }}>{eyebrow}</p>
        <h1 className="mb-6 text-4xl font-light tracking-wide md:text-6xl">{title}</h1>
        {infoWidgets(month, nights, hotel, region)}
        <GuestPartyContext.Provider value={guestName}>
          <section className="space-y-8">{children}</section>
        </GuestPartyContext.Provider>
        {peopleCards(chapterPeople[chapter])}
      </main>
      {albumPopup}
    </div>
  );

  if (page === "xiaoliuqiu") return renderChapter("xiaoliuqiu", "Taiwan · Xiaoliuqiu", "Scuba Dive Chapter", "Taiwan November", "November", "3 Nights", <p className="mt-1 text-sm font-medium" style={{ color: TAIWAN_GOLD }}>小琉球民宿 TBD</p>, "taiwan", TAIWAN_GOLD, <XiaoliuqiuContent card={card} />);
  if (page === "taipei") {
    const isReadOnlyGuest = guestName === "Guest";
    const taipeiFoodieItems = ["饗 A Joy (101)", "施家腰花 (永春)", "鼎泰豐總店 (東門)", "門前隱味牛肉麵 (西門漢口)", "晶華故宮", "大腕燒肉", "胡同燒肉", "欣葉台菜", "金蓬萊台菜", "橘色火鍋", "士林夜市", "公館夜市", "饒河夜市", "雙月", "雞窩餐廳 (麟光站)", "Nomura", "康寧街七里香臭豆腐", "清河鵝肉 (天母)", "香帥芋泥蛋糕", "舊振南傳統糕餅", "大稻埕滷肉飯 (台北車站)", "天下三絕 (忠孝復興)", "一品活蝦", "BarWu"];
    const taipeiDayTrips = [
      { titleZh: "台北市東區", titleEn: "Taipei City East", details: [{ zh: "松山文創園區", en: "Songshan Cultural and Creative Park" }, { zh: "國父紀念館", en: "Sun Yat-sen Memorial Hall" }, { zh: "Taipei 101", en: "Taipei 101" }, { zh: "象山步道", en: "Xiangshan Trail" }] },
      { titleZh: "台北市西區", titleEn: "Taipei City West", details: [{ zh: "中正紀念堂", en: "Chiang Kai-shek Memorial Hall" }, { zh: "龍山寺", en: "Longshan Temple" }, { zh: "西門町", en: "Ximending" }, { zh: "台北車站", en: "Taipei Main Station" }, { zh: "總統府", en: "Presidential Office Building" }, { zh: "華山文創園區", en: "Huashan 1914 Creative Park" }] },
      { titleZh: "野柳 & 九份 包車一日遊", titleEn: "Yehliu & Jiufen", details: [{ zh: "野柳地質公園", en: "Yehliu Geopark" }, { zh: "金瓜石（黃金瀑布、陰陽海、黃金博物園區）", en: "Jinguashi: Gold Falls, Yin Yang Sea, and Gold Museum" }, { zh: "九份老街", en: "Jiufen Old Street" }] },
      { titleZh: "北投 & 淡水", titleEn: "Beitou & Tamsui", details: [{ zh: "北投溫泉", en: "Beitou Hot Springs" }, { zh: "地熱谷", en: "Thermal Valley" }, { zh: "硫磺谷", en: "Sulfur Valley" }, { zh: "淡水老街", en: "Tamsui Old Street" }, { zh: "漁人碼頭", en: "Fisherman's Wharf" }, { zh: "紅毛城", en: "Fort San Domingo" }] },
      { titleZh: "貓空 & 台北市立動物園", titleEn: "Maokong & Taipei Zoo", details: [{ zh: "台北市立動物園", en: "Taipei Zoo" }, { zh: "貓空纜車", en: "Maokong Gondola" }, { zh: "茶館與城市景觀", en: "Tea houses with city views" }] },
      { titleZh: "兒童新樂園 & 士林夜市", titleEn: "Children's Amusement Park & Shilin Night Market", details: [{ zh: "台北市兒童新樂園", en: "Taipei Children's Amusement Park" }, { zh: "士林夜市", en: "Shilin Night Market" }] },
    ];
    return (
      <div className="min-h-screen bg-black px-6 py-10 text-white" style={{ "--chapter-accent": TAIWAN_GOLD } as React.CSSProperties}>
        {chapterNav("taipei")}
        <main className="mx-auto max-w-5xl">
          <p className="mb-3 text-sm uppercase tracking-[0.35em]" style={{ color: TAIWAN_GOLD }}>Taiwan · Taipei</p>
          <h1 className="mb-4 text-4xl font-light tracking-wide md:text-6xl">Taipei Day Trip Options</h1>
          <div className="mb-5 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setShowTaipeiMrtMap(true)}
              className="rounded-full border px-4 py-2 text-xs uppercase tracking-[0.16em] transition hover:bg-white/10"
              style={{ color: TAIWAN_GOLD, borderColor: `${TAIWAN_GOLD}66`, backgroundColor: `${TAIWAN_GOLD}14` }}
            >
              台北捷運圖
              <span className="ml-2 text-white/45">Taipei MRT Map</span>
            </button>
            <button
              type="button"
              onClick={() => setShowTaipeiFoodieList(true)}
              className="rounded-full border px-4 py-2 text-xs uppercase tracking-[0.16em] transition hover:bg-white/10"
              style={{ color: TAIWAN_GOLD, borderColor: `${TAIWAN_GOLD}66`, backgroundColor: `${TAIWAN_GOLD}14` }}
            >
              美食清單
              <span className="ml-2 text-white/45">Foodie List</span>
            </button>
          </div>
          <p className="mb-8 max-w-3xl text-sm leading-6 text-white/50">
            <span className="block text-white/65">這裡沒有固定日期，每張卡片都是一個可以自由安排的台北一日遊選項。</span>
            <span className="mt-1 block">No fixed date schedule here. Each card is a different Taipei day-trip itinerary that can be planned independently.</span>
          </p>
          <section className="grid gap-4 md:grid-cols-2">
            {taipeiDayTrips.map((trip) => (
                <article key={trip.titleEn} className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
                  <h2 className="mb-4 font-light" style={{ color: TAIWAN_GOLD }}>
                    <span className="block text-xl">{trip.titleZh}</span>
                    <span className="mt-1 block text-sm text-white/55">{trip.titleEn}</span>
                  </h2>
                  <ul className="space-y-3 text-sm leading-6">
                    {trip.details.map((detail) => (
                      <li key={detail.zh} className="border-l border-white/10 pl-3">
                        <span className="block text-white/75">{detail.zh}</span>
                        <span className="block text-xs text-white/40">{detail.en}</span>
                      </li>
                    ))}
                  </ul>
                </article>
            ))}
          </section>
          {peopleCards(chapterPeople.taipei)}
        </main>
        {showTaipeiMrtMap && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Taipei MRT map">
            <section className="flex max-h-[94vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-white/15 bg-[#111] shadow-2xl">
              <div className="flex items-center justify-between gap-4 border-b border-white/10 px-5 py-4">
                <h2 className="font-light">
                  <span className="block text-xl">台北捷運圖</span>
                  <span className="block text-xs text-white/45">Taipei MRT Map</span>
                </h2>
                <button
                  type="button"
                  onClick={() => setShowTaipeiMrtMap(false)}
                  aria-label="Close Taipei MRT map"
                  title="Close"
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/15 text-lg text-white/65 transition hover:border-white/35 hover:text-white"
                >
                  ×
                </button>
              </div>
              <div className="min-h-0 overflow-auto bg-white p-2 sm:p-4">
                <img src="/taipeimrt.png" alt="Taipei MRT sightseeing map" className="mx-auto h-auto max-h-[82vh] w-auto max-w-full object-contain" />
              </div>
            </section>
          </div>
        )}
        {showTaipeiFoodieList && (
          <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/85 p-2 backdrop-blur-sm sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-label="Taipei foodie list">
            <section className="flex max-h-[calc(100dvh-1rem)] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-white/15 bg-[#111] shadow-2xl sm:max-h-[90vh]">
              <div className="flex shrink-0 items-center justify-between gap-3 border-b border-white/10 px-4 py-3 sm:gap-4 sm:px-5 sm:py-4">
                <div>
                  <h2 className="font-light">
                    <span className="block text-xl">美食清單</span>
                    <span className="block text-xs text-white/45">Foodie List</span>
                  </h2>
                  <p className="mt-1 text-xs text-white/45">{isReadOnlyGuest ? "Read-only guest view" : `已品嚐 ${checkedTaipeiFoodieItems.length} / ${taipeiFoodieItems.length} · ${checkedTaipeiFoodieItems.length} of ${taipeiFoodieItems.length} visited`}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowTaipeiFoodieList(false)}
                  aria-label="Close foodie list"
                  title="Close"
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/15 text-lg text-white/65 transition hover:border-white/35 hover:text-white"
                >
                  ×
                </button>
              </div>
              <div className="min-h-0 flex-1 space-y-2 overflow-y-auto overscroll-contain p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:p-5">
                {taipeiFoodieItems.map((item) => {
                  const isChecked = !isReadOnlyGuest && checkedTaipeiFoodieItems.includes(item);
                  return (
                    <label key={item} className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 sm:px-4 sm:py-3 ${isReadOnlyGuest ? "cursor-not-allowed border-white/8 bg-white/[0.02]" : "cursor-pointer border-white/10 bg-white/[0.04] transition hover:border-white/25"}`}>
                      <input
                        type="checkbox"
                        disabled={isReadOnlyGuest}
                        checked={isChecked}
                        onChange={() => {
                          setCheckedTaipeiFoodieItems((current) => {
                            const next = current.includes(item) ? current.filter((checkedItem) => checkedItem !== item) : [...current, item];
                            window.localStorage.setItem("checkedTaipeiFoodieItems", JSON.stringify(next));
                            return next;
                          });
                        }}
                        className="h-5 w-5 shrink-0 accent-[#72E49A] disabled:cursor-not-allowed disabled:opacity-30"
                      />
                      <span className={isReadOnlyGuest ? "text-sm text-white/30" : isChecked ? "text-sm text-white/40 line-through" : "text-sm text-white/80"}>{item}</span>
                    </label>
                  );
                })}
              </div>
            </section>
          </div>
        )}
      </div>
    );
  }
  if (page === "onna") return renderChapter("onna", "Okinawa · Onna", "Wedding Resort Chapter", "Okinawa Japan", "November", "3 Nights", <a href="https://www.hotelmonterey.co.jp/en/okinawa/" target="_blank" rel="noopener noreferrer" className="mt-1 block text-sm font-medium hover:underline" style={{ color: BABY_BLUE }}>Hotel Monterey Okinawa</a>, "japan", BABY_BLUE, <OnnaContent card={card} linkedImage={linkedImage} />);
  if (page === "nago") return renderChapter("nago", "Okinawa · Nago", "Northern Okinawa Chapter", "Okinawa Japan", "December", "2 Nights", <a href="https://maps.google.com/?q=Hotel+Yugaf+Inn+Okinawa" target="_blank" rel="noopener noreferrer" className="mt-1 block text-sm font-medium hover:underline" style={{ color: BABY_BLUE }}>Hotel Yugaf Inn Okinawa</a>, "japan", BABY_BLUE, <NagoContent card={card} linkedImage={linkedImage} />);
  if (page === "nanjo") return renderChapter("nanjo", "Okinawa · Nanjo", "Southern Okinawa Chapter", "Okinawa Japan", "December", "2 Nights", <><a href="https://www.yuinchi.jp/heal/hot-spring/" target="_blank" rel="noopener noreferrer" className="mt-1 block text-sm font-medium hover:underline" style={{ color: BABY_BLUE }}>Yuinchi Hotel Nanjo</a><p className="mt-1 text-[9px] text-gray-500">Apeman Spa Natural Hot Spring</p></>, "japan", BABY_BLUE, <NanjoContent card={card} />);
  if (page === "naha") return renderChapter("naha", "Okinawa · Naha", "Final Naha Chapter", "Okinawa Japan", "December", "2 Nights", <><p className="mt-1 text-sm font-medium" style={{ color: BABY_BLUE }}>Hotel Strata Naha</p><p className="mt-1 text-[9px] text-gray-500">or Hotel JAL City Naha</p></>, "japan", BABY_BLUE, <NahaContent card={card} />);
  if (page === "nahaearly") return renderChapter("nahaearly", "Okinawa · Naha", "Naha + Okinawa World Chapter", "Okinawa Japan", "November", "2 Nights", <p className="mt-1 text-sm font-medium" style={{ color: BABY_BLUE }}>Hotel Strata Naha</p>, "japan", BABY_BLUE, <NahaEarlyContent card={card} linkedImage={linkedImage} />);
  if (page === "yilan") return renderChapter("yilan", "Taiwan · Yilan", "Yilan Family Chapter", "Taiwan December", "December", "3 Nights", <><p className="mt-1 text-sm font-medium" style={{ color: TAIWAN_GOLD }}>瓏山林蘇澳冷熱泉度假飯店 (1)</p><p className="mt-1 text-sm font-medium" style={{ color: TAIWAN_GOLD }}>礁溪寒沐酒店 (2)</p></>, "taiwan", TAIWAN_GOLD, <YilanContent card={card} />);

  const isTaiwanMap = selectedTrip === "taiwan";
  const departureDate = isTaiwanMap ? new Date(2026, 10, 21) : new Date(2026, 10, 25);
  const mapLocations: TimelineItem[] = isTaiwanMap
    ? [
        { id: "xiaoliuqiu", label: "Xiaoliuqiu", range: "Nov 21–23", color: "taiwan" },
        { id: "taipei", label: "Taipei", range: "Day Trips", color: "taiwan" },
        { id: "yilan", label: "Yilan", range: "Dec 8–11", color: "yilan" },
      ]
    : [
        { id: "nahaearly", label: "Naha", range: "Nov 25–27", color: "okinawa" },
        { id: "onna", label: "Onna", range: "Nov 27–30", color: "okinawa" },
        { id: "nago", label: "Nago", range: "Nov 30–Dec 2", color: "okinawa" },
        { id: "nanjo", label: "Nanjo", range: "Dec 2–4", color: "okinawa" },
        { id: "naha", label: "Naha", range: "Dec 4–6", color: "okinawa" },
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
        <button type="button" onClick={goToMainPage} className="absolute right-5 top-5 z-30 rounded-full border border-white/25 bg-black/30 px-4 py-2 text-xs uppercase tracking-[0.18em] text-white/75 backdrop-blur-md transition hover:border-white/50 hover:bg-white/10">Main Page</button>
        {guestName && guestName !== "I am just a random Guest" && <button type="button" onClick={() => openTripDashboard(guestName)} className="absolute left-5 top-5 z-30 rounded-full border border-white/25 bg-black/30 px-4 py-2 text-xs uppercase tracking-[0.18em] text-white/75 backdrop-blur-md">← Back to Dashboard</button>}
        <div className="relative z-10 flex w-full max-w-5xl items-center justify-center gap-8 md:gap-20">
          {isTaiwanMap && <svg viewBox="0 0 140 260" className="h-[340px] w-[166px] opacity-90 md:h-[520px] md:w-[255px]" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M110 0 L105 0 L94 12 L80 16 L69 24 L58 47 L47 57 L29 90 L10 117 L8 147 L0 173 L10 181 L16 205 L21 213 L43 230 L48 242 L47 254 L50 259 L61 254 L62 227 L68 210 L84 193 L98 163 L107 132 L113 96 L130 61 L127 36 L139 24 L134 15 L120 10 Z" />
            <SvgPin id="taipei" label="Taipei" cx={108} cy={18} hovered={hovered} setHovered={setHovered} activeColor={TAIWAN_GOLD} scale={0.9} labelFontSize={8} labelOffset={12} onDoubleClick={() => openChapterPage("taipei")} />
            <SvgPin id="xiaoliuqiu" label="Xiaoliuqiu" cx={39} cy={234} hovered={hovered} setHovered={setHovered} activeColor={TAIWAN_GOLD} scale={0.9} labelFontSize={8} labelOffset={12} onDoubleClick={() => openChapterPage("xiaoliuqiu")} />
            <SvgPin id="yilan" label="Yilan" cx={120} cy={45} hovered={hovered} setHovered={setHovered} activeColor={TAIWAN_GOLD} scale={0.9} labelFontSize={8} labelOffset={12} onDoubleClick={() => openChapterPage("yilan")} />
          </svg>}
          {!isTaiwanMap && <svg viewBox="0 0 331 520" className="h-[350px] w-[350px] md:h-[520px] md:w-[520px]" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M291 5 L282 5 L280 12 L283 27 L277 42 L262 65 L257 79 L251 83 L242 82 L239 85 L238 90 L243 93 L243 97 L237 105 L223 112 L216 127 L222 134 L213 135 L212 144 L209 147 L196 150 L192 156 L180 154 L177 160 L169 160 L162 154 L164 149 L173 147 L181 151 L185 145 L176 133 L167 132 L167 125 L154 124 L142 115 L130 115 L121 120 L113 118 L106 120 L104 136 L111 144 L108 157 L110 173 L120 186 L134 182 L141 189 L158 192 L159 204 L124 235 L120 235 L115 244 L108 240 L99 244 L89 264 L80 273 L74 287 L62 285 L53 293 L40 288 L35 291 L36 314 L54 350 L53 358 L60 367 L60 377 L52 380 L47 389 L36 391 L27 407 L19 405 L17 418 L20 426 L8 425 L5 431 L4 441 L10 448 L10 456 L19 465 L19 468 L15 470 L15 479 L20 486 L19 507 L23 514 L32 516 L41 509 L51 507 L69 484 L85 479 L89 470 L103 459 L103 450 L97 438 L92 435 L85 437 L79 449 L68 431 L79 420 L80 408 L84 400 L94 391 L90 379 L97 374 L98 369 L107 367 L102 355 L112 346 L120 361 L132 374 L140 372 L139 361 L118 333 L115 321 L108 318 L95 298 L99 294 L99 289 L111 279 L138 279 L141 284 L147 282 L150 278 L149 272 L153 269 L162 269 L175 254 L172 245 L174 240 L182 241 L194 232 L196 224 L192 217 L195 214 L221 219 L229 211 L237 209 L240 204 L239 199 L245 189 L237 183 L236 179 L244 164 L253 161 L266 166 L277 159 L286 157 L290 153 L292 142 L304 129 L311 105 L325 84 L322 73 L327 59 L322 50 L320 35 L309 24 L310 18 L298 13 Z" /><SvgPin id="naha" label="Naha" cx={34} cy={437} hovered={hovered} setHovered={setHovered} activeColor={BABY_BLUE} scale={2.25} labelFontSize={20} labelOffset={38} onDoubleClick={() => openChapterPage("naha")} /><SvgPin id="onna" label="Onna" cx={50} cy={300} hovered={hovered} setHovered={setHovered} activeColor={BABY_BLUE} scale={2.25} labelFontSize={20} labelOffset={38} onDoubleClick={() => openChapterPage("onna")} /><SvgPin id="nago" label="Nago" cx={152} cy={172} hovered={hovered} setHovered={setHovered} activeColor={BABY_BLUE} scale={2.25} labelFontSize={20} labelOffset={38} onDoubleClick={() => openChapterPage("nago")} /><SvgPin id="nanjo" label="Nanjo" cx={70} cy={468} hovered={hovered} setHovered={setHovered} activeColor={BABY_BLUE} scale={2.25} labelFontSize={20} labelOffset={38} onDoubleClick={() => openChapterPage("nanjo")} /></svg>}
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
        <div className={`relative z-20 mt-5 grid w-full gap-2 px-4 sm:grid-cols-2 md:absolute md:bottom-4 md:left-1/2 md:-translate-x-1/2 md:px-6 ${isTaiwanMap ? "max-w-5xl md:grid-cols-3" : "max-w-6xl md:grid-cols-5"}`}>
          {mapLocations.map((item) => <button key={item.id} type="button" onClick={() => openChapterForLocation(item.id)} className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-left transition hover:border-white/30"><span className="flex items-center gap-3"><span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color === "yilan" || item.color === "taiwan" ? TAIWAN_GOLD : BABY_BLUE }} /><span className="text-sm font-light tracking-wide text-white">{item.label}</span></span><span className="text-[10px] uppercase tracking-[0.12em] text-white/45">{item.range}</span></button>)}
        </div>
      </section>
    </div>
  );
}

function SegmentButtons({ segments, onOpenSegment }: { segments: { label: string; page: PageName; color: string }[]; onOpenSegment: (page: PageName) => void }) {
  if (!segments.length) {
    return <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm leading-6 text-white/40">No trip segments are linked to this party yet.</div>;
  }
  return <div className="mt-5 space-y-3 text-sm leading-7 text-white/70"><p className="text-xs uppercase tracking-[0.22em] text-white/35">You are joining:</p>{segments.map((segment) => <button key={segment.label} type="button" onClick={() => onOpenSegment(segment.page)} className="w-full rounded-2xl border px-4 py-3 text-left transition" style={{ borderColor: `${segment.color}44`, backgroundColor: `${segment.color}12` }}><p className="font-medium" style={{ color: segment.color }}>{segment.label}</p></button>)}</div>;
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

function MoroccoItineraryContent({ card }: { card: (children: React.ReactNode) => React.ReactNode }) {
  return (
    <>
      <DayArticle date="Day 0 · Friday, September 4, 2026" title="Toronto → Casablanca">
        {card(<><p className="text-[var(--chapter-accent)]">Royal Air Maroc · AT 211</p><p>Depart Toronto Pearson International Airport (YYZ) · Terminal 1 · 10:25 PM</p><p className="mt-2 text-white/50">Economy · Overnight flight · 7h 25m</p></>)}
      </DayArticle>
      <DayArticle date="Day 1 · Saturday, September 5, 2026" title="Arrive in Casablanca">
        {card(<><p className="text-[var(--chapter-accent)]">Royal Air Maroc · AT211</p><p>Arrive Casablanca Mohammed V International Airport (CMN) · Terminal 2 · 10:50 AM</p><div className="mt-3 space-y-2 text-white/60"><p><span className="text-white/80">Hotel Transfer:</span> Uber from CMN airport to Kyriad Residence Casablanca Centre Ville (32km, about 40 min)</p><p><span className="text-white/80">Day Plan:</span> TBD</p><p><span className="text-white/80">Evening Plan:</span> Attend the evening welcome meeting with the G Adventures CEO and fellow travellers, followed by an optional group dinner.</p></div></>)}
        {card(<><p className="text-[var(--chapter-accent)]">Stay</p><p>Kyriad Residence Casablanca Centre Ville or similar</p></>)}
      </DayArticle>
      <DayArticle date="Day 2 · Sunday, September 6, 2026" title="Casablanca · Rabat · Meknès">
        {card(<><p className="text-[var(--chapter-accent)]">Meals</p><p>Breakfast included</p></>)}
        {card(<><p className="text-[var(--chapter-accent)]">Activities</p><ul className="ml-5 list-disc space-y-2 text-white/65"><li>Visit Casablanca's monumental Hassan II Mosque.</li><li>Travel northwest to Rabat, join a local city tour to explore Kasbah des Oudaias, Mohamed V Mausoleum, and Hassan Tower.</li><li>Continue to the former imperial capital of Meknès. Enjoy some time to relax at the hotel, or find a nearby restaurant for dinner.</li></ul></>)}
        {card(<><p className="text-[var(--chapter-accent)]">Stay</p><p>Hotel Swani or similar</p><p className="mt-2 text-white/50">Private vehicle · approximately 4.5 hours / 240 km</p></>)}
      </DayArticle>
      <DayArticle date="Day 3 · Monday, September 7, 2026" title="Meknès · Volubilis · Chefchaouen">
        {card(<><p className="text-[var(--chapter-accent)]">Meals</p><p>Breakfast included</p></>)}
        {card(<><p className="text-[var(--chapter-accent)]">Activities</p><ul className="ml-5 list-disc space-y-2 text-white/65"><li>Tour Meknès' old medina, lively souks, historical landmarks like Bab Mansour and Bab El Khmiss, Dar Jamai National Museum of Music, and Mausoleum of Moulay Ismail.</li><li>Walk through the UNESCO-listed Roman ruins of Volubilis with a local expert, including preserved mosaics, bathhouses, and marble columns.</li><li>Continue through the Rif Mountains to Chefchaouen, Morocco's Blue City.</li></ul></>)}
        {card(<><p className="text-[var(--chapter-accent)]">Stay</p><p>Torre Hadra or similar guesthouse</p></>)}
      </DayArticle>
      <DayArticle date="Day 4 · Tuesday, September 8, 2026" title="Chefchaouen · Fès">
        {card(<><p className="text-[var(--chapter-accent)]">Meals</p><p>Breakfast and traditional Moroccan group dinner included</p></>)}
        {card(<><p className="text-[var(--chapter-accent)]">Activities</p><ul className="ml-5 list-disc space-y-2 text-white/65"><li>Join a morning walking tour through Chefchaouen's blue alleys and medina. Finish the walk at Rass Elma and climb to the Spanish Mosque to take in the expansive view of the Rif Mountains.</li><li>Drive to Fès. Arriving in the late afternoon, join the group for a delicious dinner of the city's culinary delights, such as the sweet and salty pastilla.</li></ul></>)}
        {card(<><p className="text-[var(--chapter-accent)]">Stay</p><p>Hotel Zahrat Al Jabal or similar</p><p className="mt-2 text-white/50">Drive to Fès · approximately 5 hours</p></>)}
      </DayArticle>
      <DayArticle date="Day 5 · Wednesday, September 9, 2026" title="Fès Medina">
        {card(<><p className="text-[var(--chapter-accent)]">Meals</p><p>Breakfast included</p></>)}
        {card(<><p className="text-[var(--chapter-accent)]">Activities</p><ul className="ml-5 list-disc space-y-2 text-white/65"><li>Fès Medina guided tour. Explore one of the world's largest medinas, with more than 9,000 winding streets spread across 365 hectares. Visit Al Qarawiyin University, a mausoleum, and the famous leather tannery viewpoint.</li><li>Enjoy free time in the evening to explore, shop, or relax.</li></ul></>)}
        {card(<><p className="text-[var(--chapter-accent)]">Stay</p><p>Hotel Zahrat Al Jabal or similar</p></>)}
      </DayArticle>
      <DayArticle date="Day 6 · Thursday, September 10, 2026" title="Fès · Ifrane · Midelt">
        {card(<><p className="text-[var(--chapter-accent)]">Meals</p><p>Breakfast, lunch, and dinner included</p></>)}
        {card(<><p className="text-[var(--chapter-accent)]">Activities</p><ul className="ml-5 list-disc space-y-2 text-white/65"><li>Travel inland toward the High Atlas Mountains with a tea stop in Ifrane.</li><li>Upon arrival at Midelt, share a home-cooked Berber lunch with a local family, followed by the Berber Village Walk in the foothills of the Atlas Mountains.</li><li>Join an introduction to traditional henna art led by local women.</li></ul></>)}
        {card(<><p className="text-[var(--chapter-accent)]">Stay</p><p>Hotel Kasbah Asmaa Midelt or similar</p></>)}
      </DayArticle>
      <DayArticle date="Day 7 · Friday, September 11, 2026" title="Midelt · Arfoud · Merzouga">
        {card(<><p className="text-[var(--chapter-accent)]">Meals</p><p>Breakfast and dinner included</p></>)}
        {card(<><p className="text-[var(--chapter-accent)]">Activities</p><ul className="ml-5 list-disc space-y-2 text-white/65"><li>Journey south through changing landscapes toward the towering Erg Chebbi dunes.</li><li>Stop in Arfoud to learn about dates and desert culture.</li><li>Ride camels into the Sahara camp and climb a nearby dune for sunset.</li><li>Enjoy dinner by firelight with Berber music beneath the stars.</li></ul></>)}
        {card(<><p className="text-[var(--chapter-accent)]">Stay</p><p>Auberge Dunes D'Or desert camp or similar</p></>)}
      </DayArticle>
      <DayArticle date="Day 8 · Saturday, September 12, 2026" title="Merzouga · Sahara Desert Immersion">
        {card(<><p className="text-[var(--chapter-accent)]">Meals</p><p>Breakfast, lunch, and dinner included</p></>)}
        {card(<><p className="text-[var(--chapter-accent)]">Activities</p><ul className="ml-5 list-disc space-y-2 text-white/65"><li>Explore Erg Chebbi by 4x4 and visit a kohl mine.</li><li>Meet Amazigh nomads for mint tea and a glimpse of desert life.</li><li>Visit Khamlia for Gnaoua music.</li><li>Join a Medfouna cooking experience in Taous village.</li><li>Return to Merzouga for free time, dinner, a bonfire, and music.</li></ul></>)}
        {card(<><p className="text-[var(--chapter-accent)]">Stay</p><p>Auberge Dunes D'Or or similar</p></>)}
      </DayArticle>
      <DayArticle date="Day 9 · Sunday, September 13, 2026" title="Merzouga · Skoura">
        {card(<><p className="text-[var(--chapter-accent)]">Meals</p><p>Breakfast, lunch, and dinner included</p></>)}
        {card(<><p className="text-[var(--chapter-accent)]">Activities</p><ul className="ml-5 list-disc space-y-2 text-white/65"><li>Leave the Sahara for Skoura, a fertile oasis of date palms with views toward the snowcapped Atlas Mountains.</li><li>Stop near Tinghir.</li><li>Join a guided walk through the Valley of One Thousand Kasbahs.</li></ul></>)}
        {card(<><p className="text-[var(--chapter-accent)]">Stay</p><p>Dar Panorama Skoura or similar</p></>)}
      </DayArticle>
      <DayArticle date="Day 10 · Monday, September 14, 2026" title="Skoura · Aït Ben Haddou · Marrakech">
        {card(<><p className="text-[var(--chapter-accent)]">Meals</p><p>Breakfast included</p></>)}
        {card(<><p className="text-[var(--chapter-accent)]">Activities</p><ul className="ml-5 list-disc space-y-2 text-white/65"><li>Cross the High Atlas and Tizi n'Tichka pass on the road to Marrakech.</li><li>Explore the UNESCO-listed earthen ksar of Aït Ben Haddou, known for its hilltop views and appearances in films and television.</li><li>Optional evening walk through Marrakech's Gueliz district to Menara Gardens.</li></ul></>)}
        {card(<><p className="text-[var(--chapter-accent)]">Stay</p><p>YAAD Hotel Marrakech or similar</p></>)}
      </DayArticle>
      <DayArticle date="Day 11 · Tuesday, September 15, 2026" title="Marrakech · Culture & Medina">
        {card(<><p className="text-[var(--chapter-accent)]">Meals</p><p>Breakfast and lunch included</p></>)}
        {card(<><p className="text-[var(--chapter-accent)]">Activities</p><ul className="ml-5 list-disc space-y-2 text-white/65"><li>Visit the G Adventures-supported Zarbiat Achbarou Cooperative for a hands-on weaving experience and lunch with the women behind the project.</li><li>Explore Bahia Palace and Ben Youssef Madrasa.</li><li>Walk through Marrakech's immersive medina and souks with a local guide.</li><li>Optional farewell dinner at a food stall in Djemaa el-Fnaa square.</li></ul></>)}
        {card(<><p className="text-[var(--chapter-accent)]">Stay</p><p>YAAD Hotel Marrakech or similar</p></>)}
      </DayArticle>
      <DayArticle date="Day 12 · Wednesday, September 16, 2026" title="Depart Marrakech">
        {card(<><p className="text-[var(--chapter-accent)]">Meals</p><p>Breakfast included</p></>)}
        {card(<><p className="text-[var(--chapter-accent)]">RAM Express · AT410</p><p>Depart Marrakech Menara Airport (RAK) · Terminal 1 · 1:45 PM</p><p>Arrive Casablanca Mohammed V International Airport (CMN) · Terminal 2 · 2:45 PM</p><p className="mt-2 text-white/50">Economy · 1h flight</p></>)}
        {card(<><p className="text-[var(--chapter-accent)]">Casablanca Connection</p><p>2-hour transit in Casablanca · Terminal change from Terminal 2 to Terminal 1</p></>)}
        {card(<><p className="text-[var(--chapter-accent)]">Royal Air Maroc · AT210</p><p>Depart Casablanca Mohammed V International Airport (CMN) · Terminal 1 · 4:45 PM</p><p>Arrive Toronto Pearson International Airport (YYZ) · Terminal 1 · 8:10 PM</p><p className="mt-2 text-white/50">Economy · 8h 25m flight</p></>)}
      </DayArticle>
    </>
  );
}

function XiaoliuqiuContent({ card }: { card: (children: React.ReactNode) => React.ReactNode }) {
  return (
    <>
      <DayArticle date="Friday, November 20, 2026" title="Arrival Day · Xiaoliuqiu">
        {card(
          <>
            <p>🌅 Anthony, Christine, Mona & Mark arriving Xiaoliuqiu</p>
            <p className="mt-2 text-white/50">
              高雄左營高鐵站 → 10:30 AM 客運 → 屏客東港總站 → 步行10分鐘東港碼頭 → 吃完中餐 → 13:30 PM <a href="https://www.leucosapphire.com/" target="_blank" rel="noopener noreferrer" className="text-[var(--chapter-accent)] hover:underline">藍白船班</a> → 與Jim碼頭集合
            </p>
          </>
        )}
        {card(
          <>
            <p>🤿 Open Water Lesson · Christine & Mark</p>
            <ul className="ml-5 list-disc space-y-1 text-white/65">
              <li>裝備組裝介紹</li>
              <li>註: 進島前須先完成電子教材喔!</li>
            </ul>
          </>
        )}
        {card(<p>🍽 Dinner · <a href="https://maps.google.com/?q=岩石二館+小琉球" target="_blank" rel="noopener noreferrer" className="text-[var(--chapter-accent)] hover:underline">岩石二館</a></p>)}
      </DayArticle>

      <DayArticle date="Saturday, November 21, 2026" title="Open Water Dive Day">
        {card(
          <>
            <p>🌊 Open Water Lesson</p>
            <ul className="ml-5 list-disc space-y-1 text-white/65">
              <li>Morning: Close Water Dive #1</li>
              <li>Afternoon: Open Water Dive #2 & #3</li>
              <li>Evening: Review 檢討與說明</li>
            </ul>
          </>
        )}
        {card(
          <>
            <p>⛴ Xenia, David, Naomi, Jenn, Hiroshi, Masashi & Miyari arriving Xiaoliuqiu</p>
            <p className="mt-2 text-sm font-medium text-white/80">Southern Xiaoliuqiu Exploration</p>
            <div className="mt-4 flex flex-col gap-4 md:flex-row">
              <ul className="ml-5 flex-1 list-disc space-y-1 text-white/65">
                <li><a href="https://maps.google.com/?q=琉行綠色隧道+小琉球" target="_blank" rel="noopener noreferrer" className="text-[var(--chapter-accent)] hover:underline">琉行綠色隧道</a></li>
                <li><a href="https://maps.google.com/?q=烏鬼洞+小琉球" target="_blank" rel="noopener noreferrer" className="text-[var(--chapter-accent)] hover:underline">烏鬼洞</a></li>
                <li><a href="https://maps.google.com/?q=落日亭+小琉球" target="_blank" rel="noopener noreferrer" className="text-[var(--chapter-accent)] hover:underline">落日亭 Sunset View</a></li>
                <li>Dessert · <a href="https://maps.google.com/?q=海找冰+小琉球" target="_blank" rel="noopener noreferrer" className="text-[var(--chapter-accent)] hover:underline">海找冰</a></li>
              </ul>
              <img src="/xlqmap.png" alt="Xiaoliuqiu map" className="h-auto w-full rounded-2xl object-contain bg-black/20 p-2 md:w-1/2" />
            </div>
          </>
        )}
        {card(<p>🍽 Dinner · <a href="https://maps.google.com/?q=夏味鮮+小琉球" target="_blank" rel="noopener noreferrer" className="text-[var(--chapter-accent)] hover:underline">夏味鮮</a></p>)}
      </DayArticle>

      <DayArticle date="Sunday, November 22, 2026" title="Dive + Northern Island Day">
        {card(
          <>
            <p>🤿 Open Water Lesson</p>
            <ul className="ml-5 list-disc space-y-1 text-white/65">
              <li>Morning: Open Water Dive #4 & #5 + Anthony & David</li>
              <li>Afternoon: Fun Dive (2 dives) Xenia & Jennifer</li>
            </ul>
          </>
        )}
        {card(
          <>
            <p>🍽 Lunch · <a href="https://maps.google.com/?q=巫里小餐館+小琉球" target="_blank" rel="noopener noreferrer" className="text-[var(--chapter-accent)] hover:underline">巫里小餐館</a></p>
            <p className="mt-2 text-white/55">Early Lunch: Jenn, Hiroshi, Xenia, and the kid.</p>
            <p className="text-white/55">Late Lunch: Mark, Anthony, Christine, David</p>
          </>
        )}
        {card(<p>👶 Toddler Group 小琉球海洋館</p>)}
        {card(
          <>
            <p>🌅 Northern Xiaoliuqiu Visits</p>
            <ul className="mt-4 ml-5 list-disc space-y-2 text-white/65">
              <li><a href="https://maps.google.com/?q=美人洞+小琉球" target="_blank" rel="noopener noreferrer" className="text-[var(--chapter-accent)] hover:underline">美人洞</a></li>
              <li><a href="https://maps.google.com/?q=花瓶岩+小琉球" target="_blank" rel="noopener noreferrer" className="text-[var(--chapter-accent)] hover:underline">花瓶岩</a></li>
              <li><a href="https://maps.google.com/?q=龍蝦洞+小琉球" target="_blank" rel="noopener noreferrer" className="text-[var(--chapter-accent)] hover:underline">龍蝦洞</a></li>
              <li><a href="https://maps.google.com/?q=琉球共融公園+小琉球" target="_blank" rel="noopener noreferrer" className="text-[var(--chapter-accent)] hover:underline">琉球共融公園</a></li>
            </ul>
          </>
        )}
        {card(<p>🍽 Dinner · <a href="https://maps.google.com/?q=蜜仔琉部餐館+小琉球" target="_blank" rel="noopener noreferrer" className="text-[var(--chapter-accent)] hover:underline">蜜仔琉部 餐館</a></p>)}
      </DayArticle>

      <DayArticle date="Monday, November 23, 2026" title="Departure to Taipei">
        {card(
          <>
            <p>🍳 Breakfast · <a href="https://maps.google.com/?q=琉浪日嚐+小琉球" target="_blank" rel="noopener noreferrer" className="text-[var(--chapter-accent)] hover:underline">琉浪日嚐</a></p>
            <p>⛴ Everyone leaving Xiaoliuqiu · 12:50 PM boat</p>
            <p>🍣 Lunch · 東港漁市場</p>
            <p>🚄 Afternoon · 左營 → 台北</p>
          </>
        )}
      </DayArticle>
    </>
  );
}

function OnnaContent({ card, linkedImage }: { card: (children: React.ReactNode) => React.ReactNode; linkedImage: (src: string, alt: string) => React.ReactNode }) {
  return (
    <>
      <DayArticle date="Friday, November 27, 2026" rentalCarDate="2026-11-27" title="Morning Arrival · Naha">
        {card(<><p>✈ EVA Air BR112 · Arrive 9:15 AM at Naha Airport</p><p>🚗 Pick up rental car · Rental Company TBD</p></>)}
        {card(
          <>
            <p className="text-[var(--chapter-accent)]">🕛 Lunch · <a href="https://okinawa.letsgojp.com/archives/405500/" target="_blank" rel="noopener noreferrer" className="hover:underline">Senaga Island</a></p>
            <ul className="mt-3 ml-5 list-disc space-y-2 text-white/65">
              <li>如果天氣好 + 飛機準時，開車前往 瀨長島 Umikaji Terrace stroll.</li>
              <li>MKCafe · 可以看海景、飛機起落、Mackerel Bitter Melon Burger (鯖魚苦瓜漢堡).</li>
            </ul>
            {linkedImage("/umikaji-terrace.png", "Umikaji Terrace Okinawa")}
          </>
        )}
        {card(
          <>
            <p className="text-[var(--chapter-accent)]">Afternoon · Option 1</p>
            <ul className="mt-3 ml-5 list-disc space-y-2 text-white/65">
              <li><a href="https://maps.google.com/?q=San-A+PARCO+CITY+Okinawa" target="_blank" rel="noopener noreferrer" className="text-[var(--chapter-accent)] hover:underline">PARCO City</a> · biggest shopping centre with indoor toddler facilities.</li>
              <li>Afternoon tea / dessert & stroll at <a href="https://maps.google.com/?q=Minatogawa+Stateside+Town+Okinawa" target="_blank" rel="noopener noreferrer" className="text-[var(--chapter-accent)] hover:underline">港川外人住宅 Minatogawa State Side Town</a>.</li>
              <li>Beans Store & Canele dessert.</li>
            </ul>
          </>
        )}
        {card(
          <>
            <p className="text-[var(--chapter-accent)]">Afternoon · Option 2</p>
            <ul className="mt-3 ml-5 list-disc space-y-2 text-white/65">
              <li><a href="https://maps.google.com/?q=Araha+Beach+Park+Okinawa" target="_blank" rel="noopener noreferrer" className="text-[var(--chapter-accent)] hover:underline">Araha Beach Park</a> playground, if weather is nice.</li>
              <li><a href="https://maps.google.com/?q=AEON+Mall+Rycom+Okinawa" target="_blank" rel="noopener noreferrer" className="text-[var(--chapter-accent)] hover:underline">Aeon Mall Rycom</a> to pick up essentials, also works as rain backup.</li>
              <li>🚗 <a href="https://maps.google.com/?q=Hotel+Monterey+Okinawa+Spa+%26+Resort" target="_blank" rel="noopener noreferrer" className="text-[var(--chapter-accent)] hover:underline">Drive to resort</a> · approximately 45 minutes.</li>
            </ul>
          </>
        )}
      </DayArticle>
      <DayArticle date="Saturday, November 28, 2026" rentalCarDate="2026-11-28" title="Resort Day · Beach / Culture / Blue Cave">{card(<p>🍳 Breakfast · Hotel buffet</p>)}{card(<><p>🤿 Blue Cave dive & snorkel 青之洞窟潛水</p><p className="text-white/50">Weather dependent</p>{linkedImage("/bluecave.png", "Blue Cave Okinawa")}</>)}{card(<a href="https://www.ryukyumura.co.jp/" target="_blank" rel="noopener noreferrer" className="text-[var(--chapter-accent)] hover:underline">🏯 Ryukyu Mura with FunPass</a>)}{card(<><a href="https://www.hotelmonterey.co.jp/en/okinawa/activity/" target="_blank" rel="noopener noreferrer" className="text-[var(--chapter-accent)] hover:underline">🏖 Resort & Beach Activities</a>{linkedImage("/hotel.png", "Hotel Monterey Okinawa")}</>)}{card(<p>🍽 Dinner · TBD</p>)}</DayArticle>
      <DayArticle date="Sunday, November 29, 2026" rentalCarDate="2026-11-29" title="Albert & Quinn Wedding Day">{card(<><p>🍳 Breakfast · Hotel buffet</p><p>💍 11:00 AM · Albert & Quinn Wedding Ceremony at Hotel Monterey Chapel</p><p>🥂 12:30 PM - 1:30 PM · Cocktail Hour &amp; Hors d&apos;Oeuvres</p><p>🍽 1:30 PM - 3:30 PM · Wedding Lunch Reception</p><p>🎉 7:30 PM · After Party</p>{linkedImage("/chapel.png", "Wedding Chapel Okinawa")}</>)}</DayArticle>
    </>
  );
}

function NagoContent({ card, linkedImage }: { card: (children: React.ReactNode) => React.ReactNode; linkedImage: (src: string, alt: string) => React.ReactNode }) {
  return (
    <>
      <DayArticle date="Monday, November 30, 2026" rentalCarDate="2026-11-30" title="Onna → Nago">
        {card(<><p>🍳 Breakfast · Hotel buffet</p><p>🧳 Checkout at 10:00 AM</p></>)}
        {card(
          <>
            <p><a href="https://maps.google.com/?q=Cape+Manzamo+Okinawa" target="_blank" rel="noopener noreferrer" className="text-[var(--chapter-accent)] hover:underline">🌊 萬座毛 Cape Manzamo</a> · ~40 min drive · quick stop</p>
            <p className="mt-3 text-white/60">沖繩非常著名的海岸懸崖景點。</p>
            <p className="mt-2 text-white/45">If weather is not good, this can be swapped to the returning drive day on December 2.</p>
            {linkedImage("/cape.png", "Cape Manzamo Okinawa")}
          </>
        )}
        {card(
          <>
            <p><a href="https://maps.google.com/?q=Busena+Marine+Park+Okinawa" target="_blank" rel="noopener noreferrer" className="text-[var(--chapter-accent)] hover:underline">🌊 海中展望塔 Busena Marine Park</a></p>
            <p className="mt-2 text-white/60">Underwater Observatory + Glass Boat</p>
            {linkedImage("/busena.png", "Busena Marine Park")}
          </>
        )}
        {card(
          <>
            <p className="text-[var(--chapter-accent)]">🍽 Lunch Options</p>
            <ul className="mt-3 ml-5 list-disc space-y-2 text-white/65">
              <li><a href="https://maps.google.com/?q=Nakamura+Soba+Kintiti+Soba+Onna+Branch" target="_blank" rel="noopener noreferrer" className="text-[var(--chapter-accent)] hover:underline">Nakamura Soba / Kintiti Soba Onna Branch 金月そば 恩納店</a> · between Cape Manzamo & Busena Park.</li>
              <li><a href="https://maps.google.com/?q=Nuchigusui+Okinawa+Cuisine" target="_blank" rel="noopener noreferrer" className="text-[var(--chapter-accent)] hover:underline">Nuchigusui ぬちぐすい Okinawa Cuisine</a>.</li>
              <li><a href="https://maps.google.com/?q=Nagumagai+Restaurant+Okinawa" target="_blank" rel="noopener noreferrer" className="text-[var(--chapter-accent)] hover:underline">Nagumagai Restaurant 名護曲</a> · between Busena Park & Nago.</li>
            </ul>
          </>
        )}
        {card(
          <>
            <p><a href="https://maps.google.com/?q=Orion+Happy+Park+Nago" target="_blank" rel="noopener noreferrer" className="text-[var(--chapter-accent)] hover:underline">🍺 14:00 - 16:00 Orion Happy Park</a></p>
            <ul className="mt-3 ml-5 list-disc space-y-2 text-white/65">
              <li>參觀啤酒製作過程。</li>
              <li>了解沖繩啤酒歷史。</li>
              <li>免費試飲 Orion Beer。</li>
              <li>工廠導覽需事先網路預約，費用 1000 日圓/人。結束後可試喝二杯啤酒。導覽以日語為主，有提供中文資料說明。</li>
            </ul>
            {linkedImage("/orion.png", "Orion Happy Park")}
          </>
        )}
        {card(
          <>
            <p>🍽 Dinner · <a href="https://maps.google.com/?q=Yakiniku+Kochan+Nago" target="_blank" rel="noopener noreferrer" className="text-[var(--chapter-accent)] hover:underline">Yakiniku Kochan 焼肉こうちゃん</a></p>
            <p className="mt-2 text-white/60">Closed Tuesday.</p>
            <p className="mt-4">🛍 還有精神的可以去 <a href="https://maps.google.com/?q=MEGA+Don+Quijote+Nago" target="_blank" rel="noopener noreferrer" className="text-[var(--chapter-accent)] hover:underline">MEGA Don Quijote Nago 唐吉訶德名護店</a> 瞎拚採買。</p>
          </>
        )}
      </DayArticle>
      <DayArticle date="Tuesday, December 1, 2026" rentalCarDate="2026-12-01" title="Aquarium + Kouri Island">
        {card(<><p>🍽 7:30 Breakfast buffet at hotel</p><p>🚗 8:45 Leave Nago Hotel · drive ~35-40 min</p></>)}
        {card(
          <>
            <p><a href="https://maps.google.com/?q=Okinawa+Churaumi+Aquarium" target="_blank" rel="noopener noreferrer" className="text-[var(--chapter-accent)] hover:underline">🐠 9:30 - 13:00 Churaumi Aquarium</a> · FunPass</p>
            <ul className="mt-3 ml-5 list-disc space-y-2 text-white/65">
              <li>Whale shark mega tank</li>
              <li>Dolphin area outside</li>
              <li>Ocean Expo Park seaside lawns</li>
            </ul>
            {linkedImage("/aquarium.png", "Churaumi Aquarium")}
          </>
        )}
        {card(
          <>
            <p className="text-[var(--chapter-accent)]">🍽 13:00 - 14:00 Lunch</p>
            <p className="mt-2 text-white/65">Inside the aquarium, the Ocean Blue Cafe has tables right next to the whale shark tank.</p>
            <p className="mt-2 text-white/45">Put the reservation name on the waitlist immediately upon arrival.</p>
          </>
        )}
        {card(
          <>
            <p><a href="https://maps.google.com/?q=Bise+Fukugi+Tree+Road+Okinawa" target="_blank" rel="noopener noreferrer" className="text-[var(--chapter-accent)] hover:underline">🌳 14:00 - 15:00 Bise Fukugi Tree Road</a></p>
            <p className="mt-2 text-white/65">綠色福木隧道、傳統沖繩村落，非常適合散步拍照。</p>
            {linkedImage("/tree.png", "Bise Fukugi Tree Road")}
          </>
        )}
        {card(
          <>
            <p><a href="https://maps.google.com/?q=Kouri+Island+Okinawa" target="_blank" rel="noopener noreferrer" className="text-[var(--chapter-accent)] hover:underline">🌊 15:30 - 17:00 Kouri Island</a></p>
            <ul className="mt-3 ml-5 list-disc space-y-2 text-white/65">
              <li>Kouri Bridge</li>
              <li>Cafe stop</li>
              <li>Beach walk & sunset</li>
              <li>Scenic drive</li>
              <li>Optional: Kouri Ocean Tower, 45-60 min if energy allows</li>
            </ul>
            {linkedImage("/kouri.png", "Kouri Island")}
          </>
        )}
        {card(<><p>🍽 Dinner · <a href="https://share.google/nhtDdtE6vYP48ws81" target="_blank" rel="noopener noreferrer" className="text-[var(--chapter-accent)] hover:underline">Restaurant Flipper</a></p><p className="mt-2 text-white/60">Okinawa-style steaks with garlic butter & house sauce. Closed Wednesday.</p></>)}
      </DayArticle>
    </>
  );
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
  return (
    <>
      <DayArticle date="Wednesday, December 2, 2026" rentalCarDate="2026-12-02" title="Nago → Nanjo">
        {card(<><p className="text-[var(--chapter-accent)]">Morning & Day</p><p>🎢 Option 1 · Kids age 4+ & adults</p><p><a href="https://junglia.jp/en" target="_blank" rel="noopener noreferrer" className="text-[var(--chapter-accent)] hover:underline">Junglia Park</a></p><div className="mt-4" /><p>🦁 Option 2 · Kids age 1–3</p><p><a href="https://maps.google.com/?q=Nago+Pineapple+Park" target="_blank" rel="noopener noreferrer" className="text-[var(--chapter-accent)] hover:underline">Nago Pineapple Park</a> or <a href="https://maps.google.com/?q=Neo+Park+Okinawa" target="_blank" rel="noopener noreferrer" className="text-[var(--chapter-accent)] hover:underline">Neo Park Zoo</a></p></>)}
        {card(
          <>
            <p className="text-[var(--chapter-accent)]">Afternoon · Miyagi Coast & American Village</p>
            <p className="mt-2">🚗 Leaving Nago and drive approximately 1 hour toward <a href="https://maps.google.com/?q=Miyagi+Coast+Okinawa" target="_blank" rel="noopener noreferrer" className="text-[var(--chapter-accent)] hover:underline">Miyagi Coast</a> & American Village.</p>
            <ul className="mt-3 ml-5 list-disc space-y-2 text-white/65">
              <li>Blue Seal Ice Cream · FunPass</li>
              <li><a href="https://maps.google.com/?q=Zhyvago+Coffee+Roastery+Okinawa" target="_blank" rel="noopener noreferrer" className="text-[var(--chapter-accent)] hover:underline">Zhyvago Coffee Roastery</a> has great vibes.</li>
              <li><a href="https://maps.google.com/?q=Chatan+Burger+Base+Atabii%27s" target="_blank" rel="noopener noreferrer" className="text-[var(--chapter-accent)] hover:underline">Chatan Burger Base Atabii&apos;s</a> for excellent burgers right on the water.</li>
            </ul>
            <img src="/america.png" alt="American Village Okinawa" className="mt-4 h-56 w-full rounded-2xl object-cover object-center" />
            <p className="mt-4">🍽 Dinner · <a href="https://maps.app.goo.gl/PXMBGjZ1AsTNkSVT9" target="_blank" rel="noopener noreferrer" className="text-[var(--chapter-accent)] hover:underline">Taco Rice Cafe Kijimuna</a></p>
            <p className="mt-2 text-white/60">Famous for Omutaco（蛋包塔可飯）— taco rice topped with a fluffy omelet, usually a big hit with kids.</p>
            <p className="mt-4">🚗 Evening drive to hotel · <a href="https://maps.google.com/?q=Yuinchi+Hotel+Nanjo" target="_blank" rel="noopener noreferrer" className="text-[var(--chapter-accent)] hover:underline">Yuinchi Hotel Nanjo</a></p>
          </>
        )}
      </DayArticle>
      <DayArticle date="Thursday, December 3, 2026" rentalCarDate="2026-12-03" title="Nanjo · Okinawa World + Gangala Valley">
        {card(<><p>🍳 Breakfast · Hotel buffet</p><p>🚕 Steven takes taxi to Naha Airport on his own</p></>)}
        {card(
          <>
            <p>🌏 <a href="https://maps.google.com/?q=Okinawa+World" target="_blank" rel="noopener noreferrer" className="text-[var(--chapter-accent)] hover:underline">Okinawa World 沖繩世界（玉泉洞）</a> · FunPass · ~10 min drive from hotel</p>
            <ul className="mt-3 ml-5 list-disc space-y-2 text-white/65">
              <li>玉泉洞鐘乳石洞</li>
              <li>琉球文化村</li>
              <li>太鼓舞表演</li>
            </ul>
            <img src="/cave.png" alt="Okinawa World Cave" className="mt-4 h-56 w-full rounded-2xl object-cover object-center" />
          </>
        )}
        {card(
          <>
            <p>🌏 Gangala之谷</p>
            <p className="mt-2 text-white/65">往自駕導航至「Cave Cafe」或「Gangala之谷」即可，有免費停車場。</p>
            <p className="mt-3 text-white/60">沖繩 Gangala 之谷（ガンガラーの谷）是位於沖繩南部南城市的熱門自然景點，以數十萬年前形成的鐘乳石洞穴崩塌所構成的森林山谷聞名。</p>
            <p className="mt-3 text-white/60">這裡不僅是「港川人」考古遺址，還設有著名的洞穴咖啡廳。導覽行程需事先預約，每日每人約 2,500 日圓，且通常結合旁邊的沖繩世界（玉泉洞）一起遊覽。</p>
            <a href="https://book.gangala.com/?lng=zh-TW" target="_blank" rel="noopener noreferrer" className="mt-4 inline-block text-[var(--chapter-accent)] hover:underline">Gangala Valley reservation</a>
            <img src="/gangala.png" alt="Gangala Valley" className="mt-4 h-56 w-full rounded-2xl object-cover object-center" />
          </>
        )}
        {card(<p>🍽 Dinner · Hotel Japanese dinner buffet, or a private event can be arranged for the hotel Observation Lounge catering experience for up to 10 people.</p>)}
        {card(<p>🛒 Optional evening stop · <a href="https://maps.google.com/?q=Costco+Nanjo+Okinawa" target="_blank" rel="noopener noreferrer" className="text-[var(--chapter-accent)] hover:underline">Costco Nanjo</a></p>)}
      </DayArticle>
    </>
  );
}

function NahaEarlyContent({ card, linkedImage }: { card: (children: React.ReactNode) => React.ReactNode; linkedImage: (src: string, alt: string) => React.ReactNode }) {
  return <><DayArticle date="Wednesday, November 25, 2026" rentalCarDate="2026-11-25" title="Morning Arrival · Naha">{card(<><p>✈ EVA Air BR112 · Arrive 9:15 AM at Naha Airport</p><p>🚗 Pick up rental car</p></>)}{card(<><p>🕛 Lunch · <a href="https://okinawa.letsgojp.com/archives/405500/" target="_blank" rel="noopener noreferrer" className="text-[var(--chapter-accent)] hover:underline">Senaga Island · Umikaji Terrace</a></p><p>如果天氣好 + 飛機準時，可前往瀨長島散步。</p><p>🍔 MKCafe · Ocean view & Mackerel Bitter Melon Burger</p></>)}{card(<><p>🏯 Shuri Castle if reopened</p><p>🛍 Kokusai dori 國際通 · Calbee Okinawa · 御果子御殿 · Tsuboya Pottery Street</p><img src="/shop.png" alt="Naha Shopping" className="mt-4 h-56 w-full rounded-2xl object-cover object-center" /></>)} </DayArticle><DayArticle date="Thursday, November 26, 2026" rentalCarDate="2026-11-26" title="Okinawa World + Gangala Valley">{card(<><p>🐟 10:00 AM · Tomari Iyumachi Fish Market Brunch</p></>)}{card(<><p>🌏 <a href="https://maps.google.com/?q=Okinawa+World" target="_blank" rel="noopener noreferrer" className="text-[var(--chapter-accent)] hover:underline">沖繩世界（玉泉洞） Okinawa World</a> · Fun Pass</p><ul className="ml-5 list-disc text-white/65"><li>玉泉洞鐘乳石洞</li><li>琉球文化村</li><li>太鼓舞表演</li></ul><img src="/cave.png" alt="Okinawa World Cave" className="mt-4 h-56 w-full rounded-2xl object-cover object-center" /></>)}{card(<><p>🌿 Gangala之谷</p><p>導航可搜尋「Cave Cafe」或「Gangala之谷」，附免費停車場。</p><p className="text-white/60">沖繩南部熱門自然景點，以鐘乳石洞穴崩塌形成的森林山谷聞名。</p><p className="text-white/60">導覽需事先預約，每人約 2,500 日圓。</p><a href="https://book.gangala.com/?lng=zh-TW" target="_blank" rel="noopener noreferrer" className="text-[var(--chapter-accent)] hover:underline">Gangala Valley Reservation</a><img src="/gangala.png" alt="Gangala Valley" className="mt-4 h-56 w-full rounded-2xl object-cover object-center" /></>)}{card(<p>🍽 Dinner · TBD</p>)} </DayArticle></>;
}

function NahaContent({ card }: { card: (children: React.ReactNode) => React.ReactNode }) {
  return <><DayArticle date="Friday, December 4, 2026" rentalCarDate="2026-12-04" title="Nanjo → Naha">{card(<><p>🧳 9:00 AM · Checkout hotel</p><p>🚗 Drive from Nanjo → Naha · approximately 30 min</p></>)}{card(<><p>🐟 11:00 AM · Tomari Iyumachi Fish Market Brunch</p></>)}{card(<><p>🏯 Shuri Castle if reopened</p><p>🛍 Kokusai dori 國際通 · Calbee Okinawa · 御果子御殿 · Tsuboya Pottery Street</p><img src="/shop.png" alt="Kokusai Dori Shopping" className="mt-4 h-56 w-full rounded-2xl object-cover object-center" /></>)} </DayArticle><DayArticle date="Saturday, December 5, 2026" rentalCarDate="2026-12-05" title="Shopping + Aquarium Day">{card(<><p>🍳 Hotel breakfast buffet</p><p>🐟 Itoman Fish Market · Ashibinaa Outlet · DMM Kariyushi Aquarium</p></>)}</DayArticle><DayArticle date="Sunday, December 6, 2026" rentalCarDate="2026-12-06" title="Departure Day">{card(<><p>🧳 Hotel checkout at 7:15 AM</p><p>✈️ EVA Air BR113 · OKA 10:15 → TPE 10:55</p></>)}</DayArticle></>;
}
