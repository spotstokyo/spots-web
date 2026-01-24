"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Database } from "@/lib/database.types";
import { supabase } from "@/lib/supabase";
import GlassCard from "@/components/ui/GlassCard";
import PageContainer from "@/components/layout/PageContainer";
import Appear from "@/components/ui/Appear";
import { sanitizeToken, inferPriceTierFromBudget, resolveNumericPriceTier } from "@/lib/search-query";
import { resolveSearchIntent } from "@/lib/resolve-search-intent";
import { requestUserLocation } from "@/lib/user-location";
import { normalizeCoordinates } from "@/lib/coordinates";

type Place = Database["public"]["Tables"]["places"]["Row"];

const derivePriceIcon = (tier: Place["price_tier"]) => {
  if (!tier) return null;
  const numericTier = Math.round(Number(tier));
  if (numericTier <= 2) return "¥";
  if (numericTier <= 4) return "¥¥";
  return "¥¥¥";
};

const formatPriceTier = (place: Place | null) => {
  if (!place) return "Not specified";
  const icon = place.price_icon?.trim() || derivePriceIcon(place.price_tier);
  if (!icon) return "Not specified";
  return icon;
};

const formatPriceRange = (place: Place | null) => {
  if (!place?.price_tier) return null;
  const tier = Math.round(Number(place.price_tier));

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

const formatRatingValue = (rating: Place["rating_avg"]) => {
  if (rating == null) return "TBD";
  return Number(rating).toFixed(1);
};

const formatPhoneHref = (phone: Place["phone"]) => {
  if (!phone) return null;
  const numeric = phone.replace(/[^+0-9]/g, "");
  if (!numeric) return null;
  return `tel:${numeric}`;
};

const ensureHttpUrl = (value: Place["website"] | Place["phone"] | string | null) => {
  if (!value) return null;
  const trimmed = `${value}`.trim();
  if (!trimmed) return null;

  try {
    const hasProtocol = /^https?:\/\//i.test(trimmed);
    const url = new URL(hasProtocol ? trimmed : `https://${trimmed}`);
    return url.href;
  } catch {
    return null;
  }
};

const getEmbedUrl = (website: Place["website"]) => {
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

const formatTimestamp = (timestamp: Place["created_at"]) => {
  if (!timestamp) return "Not specified";
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return "Not specified";

  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(date);
  } catch {
    return date.toLocaleString();
  }
};

const buildOrClause = (columns: string[], tokens: string[]) => {
  return tokens
    .flatMap((token) => columns.map((column) => `${column}.ilike.%${token}%`))
    .join(",");
};

const EARTH_RADIUS_KM = 6371;

const toRadians = (value: number) => (value * Math.PI) / 180;

const computeDistanceKm = (origin: { lat: number; lng: number }, target: { lat: number; lng: number }) => {
  const latDiff = toRadians(target.lat - origin.lat);
  const lngDiff = toRadians(target.lng - origin.lng);
  const originLat = toRadians(origin.lat);
  const targetLat = toRadians(target.lat);

  const a =
    Math.sin(latDiff / 2) ** 2 +
    Math.cos(originLat) * Math.cos(targetLat) * Math.sin(lngDiff / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_KM * c;
};

interface EmbedPreviewProps {
  embedUrl: string | null;
  externalUrl: string | null;
}

function EmbedPreview({ embedUrl, externalUrl }: EmbedPreviewProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isUnavailable, setIsUnavailable] = useState(false);

  useEffect(() => {
    setIsLoaded(false);
    setIsUnavailable(false);
  }, [embedUrl]);

  if (!embedUrl) {
    return (
      <div className="flex h-full items-center justify-center px-6 py-10 text-sm text-gray-500">
        {externalUrl ? (
          <a
            className="font-medium text-blue-600 underline-offset-4 hover:underline"
            href={externalUrl}
            rel="noreferrer"
            target="_blank"
          >
            Open website in a new tab
          </a>
        ) : (
          "Add a website to see a live preview."
        )}
      </div>
    );
  }

  return (
    <div className="relative flex-1 overflow-hidden">
      {!isLoaded && !isUnavailable && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm text-gray-500">
          Loading preview...
        </div>
      )}

      <iframe
        key={embedUrl}
        src={embedUrl}
        className="h-full w-full border-0"
        loading="lazy"
        title="Website preview"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; picture-in-picture"
        allowFullScreen
        sandbox="allow-same-origin allow-scripts allow-popups allow-forms allow-popups-to-escape-sandbox"
        onLoad={() => setIsLoaded(true)}
        onError={() => setIsUnavailable(true)}
      />

      {isUnavailable && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-white/85 p-6 text-center text-sm text-gray-600">
          <p>We could not embed this site, but you can still open it directly.</p>
          {externalUrl && (
            <a
              className="rounded-full bg-gray-900 px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-white transition hover:bg-gray-700"
              href={externalUrl}
              rel="noreferrer"
              target="_blank"
            >
              Open website
            </a>
          )}
        </div>
      )}
    </div>
  );
}

export default function ResultsContent() {
  const searchParams = useSearchParams();
  const query = searchParams.get("q")?.toLowerCase() ?? "";

  const [places, setPlaces] = useState<Place[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);

  const websiteHref = selectedPlace ? ensureHttpUrl(selectedPlace.website) : null;
  const embedUrl = selectedPlace ? getEmbedUrl(selectedPlace.website) : null;
  const phoneHref = selectedPlace ? formatPhoneHref(selectedPlace.phone) : null;
  const priceIcon = formatPriceTier(selectedPlace);
  const priceRange = formatPriceRange(selectedPlace);

  useEffect(() => {
    if (!selectedPlace) return;

    const prevOverflow = document.body.style.overflow;
    const prevPaddingRight = document.body.style.paddingRight;

    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = "hidden";
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }

    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") {
        setSelectedPlace(null);
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = prevOverflow;
      document.body.style.paddingRight = prevPaddingRight;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [selectedPlace]);

  useEffect(() => {
    const trimmed = query.trim();

    if (!trimmed) {
      setPlaces([]);
      setError(null);
      return;
    }

    let isCurrent = true;
    const intentController = new AbortController();

    const fetchPlaces = async () => {
      const parsed = await resolveSearchIntent(trimmed, intentController.signal);
      const budgetTier = inferPriceTierFromBudget(parsed.maxBudgetYen);
      if (!isCurrent) return;

      let userLocation: { lat: number; lng: number } | null = null;
      if (parsed.wantsNearby) {
        userLocation = await requestUserLocation(intentController.signal);
      }
      if (!isCurrent) return;

      const tokenSet = new Set(parsed.terms);
      parsed.locationTerms.forEach((term) => tokenSet.add(term));

      const searchTokens = Array.from(tokenSet).map((token) => sanitizeToken(token)).filter(Boolean);

      let queryBuilder = supabase
        .from("places")
        .select(
          "id,name,category,address,price_tier,price_icon,rating_avg,rating_count,website,phone,created_at,lat,lng,lat_backup,lng_backup",
        );

      if (searchTokens.length) {
        const orClause = buildOrClause(["name", "category", "address"], searchTokens);
        if (orClause) {
          queryBuilder = queryBuilder.or(orClause);
        }
      }

      if (budgetTier != null) {
        queryBuilder = queryBuilder.order("price_tier", { ascending: true, nullsFirst: true });
      }

      const effectiveLimit = searchTokens.length ? 30 : 80;
      const { data, error } = await queryBuilder.limit(effectiveLimit);

      if (!isCurrent) return;

      if (error) {
        setError(error.message);
        setPlaces([]);
        return;
      }

      let filtered = (data as Place[]) ?? [];

      if (searchTokens.length) {
        const loweredTokens = searchTokens.map((token) => token.toLowerCase());
        filtered = filtered.filter((place) => {
          const haystack = `${place.name} ${place.category ?? ""} ${place.address ?? ""}`.toLowerCase();
          return loweredTokens.every((token) => haystack.includes(token));
        });
      }

      if (budgetTier != null) {
        const filterByTier = (rows: Place[], tierLimit: number) =>
          rows.filter((place) => {
            const tier = resolveNumericPriceTier(place.price_tier, place.price_icon);
            if (tier == null) return false;
            return tier <= tierLimit;
          });

        filtered = filterByTier(filtered, budgetTier);

        if (!filtered.length && budgetTier > 1) {
          const relaxedTier = Math.min(budgetTier + 1, 6);
          filtered = filterByTier((data as Place[]) ?? [], relaxedTier);
        }
      }

      if (userLocation) {
        const withDistances = filtered.map((place) => {
          const coords =
            normalizeCoordinates(place.lat ?? null, place.lng ?? null) ??
            normalizeCoordinates(place.lat_backup ?? null, place.lng_backup ?? null);
          if (!coords) {
            return { place, distance: Number.POSITIVE_INFINITY };
          }
          return {
            place,
            distance: computeDistanceKm(userLocation as { lat: number; lng: number }, coords),
          };
        });
        withDistances.sort((a, b) => a.distance - b.distance);
        filtered = withDistances.map((entry) => entry.place);
      }

      setError(null);
      setPlaces(filtered);
    };

    void fetchPlaces();

    return () => {
      isCurrent = false;
      intentController.abort();
    };
  }, [query]);

  return (
    <PageContainer size="lg" className="mt-2 pb-16">
      <Appear preset="lift-tilt">
        <GlassCard className="mb-6 space-y-1 text-center">
          <span className="text-2xl font-semibold lowercase tracking-tight text-[#18223a]">
            spots
          </span>
          {query ? (
            <p className="text-sm text-[#4c5a7a]">
              Showing results for <span className="font-medium text-[#18223a]">{query}</span>
            </p>
          ) : (
            <p className="text-sm text-[#4c5a7a]">Start typing to explore the latest discoveries.</p>
          )}
        </GlassCard>
      </Appear>

      {/* Cards */}
      {query ? (
        <section className="grid gap-6 sm:grid-cols-2">
          {places.map((place, index) => {
            const ratingAverage = formatRatingValue(place.rating_avg);
            const ratingCount = place.rating_count ?? "TBD";
            const priceDisplay = formatPriceTier(place);

            return (
              <Appear key={place.id} preset="fade-up-soft" delayOrder={index} className="h-full">
                <GlassCard onClick={() => setSelectedPlace(place)} className="flex h-full flex-col space-y-3">
                  <div className="flex h-36 flex-col justify-end rounded-2xl bg-gradient-to-br from-white/35 via-transparent to-white/15 p-4">
                    <span className="text-xs font-semibold uppercase tracking-[0.28em] text-[#4d5f91]">
                      {place.category}
                    </span>
                    <h3 className="mt-2 text-lg font-semibold text-[#18223a]">
                      {place.name}
                    </h3>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-[#2a3554]">
                      {place.address ?? "Tokyo"}
                    </p>
                    <p className="text-sm text-[#51608b]">{priceDisplay}</p>
                    <p className="text-xs uppercase tracking-[0.18em] text-[#7c89aa]">
                      ★ {ratingAverage} · {ratingCount === "TBD" ? "No reviews yet" : `${ratingCount} reviews`}
                    </p>
                  </div>
                </GlassCard>
              </Appear>
            );
          })}

          {places.length === 0 && (
            <Appear preset="fade-up" delayOrder={places.length} className="col-span-full">
              <GlassCard className="text-center text-sm text-[#4c5a7a]">
                No results found.
              </GlassCard>
            </Appear>
          )}
        </section>
      ) : (
        <Appear preset="fade-up">
          <GlassCard className="mt-12 text-center text-sm text-[#4c5a7a]">
            Please enter a search term.
          </GlassCard>
        </Appear>
      )}

      {error && (
        <Appear preset="fade">
          <GlassCard className="border-rose-200/80 text-sm text-rose-700">{error}</GlassCard>
        </Appear>
      )}

      {selectedPlace && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-[rgba(12,18,31,0.45)] px-4 py-8 backdrop-blur-sm"
          onClick={() => setSelectedPlace(null)}
        >
          <div
            className="relative w-full max-w-4xl overflow-hidden rounded-2xl border border-white/60 bg-[rgba(255,255,255,0.78)] shadow-[0_40px_120px_-48px_rgba(22,34,64,0.7)] backdrop-blur-[22px]"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setSelectedPlace(null)}
              className="absolute right-5 top-5 inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/70 bg-white/65 text-[#1d2742] transition hover:bg-white"
            >
              <span className="sr-only">Close details</span>
              <span aria-hidden="true">&times;</span>
            </button>

            <div className="grid max-h-[85vh] max-h-modal grid-cols-1 overflow-hidden md:grid-cols-2">
              <div className="modal-scroll overflow-y-auto px-6 pb-8 pt-14 md:max-h-[85vh] md:max-h-modal md:px-8">
                <span className="text-xs font-semibold uppercase tracking-[0.32em] text-[#4d5f91]">
                  {selectedPlace.category}
                </span>
                <h2 className="mt-3 text-3xl font-semibold text-[#18223a]">
                  {selectedPlace.name}
                </h2>
                <p className="mt-2 text-sm text-[#4c5a7a]">
                  {selectedPlace.address ?? "No address provided yet."}
                </p>

                <dl className="mt-8 grid gap-5 text-sm text-[#18223a]">
                  <div>
                    <dt className="text-xs uppercase tracking-[0.22em] text-[#4d5f91]">Price Tier</dt>
                    <dd className="mt-1 text-base text-[#18223a]">
                      {priceIcon === "Not specified"
                        ? "Not specified"
                        : priceRange
                        ? `${priceIcon} · ${priceRange}`
                        : priceIcon}
                    </dd>
                  </div>

                  <div>
                    <dt className="text-xs uppercase tracking-[0.22em] text-[#4d5f91]">Phone</dt>
                    <dd className="mt-1 text-base text-[#18223a]">
                      {phoneHref ? (
                        <a className="font-medium text-[#4364ff] underline-offset-4 hover:underline" href={phoneHref}>
                          {selectedPlace.phone}
                        </a>
                      ) : (
                        selectedPlace.phone ?? "Not specified"
                      )}
                    </dd>
                  </div>

                  <div>
                    <dt className="text-xs uppercase tracking-[0.22em] text-[#4d5f91]">Website</dt>
                    <dd className="mt-1 text-base text-[#18223a]">
                      {websiteHref ? (
                        <a
                          className="font-medium text-[#4364ff] underline-offset-4 hover:underline"
                          href={websiteHref}
                          rel="noreferrer"
                          target="_blank"
                        >
                          {selectedPlace.website ?? websiteHref}
                        </a>
                      ) : (
                        "Not specified"
                      )}
                    </dd>
                  </div>

                  <div>
                    <dt className="text-xs uppercase tracking-[0.22em] text-[#4d5f91]">Ratings</dt>
                    <dd className="mt-1 text-base text-[#18223a]">
                      ★ {formatRatingValue(selectedPlace.rating_avg)} · {selectedPlace.rating_count ?? "TBD"} ratings
                    </dd>
                    <p className="mt-1 text-xs text-[#7c89aa]">
                      Placeholder values while we finish the ratings experience.
                    </p>
                  </div>

                  <div>
                    <dt className="text-xs uppercase tracking-[0.22em] text-[#4d5f91]">Created</dt>
                    <dd className="mt-1 text-base text-[#18223a]">{formatTimestamp(selectedPlace.created_at)}</dd>
                  </div>
                </dl>
              </div>

              <div className="flex min-h-[320px] flex-col border-t border-white/60 bg-white/45 md:max-h-[85vh] md:max-h-modal md:border-l md:border-t-0">
                <div className="flex items-center justify-between border-b border-white/60 px-6 py-4">
                  <span className="text-xs font-semibold uppercase tracking-[0.32em] text-[#4d5f91]">
                    Live preview
                  </span>
                  {websiteHref && (
                    <a
                      className="rounded-full border border-white/70 bg-white/65 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#1d2742] transition hover:scale-[1.01]"
                      href={websiteHref}
                      rel="noreferrer"
                      target="_blank"
                    >
                      Open
                    </a>
                  )}
                </div>
                <EmbedPreview embedUrl={embedUrl} externalUrl={websiteHref} />
              </div>
            </div>
          </div>
        </div>
      )}
    </PageContainer>
  );
}
