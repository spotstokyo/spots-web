"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import Appear from "@/components/Appear";
import AuraBadge, { type AuraTier, getAuraVisuals } from "@/components/AuraBadge";
import GlassCard from "@/components/GlassCard";
import { priceTierToSymbol } from "@/lib/pricing";
import type { Database } from "@/lib/database.types";

type ListType = Database["public"]["Enums"]["list_type"];

interface ListPlaceEntry {
  placeId: string;
  name: string;
  category: string | null;
  priceTier: number | null;
  priceIcon: string | null;
  aura: { tier: AuraTier | null; score: number | null } | null;
}

interface SocialListData {
  id: string;
  title: string;
  listType: ListType;
  isPublic: boolean;
  shareToken: string | null;
  entries: ListPlaceEntry[];
}

interface ProfileListsProps {
  lists: SocialListData[];
  shareBaseUrl?: string | null;
}

const sectionShadow = "!shadow-[0_20px_54px_-34px_rgba(19,28,46,0.34)]";
const subtleShadow = "shadow-[0_14px_36px_-26px_rgba(19,28,46,0.28)]";
const cardOutline = "ring-1 ring-[#D3D3D3]/50";

const formatListTypeLabel = (type: ListType): string => {
  const value = String(type);
  if (value === "wishlist") return "Wishlist";
  if (value === "favorites") return "Favourites";

  return value
    .split("_")
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
};

export default function ProfileLists({ lists, shareBaseUrl }: ProfileListsProps) {
  const [state, setState] = useState(lists);
  const [message, setMessage] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);

  const computedBaseUrl = useMemo(() => {
    if (shareBaseUrl && shareBaseUrl.trim()) return shareBaseUrl;
    if (typeof window !== "undefined") {
      return window.location.origin;
    }
    return "";
  }, [shareBaseUrl]);

  const handleShare = async (listId: string) => {
    setPendingId(listId);
    setMessage(null);

    const { data, error } = await supabase.rpc("upsert_list_share_token", {
      p_list: listId,
    });

    if (error) {
      setMessage(error.message ?? "Unable to share list right now.");
      setPendingId(null);
      return;
    }

    const token = data;
    setState((prev) =>
      prev.map((list) =>
        list.id === listId
          ? { ...list, isPublic: true, shareToken: token }
          : list,
      ),
    );

    const url = token && computedBaseUrl ? `${computedBaseUrl}/lists/${token}` : token ?? "";
    if (url) {
      try {
        await navigator.clipboard.writeText(url);
        setMessage("Share link copied to clipboard.");
      } catch {
        setMessage(`Share link: ${url}`);
      }
    }

    setPendingId(null);
  };

  const handleMakePrivate = async (listId: string) => {
    setPendingId(listId);
    setMessage(null);

    const { error: deleteError } = await supabase.from("list_share_tokens").delete().eq("list_id", listId);
    if (deleteError) {
      setMessage(deleteError.message ?? "Unable to update sharing settings.");
      setPendingId(null);
      return;
    }

    const { error: updateError } = await supabase
      .from("user_lists")
      .update({ is_public: false })
      .eq("id", listId);

    if (updateError) {
      setMessage(updateError.message ?? "Unable to update sharing settings.");
    } else {
      setState((prev) =>
        prev.map((list) =>
          list.id === listId ? { ...list, isPublic: false, shareToken: null } : list,
        ),
      );
      setMessage("List is now private.");
    }

    setPendingId(null);
  };

  if (!state.length) {
    return null;
  }

  return (
    <Appear preset="lift-tilt" trigger="immediate">
      <GlassCard className={`space-y-6 border-white/65 bg-white/78 ${sectionShadow} ${cardOutline}`}>
        <div className="flex flex-col gap-2">
          <h2 className="text-xl font-semibold text-[#18223a]">Your lists</h2>
          <p className="text-sm text-[#4c5a7a]">
            Track places you dream about and the ones you love. Share select lists with friends via a quick link.
          </p>
          {message ? <p className="text-xs text-[#4d5f91]">{message}</p> : null}
        </div>

        <div className="space-y-5">
          {state.map((list, listIndex) => {
            const buttonDisabled = pendingId === list.id;
            const shareLink = list.shareToken
              ? computedBaseUrl
                ? `${computedBaseUrl.replace(/\/$/, "")}/lists/${list.shareToken}`
                : `/lists/${list.shareToken}`
              : null;
            const listTypeLabel = formatListTypeLabel(list.listType);
            const trimmedTitle = list.title?.trim() ?? "";
            const canonicalLower = listTypeLabel.toLowerCase();
            const synonyms = new Set<string>([canonicalLower]);
            if (list.listType === "favorites") {
              synonyms.add("favorites");
            } else if (list.listType === "wishlist") {
              synonyms.add("wishlist");
            }
            const normalizedTitle = trimmedTitle.toLowerCase();
            const useCanonicalTitle = !trimmedTitle || synonyms.has(normalizedTitle);
            const displayTitle = useCanonicalTitle ? listTypeLabel : trimmedTitle;
            const showTypeSubtitle = !useCanonicalTitle && normalizedTitle !== canonicalLower;
            return (
            <Appear
              key={list.id}
              preset="fade-up-soft"
              delayOrder={listIndex}
              trigger="immediate"
              className={`space-y-4 rounded-2xl border border-white/65 bg-white/82 px-4 py-4 ${subtleShadow} ${cardOutline}`}
            >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-lg font-semibold text-[#18223a]">{displayTitle}</p>
                    {showTypeSubtitle ? (
                      <p className="text-sm text-[#4d5f91]">{listTypeLabel}</p>
                    ) : null}
                    <p className="text-xs text-[#7c89aa]">
                      {list.entries.length} place{list.entries.length === 1 ? "" : "s"}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {list.isPublic && list.shareToken ? (
                      <>
                        <button
                          type="button"
                          onClick={() => handleShare(list.id)}
                          disabled={buttonDisabled}
                          className={`rounded-full border border-[#1d2742] bg-[#1d2742] px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-white shadow-sm transition hover:scale-[1.01] ${
                            buttonDisabled ? "opacity-60" : ""
                          }`}
                        >
                          Copy share link
                        </button>
                        <button
                          type="button"
                          onClick={() => handleMakePrivate(list.id)}
                          disabled={buttonDisabled}
                          className={`rounded-full border border-white/60 bg-white/65 px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-[#1d2742] transition hover:scale-[1.01] ${
                            buttonDisabled ? "opacity-60" : ""
                          }`}
                        >
                          Make private
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleShare(list.id)}
                        disabled={buttonDisabled}
                        className={`rounded-full border border-[#1d2742] bg-[#1d2742] px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-white shadow-sm transition hover:scale-[1.01] ${
                          buttonDisabled ? "opacity-60" : ""
                        }`}
                      >
                        Share list
                      </button>
                    )}
                  </div>
                </div>

                {list.isPublic && shareLink ? (
                  <p className="text-xs text-[#4c5a7a]">
                    Public link: <Link href={shareLink} className="underline">{shareLink}</Link>
                  </p>
                ) : null}

                <div className="grid gap-3 sm:grid-cols-2">
                  {list.entries.length ? (
                    list.entries.map((entry, entryIndex) => {
                      const auraTier = entry.aura?.tier ?? "none";
                      const visuals = getAuraVisuals(auraTier);
                      return (
                        <Appear
                          key={entry.placeId}
                          preset="fade-up"
                          delayOrder={entryIndex}
                          trigger="immediate"
                        >
                          <GlassCard className={`flex items-center justify-between gap-4 border ${visuals.cardClass} bg-white/80 px-4 py-4 text-sm text-[#1d2742] ${subtleShadow} ${cardOutline}`}>
                            <div className="flex flex-col">
                              <Link
                                href={`/place/${entry.placeId}`}
                                className="font-semibold text-[#18223a] underline-offset-4 hover:underline"
                              >
                                {entry.name}
                              </Link>
                              <span className="text-xs text-[#7c89aa]">
                                {entry.category ?? "Spot"} · {priceTierToSymbol(entry.priceTier)}
                              </span>
                            </div>
                            <AuraBadge tier={auraTier} score={entry.aura?.score ?? null} dense />
                          </GlassCard>
                        </Appear>
                      );
                    })
                  ) : (
                    <div className={`rounded-2xl border border-dashed border-white/65 bg-white/70 px-4 py-3 text-xs text-[#7c89aa] ${subtleShadow} ${cardOutline}`}>
                      No places yet. Add from any place page.
                    </div>
                  )}
                </div>
              </Appear>
            );
          })}
        </div>
      </GlassCard>
    </Appear>
  );
}
