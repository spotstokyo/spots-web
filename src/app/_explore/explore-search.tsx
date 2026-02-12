"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import AnimatedSearchInput from "@/components/features/search/AnimatedSearchInput";
import GlassCard from "@/components/ui/GlassCard";
import Appear from "@/components/ui/Appear";
import { supabase } from "@/lib/supabase";
import type { Tables } from "@/lib/database.types";
import { resolvePriceIcon } from "@/lib/pricing";
import { useIsAdmin } from "@/lib/use-is-admin";
import { sanitizeToken, inferPriceTierFromBudget, toMinutes, resolveNumericPriceTier } from "@/lib/search-query";
import { resolveSearchIntent } from "@/lib/resolve-search-intent";
import { requestUserLocation } from "@/lib/user-location";
import { normalizeCoordinates } from "@/lib/coordinates";
import BannerEditor, {
  type BannerEditorResult,
  filterClassMap,
} from "@/components/features/place/BannerEditor";

const BANNER_BUCKET = "place-banners";

type PlaceRow = Tables<"places">;
type PlaceHoursRow = Tables<"place_hours">;

const MINUTES_IN_DAY = 24 * 60;
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

const isOpenAtTime = (
  hours: Array<Pick<PlaceHoursRow, "open" | "close" | "weekday">>,
  targetMinutes: number,
) => {
  return hours.some((entry) => {
    const openMinutes = toMinutes(entry.open);
    let closeMinutes = toMinutes(entry.close);

    if (openMinutes == null || closeMinutes == null) return false;

    if (closeMinutes <= openMinutes) {
      closeMinutes += MINUTES_IN_DAY;
    }

    let comparisonTarget = targetMinutes;
    if (comparisonTarget < openMinutes) {
      comparisonTarget += MINUTES_IN_DAY;
    }

    return comparisonTarget >= openMinutes && comparisonTarget <= closeMinutes;
  });
};

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
  const { isAdmin } = useIsAdmin();
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryParam = searchParams.get("q") ?? "";

  const [search, setSearch] = useState(queryParam);
  const [places, setPlaces] = useState<PlaceRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<PlaceRow | null>(null);
  const [editingBannerPlace, setEditingBannerPlace] = useState<PlaceRow | null>(null);
  const [bannerMap, setBannerMap] = useState<Record<string, BannerEditorResult>>({});

  const loadActiveBanners = useCallback(
    async (placeRows: PlaceRow[]) => {
      if (!placeRows.length) {
        setBannerMap({});
        return;
      }

      const placeIds = placeRows.map((place) => place.id);
      const { data, error } = await supabase
        .from("place_banners")
        .select("place_id, storage_path, public_url, metadata")
        .in("place_id", placeIds)
        .eq("is_active", true)
        .eq("moderation_status", "approved");

      if (error) {
        console.error("Failed to load banners", error);
        return;
      }

      const next: Record<string, BannerEditorResult> = {};
      data?.forEach((row) => {
        const metadata = (row.metadata as { filter?: BannerEditorResult["filter"] } | null) ?? null;
        const filter = metadata?.filter && filterClassMap[metadata.filter]
          ? metadata.filter
          : "none";

        const objectPath = row.storage_path?.startsWith(`${BANNER_BUCKET}/`)
          ? row.storage_path.substring(BANNER_BUCKET.length + 1)
          : row.storage_path;

        const publicUrl = row.public_url
          ?? supabase.storage.from(BANNER_BUCKET).getPublicUrl(objectPath).data.publicUrl
          ?? null;

        if (publicUrl) {
          next[row.place_id] = { dataUrl: publicUrl, filter };
        }
      });

      setBannerMap(next);
    },
    [],
  );

  useEffect(() => {
    setSearch(queryParam);
    setSelected(null);
  }, [queryParam]);

  useEffect(() => {
    if (!queryParam.trim()) {
      setPlaces([]);
      setBannerMap({});
      return;
    }

    let isActive = true;
    const intentController = new AbortController();

    const fetchPlaces = async () => {
      setLoading(true);
      setError(null);
      const parsed = await resolveSearchIntent(queryParam, intentController.signal);
      if (!isActive) return;
      const budgetTier = inferPriceTierFromBudget(parsed.maxBudgetYen);
      let userLocation: { lat: number; lng: number } | null = null;
      if (parsed.wantsNearby) {
        userLocation = await requestUserLocation(intentController.signal);
        if (!isActive) return;
      }
      const likeQuery = queryParam.trim().replace(/%/g, "");

      const tokenSet = new Set<string>();
      parsed.terms.forEach((term) => tokenSet.add(term));
      parsed.locationTerms.forEach((term) => tokenSet.add(term));

      const queryTokens = Array.from(tokenSet).map(sanitizeToken).filter(Boolean);
      const fallbackTerm = sanitizeToken(likeQuery);

      const hasFilterIntent = parsed.maxBudgetYen != null || parsed.targetMinutes != null || parsed.wantsNearby;
      const shouldUseFallback = !queryTokens.length && !hasFilterIntent;

      const buildOrClause = (columns: string[], tokens: string[], fallback: string) => {
        const effectiveTokens = tokens.length ? tokens : shouldUseFallback && fallback ? [fallback] : [];
        return effectiveTokens
          .flatMap((token) => columns.map((column) => `${column}.ilike.%${token}%`))
          .join(",");
      };

      const orClause = buildOrClause(["name", "address", "category"], queryTokens, fallbackTerm);

      let queryBuilder = supabase.from("places").select("*");
      if (orClause) {
        queryBuilder = queryBuilder.or(orClause);
      }
      if (budgetTier != null) {
        queryBuilder = queryBuilder.order("price_tier", { ascending: true, nullsFirst: true });
      }
      const resultLimit = queryTokens.length ? 30 : 80;
      queryBuilder = queryBuilder.limit(resultLimit);

      let { data, error } = await queryBuilder;

      if (error?.code === "42703") {
        const fallbackOrClause = buildOrClause(
          ["name", "address", "category"],
          queryTokens,
          fallbackTerm,
        );

        let fallbackQuery = supabase
          .from("places")
          .select("id, name, category, address, price_tier, website, phone, created_at, lat, lng, lat_backup, lng_backup");

        if (fallbackOrClause) {
          fallbackQuery = fallbackQuery.or(fallbackOrClause);
        }

        if (budgetTier != null) {
          fallbackQuery = fallbackQuery.order("price_tier", { ascending: true, nullsFirst: true });
        }

        const fallback = await fallbackQuery.limit(resultLimit);

        const fallbackData = fallback.data?.map((place) =>
          ({
            address: place.address ?? null,
            banner_url: null,
            category: place.category,
            created_at: place.created_at ?? null,
            id: place.id,
            lat: place.lat ?? null,
            lat_backup: place.lat_backup ?? null,
            lng: place.lng ?? null,
            lng_backup: place.lng_backup ?? null,
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

      if (!isActive) return;

      if (error) {
        setError(error.message);
        setPlaces([]);
        setBannerMap({});
      } else {
        let rows = data ?? [];

        if (parsed.terms.length) {
          const loweredTerms = parsed.terms.map((term) => term.toLowerCase());
          rows = rows.filter((place) => {
            const haystack = `${place.name} ${place.address ?? ""} ${place.category ?? ""}`.toLowerCase();
            return loweredTerms.every((term) => haystack.includes(term));
          });
        }

        if (parsed.locationTerms.length) {
          rows = rows.filter((place) => {
            const haystack = `${place.name} ${place.address ?? ""}`.toLowerCase();
            return parsed.locationTerms.every((term) => haystack.includes(term));
          });
        }

        if (parsed.targetMinutes != null && rows.length) {
          const placeIds = rows.map((place) => place.id);
          const { data: hoursData, error: hoursError } = await supabase
            .from("place_hours")
            .select("place_id, open, close, weekday")
            .in("place_id", placeIds);

          if (!hoursError && hoursData) {
            const hoursMap = new Map<string, Array<Pick<PlaceHoursRow, "open" | "close" | "weekday">>>();
            hoursData.forEach((entry) => {
              const list = hoursMap.get(entry.place_id) ?? [];
              list.push(entry);
              hoursMap.set(entry.place_id, list);
            });

            rows = rows.filter((place) => {
              const hours = hoursMap.get(place.id);
              if (!hours?.length) return false;
              return isOpenAtTime(hours, parsed.targetMinutes as number);
            });
          }
        }

        if (budgetTier != null) {
          const filterByTier = (list: PlaceRow[], tierLimit: number) =>
            list.filter((place) => {
              const tier = resolveNumericPriceTier(place.price_tier, place.price_icon);
              if (tier == null) {
                return false;
              }
              return tier <= tierLimit;
            });

          rows = filterByTier(rows, budgetTier);

          if (!rows.length && budgetTier > 1) {
            const relaxedTier = Math.min(budgetTier + 1, 6);
            rows = filterByTier(data ?? [], relaxedTier);
          }
        }

        if (userLocation) {
          const withDistances = rows.map((place) => {
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
          rows = withDistances.map((entry) => entry.place);
        }

        setPlaces(rows);
        void loadActiveBanners(rows);
      }

      if (isActive) {
        setLoading(false);
      }
    };

    fetchPlaces();
    return () => {
      isActive = false;
      intentController.abort();
    };
  }, [loadActiveBanners, queryParam]);

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
  const selectedBanner = selected ? bannerMap[selected.id] : undefined;

  useEffect(() => {
    if (!selected) return;

    const prevOverflow = document.body.style.overflow;
    const prevPaddingRight = document.body.style.paddingRight;
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = "hidden";
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSelected(null);
    };
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = prevOverflow;
      document.body.style.paddingRight = prevPaddingRight;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [selected]);

  const handleBannerApply = useCallback(
    async (result: BannerEditorResult) => {
      if (!editingBannerPlace) return;

      const placeId = editingBannerPlace.id;
      const fileId = typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : Math.random().toString(36).slice(2, 10);

      const response = await fetch(result.dataUrl);
      const blob = await response.blob();
      const extension = blob.type.split("/")[1] ?? "jpg";
      const objectPath = `${placeId}/${fileId}.${extension}`;

      const { error: uploadError } = await supabase.storage
        .from(BANNER_BUCKET)
        .upload(objectPath, blob, { contentType: blob.type, upsert: false });

      if (uploadError) {
        throw uploadError;
      }

      const { data: publicData } = supabase.storage
        .from(BANNER_BUCKET)
        .getPublicUrl(objectPath);

      const publicUrl = publicData?.publicUrl ?? null;

      const { error: deactivateError } = await supabase
        .from("place_banners")
        .update({ is_active: false })
        .eq("place_id", placeId)
        .eq("is_active", true);

      if (deactivateError) {
        throw deactivateError;
      }

      const storagePath = `${BANNER_BUCKET}/${objectPath}`;

      const { data: insertData, error: insertError } = await supabase
        .from("place_banners")
        .insert({
          place_id: placeId,
          storage_path: storagePath,
          public_url: publicUrl,
          metadata: { filter: result.filter },
          is_active: true,
          moderation_status: "approved",
        })
        .select("public_url, storage_path, metadata")
        .single();

      if (insertError) {
        throw insertError;
      }

      const storedPath = insertData?.storage_path?.startsWith(`${BANNER_BUCKET}/`)
        ? insertData.storage_path.substring(BANNER_BUCKET.length + 1)
        : insertData?.storage_path ?? objectPath;

      const finalUrl =
        insertData?.public_url ??
        supabase.storage.from(BANNER_BUCKET).getPublicUrl(storedPath).data.publicUrl ??
        publicUrl ??
        result.dataUrl;

      const metadataFilter = (insertData?.metadata as { filter?: BannerEditorResult["filter"] } | null)?.filter;
      const filter = metadataFilter && filterClassMap[metadataFilter] ? metadataFilter : result.filter;

      setBannerMap((prev) => ({
        ...prev,
        [placeId]: { dataUrl: finalUrl, filter },
      }));

      setEditingBannerPlace(null);
      setSelected((current) => (current && current.id === placeId ? { ...current } : current));
    },
    [editingBannerPlace],
  );

  return (
    <div className="space-y-6">
      <Appear preset="lift-tilt" trigger="immediate">
        <GlassCard className="space-y-3">
          <AnimatedSearchInput value={search} onChange={setSearch} onSubmit={handleSubmit} />
          <p className="mt-4 text-xs text-[#4c5a7a]">
            Search by neighborhood, cuisine, or vibe. Tap a spot to see the details or jump into the full page.
          </p>
        </GlassCard>
      </Appear>

      <Appear preset="fade-up" trigger="immediate" className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-[#4c5a7a]">
          {queryParam ? `Results for “${queryParam}”` : "Start searching to explore spots."}
        </p>
        {isAdmin ? (
          <Link
            href="/submit"
            className="rounded-full border border-[#1d2742] bg-[#1d2742] px-5 py-2 text-sm font-semibold text-white shadow-[0_20px_45px_-28px_rgba(19,28,46,0.52)] transition hover:scale-[1.01]"
          >
            Submit a new spot
          </Link>
        ) : null}
      </Appear>

      {error ? (
        <Appear preset="fade" trigger="immediate" delayOrder={1}>
          <GlassCard className="border-red-200/70 bg-[rgba(255,255,255,0.58)] text-sm text-rose-700">
            {error}
          </GlassCard>
        </Appear>
      ) : null}

      {loading ? (
        <Appear preset="fade-up" trigger="immediate" delayOrder={2}>
          <GlassCard className="text-center text-sm text-[#4c5a7a]">
            Searching…
          </GlassCard>
        </Appear>
      ) : null}

      {!loading && queryParam && !places.length ? (
        <Appear preset="fade-up" trigger="immediate" delayOrder={3}>
          <GlassCard className="text-center text-sm text-[#4c5a7a]">
            No results yet. Try another keyword or add a new spot.
          </GlassCard>
        </Appear>
      ) : null}

      <div className="grid gap-6 md:grid-cols-2">
        {places.map((place, index) => {
          const banner = bannerMap[place.id];
          return (
            <Appear key={place.id} preset="fade-up-soft" trigger="immediate" delayOrder={index} className="h-full">
              <GlassCard
                onClick={() => setSelected(place)}
                className="flex h-full flex-col justify-between space-y-3 transition hover:scale-[1.01]"
              >
                <div className="relative h-36 overflow-hidden rounded-2xl">
                  {banner ? (
                    <>
                      <Image
                        src={banner.dataUrl}
                        alt={`${place.name} banner`}
                        fill
                        className={`object-cover ${filterClassMap[banner.filter]}`}
                        sizes="(max-width: 768px) 100vw, 50vw"
                        unoptimized
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/35 via-black/5 to-transparent" />
                    </>
                  ) : (
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.9),transparent_68%),radial-gradient(circle_at_bottom,rgba(229,235,255,0.55),transparent_75%),linear-gradient(180deg,rgba(255,255,255,0.92)0%,rgba(241,245,255,0.78)100%)]" />
                  )}
                  <div
                    className={`relative z-10 flex h-full flex-col justify-end p-4 ${banner ? "" : "text-[#1d2742]"
                      }`}
                  >
                    <span
                      className={`text-xs font-semibold uppercase tracking-[0.28em] ${banner ? "text-[#f0f2fa] drop-shadow" : "text-[#4d5f91]"
                        }`}
                    >
                      {place.category}
                    </span>
                    <h3
                      className={`mt-2 text-lg font-semibold ${banner ? "text-white drop-shadow-sm" : "text-[#18223a]"
                        }`}
                    >
                      {place.name}
                    </h3>
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="mt-3 text-sm text-[#2a3554]">{place.address ?? "Tokyo"}</p>
                  <p className="mt-3 text-sm text-[#51608b]">
                    {resolvePriceIcon(place.price_icon, place.price_tier) ?? "Not specified"}
                  </p>
                  <p className="mt-2 text-xs uppercase tracking-[0.18em] text-[#7c89aa]">
                    Tap to view details
                  </p>
                </div>
              </GlassCard>
            </Appear>
          );
        })}
      </div>

      {selected ? (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-[rgba(12,18,31,0.45)] px-4 py-8 backdrop-blur-sm"
          onClick={() => setSelected(null)}
        >
          <button
            type="button"
            onClick={() => setSelected(null)}
            className="absolute right-5 top-5 inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/70 bg-white/70 text-[#1d2742] shadow-sm transition hover:bg-white"
          >
            <span className="sr-only">Close details</span>
            <span aria-hidden>&times;</span>
          </button>
          <div
            className="relative w-full max-w-5xl overflow-hidden rounded-2xl border border-white/60 bg-[rgba(255,255,255,0.72)] shadow-[0_40px_120px_-50px_rgba(22,34,64,0.75)] backdrop-blur-[22px]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="grid max-h-[85vh] grid-cols-1 overflow-hidden md:grid-cols-2">
              <div className="modal-scroll overflow-y-auto px-6 pb-8 pt-14 md:max-h-[85vh] md:px-8">
                <div className="relative mb-5 h-44 overflow-hidden rounded-2xl border border-white/60">
                  {selectedBanner ? (
                    <>
                      <Image
                        src={selectedBanner.dataUrl}
                        alt={`${selected.name} banner`}
                        fill
                        className={`object-cover ${filterClassMap[selectedBanner.filter]}`}
                        sizes="(max-width: 768px) 100vw, 600px"
                        unoptimized
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-black/10 to-transparent" />
                    </>
                  ) : selected.banner_url ? (
                    <>
                      <Image
                        src={selected.banner_url}
                        alt={`${selected.name} banner`}
                        fill
                        className="object-cover"
                        sizes="(max-width: 768px) 100vw, 600px"
                        unoptimized
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-black/10 to-transparent" />
                    </>
                  ) : (
                    <div className="absolute inset-0 bg-gradient-to-br from-white/40 via-transparent to-white/15" />
                  )}
                </div>
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

                <div className="mt-6 flex flex-wrap gap-2">
                  <Link
                    href={`/place/${selected.id}`}
                    className="rounded-full border border-[#1d2742] bg-[#1d2742] px-5 py-2 text-sm font-semibold text-white shadow-[0_22px_48px_-28px_rgba(19,28,46,0.55)] transition hover:scale-[1.01]"
                  >
                    View place page
                  </Link>
                  <button
                    type="button"
                    onClick={() => setEditingBannerPlace(selected)}
                    className="rounded-full border border-white/45 bg-white/60 px-5 py-2 text-sm font-semibold text-[#1d2742] transition hover:scale-[1.02]"
                  >
                    Edit banner
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelected(null)}
                    className="rounded-full border border-white/40 bg-white/55 px-5 py-2 text-sm text-[#1d2742] transition hover:scale-[1.02]"
                  >
                    Close
                  </button>
                </div>
              </div>

              <div className="flex min-h-[320px] flex-col border-t border-white/60 bg-white/45 md:border-l md:border-t-0">
                <div className="flex items-center justify-between border-b border-white/60 px-6 py-4">
                  <span className="text-xs font-semibold uppercase tracking-[0.32em] text-[#4d5f91]">
                    Live preview
                  </span>
                  {websiteHref ? (
                    <a
                      className="rounded-full border border-white/70 bg-white/65 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#1d2742] transition hover:scale-[1.01]"
                      href={websiteHref}
                      rel="noreferrer"
                      target="_blank"
                    >
                      Open
                    </a>
                  ) : null}
                </div>
                {embedUrl ? (
                  <iframe
                    key={embedUrl}
                    src={embedUrl}
                    className="h-full w-full border-0"
                    loading="lazy"
                    title="Place preview"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; picture-in-picture"
                    allowFullScreen
                    sandbox="allow-same-origin allow-scripts allow-popups allow-forms allow-popups-to-escape-sandbox"
                  />
                ) : (
                  <div className="flex flex-1 items-center justify-center px-6 py-10 text-sm text-gray-500">
                    No website provided.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {editingBannerPlace ? (
        <BannerEditor
          initialImage={
            bannerMap[editingBannerPlace.id]?.dataUrl ?? editingBannerPlace.banner_url ?? null
          }
          initialFilter={bannerMap[editingBannerPlace.id]?.filter ?? "none"}
          onApply={handleBannerApply}
          onCancel={() => setEditingBannerPlace(null)}
        />
      ) : null}
    </div>
  );
}
