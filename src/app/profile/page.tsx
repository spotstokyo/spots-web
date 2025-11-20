import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import FeedCard from "@/components/FeedCard";
import FollowButton from "@/components/FollowButton";
import GlassCard from "@/components/GlassCard";
import PageContainer from "@/components/PageContainer";
import ProfileLists from "@/components/ProfileLists";
import FriendSearchInline from "@/components/FriendSearchInline";
import LogoutButton from "@/components/LogoutButton";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { formatRelativeTime } from "@/lib/time";
import { priceTierToSymbol } from "@/lib/pricing";
import type { Tables, Database } from "@/lib/database.types";
import type { AuraTier } from "@/components/AuraBadge";
import VisitedSpotsCarousel, { type VisitedSpotEntry } from "@/components/VisitedSpotsCarousel";

export const revalidate = 0;

type ProfileRow = Pick<Tables<"profiles">, "display_name" | "avatar_url" | "is_admin">;

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

type VisitPlaceSelectRow = Pick<
  Tables<"places">,
  "id" | "name" | "category" | "address" | "price_tier" | "price_icon"
>;

type VisitEntry = {
  id: string;
  visited_at: string | null;
  note: string | null;
  rating: number | null;
  place: VisitPlaceRow;
};

type IncomingRequestRow = {
  requester_id: string;
  status: string;
  requester: Pick<Tables<"profiles">, "id" | "display_name" | "avatar_url" | "username"> | null;
};

type PendingRequest = {
  id: string;
  displayName: string;
  username: string | null;
  avatarUrl: string | null;
};

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

  let user = null;
  try {
    const { data } = await supabase.auth.getUser();
    user = data.user ?? null;
  } catch (error) {
    if ((error as { name?: string })?.name !== "AuthSessionMissingError") {
      throw error;
    }
  }

  if (!user) {
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

  const userId = user.id;

  const [profileResponse, postsResponse] = await Promise.all([
    supabase
      .from("profiles")
      .select("display_name, avatar_url, is_admin")
      .eq("id", userId)
      .maybeSingle<ProfileRow>(),
    supabase
      .from("posts")
      .select(
        `id, created_at, note, photo_url, price_tier, place_id,
         place:places ( id, name, price_tier ),
         author:profiles ( id, display_name, avatar_url )`,
        { count: "planned" }
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

  const [followersCountResponse, followingCountResponse, incomingRequestsResponse] = await Promise.all([
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
    supabase
      .from("user_relationships")
      .select(
        `requester_id, status,
         requester:profiles!user_relationships_requester_id_fkey ( id, display_name, avatar_url, username )`,
      )
      .eq("addressee_id", userId)
      .eq("status", "pending")
      .returns<IncomingRequestRow[]>(),
  ]);

  const followersTotal = followersCountResponse.count ?? 0;
  const followingTotal = followingCountResponse.count ?? 0;
  const pendingRequests: PendingRequest[] = (incomingRequestsResponse.data ?? [])
    .map((row) => {
      const requester = row.requester;
      if (!requester) return null;
      const displayName = requester.display_name?.trim() || requester.username || "Spots explorer";
      return {
        id: requester.id,
        displayName,
        username: requester.username ?? null,
        avatarUrl: requester.avatar_url ?? null,
      };
    })
    .filter((entry): entry is PendingRequest => Boolean(entry));

  const listIds = (listsData ?? []).map((list) => list.id);

  let listEntries: UserListEntryRow[] = [];
  let shareTokens: ListShareRow[] = [];
  let auraRows: { place_id: string; tier: AuraTier; score: number }[] = [];
  let visitEntries: VisitEntry[] = [];

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
        .select("id, name, category, address, price_tier, price_icon")
        .in("id", placeIds)
        .returns<VisitPlaceSelectRow[]>();

      if (placeRows?.length) {
        placeRows.forEach((place) => {
          placeMap.set(place.id, {
            id: place.id,
            name: place.name,
            category: place.category,
            address: place.address,
            price_tier: place.price_tier,
            price_icon: place.price_icon,
            banner_url: null,
          });
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
        (entry): entry is VisitEntry => Boolean(entry),
      );
  }

  const latestVisitEntries: VisitEntry[] = [];
  const seenPlaceIds = new Set<string>();
  for (const entry of visitEntries) {
    if (seenPlaceIds.has(entry.place.id)) continue;
    seenPlaceIds.add(entry.place.id);
    latestVisitEntries.push(entry);
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
        .concat(latestVisitEntries.map((entry) => entry.place.id)),
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
  const isAdmin = Boolean(profile?.is_admin);
  const posts = (postsResponse.data ?? []) as ProfilePostRow[];
  const totalPosts = postsResponse.count ?? posts.length;

  const displayName = profile?.display_name?.trim() || user.email || "Spots explorer";
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

  const visitedSpotsForCarousel: VisitedSpotEntry[] = latestVisitEntries.map((visit) => ({
    id: visit.id,
    placeId: visit.place.id,
    name: visit.place.name,
    category: visit.place.category,
    address: visit.place.address,
    priceTier: visit.place.price_tier,
    priceIcon: visit.place.price_icon,
    bannerUrl: visit.place.banner_url ?? null,
    note: visit.note,
    rating: visit.rating,
    visitedAt: visit.visited_at,
    aura: auraMap.get(visit.place.id) ?? null,
  }));

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
  const sectionShadow = "shadow-[0_24px_64px_-34px_rgba(19,28,46,0.42)]";
  const subtleShadow = "shadow-[0_18px_44px_-30px_rgba(19,28,46,0.36)]";

  return (
    <PageContainer size="lg" className="mt-2 pb-20">
      <div className="flex flex-col gap-8">
        <FriendSearchInline className="mt-1" />

        <GlassCard className={`space-y-8 border-white/65 bg-gradient-to-br from-white/85 via-white/76 to-[#eef1ff]/82 ${sectionShadow}`}>
          <div className="space-y-6">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                {avatarUrl ? (
                  <Image
                    src={avatarUrl}
                    alt={displayName}
                    width={64}
                    height={64}
                    className={`h-20 w-20 rounded-2xl border border-white/70 object-cover ${subtleShadow}`}
                  />
                ) : (
                  <div className={`flex h-20 w-20 items-center justify-center rounded-2xl border border-white/70 bg-white/80 text-xl font-semibold text-[#1d2742] ${subtleShadow}`}>
                    {initials}
                  </div>
                )}
                <div className="space-y-1">
                  <h1 className="text-2xl font-semibold text-[#18223a]">{displayName}</h1>
                  <p className="text-sm text-[#4c5a7a]">Tracking your foodie streaks in Tokyo.</p>
                </div>
              </div>
              <div className="grid w-full gap-3 sm:max-w-md sm:auto-cols-fr sm:grid-flow-col">
                <div className={`rounded-xl border border-white/65 bg-white/82 px-5 py-4 text-center text-sm text-[#1d2742] ${subtleShadow}`}>
                  <p className="text-xs uppercase tracking-[0.2em] text-[#4d5f91]">Followers</p>
                  <p className="text-xl font-semibold text-[#18223a]">{followersTotal}</p>
                </div>
                <div className={`rounded-xl border border-white/65 bg-white/82 px-5 py-4 text-center text-sm text-[#1d2742] ${subtleShadow}`}>
                  <p className="text-xs uppercase tracking-[0.2em] text-[#4d5f91]">Following</p>
                  <p className="text-xl font-semibold text-[#18223a]">{followingTotal}</p>
                </div>
                <div className={`rounded-xl border border-white/65 bg-white/82 px-5 py-4 text-center text-sm text-[#1d2742] ${subtleShadow}`}>
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
              {isAdmin ? (
                <Link
                  href="/post"
                  className="rounded-full border border-[#1d2742] bg-[#1d2742] px-4 py-2 text-sm font-semibold text-white shadow-[0_22px_48px_-28px_rgba(19,28,46,0.55)] transition hover:scale-[1.01]"
                >
                  Share a new post
                </Link>
              ) : null}
              <Link
                href="/explore"
                className="rounded-full border border-white/50 bg-white/55 px-4 py-2 text-sm text-[#1d2742] shadow-sm transition hover:scale-[1.02]"
              >
                Discover spots
              </Link>
              <LogoutButton className="sm:ml-auto" />
            </div>
          </div>

          {pendingRequests.length ? (
            <div className={`space-y-3 rounded-2xl border border-white/65 bg-white/78 px-4 py-4 ${subtleShadow}`}>
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-[#18223a]">Friend requests</h2>
                <span className="text-xs uppercase tracking-[0.2em] text-[#7c89aa]">
                  {pendingRequests.length} pending
                </span>
              </div>
              <div className="flex flex-col gap-3">
                {pendingRequests.map((request) => (
                  <div
                    key={request.id}
                    className={`flex items-center gap-3 rounded-2xl border border-white/65 bg-white/85 px-4 py-3 ${subtleShadow}`}
                  >
                    {request.avatarUrl ? (
                      <Image
                        src={request.avatarUrl}
                        alt={request.displayName}
                        width={48}
                        height={48}
                        className="h-12 w-12 rounded-xl border border-white/65 object-cover"
                      />
                    ) : (
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-white/65 bg-white/80 text-sm font-semibold text-[#1d2742]">
                        {getInitials(request.displayName)}
                      </div>
                    )}
                    <div className="flex flex-1 flex-col">
                      <span className="text-sm font-semibold text-[#18223a]">
                        {request.displayName}
                      </span>
                      {request.username ? (
                        <span className="text-xs uppercase tracking-[0.24em] text-[#7c89aa]">
                          @{request.username}
                        </span>
                      ) : null}
                    </div>
                    <FollowButton targetUserId={request.id} className="ml-auto" />
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </GlassCard>

        <GlassCard className={`space-y-6 border-white/65 bg-white/78 pb-5 ${sectionShadow}`}>
          <h2 className="text-xl font-semibold text-[#18223a]">Your posts</h2>
          <div className="flex flex-col gap-8">
            {feedItems.length ? (
              feedItems.map((item) => <FeedCard key={item.id} item={item} />)
            ) : (
              <div className={`rounded-2xl border border-white/65 bg-white/75 px-6 py-6 text-center text-sm text-[#4c5a7a] ${subtleShadow}`}>
                You haven’t shared any spots yet. Start your streak by posting.
              </div>
            )}
          </div>
        </GlassCard>

        <GlassCard className={`space-y-4 border-white/65 bg-white/78 ${sectionShadow}`}>
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-[#18223a]">Visited spots</h2>
            <span className="rounded-full border border-white/65 bg-white/82 px-3 py-1 text-xs uppercase tracking-[0.2em] text-[#7c89aa]">
              {visitedSpotsForCarousel.length} visit{visitedSpotsForCarousel.length === 1 ? "" : "s"}
            </span>
          </div>
          {visitedSpotsForCarousel.length ? (
            <VisitedSpotsCarousel entries={visitedSpotsForCarousel} />
          ) : (
            <div className={`rounded-xl border border-dashed border-white/65 bg-white/70 px-5 py-7 text-center text-sm text-[#4c5a7a] ${subtleShadow}`}>
              Log a visit on any place to start building your list.
            </div>
          )}
        </GlassCard>

        <ProfileLists lists={socialLists} shareBaseUrl={shareBaseUrl} />
      </div>
    </PageContainer>
  );
}
