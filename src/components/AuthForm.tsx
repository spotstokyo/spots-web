"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

interface AuthFormProps {
  mode: "login" | "signup";
}

const titles = {
  login: "Welcome back",
  signup: "Join spots",
} as const;

const helperText = {
  login: "Sign in with your email and password or Google.",
  signup: "Create an account with email and password.",
} as const;

export default function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [identifier, setIdentifier] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
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

  useEffect(() => {
    setStatus(null);
    setError(null);
    setEmail("");
    setIdentifier("");
    setUsername("");
    setPassword("");
    setConfirmPassword("");
  }, [mode]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setStatus(null);
    setError(null);

    if (mode === "login") {
      const trimmedIdentifier = identifier.trim();
      const trimmedPassword = password.trim();

      if (!trimmedIdentifier || !trimmedPassword) {
        setError("Email or username and password are required.");
        return;
      }

      try {
        setPending(true);

        let emailToUse = trimmedIdentifier;

        if (!trimmedIdentifier.includes("@")) {
          const { data: profile, error: profileError } = await supabase
            .from("profiles")
            .select("email, username")
            .eq("username", trimmedIdentifier.toLowerCase())
            .maybeSingle();

          if (profileError) {
            throw profileError;
          }

          if (!profile?.email) {
            setError("No account found with that username.");
            return;
          }

          emailToUse = profile.email;
        }

        const { data, error: authError } = await supabase.auth.signInWithPassword({
          email: emailToUse.trim(),
          password: trimmedPassword,
        });

        if (authError) {
          throw authError;
        }

        const user = data.user;
        const metadataUsername = (user?.user_metadata?.username as string | undefined)?.toLowerCase();
        const usernameUsed = metadataUsername ?? (!trimmedIdentifier.includes("@") ? trimmedIdentifier.toLowerCase() : null);

        if (user && emailToUse) {
          try {
            await supabase.from("profiles").upsert(
              {
                id: user.id,
                email: emailToUse.trim().toLowerCase(),
                username: usernameUsed ?? undefined,
              },
              { onConflict: "id" },
            );
          } catch (profileError) {
            console.warn("Unable to sync profile", profileError);
          }
        }

        setIdentifier("");
        setPassword("");
        router.replace("/feed");
        router.refresh();
      } catch (authError) {
        const message = authError instanceof Error ? authError.message : "Something went wrong.";
        setError(message);
      } finally {
        setPending(false);
      }
      return;
    }

    const trimmedEmail = email.trim().toLowerCase();
    const trimmedUsername = username.trim().toLowerCase();
    const trimmedPassword = password.trim();

    if (!trimmedEmail || !trimmedPassword || !trimmedUsername) {
      setError("Email, username, and password are required.");
      return;
    }

    if (!/^[a-z0-9_\.]{3,30}$/i.test(trimmedUsername)) {
      setError("Username must be 3-30 characters and can include letters, numbers, underscores, or dots.");
      return;
    }

    if (trimmedPassword !== confirmPassword.trim()) {
      setError("Passwords must match.");
      return;
    }

    try {
      setPending(true);

      const { data: existingUsername, error: usernameLookupError } = await supabase
        .from("profiles")
        .select("id")
        .eq("username", trimmedUsername)
        .maybeSingle();

      if (usernameLookupError && usernameLookupError.code !== "PGRST116") {
        throw usernameLookupError;
      }

      if (existingUsername) {
        setError("That username is already taken.");
        return;
      }

      const redirectToUrl = new URL("/auth/callback", window.location.origin);
      redirectToUrl.searchParams.set("redirect", "/profile");

      const { data, error: authError } = await supabase.auth.signUp({
        email: trimmedEmail,
        password: trimmedPassword,
        options: {
          emailRedirectTo: redirectToUrl.toString(),
          data: {
            username: trimmedUsername,
          },
        },
      });

      if (authError) {
        throw authError;
      }

      const userId = data.user?.id;

      if (userId) {
        try {
          await supabase.from("profiles").upsert(
            {
              id: userId,
              email: trimmedEmail,
              username: trimmedUsername,
            },
            { onConflict: "id" },
          );
        } catch (profileError) {
          console.warn("Unable to sync profile", profileError);
        }
      }

      setStatus("Check your inbox to confirm your account.");
      setEmail("");
      setUsername("");
      setPassword("");
      setConfirmPassword("");
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
      const redirectToUrl = new URL("/auth/callback", window.location.origin);
      redirectToUrl.searchParams.set("redirect", "/profile");

      const { error: authError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: redirectToUrl.toString(),
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

      <form onSubmit={handleSubmit} className="space-y-4">
        {mode === "login" ? (
          <div className="space-y-2">
            <label htmlFor="identifier" className="text-sm font-medium text-[#1d2742]">
              Email or username
            </label>
            <input
              id="identifier"
              type="text"
              value={identifier}
              onChange={(event) => setIdentifier(event.target.value)}
              placeholder="you@example.com or username"
              className="w-full rounded-2xl border border-white/55 bg-white/55 px-4 py-3 text-[#18223a] placeholder:text-[#7c89aa] shadow-inner focus:outline-none focus:ring-2 focus:ring-[#2a3554]/30"
              required
              autoComplete="username"
            />
          </div>
        ) : (
          <>
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
                className="w-full rounded-2xl border border-white/55 bg-white/55 px-4 py-3 text-[#18223a] placeholder:text-[#7c89aa] shadow-inner focus:outline-none focus:ring-2 focus:ring-[#2a3554]/30"
                required
                autoComplete="email"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="username" className="text-sm font-medium text-[#1d2742]">
                Username
              </label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                placeholder="your.username"
                className="w-full rounded-2xl border border-white/55 bg-white/55 px-4 py-3 text-[#18223a] placeholder:text-[#7c89aa] shadow-inner focus:outline-none focus:ring-2 focus:ring-[#2a3554]/30"
                required
                autoComplete="username"
              />
            </div>
          </>
        )}
        <div className="space-y-2">
          <label htmlFor="password" className="text-sm font-medium text-[#1d2742]">
            Password
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="••••••••"
            className="w-full rounded-2xl border border-white/55 bg-white/55 px-4 py-3 text-[#18223a] placeholder:text-[#7c89aa] shadow-inner focus:outline-none focus:ring-2 focus:ring-[#2a3554]/30"
            required
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            minLength={6}
          />
        </div>
        {mode === "signup" ? (
          <div className="space-y-2">
            <label htmlFor="confirm-password" className="text-sm font-medium text-[#1d2742]">
              Confirm password
            </label>
            <input
              id="confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              placeholder="••••••••"
              className="w-full rounded-2xl border border-white/55 bg-white/55 px-4 py-3 text-[#18223a] placeholder:text-[#7c89aa] shadow-inner focus:outline-none focus:ring-2 focus:ring-[#2a3554]/30"
              required
              autoComplete="new-password"
              minLength={6}
            />
          </div>
        ) : null}
        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-full border border-[#1d2742] bg-[#1d2742] px-5 py-3 text-sm font-semibold text-white shadow-[0_24px_52px_-32px_rgba(19,28,46,0.58)] transition hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? "Working…" : mode === "login" ? "Log in" : "Create account"}
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
