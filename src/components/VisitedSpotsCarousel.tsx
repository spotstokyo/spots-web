"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import GlassCard from "@/components/GlassCard";
import { priceTierToSymbol } from "@/lib/pricing";
import { formatRelativeTime } from "@/lib/time";

export interface VisitedSpotEntry {
  id: string;
  placeId: string;
  name: string;
  category: string | null;
  address: string | null;
  priceTier: number | null;
  priceIcon: string | null;
  bannerUrl: string | null;
  note: string | null;
  rating: number | null;
  visitedAt: string | null;
  aura: { tier: string | null; score: number | null } | null;
}

interface VisitedSpotsCarouselProps {
  entries: VisitedSpotEntry[];
}

export default function VisitedSpotsCarousel({ entries }: VisitedSpotsCarouselProps) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const glowClassForAura: Record<string, string> = {
    mythic: "before:bg-[rgba(255,212,130,0.65)]",
    gold: "before:bg-[rgba(255,223,176,0.58)]",
    silver: "before:bg-[rgba(205,214,239,0.62)]",
    bronze: "before:bg-[rgba(228,198,171,0.58)]",
    none: "before:bg-[rgba(205,214,239,0.38)]",
  };

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    let isPointerDown = false;
    let startX = 0;
    let scrollLeft = 0;
    let activePointerId: number | null = null;
    let hasMoved = false;

    const handlePointerDown = (event: PointerEvent) => {
      if (event.pointerType === "mouse" || event.pointerType === "touch" || event.pointerType === "pen") {
        isPointerDown = true;
        startX = event.clientX;
        scrollLeft = el.scrollLeft;
        activePointerId = event.pointerId;
        hasMoved = false;
        el.classList.add("cursor-grabbing");
      }
    };

    const handlePointerMove = (event: PointerEvent) => {
      if (!isPointerDown || activePointerId !== event.pointerId) return;
      const walk = event.clientX - startX;
      if (!hasMoved && Math.abs(walk) > 4) {
        hasMoved = true;
      }
      if (hasMoved) {
        event.preventDefault();
        el.scrollLeft = scrollLeft - walk;
      }
    };

    const endDrag = (event: PointerEvent) => {
      if (!isPointerDown || activePointerId !== event.pointerId) return;
      isPointerDown = false;
      el.classList.remove("cursor-grabbing");
      if (hasMoved) {
        event.preventDefault();
        event.stopPropagation();
      }
      activePointerId = null;
    };

    el.addEventListener("pointerdown", handlePointerDown);
    el.addEventListener("pointermove", handlePointerMove);
    el.addEventListener("pointerup", endDrag);
    el.addEventListener("pointercancel", endDrag);
    el.addEventListener("pointerleave", endDrag);

    return () => {
      el.removeEventListener("pointerdown", handlePointerDown);
      el.removeEventListener("pointermove", handlePointerMove);
      el.removeEventListener("pointerup", endDrag);
      el.removeEventListener("pointercancel", endDrag);
      el.removeEventListener("pointerleave", endDrag);
    };
  }, []);


  return (
    <>
      <div
        ref={scrollRef}
        className="mt-4 flex snap-x snap-mandatory gap-4 overflow-x-auto pb-3 pr-4 cursor-grab"
      >
      {entries.map((entry) => {
        const visitedAtLabel = entry.visitedAt ? formatRelativeTime(entry.visitedAt) : "Recently";
        const priceLabel = entry.priceIcon?.trim()
          ? entry.priceIcon.trim()
          : priceTierToSymbol(entry.priceTier) ?? "Not specified";
        const auraTier = (entry.aura?.tier ?? "none").toLowerCase();
        const glowClass = glowClassForAura[auraTier] ?? glowClassForAura.none;

        return (
          <Link
            key={entry.id}
            href={`/place/${entry.placeId}`}
            className="group snap-center focus:outline-none focus-visible:ring-2 focus-visible:ring-[#a4b3f8]"
          >
            <GlassCard
              className={`relative flex min-w-[230px] max-w-[240px] flex-col justify-between gap-3 border border-transparent bg-white/94 shadow-none transition-transform duration-200 group-hover:scale-[1.02] overflow-visible before:pointer-events-none before:absolute before:-inset-[6px] before:-z-10 before:rounded-[26px] before:opacity-100 before:transition before:duration-300 group-hover:before:brightness-110 ${glowClass}`}
            >
              <div className="relative h-40 overflow-hidden rounded-2xl border border-white/65">
                {entry.bannerUrl ? (
                  <Image
                    src={entry.bannerUrl}
                    alt={`${entry.name} banner`}
                    fill
                    className="object-cover transition-transform duration-200 group-hover:scale-[1.03]"
                    sizes="(max-width: 768px) 80vw, 320px"
                    unoptimized
                  />
                ) : (
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.92),transparent_70%),radial-gradient(circle_at_bottom,rgba(216,224,255,0.6),transparent_78%),linear-gradient(180deg,rgba(245,247,255,0.9)0%,rgba(229,235,255,0.76)100%)]" />
                )}
                <div className="relative z-10 flex h-full flex-col justify-end bg-gradient-to-t from-black/35 via-black/5 to-transparent px-4 pb-4 pt-6">
                  <span className="text-xs font-semibold uppercase tracking-[0.28em] text-[#f0f2fa] drop-shadow">
                    {entry.category ?? "Spot"}
                  </span>
                  <h3 className="mt-1 text-[1.1rem] font-semibold tracking-tight text-white drop-shadow-sm">
                    {entry.name}
                  </h3>
                </div>
              </div>

              <div className="space-y-2 pt-2 text-sm text-[#1d2742]">
                <p className="text-sm font-medium text-[#18223a]">{priceLabel}</p>
                <p className="text-xs uppercase tracking-[0.18em] text-[#7c89aa]">
                  Visited {visitedAtLabel}
                </p>
                {entry.rating != null ? (
                  <p className="text-xs uppercase tracking-[0.18em] text-[#7c89aa]">
                    Rating: {Number(entry.rating).toFixed(1)} / 5
                  </p>
                ) : null}
              </div>

              {entry.note ? (
                <p className="mt-2 rounded-xl bg-[#f1f4ff]/55 px-3 py-2 text-xs font-medium text-[#223050]">
                  “{entry.note}”
                </p>
              ) : null}
            </GlassCard>
          </Link>
        );
      })}
      </div>
    </>
  );
}
