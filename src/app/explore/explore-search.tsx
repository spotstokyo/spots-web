"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import AnimatedSearchInput from "@/components/AnimatedSearchInput";
import GlassCard from "@/components/GlassCard";
import { supabase } from "@/lib/supabase";
import type { Tables } from "@/lib/database.types";
import { resolvePriceIcon } from "@/lib/pricing";

type PlaceRow = Tables<"places">;

const ensureHttpUrl = (value: string | null) => {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  try {
    const hasProtocol = /^https?:\/\//i.test(trimmed);
    return new URL(hasProtocol ? trimmed : `https://${trimmed}`).href;
  } catch {
    return null;
  }
};

const getEmbedUrl = (website: string | null) => {
  const normalized = ensureHttpUrl(website);
  if (!normalized) return null;

  try {
    const url = new URL(normalized);
    const hostname = url.hostname.toLowerCase();
    const segments = url.pathname.split("/").filter(Boolean);

    if (hostname.includes("instagram.com")) {
      if (segments[0] === "p" && segments[1]) {
        return `https://www.instagram.com/p/${segments[1]}/embed`;
      }

      if (segments.length >= 1) {
        return `https://www.instagram.com/${segments[0]}/embed`;
      }

      return "https://www.instagram.com/instagram/embed";
    }

    return normalized;
  } catch {
    return normalized;
  }
};

const formatPhoneHref = (phone: string | null) => {
  if (!phone) return null;
  const numeric = phone.replace(/[^+0-9]/g, "");
  return numeric ? `tel:${numeric}` : null;
};

const formatRange = (tier: PlaceRow["price_tier"]) => {
  if (!tier) return null;
  switch (tier) {
    case 1:
      return "¥1-1,000";
    case 2:
      return "¥1,000-2,000";
    case 3:
      return "¥2,000-3,000";
    case 4:
      return "¥3,000-5,000";
    case 5:
      return "¥5,000-10,000";
    case 6:
      return "¥10,000+";
    default:
      return null;
  }
};

export default function ExploreSearch() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryParam = searchParams.get("q") ?? "";

  const [search, setSearch] = useState(queryParam);
  const [places, setPlaces] = useState<PlaceRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<PlaceRow | null>(null);

  useEffect(() => {
    setSearch(queryParam);
    setSelected(null);
  }, [queryParam]);

  useEffect(() => {
    if (!queryParam.trim()) {
      setPlaces([]);
      return;
    }

    const fetchPlaces = async () => {
      setLoading(true);
      setError(null);
      const likeQuery = queryParam.trim().replace(/%/g, "");

      let { data, error } = await supabase
        .from("places")
        .select("*")
        .or(
          `name.ilike.%${likeQuery}%,address.ilike.%${likeQuery}%,category.ilike.%${likeQuery}%`
        )
        .limit(30);

      if (error?.code === "42703") {
        const fallback = await supabase
          .from("places")
          .select("id, name, category, address, price_tier, website, phone, created_at")
          .or(
            `name.ilike.%${likeQuery}%,address.ilike.%${likeQuery}%,category.ilike.%${likeQuery}%`
          )
          .limit(30);

        const fallbackData = fallback.data?.map((place) =>
          ({
            address: place.address ?? null,
            banner_url: null,
            category: place.category,
            created_at: place.created_at ?? null,
            id: place.id,
            lat: null,
            lng: null,
            logo_url: null,
            name: place.name,
            phone: place.phone ?? null,
            price_icon: null,
            price_tier: place.price_tier ?? null,
            rating_avg: null,
            rating_count: null,
            website: place.website ?? null,
          }) satisfies PlaceRow,
        ) ?? null;

        data = fallbackData;
        error = fallback.error;
      }

      if (error) {
        setError(error.message);
        setPlaces([]);
      } else {
        setPlaces(data ?? []);
      }

      setLoading(false);
    };

    fetchPlaces();
  }, [queryParam]);

  const handleSubmit = () => {
    const value = search.trim();
    if (!value) {
      router.push("/explore");
      return;
    }
    router.push(`/explore?q=${encodeURIComponent(value)}`);
  };

  const websiteHref = selected ? ensureHttpUrl(selected.website) : null;
  const phoneHref = selected ? formatPhoneHref(selected.phone) : null;
  const priceIcon = selected ? resolvePriceIcon(selected.price_icon, selected.price_tier) : null;
  const priceRange = selected ? formatRange(selected.price_tier) : null;
  const embedUrl = selected ? getEmbedUrl(selected.website ?? null) : null;

  return (
    <div className="space-y-6">
      <GlassCard className="space-y-3">
        <AnimatedSearchInput value={search} onChange={setSearch} onSubmit={handleSubmit} />
        <p className="text-xs text-[#4c5a7a]">
          Search by neighborhood, cuisine, or vibe. Tap a spot to see the details or jump into the full page.
        </p>
      </GlassCard>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-[#4c5a7a]">
          {queryParam ? `Results for “${queryParam}”` : "Start searching to explore spots."}
        </p>
        <Link
          href="/submit"
          className="rounded-full border border-[#1d2742] bg-[#1d2742] px-5 py-2 text-sm font-semibold text-white shadow-[0_20px_45px_-28px_rgba(19,28,46,0.52)] transition hover:scale-[1.03]"
        >
          Submit a new spot
        </Link>
      </div>

      {error ? (
        <GlassCard className="border-red-200/70 bg-[rgba(255,255,255,0.58)] text-sm text-rose-700">
          {error}
        </GlassCard>
      ) : null}

      {loading ? (
        <GlassCard className="text-center text-sm text-[#4c5a7a]">
          Searching…
        </GlassCard>
      ) : null}

      {!loading && queryParam && !places.length ? (
        <GlassCard className="text-center text-sm text-[#4c5a7a]">
          No results yet. Try another keyword or add a new spot.
        </GlassCard>
      ) : null}

      <div className="grid gap-6 md:grid-cols-2">
        {places.map((place) => (
          <GlassCard key={place.id} onClick={() => setSelected(place)} className="space-y-3">
            <div className="flex h-36 flex-col justify-end rounded-2xl bg-gradient-to-br from-white/35 via-transparent to-white/15 p-4">
              <span className="text-xs font-semibold uppercase tracking-[0.28em] text-[#4d5f91]">
                {place.category}
              </span>
              <h3 className="mt-2 text-lg font-semibold text-[#18223a]">
                {place.name}
              </h3>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-[#2a3554]">{place.address ?? "Tokyo"}</p>
              <p className="text-sm text-[#51608b]">{resolvePriceIcon(place.price_icon, place.price_tier) ?? "Not specified"}</p>
              <p className="text-xs uppercase tracking-[0.18em] text-[#7c89aa]">
                Tap to view details
              </p>
            </div>
          </GlassCard>
        ))}
      </div>

      {selected ? (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-[rgba(12,18,31,0.45)] px-4 py-8 backdrop-blur-sm"
          onClick={() => setSelected(null)}
        >
          <div
            className="relative w-full max-w-3xl rounded-3xl border border-white/60 bg-[rgba(255,255,255,0.72)] p-6 shadow-[0_40px_120px_-50px_rgba(22,34,64,0.75)] backdrop-blur-[22px]"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setSelected(null)}
              className="absolute right-5 top-5 inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/70 bg-white/65 text-[#1d2742] transition hover:bg-white"
            >
              <span className="sr-only">Close details</span>
              <span aria-hidden>&times;</span>
            </button>

            <div className="pr-4">
              <span className="text-xs font-semibold uppercase tracking-[0.32em] text-[#4d5f91]">
                {selected.category}
              </span>
              <h2 className="mt-3 text-3xl font-semibold text-[#18223a]">
                {selected.name}
              </h2>
              <p className="mt-2 text-sm text-[#4c5a7a]">
                {selected.address ?? "No address provided yet."}
              </p>

              <div className="mt-6 grid gap-4 text-sm text-[#18223a] md:grid-cols-2">
                <GlassCard className="space-y-1 border-white/50 bg-[rgba(255,255,255,0.54)]">
                  <p className="text-xs uppercase tracking-[0.22em] text-[#4d5f91]">Price</p>
                  <p className="text-base text-[#1d2742]">
                    {priceIcon}
                    {priceRange ? ` · ${priceRange}` : ""}
                  </p>
                </GlassCard>
                <GlassCard className="space-y-1 border-white/50 bg-[rgba(255,255,255,0.54)]">
                  <p className="text-xs uppercase tracking-[0.22em] text-[#4d5f91]">Website</p>
                  <p className="text-base text-[#1d2742]">
                    {websiteHref ? (
                      <a
                        href={websiteHref}
                        rel="noreferrer"
                        target="_blank"
                        className="font-medium text-[#4364ff] underline-offset-4 hover:underline"
                      >
                        Open site
                      </a>
                    ) : (
                      "Not provided"
                    )}
                  </p>
                </GlassCard>
                <GlassCard className="space-y-1 border-white/50 bg-[rgba(255,255,255,0.54)]">
                  <p className="text-xs uppercase tracking-[0.22em] text-[#4d5f91]">Phone</p>
                  <p className="text-base text-[#1d2742]">
                    {phoneHref ? (
                      <a href={phoneHref} className="font-medium text-[#4364ff] underline-offset-4 hover:underline">
                        {selected.phone}
                      </a>
                    ) : (
                      selected.phone ?? "Not provided"
                    )}
                  </p>
                </GlassCard>
                <GlassCard className="space-y-1 border-white/50 bg-[rgba(255,255,255,0.54)]">
                  <p className="text-xs uppercase tracking-[0.22em] text-[#4d5f91]">Added</p>
                  <p className="text-base text-[#1d2742]">
                    {selected.created_at
                      ? new Date(selected.created_at).toLocaleDateString()
                      : "Unknown"}
                  </p>
                </GlassCard>
              </div>

              {embedUrl ? (
                <div className="mt-6 overflow-hidden rounded-3xl border border-white/60 bg-white/55">
                  <iframe
                    key={embedUrl}
                    src={embedUrl}
                    className="h-[320px] w-full border-0"
                    loading="lazy"
                    title="Place preview"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; picture-in-picture"
                    allowFullScreen
                    sandbox="allow-same-origin allow-scripts allow-popups allow-forms allow-popups-to-escape-sandbox"
                  />
                </div>
              ) : null}

              <div className="mt-6 flex flex-wrap gap-2">
                <Link
                  href={`/place/${selected.id}`}
                  className="rounded-full border border-[#1d2742] bg-[#1d2742] px-5 py-2 text-sm font-semibold text-white shadow-[0_22px_48px_-28px_rgba(19,28,46,0.55)] transition hover:scale-[1.03]"
                >
                  View place page
                </Link>
                <button
                  type="button"
                  onClick={() => setSelected(null)}
                  className="rounded-full border border-white/40 bg-white/55 px-5 py-2 text-sm text-[#1d2742] transition hover:scale-[1.02]"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
