"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type ViewMode = "request" | "update";

export default function ResetPasswordForm() {
  const [mode, setMode] = useState<ViewMode>("request");
  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [recoveryEmail, setRecoveryEmail] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const initialize = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (!active) return;
        if (data.session?.user) {
          setMode("update");
          setRecoveryEmail(data.session.user.email ?? null);
        }
      } catch {
        // ignore session errors; form will stay in request mode
      }
    };

    void initialize();

    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (!active) {
        return;
      }
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") {
        if (session?.user) {
          setMode("update");
          setRecoveryEmail(session.user.email ?? null);
        }
      }
    });

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!status && !error) return;
    const timer = window.setTimeout(() => {
      setStatus(null);
      setError(null);
    }, 5000);
    return () => window.clearTimeout(timer);
  }, [status, error]);

  const handleRequest = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus(null);
    setError(null);

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setError("Email is required.");
      return;
    }

    try {
      setPending(true);
      const redirectTo = `${window.location.origin}/reset-password`;
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(trimmedEmail, {
        redirectTo,
      });
      if (resetError) {
        throw resetError;
      }
      setStatus("Check your email for a link to reset your password.");
      setEmail("");
    } catch (requestError) {
      const message =
        requestError instanceof Error ? requestError.message : "Unable to send reset email.";
      setError(message);
    } finally {
      setPending(false);
    }
  };

  const handleUpdate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus(null);
    setError(null);

    const trimmedPassword = newPassword.trim();
    if (!trimmedPassword) {
      setError("New password is required.");
      return;
    }
    if (trimmedPassword.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (trimmedPassword !== confirmPassword.trim()) {
      setError("Passwords do not match.");
      return;
    }

    try {
      setPending(true);
      const { error: updateError } = await supabase.auth.updateUser({
        password: trimmedPassword,
      });
      if (updateError) {
        throw updateError;
      }
      setStatus("Your password has been updated. You can now continue to the app.");
      setNewPassword("");
      setConfirmPassword("");
    } catch (updateError) {
      const message =
        updateError instanceof Error ? updateError.message : "Unable to update password.";
      setError(message);
    } finally {
      setPending(false);
    }
  };

  const title = mode === "update" ? "Choose a new password" : "Reset your password";
  const subtitle =
    mode === "update"
      ? recoveryEmail
        ? `Signed in as ${recoveryEmail}. Enter a new password below.`
        : "Enter a new password to finish resetting your account."
      : "Enter the email linked to your account and we’ll send you a reset link.";

  return (
    <div className="space-y-6">
      <div className="space-y-2 text-center">
        <h1 className="text-3xl font-semibold text-[#18223a]">{title}</h1>
        <p className="text-sm text-[#4c5a7a]">{subtitle}</p>
      </div>

      {mode === "request" ? (
        <form onSubmit={handleRequest} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="reset-email" className="text-sm font-medium text-[#1d2742]">
              Email
            </label>
            <input
              id="reset-email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              className="w-full rounded-2xl border border-white/55 bg-white/55 px-4 py-3 text-[#18223a] placeholder:text-[#7c89aa] shadow-inner focus:outline-none focus:ring-2 focus:ring-[#2a3554]/30"
              required
              autoComplete="email"
            />
          </div>
          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-full border border-[#1d2742] bg-[#1d2742] px-5 py-3 text-sm font-semibold text-white shadow-[0_24px_52px_-32px_rgba(19,28,46,0.58)] transition hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pending ? "Sending…" : "Send reset link"}
          </button>
        </form>
      ) : (
        <form onSubmit={handleUpdate} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="new-password" className="text-sm font-medium text-[#1d2742]">
              New password
            </label>
            <input
              id="new-password"
              type="password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              placeholder="••••••••"
              className="w-full rounded-2xl border border-white/55 bg-white/55 px-4 py-3 text-[#18223a] placeholder:text-[#7c89aa] shadow-inner focus:outline-none focus:ring-2 focus:ring-[#2a3554]/30"
              required
              minLength={6}
              autoComplete="new-password"
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="confirm-new-password" className="text-sm font-medium text-[#1d2742]">
              Confirm password
            </label>
            <input
              id="confirm-new-password"
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              placeholder="••••••••"
              className="w-full rounded-2xl border border-white/55 bg-white/55 px-4 py-3 text-[#18223a] placeholder:text-[#7c89aa] shadow-inner focus:outline-none focus:ring-2 focus:ring-[#2a3554]/30"
              required
              minLength={6}
              autoComplete="new-password"
            />
          </div>
          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-full border border-[#1d2742] bg-[#1d2742] px-5 py-3 text-sm font-semibold text-white shadow-[0_24px_52px_-32px_rgba(19,28,46,0.58)] transition hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pending ? "Updating…" : "Update password"}
          </button>
        </form>
      )}

      <p className="text-center text-sm text-[#4c5a7a]">
        Remembered your password?{" "}
        <Link href="/login" className="font-semibold text-[#18223a] underline-offset-4 hover:underline">
          Return to log in
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
