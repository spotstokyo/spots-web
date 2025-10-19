"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import GlassCard from "@/components/GlassCard";
import MapView, { type MapPlace, type MapViewHandle } from "@/components/MapView";
import { useMapTransition } from "@/components/MapTransitionProvider";

interface MapScreenProps {
  places: MapPlace[];
}

const formatPrice = (place: MapPlace) => {
  if (!place.price_icon && place.price_tier == null) return null;
  if (place.price_icon && place.price_icon.trim()) return place.price_icon.trim();
  if (place.price_tier == null) return null;

  const tier = Math.round(Number(place.price_tier));
  if (Number.isNaN(tier)) return null;
  return "¥".repeat(Math.min(Math.max(tier, 1), 6));
};

export default function MapScreen({ places }: MapScreenProps) {
  const mapRef = useRef<MapViewHandle>(null);
  const [selected, setSelected] = useState<MapPlace | null>(null);
  const { completeTransition, stage: transitionStage } = useMapTransition();

  const handleMapReady = useCallback(() => {
    completeTransition();
  }, [completeTransition]);

  useEffect(() => {
    if (transitionStage !== "entering") return;
    const fallback = window.setTimeout(() => completeTransition(), 1600);
    return () => window.clearTimeout(fallback);
  }, [completeTransition, transitionStage]);

  const detail = useMemo(() => selected, [selected]);

  return (
    <div
      className={`relative -mb-12 w-full transform-gpu overflow-hidden rounded-2xl transition-[opacity,transform] duration-700 ease-out ${
        transitionStage === "entering" ? "opacity-0 scale-[1.02]" : "opacity-100 scale-100"
      }`}
      style={{
        marginTop: "calc(-1 * var(--safe-area-top, 0px) - 7rem)",
        height: "calc(100dvh + var(--safe-area-top, 0px) + var(--safe-area-bottom, 0px) + 7rem)",
        minHeight: "calc(100dvh + var(--safe-area-top, 0px) + var(--safe-area-bottom, 0px) + 7rem)",
        maxHeight: "calc(100dvh + var(--safe-area-top, 0px) + var(--safe-area-bottom, 0px) + 7rem)",
      }}
    >
      <div className="absolute inset-0">
        <MapView ref={mapRef} places={places} onPlaceSelect={setSelected} onReady={handleMapReady} />
      </div>

      <div className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-white/70 to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-white/60 to-transparent" />

      <div className="absolute left-1/2 top-6 z-20 -translate-x-1/2">
        <Link
          href="/feed"
          className="rounded-full border border-white/70 bg-white/80 px-5 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-[#1d2742] shadow-sm transition hover:scale-[1.01]"
        >
          Back to feed
        </Link>
      </div>

      <div className="absolute top-6 right-6 z-20 flex flex-col overflow-hidden rounded-2xl border border-white/70 bg-white/85 shadow-[0_18px_36px_-20px_rgba(24,39,79,0.55)]">
        <button
          type="button"
          aria-label="Zoom in"
          onClick={() => mapRef.current?.zoomIn()}
          className="grid h-11 w-11 place-items-center text-lg font-semibold text-[#1d2742] transition hover:bg-white/90"
        >
          +
        </button>
        <div className="h-px bg-white/70" />
        <button
          type="button"
          aria-label="Zoom out"
          onClick={() => mapRef.current?.zoomOut()}
          className="grid h-11 w-11 place-items-center text-xl font-semibold text-[#1d2742] transition hover:bg-white/90"
        >
          –
        </button>
      </div>

      {!detail && (
        <div className="absolute bottom-10 right-6 z-20">
          <button
            type="button"
            onClick={() => mapRef.current?.recenterUser()}
            className="rounded-full border border-white/70 bg-white/90 px-5 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#1d2742] shadow-[0_18px_32px_-20px_rgba(24,39,79,0.6)] transition hover:scale-[1.04]"
          >
            Current location
          </button>
        </div>
      )}

      {detail && (
        <div className="pointer-events-none absolute bottom-32 left-1/2 z-30 w-full max-w-md -translate-x-1/2 px-4">
          <GlassCard className="pointer-events-auto space-y-2 border-white/70 bg-white/85">
            <div className="flex items-start justify-between gap-3">
              <Link
                href={`/place/${detail.id}`}
                className="group flex flex-1 flex-col gap-2 text-left"
              >
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#4d5f91] transition-colors group-hover:text-[#354778]">
                  {detail.category ?? "Spot"}
                </p>
                <h3 className="text-lg font-semibold text-[#18223a] transition-colors group-hover:text-[#0f1a35]">
                  {detail.name}
                </h3>
                {detail.address && <p className="text-sm text-[#2a3554]">{detail.address}</p>}
                <div className="flex items-center gap-4 text-xs uppercase tracking-[0.16em] text-[#6b7aa4]">
                  {formatPrice(detail) && <span>{formatPrice(detail)}</span>}
                  {detail.rating_avg != null && (
                    <span>
                      ★ {Number(detail.rating_avg).toFixed(1)} · {detail.rating_count ?? "TBD"}
                    </span>
                  )}
                </div>
              </Link>
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  setSelected(null);
                }}
                className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/70 bg-white/80 text-[#1d2742] transition hover:bg-white"
              >
                <span className="sr-only">Close details</span>
                <span aria-hidden>×</span>
              </button>
            </div>
            {detail.website && (
              <a
                href={detail.website.startsWith("http") ? detail.website : `https://${detail.website}`}
                target="_blank"
                rel="noreferrer"
                onClick={(event) => event.stopPropagation()}
                className="inline-flex items-center gap-2 text-sm font-medium text-[#4364ff] underline-offset-4 hover:underline"
              >
                Visit site →
              </a>
            )}
          </GlassCard>
        </div>
      )}
    </div>
  );
}
