"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import FollowButton from "@/components/features/profile/FollowButton";
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
      <div className="flex flex-col gap-3 pt-1">
        {results.map((profile) => (
          <div
            key={profile.id}
            className="flex items-center justify-between rounded-xl border border-white/65 bg-white/80 px-4 py-3 text-sm text-[#1d2742] shadow-[0_28px_64px_-34px_rgba(19,28,46,0.46),0_10px_22px_-18px_rgba(19,28,46,0.24)] transition hover:scale-[1.01]"
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

  const bodyContent = body;

  return (
    <div className={`space-y-3 ${className ?? ""}`}>
      <div className="relative w-full">
        <input
          type="text"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
            }
          }}
          placeholder="Search by name or username"
          className="w-full rounded-full bg-gradient-to-br from-white/98 via-white/94 to-[#eef1ff]/92 px-5 py-3 text-sm text-[#1d2742] shadow-[0_30px_78px_-36px_rgba(19,28,46,0.6),0_12px_32px_-20px_rgba(255,255,255,0.96)_inset,0_0_0_1px_rgba(29,39,66,0.12)] outline-none transition focus:shadow-[0_34px_88px_-38px_rgba(19,28,46,0.64),0_14px_32px_-20px_rgba(255,255,255,0.97)_inset,0_0_0_1px_rgba(29,39,66,0.16)] focus:brightness-[1.03] hover:translate-y-[-1px]"
        />
        <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-[#4d5f91]">
          Search
        </div>
      </div>

      {bodyContent ? <div className="space-y-2">{bodyContent}</div> : null}
    </div>
  );
}
