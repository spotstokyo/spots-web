"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import AuraBadge, { type AuraTier } from "@/components/AuraBadge";
import type { Database } from "@/lib/database.types";

interface PlaceSocialActionsProps {
  placeId: string;
  placeName: string;
  userId: string | null;
  initialState: {
    isWishlist: boolean;
    isFavorite: boolean;
    aura: { tier: AuraTier | null; score: number | null } | null;
    visitCount: number;
  };
}

type ListType = Database["public"]["Enums"]["list_type"];

type ActionState = "idle" | "wishlist" | "favorite" | "visit";

export default function PlaceSocialActions({
  placeId,
  placeName,
  userId,
  initialState,
}: PlaceSocialActionsProps) {
  const [wishlist, setWishlist] = useState(initialState.isWishlist);
  const [favorite, setFavorite] = useState(initialState.isFavorite);
  const [aura, setAura] = useState(initialState.aura);
  const [visitCount, setVisitCount] = useState(initialState.visitCount);
  const [status, setStatus] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [actionState, setActionState] = useState<ActionState>("idle");

  const disabled = actionState !== "idle";

  const auraDisplay = useMemo(() => {
    if (aura) {
      return <AuraBadge tier={aura.tier} score={aura.score} />;
    }
    return <AuraBadge tier="none" score={null} />;
  }, [aura]);

  const refreshAura = useCallback(async () => {
    if (!userId) return;
    const { data, error } = await supabase
      .from("place_auras")
      .select("tier, score")
      .eq("user_id", userId)
      .eq("place_id", placeId)
      .maybeSingle();

    if (!error) {
      if (data) {
        setAura({ tier: data.tier, score: data.score });
      } else {
        setAura(null);
      }
    }
  }, [placeId, userId]);

  const handleListToggle = useCallback(
    async (type: ListType) => {
      if (!userId) return;
      setActionState(type === "wishlist" ? "wishlist" : "favorite");
      setStatus(null);
      setErrorMessage(null);

      const { data, error } = await supabase.rpc("toggle_list_membership", {
        p_user: userId,
        p_place: placeId,
        p_type: type,
      });

      if (error) {
        setErrorMessage(error.message ?? "Unable to update list.");
      } else if (typeof data === "boolean") {
        if (type === "wishlist") {
          setWishlist(data);
          setStatus(data ? "Added to wishlist" : "Removed from wishlist");
        } else {
          setFavorite(data);
          setStatus(data ? "Marked as favorite" : "Removed from favorites");
        }
        await refreshAura();
      }

      setActionState("idle");
    },
    [placeId, refreshAura, userId],
  );

  const handleLogVisit = useCallback(async () => {
    if (!userId) return;
    setActionState("visit");
    setStatus(null);
    setErrorMessage(null);

    const { error } = await supabase.rpc("log_visit_and_update", {
      p_user: userId,
      p_place: placeId,
    });

    if (error) {
      setErrorMessage(error.message ?? "Unable to log visit.");
    } else {
      setVisitCount((prev) => prev + 1);
      setStatus("Visit logged");
      await refreshAura();
    }

    setActionState("idle");
  }, [placeId, refreshAura, userId]);

  if (!userId) {
    return (
      <div className="mt-4 flex flex-col gap-3 rounded-2xl border border-white/55 bg-white/55 px-4 py-4 text-sm text-[#1d2742] shadow-sm">
        <p className="font-medium">Sign in to track {placeName}.</p>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/login"
            className="rounded-full border border-[#1d2742] bg-[#1d2742] px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white shadow-sm transition hover:scale-[1.02]"
          >
            Log in
          </Link>
          <Link
            href="/signup"
            className="rounded-full border border-white/55 bg-white/65 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#1d2742] shadow-sm transition hover:scale-[1.02]"
          >
            Sign up
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-4 space-y-4 rounded-2xl border border-white/60 bg-white/55 px-5 py-4 shadow-[0_24px_60px_-36px_rgba(24,39,79,0.35)]">
      <div className="flex flex-wrap items-center gap-3">
        {auraDisplay}
        <span className="text-xs uppercase tracking-[0.2em] text-[#4d5f91]">
          {visitCount > 0 ? `${visitCount} visit${visitCount === 1 ? "" : "s"}` : "No visits logged"}
        </span>
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => handleListToggle("wishlist")}
          disabled={disabled}
          className={`rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] transition hover:scale-[1.01] ${
            wishlist
              ? "border-[#7b68ee]/60 bg-[rgba(123,104,238,0.18)] text-[#42348e]"
              : "border-white/60 bg-white/65 text-[#1d2742]"
          } ${disabled ? "opacity-60" : ""}`}
        >
          {wishlist ? "Wishlisted" : "Wishlist"}
        </button>
        <button
          type="button"
          onClick={() => handleListToggle("favorites")}
          disabled={disabled}
          className={`rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] transition hover:scale-[1.01] ${
            favorite
              ? "border-[#ef8d4b]/60 bg-[rgba(239,141,75,0.15)] text-[#8a4820]"
              : "border-white/60 bg-white/65 text-[#1d2742]"
          } ${disabled ? "opacity-60" : ""}`}
        >
          {favorite ? "Favorited" : "Favorite"}
        </button>
        <button
          type="button"
          onClick={handleLogVisit}
          disabled={disabled}
          className={`rounded-full border border-[#1d2742] bg-[#1d2742] px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-white shadow-[0_22px_48px_-28px_rgba(19,28,46,0.55)] transition hover:scale-[1.01] ${
            disabled ? "opacity-60" : ""
          }`}
        >
          Log visit
        </button>
      </div>

      {status ? <p className="text-xs text-[#4c5a7a]">{status}</p> : null}
      {errorMessage ? <p className="text-xs text-rose-500">{errorMessage}</p> : null}
    </div>
  );
}
