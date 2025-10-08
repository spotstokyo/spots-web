import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import FeedCard from "@/components/FeedCard";
import GlassCard from "@/components/GlassCard";
import PageContainer from "@/components/PageContainer";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { calculateStreakFromDates, calculateLongestStreakFromDates } from "@/lib/streak";
import { formatRelativeTime } from "@/lib/time";
import { priceTierToSymbol } from "@/lib/pricing";
import type { Tables } from "@/lib/database.types";

type ProfileRow = Pick<Tables<"profiles">, "display_name" | "avatar_url">;

interface ProfilePostRow extends Tables<"posts"> {
  place: Pick<Tables<"places">, "id" | "name" | "price_tier"> | null;
  author: Pick<Tables<"profiles">, "display_name" | "avatar_url" | "id"> | null;
}

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
              className="rounded-full border border-[#1d2742] bg-[#1d2742] px-4 py-2 text-sm font-semibold text-white shadow-[0_22px_48px_-28px_rgba(19,28,46,0.55)] transition hover:scale-[1.03]"
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

  const [profileResponse, streakResponse, postsResponse] = await Promise.all([
    supabase
      .from("profiles")
      .select("display_name, avatar_url")
      .eq("id", userId)
      .maybeSingle<ProfileRow>(),
    supabase
      .from("user_streaks")
      .select("current_streak, longest_streak")
      .eq("user_id", userId)
      .maybeSingle<{ current_streak: number | null; longest_streak: number | null }>(),
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

  if (profileResponse.error) {
    notFound();
  }

  const profile = profileResponse.data;
  const posts = (postsResponse.data ?? []) as ProfilePostRow[];
  const totalPosts = postsResponse.count ?? posts.length;

  const dateValues = posts
    .map((post) => post.created_at)
    .filter((value): value is string => Boolean(value));

  const computedCurrent = calculateStreakFromDates(dateValues);
  const computedLongest = calculateLongestStreakFromDates(dateValues);

  const currentStreak = streakResponse.data?.current_streak ?? computedCurrent;
  const longestStreak = streakResponse.data?.longest_streak ?? computedLongest;

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
      place,
      priceLabel: priceTierToSymbol(post.price_tier),
      user: {
        displayName: authorName,
        avatarUrl: post.author?.avatar_url ?? avatarUrl,
        initials: getInitials(authorName),
      },
    };
  });

  return (
    <PageContainer size="lg" className="mt-2 pb-20">
      <div className="flex flex-col gap-8">
        <GlassCard className="space-y-8">
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
          <div className="grid w-full gap-4 sm:max-w-md sm:auto-cols-fr sm:grid-flow-col">
            <div className="rounded-2xl border border-white/60 bg-white/55 px-5 py-4 text-center text-sm text-[#1d2742] shadow-[0_22px_48px_-30px_rgba(24,39,79,0.35)]">
              <p className="text-xs uppercase tracking-[0.2em] text-[#4d5f91]">Current streak</p>
              <p className="text-xl font-semibold text-[#18223a]">{currentStreak} days</p>
            </div>
            <div className="rounded-2xl border border-white/60 bg-white/55 px-5 py-4 text-center text-sm text-[#1d2742] shadow-[0_22px_48px_-30px_rgba(24,39,79,0.35)]">
              <p className="text-xs uppercase tracking-[0.2em] text-[#4d5f91]">Longest streak</p>
              <p className="text-xl font-semibold text-[#18223a]">{longestStreak} days</p>
            </div>
            <div className="rounded-2xl border border-white/60 bg-white/55 px-5 py-4 text-center text-sm text-[#1d2742] shadow-[0_22px_48px_-30px_rgba(24,39,79,0.35)]">
              <p className="text-xs uppercase tracking-[0.2em] text-[#4d5f91]">Posts</p>
              <p className="text-xl font-semibold text-[#18223a]">{totalPosts}</p>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/post"
            className="rounded-full border border-[#1d2742] bg-[#1d2742] px-4 py-2 text-sm font-semibold text-white shadow-[0_22px_48px_-28px_rgba(19,28,46,0.55)] transition hover:scale-[1.03]"
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
        </GlassCard>

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
