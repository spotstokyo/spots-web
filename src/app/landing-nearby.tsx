"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { MapPin, Navigation, Sparkles } from "lucide-react";
import type { Tables } from "@/lib/database.types";
import { supabaseBrowserClient } from "@/lib/supabase-browser";
import { requestUserLocation } from "@/lib/user-location";
import { priceTierToSymbol } from "@/lib/pricing";

type PlaceRow = Pick<
  Tables<"places">,
  "id" | "name" | "category" | "address" | "price_tier" | "price_icon" | "lat" | "lng" | "rating_avg" | "rating_count" | "website"
>;

type NearbyPlace = PlaceRow & { distanceKm: number | null };

const haversineDistanceKm = (origin: { lat: number; lng: number }, target: { lat: number; lng: number }) => {
  const toRadians = (value: number) => (value * Math.PI) / 180;
  const latDiff = toRadians(target.lat - origin.lat);
  const lngDiff = toRadians(target.lng - origin.lng);
  const originLat = toRadians(origin.lat);
  const targetLat = toRadians(target.lat);
  const a =
    Math.sin(latDiff / 2) ** 2 +
    Math.cos(originLat) * Math.cos(targetLat) * Math.sin(lngDiff / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return 6371 * c;
};

const formatKm = (value: number | null) => {
  if (value == null || Number.isNaN(value)) return null;
  if (value < 0.5) return "~500m away";
  if (value < 1.5) return `${value.toFixed(1)} km away`;
  return `${value.toFixed(1)} km away`;
};

export default function LandingNearby() {
  const [places, setPlaces] = useState<NearbyPlace[]>([]);
  const [loading, setLoading] = useState(true);
  const [usedLocation, setUsedLocation] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);
      const supabase = supabaseBrowserClient;

      let userLocation: { lat: number; lng: number } | null = null;
      try {
        userLocation = await requestUserLocation();
      } catch {
        userLocation = null;
      }
      if (cancelled) return;
      setUsedLocation(Boolean(userLocation));

      const deltaLat = userLocation ? 0.35 : null;
      const deltaLng = userLocation
        ? Math.min(0.5, Math.max(0.25, 0.35 / Math.max(Math.cos((userLocation.lat * Math.PI) / 180), 0.2)))
        : null;

      let query = supabase
        .from("places")
        .select("id, name, category, address, price_tier, price_icon, lat, lng, rating_avg, rating_count, website")
        .order("rating_count", { ascending: false, nullsLast: true })
        .limit(userLocation ? 80 : 18);

      if (userLocation && deltaLat && deltaLng) {
        query = query
          .gte("lat", userLocation.lat - deltaLat)
          .lte("lat", userLocation.lat + deltaLat)
          .gte("lng", userLocation.lng - deltaLng)
          .lte("lng", userLocation.lng + deltaLng);
      }

      const { data, error } = await query;
      if (cancelled) return;
      if (error) {
        setError("Couldn't load nearby spots right now.");
        setLoading(false);
        return;
      }

      const withDistance: NearbyPlace[] = (data ?? []).map((place) => {
        const coords = place.lat != null && place.lng != null ? { lat: place.lat, lng: place.lng } : null;
        const distanceKm = coords && userLocation ? haversineDistanceKm(userLocation, coords) : null;
        return { ...place, distanceKm };
      });

      const sorted = withDistance.sort((a, b) => {
        if (a.distanceKm != null && b.distanceKm != null) {
          return a.distanceKm - b.distanceKm;
        }
        if (a.distanceKm != null) return -1;
        if (b.distanceKm != null) return 1;
        return (b.rating_count ?? 0) - (a.rating_count ?? 0);
      });

      setPlaces(sorted.slice(0, 18));
      setLoading(false);
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  const highlight = useMemo(() => places.slice(0, 3), [places]);
  const rest = useMemo(() => places.slice(3), [places]);
  const locationStatus = usedLocation ? "Showing places near you" : "Trending picks in Tokyo";

  const renderCard = (place: NearbyPlace) => {
    const distanceLabel = formatKm(place.distanceKm);
    const priceLabel = priceTierToSymbol(place.price_tier);
    const accent =
      place.price_icon ??
      (priceLabel ? priceLabel.replace(/\$/g, "¥").replace(/!/g, "•") : null);

    return (
      <div
        key={place.id}
        className="group relative flex flex-col gap-2 rounded-2xl border border-white/60 bg-white/80 p-4 shadow-[0_20px_48px_-26px_rgba(24,34,58,0.4)] transition hover:-translate-y-1 hover:shadow-[0_28px_64px_-28px_rgba(24,34,58,0.52)]"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-col">
            <p className="text-sm uppercase tracking-[0.22em] text-[#7c89aa]">{place.category || "Spot"}</p>
            <h3 className="text-lg font-semibold text-[#1d2742]">{place.name}</h3>
          </div>
          {accent ? (
            <span className="rounded-full bg-[#1d2742] px-3 py-1 text-xs font-semibold text-white shadow-sm">
              {accent}
            </span>
          ) : null}
        </div>
        <p className="text-sm text-[#4c5a7a] line-clamp-2">{place.address || "Nearby spot"}</p>
        <div className="flex items-center gap-3 text-xs text-[#324166]">
          {distanceLabel ? (
            <span className="flex items-center gap-1 rounded-full bg-[#eef1ff] px-2 py-1">
              <Navigation className="h-3.5 w-3.5" />
              {distanceLabel}
            </span>
          ) : null}
          {place.rating_avg ? (
            <span className="rounded-full bg-white/80 px-2 py-1 shadow-sm">
              {place.rating_avg.toFixed(1)} · {place.rating_count ?? 0} ratings
            </span>
          ) : null}
        </div>
        <div className="flex items-center gap-2 pt-1">
          <Link
            href={`/explore?q=${encodeURIComponent(place.name)}`}
            className="text-xs font-semibold uppercase tracking-[0.22em] text-[#1d2742] underline-offset-4 hover:underline"
          >
            Explore
          </Link>
          {place.website ? (
            <Link
              href={place.website}
              target="_blank"
              rel="noreferrer"
              className="text-xs uppercase tracking-[0.22em] text-[#4c5a7a] underline-offset-4 hover:underline"
            >
              Website
            </Link>
          ) : null}
        </div>
      </div>
    );
  };

  return (
    <section id="nearby-spots" className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 pb-20 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-[#e9edff] to-white text-[#1d2742] shadow-[0_12px_32px_-20px_rgba(27,38,74,0.4)]">
            <MapPin className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-2xl font-semibold text-[#18223a]">Showing spots near you</h2>
          </div>
        </div>
        <div className="flex items-center gap-2 rounded-full border border-white/60 bg-white/70 px-3 py-1 text-xs uppercase tracking-[0.22em] text-[#4d5f91] shadow-sm">
          <Sparkles className="h-4 w-4" />
          Curated for you
        </div>
      </div>

      {error ? (
        <div className="rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-700 shadow-sm">
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div
              key={index}
              className="h-36 animate-pulse rounded-2xl border border-white/60 bg-white/60 shadow-[0_18px_40px_-26px_rgba(24,34,58,0.34)]"
            />
          ))}
        </div>
      ) : (
        <>
          {highlight.length ? (
            <div className="grid gap-4 md:grid-cols-3">
              {highlight.map((place, index) => (
                <div
                  key={place.id}
                  className="relative overflow-hidden rounded-3xl border border-white/70 bg-gradient-to-br from-white/92 via-white/86 to-[#eef1ff]/88 p-[1px] shadow-[0_24px_60px_-32px_rgba(24,34,58,0.5)]"
                >
                  <div className="h-full rounded-[28px] bg-white/90 p-5">
                    <div className="flex items-center gap-3">
                      <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-[#1d2742] text-sm font-semibold text-white shadow-sm">
                        {index + 1}
                      </span>
                      <div className="flex flex-col">
                        <p className="text-xs uppercase tracking-[0.24em] text-[#7c89aa]">{place.category || "Spot"}</p>
                        <h3 className="text-lg font-semibold text-[#1d2742]">{place.name}</h3>
                      </div>
                    </div>
                    <p className="mt-2 line-clamp-2 text-sm text-[#4c5a7a]">{place.address || "Close by"}</p>
                    <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-[#324166]">
                      {formatKm(place.distanceKm) ? (
                        <span className="rounded-full bg-[#eef1ff] px-3 py-1">{formatKm(place.distanceKm)}</span>
                      ) : null}
                      {place.rating_avg ? (
                        <span className="rounded-full bg-white/80 px-3 py-1 shadow-sm">
                          {place.rating_avg.toFixed(1)} · {place.rating_count ?? 0} ratings
                        </span>
                      ) : null}
                      {priceTierToSymbol(place.price_tier) ? (
                        <span className="rounded-full border border-white/60 px-3 py-1">
                          {priceTierToSymbol(place.price_tier)}
                        </span>
                      ) : null}
                    </div>
                    <div className="mt-4 flex items-center gap-3">
                      <Link
                        href={`/explore?q=${encodeURIComponent(place.name)}`}
                        className="text-xs font-semibold uppercase tracking-[0.22em] text-[#1d2742] underline-offset-4 hover:underline"
                      >
                        View details
                      </Link>
                      {place.website ? (
                        <Link
                          href={place.website}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs uppercase tracking-[0.22em] text-[#4c5a7a] underline-offset-4 hover:underline"
                        >
                          Website
                        </Link>
                      ) : null}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : null}

          {rest.length ? (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {rest.map((place) => renderCard(place))}
            </div>
          ) : null}
        </>
      )}
    </section>
  );
}
