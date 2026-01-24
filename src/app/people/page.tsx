"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AnimatedSearchInput from "@/components/features/search/AnimatedSearchInput";
import GlassCard from "@/components/ui/GlassCard";
import FollowButton from "@/components/features/profile/FollowButton";
import { supabase } from "@/lib/supabase";

interface ProfileRow {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  username: string | null;
}

export default function PeoplePage() {
  const [q, setQ] = useState("");
  const [rows, setRows] = useState<ProfileRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const run = async () => {
      if (!q.trim()) {
        setRows([]);
        return;
      }
      setLoading(true);
      setError(null);
      const like = q.trim().replace(/%/g, "");

      const { data, error } = await supabase
        .from("profiles")
        .select("id, display_name, avatar_url, username")
        .or(
          `display_name.ilike.%${like}%,username.ilike.%${like}%`
        )
        .limit(20);

      if (error) {
        setError(error.message);
        setRows([]);
      } else {
        setRows(data ?? []);
      }

      setLoading(false);
    };

    const t = window.setTimeout(run, 250);
    return () => window.clearTimeout(t);
  }, [q]);

  return (
    <div className="space-y-6">
      <GlassCard className="space-y-3">
        <h1 className="text-xl font-semibold text-[#18223a]">Find people</h1>
        <AnimatedSearchInput
          value={q}
          onChange={setQ}
          onSubmit={() => {}}
          suggestions={["Search by name or username to follow friends."]}
        />
      </GlassCard>

      {error ? (
        <GlassCard className="text-sm text-rose-700">{error}</GlassCard>
      ) : null}

      {loading ? (
        <GlassCard className="text-sm text-[#4c5a7a]">Searching…</GlassCard>
      ) : null}

      {!loading && !rows.length && q.trim() ? (
        <GlassCard className="text-sm text-[#4c5a7a]">No users match that query.</GlassCard>
      ) : null}

      <div className="space-y-3">
        {rows.map((user) => (
          <GlassCard key={user.id} className="flex items-center justify-between border-white/50 bg-white/70 px-4 py-3">
            <div className="flex flex-col">
              <Link href={`/users/${user.id}`} className="font-medium text-[#18223a] underline-offset-4 hover:underline">
                {user.display_name?.trim() || user.username || "Spots explorer"}
              </Link>
              {user.username ? (
                <span className="text-xs text-[#7c89aa]">@{user.username}</span>
              ) : null}
            </div>
            <FollowButton targetUserId={user.id} />
          </GlassCard>
        ))}
      </div>
    </div>
  );
}
