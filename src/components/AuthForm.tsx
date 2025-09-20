"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

interface AuthFormProps {
  mode: "login" | "signup";
}

const titles = {
  login: "Welcome back",
  signup: "Join spots",
} as const;

const helperText = {
  login: "Sign in with a magic link or Google.",
  signup: "Create an account to track your streaks.",
} as const;

export default function AuthForm({ mode }: AuthFormProps) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (!status && !error) return;
    const timer = window.setTimeout(() => {
      setStatus(null);
      setError(null);
    }, 5000);
    return () => window.clearTimeout(timer);
  }, [status, error]);

  const handleMagicLink = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!email.trim()) return;

    try {
      setPending(true);
      setStatus(null);
      setError(null);

      const redirectTo = `${window.location.origin}/profile`;
      const { error: authError } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          emailRedirectTo: redirectTo,
        },
      });

      if (authError) {
        throw authError;
      }

      setStatus("Check your inbox for the magic link.");
      setEmail("");
    } catch (authError) {
      const message = authError instanceof Error ? authError.message : "Something went wrong.";
      setError(message);
    } finally {
      setPending(false);
    }
  };

  const handleGoogle = async () => {
    try {
      setPending(true);
      const redirectTo = `${window.location.origin}/profile`;
      const { error: authError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo,
        },
      });

      if (authError) {
        throw authError;
      }
    } catch (authError) {
      const message = authError instanceof Error ? authError.message : "Unable to start Google sign-in.";
      setError(message);
      setPending(false);
    }
  };

  const oppositeMode = mode === "login" ? "signup" : "login";

  return (
    <div className="space-y-6">
      <div className="space-y-2 text-center">
        <h1 className="text-3xl font-semibold text-[#18223a]">{titles[mode]}</h1>
        <p className="text-sm text-[#4c5a7a]">{helperText[mode]}</p>
      </div>

      <form onSubmit={handleMagicLink} className="space-y-4">
        <div className="space-y-2">
          <label htmlFor="email" className="text-sm font-medium text-[#1d2742]">
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
            className="w-full rounded-2xl border border-white/55 bg-white/55 px-4 py-3 text-[#18223a] placeholder:text-[#7c89aa] shadow-inner focus:outline-none focus:ring-2 focus:ring-[#8ca7ff]/40"
            required
            autoComplete="email"
          />
        </div>
        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-full border border-white/60 bg-gradient-to-br from-[#5c7aff]/90 via-[#6d8dff]/85 to-[#4f6bff]/85 px-5 py-3 text-sm font-semibold text-white shadow-[0_24px_52px_-32px_rgba(74,106,255,0.8)] transition hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? "Sending…" : "Send me a magic link"}
        </button>
      </form>

      <div className="relative py-2 text-center text-xs uppercase tracking-[0.3em] text-[#7c89aa]">
        <span className="relative z-10 bg-white/55 px-3">or</span>
        <div className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-white/55" />
      </div>

      <button
        type="button"
        onClick={handleGoogle}
        disabled={pending}
        className="w-full rounded-full border border-white/55 bg-white/65 px-5 py-3 text-sm font-semibold text-[#1d2742] shadow-md transition hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-60"
      >
        Continue with Google
      </button>

      <p className="text-center text-sm text-[#4c5a7a]">
        {mode === "login" ? "New to spots?" : "Already have an account?"}
        {" "}
        <Link
          href={`/${oppositeMode}`}
          className="font-semibold text-[#18223a] underline-offset-4 hover:underline"
        >
          {mode === "login" ? "Create one" : "Log in"}
        </Link>
      </p>

      {(status || error) && (
        <div
          className={`rounded-2xl border px-4 py-3 text-sm shadow-inner backdrop-blur ${
            status
              ? "border-[#8fc7a6]/70 bg-[#e9fff3]/90 text-[#204836]"
              : "border-rose-200/80 bg-rose-50/90 text-rose-700"
          }`}
        >
          {status ?? error}
        </div>
      )}
    </div>
  );
}
