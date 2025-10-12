"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import AuraBadge, { type AuraTier } from "@/components/AuraBadge";
import type { Database } from "@/lib/database.types";
import { createPortal } from "react-dom";

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
  const [visitModalOpen, setVisitModalOpen] = useState(false);
  const [visitNote, setVisitNote] = useState("");
  const [visitDate, setVisitDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [visitModalError, setVisitModalError] = useState<string | null>(null);
  const [isMounted, setIsMounted] = useState(false);

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

  const openVisitModal = () => {
    if (!userId) return;
    setVisitModalOpen(true);
    setVisitNote("");
    setVisitModalError(null);
    setVisitDate(new Date().toISOString().slice(0, 10));
  };

  const closeVisitModal = () => {
    if (actionState === "visit") return;
    setVisitModalOpen(false);
    setVisitModalError(null);
  };

  const confirmVisit = async () => {
    if (!userId) return;
    const trimmedNote = visitNote.trim();
    if (trimmedNote.length < 12) {
      setVisitModalError("Share a few more details about what you ate or who you went with.");
      return;
    }

    setActionState("visit");
    setStatus(null);
    setErrorMessage(null);
    setVisitModalError(null);

    const noteWithDate = visitDate
      ? `Visited ${new Date(visitDate).toLocaleDateString()} — ${trimmedNote}`
      : trimmedNote;

    const { error } = await supabase.rpc("log_visit_and_update", {
      p_user: userId,
      p_place: placeId,
      p_note: noteWithDate,
    });

    if (error) {
      setVisitModalError(error.message ?? "Unable to log visit right now.");
    } else {
      setVisitCount((prev) => prev + 1);
      setStatus("Visit logged");
      await refreshAura();
      setVisitModalOpen(false);
      setVisitNote("");
    }

    setActionState("idle");
  };

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isMounted || !visitModalOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isMounted, visitModalOpen]);

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
          onClick={openVisitModal}
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

      {visitModalOpen && isMounted
        ? createPortal(
            <div className="fixed inset-0 z-40 flex items-center justify-center bg-[rgba(12,18,31,0.45)] px-4 py-8 backdrop-blur-sm">
              <div className="relative w-full max-w-lg rounded-2xl border border-white/65 bg-[rgba(255,255,255,0.92)] p-6 shadow-[0_40px_120px_-50px_rgba(22,34,64,0.75)] backdrop-blur-[18px]">
                <button
                  type="button"
                  onClick={closeVisitModal}
                  className="absolute right-4 top-4 inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/60 bg-white/70 text-[#1d2742] transition hover:bg-white"
                  disabled={actionState === "visit"}
                >
                  <span className="sr-only">Close</span>
                  <span aria-hidden>×</span>
                </button>

                <div className="space-y-4 pr-6">
                  <div className="space-y-1">
                    <h3 className="text-lg font-semibold text-[#18223a]">Log your visit</h3>
                    <p className="text-sm text-[#4c5a7a]">
                      Share a quick detail about what you tried so we can keep visits authentic.
                    </p>
                  </div>

                  <label className="flex flex-col gap-1 text-sm text-[#1d2742]">
                    <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[#4d5f91]">
                      Date of visit
                    </span>
                    <input
                      type="date"
                      max={new Date().toISOString().slice(0, 10)}
                      value={visitDate}
                      onChange={(event) => setVisitDate(event.target.value)}
                      className="rounded-xl border border-white/60 bg-white/80 px-3 py-2 text-sm text-[#1d2742] focus:border-[#1d2742] focus:outline-none"
                    />
                  </label>

                  <label className="flex flex-col gap-1 text-sm text-[#1d2742]">
                    <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[#4d5f91]">
                      What did you eat or experience? *
                    </span>
                    <textarea
                      value={visitNote}
                      onChange={(event) => setVisitNote(event.target.value)}
                      rows={4}
                      className="rounded-xl border border-white/60 bg-white/85 px-3 py-2 text-sm text-[#1d2742] focus:border-[#1d2742] focus:outline-none"
                      placeholder="Example: Tried the tsukemen with extra yuzu — broth was super rich."
                    />
                  </label>

                  {visitModalError ? <p className="text-sm text-rose-500">{visitModalError}</p> : null}

                  <div className="flex justify-end gap-3 pt-2">
                    <button
                      type="button"
                      onClick={closeVisitModal}
                      className="rounded-full border border-white/60 bg-white/75 px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-[#1d2742] transition hover:scale-[1.01]"
                      disabled={actionState === "visit"}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={confirmVisit}
                      className="rounded-full border border-[#1d2742] bg-[#1d2742] px-5 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-white shadow-[0_22px_48px_-28px_rgba(19,28,46,0.55)] transition hover:scale-[1.01]"
                      disabled={actionState === "visit"}
                    >
                      {actionState === "visit" ? "Logging…" : "Submit visit"}
                    </button>
                  </div>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
