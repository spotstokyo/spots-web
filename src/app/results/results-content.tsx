"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Database } from "@/lib/database.types";
import { supabase } from "@/lib/supabase";
import GlassCard from "@/components/GlassCard";
import PageContainer from "@/components/PageContainer";

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

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") {
        setSelectedPlace(null);
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [selectedPlace]);

  useEffect(() => {
    if (!query) {
      setPlaces([]);
      return;
    }

    const fetchPlaces = async () => {
      const { data, error } = await supabase.from("places").select("*");

      if (error) {
        setError(error.message);
        return;
      }

      const filtered = (data as Place[]).filter((p) =>
        [p.name, p.category, p.address]
          .filter(Boolean)
          .some((field) => field!.toLowerCase().includes(query))
      );

      setPlaces(filtered);
    };

    fetchPlaces();
  }, [query]);

  return (
    <PageContainer size="lg" className="mt-2 pb-16">
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

      {/* Cards */}
      {query ? (
        <section className="grid gap-6 sm:grid-cols-2">
          {places.map((place) => {
            const ratingAverage = formatRatingValue(place.rating_avg);
            const ratingCount = place.rating_count ?? "TBD";
            const priceDisplay = formatPriceTier(place);

            return (
              <GlassCard key={place.id} onClick={() => setSelectedPlace(place)} className="space-y-3">
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
            );
          })}

          {places.length === 0 && (
            <GlassCard className="col-span-full text-center text-sm text-[#4c5a7a]">
              No results found.
            </GlassCard>
          )}
        </section>
      ) : (
        <GlassCard className="mt-12 text-center text-sm text-[#4c5a7a]">
          Please enter a search term.
        </GlassCard>
      )}

      {error && <GlassCard className="border-rose-200/80 text-sm text-rose-700">{error}</GlassCard>}

      {selectedPlace && (
        <div
          className="fixed inset-0 z-30 flex items-center justify-center bg-[rgba(12,18,31,0.45)] px-4 py-8 backdrop-blur-sm"
          onClick={() => setSelectedPlace(null)}
        >
          <div
            className="relative w-full max-w-5xl overflow-hidden rounded-2xl border border-white/60 bg-[rgba(255,255,255,0.78)] shadow-[0_40px_120px_-48px_rgba(22,34,64,0.7)] backdrop-blur-[22px]"
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

            <div className="grid max-h-[85vh] grid-cols-1 overflow-hidden md:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
              <div className="overflow-y-auto px-6 pb-8 pt-14 md:max-h-[85vh] md:px-8">
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

              <div className="flex min-h-[320px] flex-col border-t border-white/60 bg-white/45 md:border-l md:border-t-0">
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
