import Link from "next/link";
import { notFound } from "next/navigation";
import GlassCard from "@/components/ui/GlassCard";
import PageContainer from "@/components/layout/PageContainer";
import FollowButton from "@/components/features/profile/FollowButton";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import type { Tables, Database } from "@/lib/database.types";

interface PublicProfilePageProps {
  params: Promise<{ id: string }>;
}

type ProfileRow = Pick<Tables<"profiles">, "display_name" | "avatar_url">;

export const revalidate = 0;

export default async function PublicProfilePage({ params }: PublicProfilePageProps) {
  const supabase = await createSupabaseServerClient();
  const { id: targetUserId } = await params;

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("display_name, avatar_url")
    .eq("id", targetUserId)
    .maybeSingle<ProfileRow>();

  if (profileError || !profile) {
    notFound();
  }

  const [followersCountResponse, followingCountResponse, listsResponse] = await Promise.all([
    supabase
      .from("user_relationships")
      .select("requester_id", { head: true, count: "exact" })
      .eq("addressee_id", targetUserId)
      .eq("status", "accepted"),
    supabase
      .from("user_relationships")
      .select("addressee_id", { head: true, count: "exact" })
      .eq("requester_id", targetUserId)
      .eq("status", "accepted"),
    supabase
      .from("user_lists")
      .select("id, title, list_type, is_public")
      .eq("user_id", targetUserId)
      .in("list_type", ["wishlist", "favorites"] satisfies Database["public"]["Enums"]["list_type"][])
      .order("list_type", { ascending: true }),
  ]);

  const followersTotal = followersCountResponse.count ?? 0;
  const followingTotal = followingCountResponse.count ?? 0;
  const lists = (listsResponse.data ?? []).filter((list) => list.is_public);

  const listIds = lists.map((list) => list.id);
  let listEntries: Array<{
    list_id: string;
    place: Pick<Tables<"places">, "id" | "name" | "category" | "price_tier" | "price_icon"> | null;
  }> = [];

  if (listIds.length) {
    const [entriesResponse] = await Promise.all([
      supabase
        .from("user_list_entries")
        .select(
          `list_id, place:places ( id, name, category, price_tier, price_icon )`
        )
        .in("list_id", listIds),
    ]);

    listEntries = entriesResponse.data ?? [];
  }

  const socialLists = lists.map((list) => {
    const entriesForList = listEntries
      .filter((entry) => entry.list_id === list.id && entry.place?.id)
      .map((entry) => {
        const place = entry.place!;
        return {
          placeId: place.id,
          name: place.name,
          category: place.category,
          priceTier: place.price_tier,
          priceIcon: place.price_icon ?? null,
        };
      });

    return {
      id: list.id,
      title: list.title,
      listType: list.list_type,
      isPublic: true,
      shareToken: null,
      entries: entriesForList,
    };
  });

  const listSection = socialLists.length ? (
    <div className="space-y-5">
      {socialLists.map((list) => (
        <GlassCard key={list.id} className="space-y-3 border-white/45 bg-white/60 shadow-none">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#4d5f91]">{list.listType}</p>
              <h2 className="text-lg font-semibold text-[#18223a]">{list.title}</h2>
            </div>
            <span className="text-xs text-[#7c89aa]">{list.entries.length} spots</span>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {list.entries.length ? (
              list.entries.map((entry) => (
                <GlassCard
                  key={entry.placeId}
                  className="flex items-center justify-between gap-3 border bg-white/75 px-4 py-3 text-sm text-[#1d2742]"
                >
                  <div className="flex flex-col">
                    <Link href={`/place/${entry.placeId}`} className="font-semibold text-[#18223a] underline-offset-4 hover:underline">
                      {entry.name}
                    </Link>
                    <span className="text-xs text-[#7c89aa]">{entry.category ?? "Spot"}</span>
                  </div>
                </GlassCard>
              ))
            ) : (
              <div className="rounded-xl border border-dashed border-white/45 bg-white/55 px-4 py-3 text-xs text-[#7c89aa]">
                No spots yet.
              </div>
            )}
          </div>
        </GlassCard>
      ))}
    </div>
  ) : (
    <GlassCard className="border-white/45 bg-white/60 text-sm text-[#4c5a7a] shadow-none">
      {lists.length
        ? "This user’s wishlist and favorites are empty right now."
        : "This user keeps their lists private."}
    </GlassCard>
  );

  const displayName = profile.display_name?.trim() || "Spots explorer";
  const avatarUrl = profile.avatar_url;

  function getInitials(name: string) {
    const trimmed = name.trim();
    if (!trimmed) return "--";
    const parts = trimmed.split(/\s+/);
    if (parts.length === 1) {
      return parts[0]?.slice(0, 2).toUpperCase() ?? "--";
    }
    return `${parts[0]?.[0] ?? ""}${parts[parts.length - 1]?.[0] ?? ""}`.toUpperCase() || "--";
  }

  const initials = getInitials(displayName);

  return (
    <PageContainer size="lg" className="mt-2 pb-20">
      <div className="flex flex-col gap-8">
        <GlassCard className="space-y-6 border-white/45 bg-white/60 shadow-none">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              {avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={avatarUrl}
                  alt={displayName}
                  className="h-20 w-20 rounded-2xl border border-white/70 object-cover shadow-[0_14px_36px_-26px_rgba(19,28,46,0.28)]"
                />
              ) : (
                <div className="flex h-20 w-20 items-center justify-center rounded-2xl border border-white/70 bg-white/80 text-xl font-semibold text-[#1d2742] shadow-[0_14px_36px_-26px_rgba(19,28,46,0.28)]">
                  {initials}
                </div>
              )}
              <div className="space-y-1">
                <h1 className="text-2xl font-semibold text-[#18223a]">{displayName}</h1>
                <p className="text-sm text-[#4c5a7a]">Shared spots and lists</p>
              </div>
            </div>
            <FollowButton targetUserId={targetUserId} />
          </div>

          <div className="grid w-full gap-3 sm:max-w-md sm:auto-cols-fr sm:grid-flow-col">
            <Link href={`/users/${targetUserId}/followers`} className="rounded-xl border border-white/45 bg-white/65 px-5 py-4 text-center text-sm text-[#1d2742] shadow-none transition hover:bg-white/80">
              <p className="text-xs uppercase tracking-[0.2em] text-[#4d5f91]">Followers</p>
              <p className="text-xl font-semibold text-[#18223a]">{followersTotal}</p>
            </Link>
            <Link href={`/users/${targetUserId}/following`} className="rounded-xl border border-white/45 bg-white/65 px-5 py-4 text-center text-sm text-[#1d2742] shadow-none transition hover:bg-white/80">
              <p className="text-xs uppercase tracking-[0.2em] text-[#4d5f91]">Following</p>
              <p className="text-xl font-semibold text-[#18223a]">{followingTotal}</p>
            </Link>
          </div>
        </GlassCard>

        {listSection}
      </div>
    </PageContainer>
  );
}
