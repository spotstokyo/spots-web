import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import FeedCard from "@/components/FeedCard";
import GlassCard from "@/components/GlassCard";
import PageContainer from "@/components/PageContainer";
import ProfileLists from "@/components/ProfileLists";
import FriendSearchInline from "@/components/FriendSearchInline";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { formatRelativeTime } from "@/lib/time";
import { priceTierToSymbol } from "@/lib/pricing";
import type { Tables, Database } from "@/lib/database.types";
import { getAuraVisuals } from "@/components/AuraBadge";
import type { AuraTier } from "@/components/AuraBadge";

export const revalidate = 0;

type ProfileRow = Pick<Tables<"profiles">, "display_name" | "avatar_url">;

interface ProfilePostRow extends Tables<"posts"> {
  place: Pick<Tables<"places">, "id" | "name" | "price_tier"> | null;
  author: Pick<Tables<"profiles">, "display_name" | "avatar_url" | "id"> | null;
}

type UserListRow = {
  id: string;
  title: string;
  list_type: Database["public"]["Enums"]["list_type"];
  is_public: boolean;
  slug: string;
};

type UserListEntryRow = {
  list_id: string;
  place: Pick<Tables<"places">, "id" | "name" | "category" | "price_tier" | "price_icon"> | null;
};

type ListShareRow = {
  list_id: string;
  token: string;
};

type VisitRow = {
  id: string;
  visited_at: string | null;
  note: string | null;
  rating: number | null;
  place_id: string;
};

type VisitPlaceRow = Pick<
  Tables<"places">,
  "id" | "name" | "category" | "address" | "price_tier" | "price_icon" | "banner_url"
>;

function getInitials(name: string) {
  const trimmed = name.trim();
  if (!trimmed) return "--";
  const parts = trimmed.split(/\s+/);
  if (parts.length === 1) {
    return parts[0]?.slice(0, 2).toUpperCase() ?? "--";
  }
  return `${parts[0]?.[0] ?? ""}${parts[parts.length - 1]?.[0] ?? ""}`.toUpperCase() || "--";
}

export default async function ProfilePage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return (
      <PageContainer size="md" className="mt-2 pb-16">
        <div className="rounded-2xl border border-white/55 bg-white/55 px-6 py-8 text-center shadow-[0_22px_48px_-28px_rgba(31,41,55,0.3)]">
          <p className="text-lg font-semibold text-[#18223a]">You need to be signed in.</p>
          <p className="mt-2 text-sm text-[#4c5a7a]">Log in to view your streak and posts.</p>
          <div className="mt-4 flex justify-center gap-3">
            <Link
              href="/login"
              className="rounded-full border border-[#1d2742] bg-[#1d2742] px-4 py-2 text-sm font-semibold text-white shadow-[0_22px_48px_-28px_rgba(19,28,46,0.55)] transition hover:scale-[1.01]"
            >
              Log in
            </Link>
            <Link
              href="/signup"
              className="rounded-full border border-white/45 bg-white/55 px-4 py-2 text-sm text-[#1d2742] shadow-sm transition hover:scale-[1.02]"
            >
              Sign up
            </Link>
          </div>
        </div>
      </PageContainer>
    );
  }

  const userId = session.user.id;

  const [profileResponse, postsResponse] = await Promise.all([
    supabase
      .from("profiles")
      .select("display_name, avatar_url")
      .eq("id", userId)
      .maybeSingle<ProfileRow>(),
    supabase
      .from("posts")
      .select(
        `id, created_at, note, photo_url, price_tier, place_id,
         place:places ( id, name, price_tier ),
         author:profiles ( id, display_name, avatar_url )`,
        { count: "exact" }
      )
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(50),
  ]);

  try {
    await supabase.rpc("ensure_default_lists", { p_user: userId });
  } catch {
    // ignore; lists will be created lazily as needed
  }

  const { data: listsData } = await supabase
    .from("user_lists")
    .select("id, title, list_type, is_public, slug")
    .eq("user_id", userId)
    .order("list_type", { ascending: true })
    .returns<UserListRow[]>();

  const [followersCountResponse, followingCountResponse] = await Promise.all([
    supabase
      .from("user_relationships")
      .select("requester_id", { head: true, count: "exact" })
      .eq("addressee_id", userId)
      .eq("status", "accepted"),
    supabase
      .from("user_relationships")
      .select("addressee_id", { head: true, count: "exact" })
      .eq("requester_id", userId)
      .eq("status", "accepted"),
  ]);

  const followersTotal = followersCountResponse.count ?? 0;
  const followingTotal = followingCountResponse.count ?? 0;

  const listIds = (listsData ?? []).map((list) => list.id);

  let listEntries: UserListEntryRow[] = [];
  let shareTokens: ListShareRow[] = [];
  let auraRows: { place_id: string; tier: AuraTier; score: number }[] = [];
  let visitEntries: {
    id: string;
    visited_at: string | null;
    note: string | null;
    rating: number | null;
    place: VisitPlaceRow;
  }[] = [];

  const { data: visits } = await supabase
    .from("place_visits")
    .select("id, visited_at, note, rating, place_id")
    .eq("user_id", userId)
    .order("visited_at", { ascending: false })
    .limit(40)
    .returns<VisitRow[]>();

  if (visits?.length) {
    const placeIds = Array.from(new Set(visits.map((row) => row.place_id)));
    const placeMap = new Map<string, VisitPlaceRow>();

    if (placeIds.length) {
      const { data: placeRows } = await supabase
        .from("places")
        .select("id, name, category, address, price_tier, price_icon, banner_url")
        .in("id", placeIds)
        .returns<VisitPlaceRow[]>();

      if (placeRows?.length) {
        placeRows.forEach((place) => {
          placeMap.set(place.id, place);
        });
      }
    }

    visitEntries = visits
      .map((row) => {
        const place = placeMap.get(row.place_id);
        if (!place) return null;
        return {
          id: row.id,
          visited_at: row.visited_at,
          note: row.note,
          rating: row.rating,
          place,
        };
      })
      .filter(
        (entry): entry is {
          id: string;
          visited_at: string | null;
          note: string | null;
          rating: number | null;
          place: VisitPlaceRow;
        } => Boolean(entry),
      );
  }

  if (listIds.length) {
    const [entriesResponse, shareResponse] = await Promise.all([
      supabase
        .from("user_list_entries")
        .select(
          `list_id, place:places ( id, name, category, price_tier, price_icon )`
        )
        .in("list_id", listIds)
        .order("added_at", { ascending: false })
        .returns<UserListEntryRow[]>(),
      supabase
        .from("list_share_tokens")
        .select("list_id, token")
        .in("list_id", listIds)
        .returns<ListShareRow[]>(),
    ]);

    listEntries = entriesResponse.data ?? [];
    shareTokens = shareResponse.data ?? [];
  }

  const auraPlaceIds = Array.from(
    new Set(
      listEntries
        .map((entry) => entry.place?.id)
        .filter((value): value is string => Boolean(value))
        .concat(visitEntries.map((entry) => entry.place.id)),
    ),
  );

  if (auraPlaceIds.length) {
    const { data: auraData } = await supabase
      .from("place_auras")
      .select("place_id, tier, score")
      .eq("user_id", userId)
      .in("place_id", auraPlaceIds)
      .returns<{ place_id: string; tier: AuraTier; score: number }[]>();

    auraRows = auraData ?? [];
  }

  if (profileResponse.error) {
    notFound();
  }

  const profile = profileResponse.data;
  const posts = (postsResponse.data ?? []) as ProfilePostRow[];
  const totalPosts = postsResponse.count ?? posts.length;

  const displayName = profile?.display_name?.trim() || session.user.email || "Spots explorer";
  const avatarUrl = profile?.avatar_url ?? null;
  const initials = getInitials(displayName);

  const feedItems = posts.map((post) => {
    const place = post.place
      ? {
          id: post.place.id,
          name: post.place.name,
          priceLabel: priceTierToSymbol(post.place.price_tier),
        }
      : null;

    const authorName = post.author?.display_name?.trim() || displayName;

    return {
      id: post.id,
      photoUrl: post.photo_url ?? null,
      note: post.note ?? null,
      timeAgo: post.created_at ? formatRelativeTime(post.created_at) : "Just now",
      userId: post.author?.id ?? null,
      place,
      priceLabel: priceTierToSymbol(post.price_tier),
      user: {
        displayName: authorName,
        avatarUrl: post.author?.avatar_url ?? avatarUrl,
        initials: getInitials(authorName),
      },
    };
  });

  const shareTokensMap = new Map<string, string>();
  shareTokens.forEach((token) => {
    shareTokensMap.set(token.list_id, token.token);
  });

  const auraMap = new Map<string, { tier: AuraTier | null; score: number | null }>();
  auraRows.forEach((row) => {
    auraMap.set(row.place_id, { tier: row.tier, score: row.score });
  });

  const socialLists = (listsData ?? []).map((list) => {
    const entriesForList = listEntries
      .filter((entry) => entry.list_id === list.id && entry.place?.id)
      .map((entry) => {
        const place = entry.place!;
        const aura = auraMap.get(place.id) ?? null;
        return {
          placeId: place.id,
          name: place.name,
          category: place.category,
          priceTier: place.price_tier,
          priceIcon: place.price_icon ?? null,
          aura,
        };
      });

    return {
      id: list.id,
      title: list.title,
      listType: list.list_type,
      isPublic: list.is_public,
      shareToken: shareTokensMap.get(list.id) ?? null,
      entries: entriesForList,
    };
  });

  const shareBaseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? null;

  return (
    <PageContainer size="lg" className="mt-2 pb-20">
      <div className="flex flex-col gap-8">
        <FriendSearchInline />
        <GlassCard className="space-y-8">
          <div className="space-y-6">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                {avatarUrl ? (
                  <Image
                    src={avatarUrl}
                    alt={displayName}
                    width={64}
                    height={64}
                    className="h-20 w-20 rounded-2xl border border-white/70 object-cover shadow-[0_26px_52px_-32px_rgba(24,39,79,0.55)]"
                  />
                ) : (
                  <div className="flex h-20 w-20 items-center justify-center rounded-2xl border border-white/70 bg-white/75 text-xl font-semibold text-[#1d2742] shadow-[0_26px_52px_-32px_rgba(24,39,79,0.55)]">
                    {initials}
                  </div>
                )}
                <div className="space-y-1">
                  <h1 className="text-2xl font-semibold text-[#18223a]">{displayName}</h1>
                  <p className="text-sm text-[#4c5a7a]">Tracking your foodie streaks in Tokyo.</p>
                </div>
              </div>
              <div className="grid w-full gap-3 sm:max-w-md sm:auto-cols-fr sm:grid-flow-col">
                <div className="rounded-xl border border-white/45 bg-white/60 px-5 py-4 text-center text-sm text-[#1d2742] shadow-none">
                  <p className="text-xs uppercase tracking-[0.2em] text-[#4d5f91]">Followers</p>
                  <p className="text-xl font-semibold text-[#18223a]">{followersTotal}</p>
                </div>
                <div className="rounded-xl border border-white/45 bg-white/60 px-5 py-4 text-center text-sm text-[#1d2742] shadow-none">
                  <p className="text-xs uppercase tracking-[0.2em] text-[#4d5f91]">Following</p>
                  <p className="text-xl font-semibold text-[#18223a]">{followingTotal}</p>
                </div>
                <div className="rounded-xl border border-white/45 bg-white/60 px-5 py-4 text-center text-sm text-[#1d2742] shadow-none">
                  <p className="text-xs uppercase tracking-[0.2em] text-[#4d5f91]">Posts</p>
                  <p className="text-xl font-semibold text-[#18223a]">{totalPosts}</p>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/profile/edit"
                className="rounded-full border border-white/55 bg-white/60 px-4 py-2 text-sm text-[#1d2742] shadow-sm transition hover:scale-[1.02]"
              >
                Edit profile
              </Link>
              <Link
                href="/post"
                className="rounded-full border border-[#1d2742] bg-[#1d2742] px-4 py-2 text-sm font-semibold text-white shadow-[0_22px_48px_-28px_rgba(19,28,46,0.55)] transition hover:scale-[1.01]"
              >
                Share a new post
              </Link>
              <Link
                href="/explore"
                className="rounded-full border border-white/50 bg-white/55 px-4 py-2 text-sm text-[#1d2742] shadow-sm transition hover:scale-[1.02]"
              >
                Discover spots
              </Link>
            </div>
          </div>
        </GlassCard>

        <GlassCard className="space-y-4 border-white/45 bg-white/60 shadow-none">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-[#18223a]">Visited spots</h2>
            <span className="text-xs text-[#7c89aa]">
              {visitEntries.length} visit{visitEntries.length === 1 ? "" : "s"}
            </span>
          </div>
          {visitEntries.length ? (
            <div className="flex flex-col gap-4">
              {visitEntries.map((visit) => {
                const aura = auraMap.get(visit.place.id) ?? null;
                const visuals = getAuraVisuals((aura?.tier ?? "none") as AuraTier);
                const visitedAt = visit.visited_at ? formatRelativeTime(visit.visited_at) : "Recently";
                return (
                  <GlassCard
                    key={visit.id}
                    className={`space-y-3 border ${visuals.cardClass} bg-white/82 transition hover:scale-[1.01]`}
                  >
                    <div className="relative h-36 overflow-hidden rounded-2xl border border-white/60">
                      {visit.place.banner_url ? (
                        <Image
                          src={visit.place.banner_url}
                          alt={`${visit.place.name} banner`}
                          fill
                          className="object-cover"
                          sizes="(max-width: 768px) 100vw, 50vw"
                          unoptimized
                        />
                      ) : (
                        <div className="absolute inset-0 bg-gradient-to-br from-white/35 via-transparent to-white/15" />
                      )}
                      <div className="relative z-10 flex h-full flex-col justify-end p-4">
                        <span className="text-xs font-semibold uppercase tracking-[0.28em] text-[#f0f2fa] drop-shadow">
                          {visit.place.category ?? "Spot"}
                        </span>
                        <h3 className="mt-2 text-lg font-semibold text-white drop-shadow-sm">
                          <Link href={`/place/${visit.place.id}`}>{visit.place.name}</Link>
                        </h3>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm text-[#2a3554]">{visit.place.address ?? "Tokyo"}</p>
                      <p className="text-sm text-[#51608b]">
                        {priceTierToSymbol(visit.place.price_tier) ?? "Not specified"}
                      </p>
                      <p className="text-xs uppercase tracking-[0.18em] text-[#7c89aa]">
                        Visited {visitedAt}
                      </p>
                      {visit.note ? (
                        <p className="text-sm text-[#1d2742]">
                          “{visit.note}”
                        </p>
                      ) : (
                        <p className="text-sm text-[#7c89aa]">Visit logged without details.</p>
                      )}
                      {visit.rating != null ? (
                        <p className="text-xs uppercase tracking-[0.18em] text-[#7c89aa]">
                          Rating: {Number(visit.rating).toFixed(1)} / 5
                        </p>
                      ) : null}
                    </div>
                  </GlassCard>
                );
              })}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-white/45 bg-white/55 px-4 py-6 text-center text-sm text-[#4c5a7a]">
              Log a visit on any place to start building your list.
            </div>
          )}
        </GlassCard>

        <ProfileLists lists={socialLists} shareBaseUrl={shareBaseUrl} />

        <GlassCard className="space-y-6">
          <h2 className="text-xl font-semibold text-[#18223a]">Your posts</h2>
          <div className="flex flex-col gap-8">
            {feedItems.length ? (
              feedItems.map((item) => <FeedCard key={item.id} item={item} />)
            ) : (
              <div className="rounded-2xl border border-white/60 bg-white/55 px-5 py-6 text-center text-sm text-[#4c5a7a]">
                You haven’t shared any spots yet. Start your streak by posting.
              </div>
            )}
          </div>
        </GlassCard>
      </div>
    </PageContainer>
  );
}
