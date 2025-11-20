"use client";

import { useEffect } from "react";
import Link from "next/link";

interface GlobalErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

function isSupabaseUnavailable(error: Error & { cause?: unknown }) {
  const message = error.message?.toLowerCase() ?? "";
  if (message.includes("fetch failed")) {
    return true;
  }

  const code = (error as { code?: string | number })?.code;
  if (typeof code === "string" && code.toLowerCase() === "enotfound") {
    return true;
  }

  const cause = (error as { cause?: unknown })?.cause;
  if (cause && typeof cause === "object") {
    const causeMessage = "message" in cause ? String((cause as { message?: string }).message ?? "") : "";
    if (causeMessage.toLowerCase().includes("enotfound")) {
      return true;
    }

    const causeCode = "code" in cause ? (cause as { code?: string }).code : undefined;
    if (typeof causeCode === "string" && causeCode.toLowerCase() === "enotfound") {
      return true;
    }
  }

  return false;
}

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  const supabaseOffline = isSupabaseUnavailable(error);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-[#f5f7fb] px-6 text-center text-[#1d2742]">
      <div className="space-y-3">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-[#5a678a]">Something went wrong</p>
        <h1 className="text-3xl font-semibold">
          {supabaseOffline ? "We can't reach our data right now" : "This page failed to load"}
        </h1>
        <p className="text-sm text-[#4c5a7a]">
          {supabaseOffline
            ? "It looks like the Supabase API is unreachable. Double-check your connection and environment variables, then try again."
            : "The server hit an unexpected error. Try again, or head back home while we fix it."}
        </p>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={() => reset()}
          className="rounded-full border border-[#1d2742] bg-[#1d2742] px-5 py-2 text-sm font-semibold text-white shadow-[0_20px_45px_-28px_rgba(19,28,46,0.52)] transition hover:scale-[1.02]"
        >
          Try again
        </button>
        <Link
          href="/"
          className="rounded-full border border-white/40 bg-white px-5 py-2 text-sm font-semibold text-[#1d2742] shadow-sm transition hover:scale-[1.02]"
        >
          Go home
        </Link>
      </div>
      {error.digest && (
        <p className="text-xs text-[#7a86a8]">Error reference: {error.digest}</p>
      )}
    </div>
  );
}
