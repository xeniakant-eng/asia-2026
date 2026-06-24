"use client";

import { FormEvent, useState } from "react";

export default function LoginPage() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGuestSubmitting, setIsGuestSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    const response = await fetch("/api/site-auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: "member", password }),
    });

    setIsSubmitting(false);
    if (response.ok) {
      const from = new URLSearchParams(window.location.search).get("from") || "/";
      window.location.href = from.startsWith("/") && !from.startsWith("//") ? from : "/";
      return;
    }

    setError(response.status === 503 ? "Password protection is not configured yet." : "Incorrect password.");
  }

  async function continueAsGuest() {
    setError("");
    setIsGuestSubmitting(true);
    const response = await fetch("/api/site-auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: "guest" }),
    });
    setIsGuestSubmitting(false);

    if (response.ok) {
      const from = new URLSearchParams(window.location.search).get("from") || "/";
      window.location.href = from.startsWith("/") && !from.startsWith("//") ? from : "/";
      return;
    }

    setError("Guest access is not available right now.");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-black px-6 text-white">
      <form onSubmit={handleSubmit} className="w-full max-w-sm rounded-[2rem] border border-white/10 bg-white/[0.04] p-8 text-center shadow-[0_0_40px_rgba(255,255,255,0.06)] backdrop-blur-xl">
        <p className="mb-3 text-xs uppercase tracking-[0.35em] text-white/70">Private Group Event</p>
        <h1 className="text-3xl font-light tracking-wide">XK Events</h1>
        <p className="mb-7 mt-3 text-sm leading-6 text-white/45">Choose how you would like to enter.</p>
        <button
          type="button"
          onClick={continueAsGuest}
          disabled={isSubmitting || isGuestSubmitting}
          className="w-full rounded-2xl border border-white/15 bg-white/[0.04] px-4 py-4 text-sm font-light uppercase tracking-[0.18em] text-white/70 transition hover:border-white/35 hover:bg-white/[0.08] disabled:cursor-wait disabled:opacity-45"
        >
          {isGuestSubmitting ? "Opening" : "Continue as Guest"}
        </button>
        <div className="my-6 flex items-center gap-3 text-[10px] uppercase tracking-[0.2em] text-white/25">
          <span className="h-px flex-1 bg-white/10" />
          Member Access
          <span className="h-px flex-1 bg-white/10" />
        </div>
        <label className="mb-2 block text-left text-xs uppercase tracking-[0.22em] text-white/45" htmlFor="site-password">
          Member Password
        </label>
        <input
          id="site-password"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          autoFocus
          className="mb-4 w-full rounded-2xl border border-white/15 bg-black/30 px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/25 focus:border-white/40"
          placeholder="Enter password"
        />
        {error && <p className="mb-4 rounded-2xl border border-red-300/20 bg-red-300/5 px-4 py-3 text-sm text-red-100/80">{error}</p>}
        <button
          type="submit"
          disabled={isSubmitting || isGuestSubmitting || !password}
          className="w-full rounded-2xl border border-[#FF8FC7]/35 bg-[#FF8FC7]/10 px-4 py-4 text-sm font-light uppercase tracking-[0.18em] text-[#FF8FC7] transition hover:border-[#FF8FC7]/60 hover:bg-[#FF8FC7]/15 disabled:cursor-not-allowed disabled:opacity-45"
        >
          {isSubmitting ? "Checking" : "Enter as Member"}
        </button>
      </form>
    </main>
  );
}
