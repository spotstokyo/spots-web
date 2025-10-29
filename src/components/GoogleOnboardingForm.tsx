"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

const USERNAME_PATTERN = /^[a-z0-9_\.]{3,30}$/i;

interface GoogleOnboardingFormProps {
  redirectPath: string;
  initialEmail: string | null;
  suggestedUsername: string | null;
  displayName: string | null;
}

export default function GoogleOnboardingForm({
  redirectPath,
  initialEmail,
  suggestedUsername,
  displayName,
}: GoogleOnboardingFormProps) {
  const router = useRouter();
  const [username, setUsername] = useState(() => suggestedUsername?.toLowerCase() ?? "");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    const trimmedUsername = username.trim().toLowerCase();
    if (!trimmedUsername) {
      setError("Username is required.");
      return;
    }

    if (!USERNAME_PATTERN.test(trimmedUsername)) {
      setError("Username must be 3-30 characters using letters, numbers, underscores, or dots.");
      return;
    }

    try {
      setPending(true);

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        throw new Error("You need to be signed in to finish onboarding.");
      }

      const { data: existingUsername, error: usernameLookupError } = await supabase
        .from("profiles")
        .select("id")
        .eq("username", trimmedUsername)
        .neq("id", user.id)
        .maybeSingle();

      if (usernameLookupError && usernameLookupError.code !== "PGRST116") {
        throw usernameLookupError;
      }

      if (existingUsername) {
        setError("That username is already taken.");
        setPending(false);
        return;
      }

      const email = initialEmail?.trim().toLowerCase() || user.email?.toLowerCase() || null;
      const profilePayload: { id: string; username: string; email: string | null; display_name?: string | null } = {
        id: user.id,
        username: trimmedUsername,
        email,
      };

      if (displayName) {
        profilePayload.display_name = displayName;
      }

      const { error: profileError } = await supabase.from("profiles").upsert(profilePayload, {
        onConflict: "id",
      });

      if (profileError) {
        throw profileError;
      }

      const userMetadata = {
        ...(user.user_metadata ?? {}),
        username: trimmedUsername,
      };

      const { error: updateError } = await supabase.auth.updateUser({
        data: userMetadata,
      });

      if (updateError) {
        throw updateError;
      }

      router.replace(redirectPath);
      router.refresh();
    } catch (submitError) {
      const message =
        submitError instanceof Error ? submitError.message : "Something went wrong while saving.";
      setError(message);
      setPending(false);
      return;
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2 text-center">
        <h1 className="text-3xl font-semibold text-[#18223a]">Finish setting up your account</h1>
        <p className="text-sm text-[#4c5a7a]">Pick a username to complete your Google signup.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {initialEmail ? (
          <div className="space-y-1 text-left">
            <p className="text-[0.75rem] font-semibold uppercase tracking-wide text-[#7c89aa]">Google email</p>
            <p className="rounded-xl border border-white/45 bg-white/55 px-4 py-2 text-sm text-[#1d2742]">
              {initialEmail}
            </p>
          </div>
        ) : null}

        <div className="space-y-2">
          <label htmlFor="onboard-username" className="text-sm font-medium text-[#1d2742]">
            Username
          </label>
          <input
            id="onboard-username"
            type="text"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            placeholder="your.username"
            className="w-full rounded-2xl border border-white/55 bg-white/55 px-4 py-3 text-[#18223a] placeholder:text-[#7c89aa] shadow-inner focus:outline-none focus:ring-2 focus:ring-[#2a3554]/30"
            autoComplete="username"
            required
          />
        </div>

        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-full border border-[#1d2742] bg-[#1d2742] px-5 py-3 text-sm font-semibold text-white shadow-[0_24px_52px_-32px_rgba(19,28,46,0.58)] transition hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? "Saving…" : "Continue"}
        </button>
      </form>

      {error ? (
        <div className="rounded-2xl border border-rose-200/80 bg-rose-50/90 px-4 py-3 text-sm text-rose-700 shadow-inner backdrop-blur">
          {error}
        </div>
      ) : null}
    </div>
  );
}
