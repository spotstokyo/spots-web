"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import AnimatedSearchInput from "@/components/AnimatedSearchInput";
import GlassCard from "@/components/GlassCard";
import FollowButton from "@/components/FollowButton";
import { supabase } from "@/lib/supabase";

interface ProfileRow {
  id: string;
  display_name: string | null;
  username: string | null;
}

interface FriendSearchInlineProps {
  className?: string;
}

export default function FriendSearchInline({ className }: FriendSearchInlineProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ProfileRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setError(null);
      return;
    }

    let cancelled = false;
    const timer = window.setTimeout(async () => {
      setLoading(true);
      setError(null);
      const like = query.trim().replace(/%/g, "");

      const { data, error } = await supabase
        .from("profiles")
        .select("id, display_name, username")
        .or(`display_name.ilike.%${like}%,username.ilike.%${like}%`)
        .order("display_name", { ascending: true })
        .limit(5);

      if (!cancelled) {
        if (error) {
          setError(error.message ?? "Unable to search right now.");
          setResults([]);
        } else {
          setResults(data ?? []);
        }
        setLoading(false);
      }
    }, 250);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [query]);

  const body = useMemo(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      return null;
    }

    if (loading) {
      return <p className="text-xs text-[#4c5a7a]">Searching…</p>;
    }

    if (error) {
      return <p className="text-xs text-rose-500">{error}</p>;
    }

    if (!results.length) {
      return <p className="text-xs text-[#4c5a7a]">No matching users yet.</p>;
    }

    return (
      <div className="flex flex-col gap-3 pt-2">
        {results.map((profile) => (
          <div
            key={profile.id}
            className="flex items-center justify-between rounded-xl border border-white/60 bg-white/75 px-4 py-3 text-sm text-[#1d2742] shadow-[0_26px_56px_-40px_rgba(22,34,64,0.55)] transition hover:scale-[1.01]"
          >
            <div className="flex flex-col">
              <Link
                href={`/users/${profile.id}`}
                className="font-medium text-[#18223a] underline-offset-4 hover:underline"
              >
                {profile.display_name?.trim() || profile.username || "Spots explorer"}
              </Link>
              {profile.username ? (
                <span className="text-xs text-[#7c89aa]">@{profile.username}</span>
              ) : null}
            </div>
            <FollowButton targetUserId={profile.id} className="ml-3" />
          </div>
        ))}
      </div>
    );
  }, [error, loading, query, results]);

  const bodyContent =
    body ??
    (query.trim()
      ? <p className="text-xs text-[#4c5a7a]">Search for a different name.</p>
      : <p className="text-xs text-[#4c5a7a]">Start typing to discover new friends.</p>);

  return (
    <GlassCard
      className={`space-y-4 border-white/55 bg-[rgba(255,255,255,0.78)] shadow-[0_34px_80px_-42px_rgba(24,39,79,0.55)] backdrop-blur-[22px] ${className ?? ""}`}
    >
      <div className="flex flex-col gap-4">
        <span className="inline-flex w-fit items-center gap-2 rounded-full border border-white/60 bg-white/70 px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.28em] text-[#4d5f91] shadow-[0_18px_36px_-28px_rgba(24,39,79,0.45)]">
          Find friends
        </span>
        <AnimatedSearchInput
          value={query}
          onChange={setQuery}
          onSubmit={() => undefined}
          suggestions={["Search by name or username to follow friends."]}
        />
      </div>
      <div className="rounded-2xl border border-white/45 bg-white/50 px-4 py-4 shadow-inner shadow-white/30">
        {bodyContent}
      </div>
    </GlassCard>
  );
}
