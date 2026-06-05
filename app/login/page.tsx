"use client";

import { FormEvent, useState } from "react";

export default function LoginPage() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    const response = await fetch("/api/site-auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });

    setIsSubmitting(false);
    if (response.ok) {
      window.location.href = "/";
      return;
    }

    setError(response.status === 503 ? "Password protection is not configured yet." : "Incorrect password.");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-black px-6 text-white">
      <form onSubmit={handleSubmit} className="w-full max-w-sm rounded-[2rem] border border-white/10 bg-white/[0.04] p-8 text-center shadow-[0_0_40px_rgba(255,255,255,0.06)] backdrop-blur-xl">
        <p className="mb-3 text-xs uppercase tracking-[0.35em] text-white/70">Private Group Event</p>
        <h1 className="mb-4 text-3xl font-light tracking-wide">XK Events</h1>
        <label className="mb-2 block text-left text-xs uppercase tracking-[0.22em] text-white/45" htmlFor="site-password">
          Password
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
          disabled={isSubmitting || !password}
          className="w-full rounded-2xl border border-[#FF8FC7]/35 bg-[#FF8FC7]/10 px-4 py-4 text-sm font-light uppercase tracking-[0.18em] text-[#FF8FC7] transition hover:border-[#FF8FC7]/60 hover:bg-[#FF8FC7]/15 disabled:cursor-not-allowed disabled:opacity-45"
        >
          {isSubmitting ? "Checking" : "Enter"}
        </button>
      </form>
    </main>
  );
}
