"use client";

import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

interface EditProfileFormProps {
  userId: string;
  initialDisplayName: string;
  initialUsername: string;
  initialAvatarUrl: string | null;
}

const PROFILE_AVATAR_BUCKET = "profile-avatars";

export default function EditProfileForm({
  userId,
  initialDisplayName,
  initialUsername,
  initialAvatarUrl,
}: EditProfileFormProps) {
  const router = useRouter();
  const [displayName, setDisplayName] = useState(initialDisplayName);
  const [username, setUsername] = useState(initialUsername);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(initialAvatarUrl);
  const [currentAvatarUrl, setCurrentAvatarUrl] = useState<string | null>(initialAvatarUrl);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarRemoved, setAvatarRemoved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!avatarPreview || !avatarPreview.startsWith("blob:")) return;
    return () => {
      URL.revokeObjectURL(avatarPreview);
    };
  }, [avatarPreview]);

  const initials = useMemo(() => {
    const trimmed = displayName.trim();
    if (!trimmed) return "--";
    const parts = trimmed.split(/\s+/);
    if (parts.length === 1) return parts[0]?.slice(0, 2).toUpperCase() ?? "--";
    return `${parts[0]?.[0] ?? ""}${parts[parts.length - 1]?.[0] ?? ""}`.toUpperCase() || "--";
  }, [displayName]);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setAvatarFile(file);
    setAvatarRemoved(false);
    const previewUrl = URL.createObjectURL(file);
    setAvatarPreview(previewUrl);
  };

  const handleRemoveAvatar = () => {
    if (avatarRemoved) {
      setAvatarRemoved(false);
      setAvatarPreview(currentAvatarUrl);
      return;
    }

    setAvatarFile(null);
    setAvatarRemoved(true);
    setAvatarPreview(null);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const trimmedName = displayName.trim();
    const trimmedUsername = username.trim();

    if (!trimmedName) {
      setError("Display name is required.");
      setSuccess(null);
      return;
    }

    if (trimmedUsername && !/^[a-z0-9._-]{3,}$/i.test(trimmedUsername)) {
      setError("Username must be at least 3 characters and can include letters, numbers, dots, underscores, or hyphens.");
      setSuccess(null);
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      let nextAvatarUrl = initialAvatarUrl;

      if (avatarRemoved) {
        nextAvatarUrl = null;
      }

      if (avatarFile) {
        const fileExt = avatarFile.name.split(".").pop()?.toLowerCase() ?? "jpg";
        const safeExt = fileExt.replace(/[^a-z0-9]/gi, "") || "jpg";
        const objectPath = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${safeExt}`;

        const { error: uploadError } = await supabase.storage
          .from(PROFILE_AVATAR_BUCKET)
          .upload(objectPath, avatarFile, {
            contentType: avatarFile.type || undefined,
            cacheControl: "3600",
            upsert: true,
          });

        if (uploadError) {
          throw uploadError;
        }

        const { data: publicData } = supabase.storage.from(PROFILE_AVATAR_BUCKET).getPublicUrl(objectPath);
        nextAvatarUrl = publicData.publicUrl ?? null;
      }

      const { error: updateError } = await supabase
        .from("profiles")
        .update({
          display_name: trimmedName,
          username: trimmedUsername || null,
          avatar_url: nextAvatarUrl,
        })
        .eq("id", userId);

      if (updateError) {
        throw updateError;
      }

      setSuccess("Profile updated successfully.");
      setAvatarRemoved(false);
      setAvatarFile(null);
      setAvatarPreview(nextAvatarUrl);
      setDisplayName(trimmedName);
      setUsername(trimmedUsername);
      setCurrentAvatarUrl(nextAvatarUrl);
      router.refresh();
    } catch (submitError) {
      const message =
        submitError instanceof Error ? submitError.message : "We couldn’t update your profile right now.";
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
        <div className="relative h-24 w-24 rounded-2xl border border-white/70 bg-white/70 shadow-inner">
          {avatarPreview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={avatarPreview}
              alt="Avatar preview"
              className="h-full w-full rounded-2xl object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-xl font-semibold text-[#1d2742]">
              {initials}
            </div>
          )}
        </div>
        <div className="space-y-3 text-sm text-[#4c5a7a]">
          <div className="space-y-2">
            <label htmlFor="avatar" className="text-sm font-medium text-[#1d2742]">
              Profile photo
            </label>
            <input
              id="avatar"
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={handleFileChange}
              className="block w-full text-sm text-[#1d2742] file:mr-3 file:rounded-full file:border file:border-white/60 file:bg-white/70 file:px-4 file:py-2 file:text-sm file:font-medium file:text-[#1d2742] file:shadow-sm file:transition file:hover:cursor-pointer file:hover:bg-white/80"
            />
          </div>
          <button
            type="button"
            onClick={handleRemoveAvatar}
            className="rounded-full border border-white/60 bg-white/55 px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-[#4c5a7a] transition hover:scale-[1.02]"
          >
            {avatarRemoved ? "Keep current photo" : "Remove photo"}
          </button>
        </div>
      </div>

      <div className="grid gap-4">
        <div className="space-y-2">
          <label htmlFor="displayName" className="text-sm font-medium text-[#1d2742]">
            Display name
          </label>
          <input
            id="displayName"
            name="displayName"
            type="text"
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
            placeholder="Your name"
            className="w-full rounded-2xl border border-white/55 bg-white/60 px-4 py-3 text-[#18223a] placeholder:text-[#7c89aa] shadow-inner focus:outline-none focus:ring-2 focus:ring-[#2a3554]/30"
            maxLength={80}
            required
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="username" className="text-sm font-medium text-[#1d2742]">
            Username
          </label>
          <input
            id="username"
            name="username"
            type="text"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            placeholder="your.username"
            className="w-full rounded-2xl border border-white/55 bg-white/60 px-4 py-3 text-[#18223a] placeholder:text-[#7c89aa] shadow-inner focus:outline-none focus:ring-2 focus:ring-[#2a3554]/30"
            maxLength={40}
            autoComplete="username"
          />
          <p className="text-xs text-[#6b7aa4]">
            Usernames appear in your profile URL. Use letters, numbers, dots, underscores, or hyphens.
          </p>
        </div>
      </div>

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50/80 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {success ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/80 px-4 py-3 text-sm text-emerald-700">
          {success}
        </div>
      ) : null}

      <div className="flex flex-wrap gap-3">
        <button
          type="submit"
          disabled={saving}
          className="rounded-full border border-[#1d2742] bg-[#1d2742] px-5 py-3 text-sm font-semibold text-white shadow-[0_24px_52px_-30px_rgba(19,28,46,0.55)] transition hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save changes"}
        </button>
        <button
          type="button"
          onClick={() => router.push("/profile")}
          className="rounded-full border border-white/60 bg-white/60 px-5 py-3 text-sm font-semibold text-[#1d2742] transition hover:scale-[1.02]"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
