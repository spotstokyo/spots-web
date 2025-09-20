import Link from "next/link";
import { redirect } from "next/navigation";
import type { Tables } from "@/lib/database.types";
import FeedCard from "@/components/FeedCard";
import GlassCard from "@/components/GlassCard";
import PageContainer from "@/components/PageContainer";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { calculateStreakFromDates } from "@/lib/streak";
import { formatRelativeTime } from "@/lib/time";
import { priceTierToSymbol, resolvePriceIcon } from "@/lib/pricing";

interface FeedPostRowPlace {
  id: string;
  name: string;
  price_tier: number | null;
  price_icon?: string | null;
}

interface FeedPostRow extends Tables<"posts"> {
  place: FeedPostRowPlace | null;
  author: Pick<Tables<"profiles">, "id" | "display_name" | "avatar_url"> | null;
}

type StreakRow = Pick<Tables<"user_streaks">, "current_streak">;

type PostDateRow = Pick<Tables<"posts">, "created_at">;

function getInitials(name: string) {
  const trimmed = name.trim();
  if (!trimmed) return "--";

  const parts = trimmed.split(/\s+/);
  if (parts.length === 1) {
    const [first] = parts;
    return first.slice(0, 2).toUpperCase();
  }

  const first = parts[0]?.[0] ?? "";
  const second = parts[parts.length - 1]?.[0] ?? "";
  const combined = `${first}${second}`;
  return combined.toUpperCase() || "--";
}

export default async function FeedPage() {
  const supabase = await createSupabaseServerClient();
  const [{ data: sessionData }, initialPostsResponse] = await Promise.all([
    supabase.auth.getSession(),
    supabase
      .from("posts")
      .select(
        `id, user_id, created_at, note, photo_url, price_tier, place_id,
         place:places ( id, name, price_tier, price_icon ),
         author:profiles ( id, display_name, avatar_url )`
      )
      .order("created_at", { ascending: false })
      .limit(50),
  ]);

  let postsError = initialPostsResponse.error;
  let posts: FeedPostRow[] = (initialPostsResponse.data ?? []) as FeedPostRow[];

  if (postsError?.code === "42703") {
    const fallback = await supabase
      .from("posts")
      .select(
        `id, user_id, created_at, note, photo_url, price_tier, place_id,
         place:places ( id, name, price_tier ),
         author:profiles ( id, display_name, avatar_url )`
      )
      .order("created_at", { ascending: false })
      .limit(50);

    postsError = fallback.error;
    posts = (fallback.data ?? []).map((post) =>
      ({
        ...post,
        place: post.place
          ? {
              ...post.place,
              price_icon: null,
            }
          : null,
      }) satisfies FeedPostRow,
    );
  }

  const session = sessionData.session;
  if (!session) {
    redirect("/");
  }

  const feedItems = posts.map((post) => {
    const place = post.place
      ? {
          id: post.place.id,
          name: post.place.name,
          priceLabel: resolvePriceIcon(post.place.price_icon, post.place.price_tier),
        }
      : null;

    const displayName = post.author?.display_name?.trim() || "Spots explorer";
    const timeAgo = post.created_at ? formatRelativeTime(post.created_at) : "Just now";

    return {
      id: post.id,
      photoUrl: post.photo_url ?? null,
      note: post.note ?? null,
      timeAgo,
      place,
      priceLabel: place?.priceLabel ?? priceTierToSymbol(post.price_tier),
      user: {
        displayName,
        avatarUrl: post.author?.avatar_url ?? null,
        initials: getInitials(displayName),
      },
    };
  });

  const userId = session.user.id;

  let streakCount = 0;

  if (userId) {
    const { data: streakRow, error: streakError } = await supabase
      .from("user_streaks")
      .select("current_streak")
      .eq("user_id", userId)
      .maybeSingle<StreakRow>();

    if (!streakError && streakRow?.current_streak) {
      streakCount = streakRow.current_streak;
    } else {
      const { data: fallbackDates } = await supabase
        .from("posts")
        .select("created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(120)
        .returns<PostDateRow[]>();

      const dateValues = (fallbackDates ?? [])
        .map((row) => row.created_at)
        .filter((value): value is string => Boolean(value));

      streakCount = calculateStreakFromDates(dateValues);
    }
  }

  const streakText = `${streakCount}-day streak`;

  return (
    <PageContainer size="lg" className="mt-2 pb-16">
      <div className="flex flex-col gap-7">
        <GlassCard className="flex flex-col gap-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-1">
              <p className="text-xs uppercase tracking-[0.4em] text-[#4d5f91]">Today&apos;s streak</p>
              <h1 className="text-3xl font-semibold text-[#18223a]">streak feed</h1>
              <p className="text-sm text-[#4c5a7a]">
                Keep discovering with your crew. Every post keeps the flame alive.
              </p>
            </div>
            <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/60 bg-white/60 px-4 py-2 text-sm font-medium text-[#18223a] shadow-inner">
                <span role="img" aria-hidden>
                  🔥
                </span>
                {streakText}
              </span>
              <div className="flex gap-2">
                <Link
                  href="/post"
                  className="rounded-full border border-[#1d2742] bg-[#1d2742] px-5 py-2 text-sm font-semibold text-white shadow-[0_20px_45px_-28px_rgba(19,28,46,0.52)] transition hover:scale-[1.03]"
                >
                  Share a post
                </Link>
                <Link
                  href="/explore"
                  className="rounded-full border border-white/40 bg-white/50 px-5 py-2 text-sm font-medium text-[#1d2742] shadow-sm transition hover:scale-[1.03]"
                >
                  Explore spots
                </Link>
              </div>
            </div>
          </div>
        </GlassCard>

        {postsError ? (
          <div className="rounded-3xl border border-red-200 bg-red-50/80 p-6 text-sm text-red-600">
            Unable to load feed right now. Please try again shortly.
          </div>
        ) : null}

        <section className="flex flex-col gap-6">
          {feedItems.length ? (
            feedItems.map((item) => <FeedCard key={item.id} item={item} />)
          ) : (
            <GlassCard className="text-center text-sm text-[#4c5a7a]">
              No posts yet. Share your first spot to start the streak.
            </GlassCard>
          )}
        </section>
      </div>
    </PageContainer>
  );
}
