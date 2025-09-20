import { notFound } from "next/navigation";
import FeedCard from "@/components/FeedCard";
import OpeningTimesEditor from "@/components/OpeningTimesEditor";
import PlaceBanner from "@/components/PlaceBanner";
import GlassCard from "@/components/GlassCard";
import PageContainer from "@/components/PageContainer";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { formatRelativeTime } from "@/lib/time";
import { resolvePriceIcon, priceTierToSymbol } from "@/lib/pricing";
import type { Tables } from "@/lib/database.types";

export const dynamic = "force-dynamic";
export const revalidate = 0;

interface PlacePageProps {
  params: Promise<{ id: string }>;
}

type PlaceRowBase = Pick<
  Tables<"places">,
  | "id"
  | "name"
  | "category"
  | "address"
  | "phone"
  | "website"
  | "price_tier"
>;

type PlaceRowData = PlaceRowBase & {
  price_icon?: string | null;
  banner_url?: string | null;
  logo_url?: string | null;
};

interface PlacePostRow extends Tables<"posts"> {
  author: Pick<Tables<"profiles">, "display_name" | "avatar_url" | "id"> | null;
}

function normalizeWebsite(url: string | null) {
  if (!url) return null;
  try {
    const trimmed = url.trim();
    const hasProtocol = /^https?:\/\//i.test(trimmed);
    const normalized = hasProtocol ? trimmed : `https://${trimmed}`;
    return new URL(normalized).toString();
  } catch {
    return null;
  }
}

function normalizePhone(phone: string | null) {
  if (!phone) return null;
  const digits = phone.replace(/[^+0-9]/g, "");
  return digits ? `tel:${digits}` : null;
}

export default async function PlacePage({ params }: PlacePageProps) {
  const supabase = await createSupabaseServerClient();
  const { id: placeId } = await params;

  const [placeResponseInitial, hoursResponse, postsResponse] = await Promise.all([
    supabase
      .from("places")
      .select(
        "id, name, category, address, phone, website, price_tier, price_icon, banner_url, logo_url"
      )
      .eq("id", placeId)
      .maybeSingle<PlaceRowData>(),
    supabase
      .from("place_hours")
      .select("id, weekday, open, close")
      .eq("place_id", placeId)
      .order("weekday", { ascending: true }),
    supabase
      .from("posts")
      .select(
        `id, created_at, note, photo_url, price_tier, place_id,
         author:profiles ( id, display_name, avatar_url )`
      )
      .eq("place_id", placeId)
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  let placeResponse = placeResponseInitial;

  if (placeResponse.error?.code === "42703") {
    placeResponse = await supabase
      .from("places")
      .select("id, name, category, address, phone, website, price_tier")
      .eq("id", placeId)
      .maybeSingle<PlaceRowData>();
  }

  if (placeResponse.error && placeResponse.error.code !== "PGRST116") {
    throw placeResponse.error;
  }

  const place = placeResponse.data;

  if (!place) {
    notFound();
  }

  const placePriceIcon = resolvePriceIcon(place.price_icon, place.price_tier);
  const websiteUrl = normalizeWebsite(place.website);
  const phoneHref = normalizePhone(place.phone);

  const posts = (postsResponse.data ?? []) as PlacePostRow[];

  const feedItems = posts.map((post) => {
    const displayName = post.author?.display_name?.trim() || "Spots explorer";
    return {
      id: post.id,
      photoUrl: post.photo_url ?? null,
      note: post.note ?? null,
      timeAgo: post.created_at ? formatRelativeTime(post.created_at) : "Just now",
      place: {
        id: place.id,
        name: place.name,
        priceLabel: placePriceIcon,
      },
      priceLabel: priceTierToSymbol(post.price_tier) ?? placePriceIcon,
      user: {
        displayName,
        avatarUrl: post.author?.avatar_url ?? null,
        initials: displayName.slice(0, 2).toUpperCase(),
      },
    };
  });

  return (
    <PageContainer size="lg" className="mt-2 pb-16">
      <div className="flex flex-col gap-6">
        <PlaceBanner
          name={place.name}
          bannerUrl={place.banner_url ?? null}
          logoUrl={place.logo_url ?? null}
        />

        <GlassCard className="space-y-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-1">
              <h1 className="text-3xl font-semibold text-[#18223a]">{place.name}</h1>
              <p className="text-sm text-[#4c5a7a]">
                {place.category}
                {placePriceIcon ? (
                  <span className="ml-2 inline-flex items-center rounded-full border border-white/60 bg-white/55 px-3 py-1 text-xs font-medium text-[#1d2742]">
                    {placePriceIcon}
                  </span>
                ) : null}
              </p>
              {place.address ? (
                <p className="text-sm text-[#2a3554]">{place.address}</p>
              ) : null}
            </div>
            <div className="flex flex-wrap gap-2">
              {phoneHref ? (
                <a
                  href={phoneHref}
                  className="rounded-full border border-white/55 bg-white/55 px-4 py-2 text-sm text-[#1d2742] transition hover:scale-[1.02]"
                >
                  Call
                </a>
              ) : null}
              {websiteUrl ? (
                <a
                  href={websiteUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-full border border-white/55 bg-white/55 px-4 py-2 text-sm text-[#1d2742] transition hover:scale-[1.02]"
                >
                  Website
                </a>
              ) : null}
            </div>
          </div>
        </GlassCard>

        <OpeningTimesEditor placeId={place.id} initialHours={hoursResponse.data ?? []} />

        <GlassCard className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-[#18223a]">Latest posts</h2>
            <span className="text-xs text-[#7c89aa]">{posts.length} entries</span>
          </div>
          <div className="flex flex-col gap-6">
            {feedItems.length ? (
              feedItems.map((item) => <FeedCard key={item.id} item={item} />)
            ) : (
              <GlassCard className="text-center text-sm text-[#4c5a7a]">
                No posts from this place yet.
              </GlassCard>
            )}
          </div>
        </GlassCard>
      </div>
    </PageContainer>
  );
}
