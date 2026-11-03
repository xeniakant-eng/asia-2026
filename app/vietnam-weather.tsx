"use client";

import { useEffect, useState } from "react";

const destinations: Record<string, { name: string; latitude: number; longitude: number }> = {
  Hanoi: { name: "Hanoi", latitude: 21.03, longitude: 105.85 },
  "Aime’e Cruise": { name: "Ha Long Bay", latitude: 20.94, longitude: 107.08 },
  "Ninh Binh": { name: "Ninh Binh", latitude: 20.25, longitude: 105.97 },
  "Ho Chi Minh City": { name: "Ho Chi Minh City", latitude: 10.82, longitude: 106.63 },
  Depart: { name: "Ho Chi Minh City", latitude: 10.82, longitude: 106.63 },
};

type Forecast = { low: number; high: number; rain: number | null };
type ForecastState = Forecast | "unavailable" | "outside-range" | null;

export default function VietnamWeather({ location, date }: { location: string; date: string }) {
  const destination = destinations[location];
  const [forecast, setForecast] = useState<ForecastState>(null);

  useEffect(() => {
    if (!destination) return;
    const controller = new AbortController();
    const params = new URLSearchParams({
      latitude: String(destination.latitude),
      longitude: String(destination.longitude),
      daily: "temperature_2m_min,temperature_2m_max,precipitation_probability_max",
      timezone: "Asia/Ho_Chi_Minh",
      forecast_days: "16",
    });

    async function refresh() {
      try {
        const response = await fetch("https://api.open-meteo.com/v1/forecast?" + params, { signal: controller.signal, cache: "no-cache" });
        if (!response.ok) throw new Error("Weather request failed");
        const { daily } = await response.json();
        if (controller.signal.aborted) return;
        const index = daily.time.indexOf(date);
        if (index === -1) {
          setForecast("outside-range");
          return;
        }
        const low = daily.temperature_2m_min[index];
        const high = daily.temperature_2m_max[index];
        const rain = daily.precipitation_probability_max[index];
        setForecast(Number.isFinite(low) && Number.isFinite(high)
          ? { low, high, rain: Number.isFinite(rain) ? rain : null }
          : "unavailable");
      } catch {
        if (!controller.signal.aborted) setForecast("unavailable");
      }
    }

    void refresh();
    const timer = window.setInterval(() => void refresh(), 30 * 60 * 1000);
    return () => { controller.abort(); window.clearInterval(timer); };
  }, [destination, date]);

  return (
    <div className="min-w-0 rounded-xl border border-white/10 bg-white/[0.04] p-3">
      <p className="text-sm font-medium text-white/90">{destination?.name ?? location}</p>
      <div aria-live="polite" className="text-xs text-white/75">
        {!destination || forecast === "unavailable" ? "Forecast unavailable right now." :
          forecast === "outside-range" ? "No live forecast for this date. Forecasts cover up to 16 days." :
          forecast ? <>{Math.round(forecast.low)}–{Math.round(forecast.high)}°C{forecast.rain !== null && <> · {forecast.rain}% chance of precipitation</>}</> :
          "Loading forecast…"}
      </div>
      <a href="https://open-meteo.com/" target="_blank" rel="noreferrer" className="mt-1 inline-block text-[10px] text-[#F6C65B] underline">Open-Meteo</a>
    </div>
  );
}