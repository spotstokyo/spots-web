import Link from "next/link";
import { notFound } from "next/navigation";
import GlassCard from "@/components/GlassCard";
import PageContainer from "@/components/PageContainer";
import FollowButton from "@/components/FollowButton";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import type { Tables, Database } from "@/lib/database.types";
import { getAuraVisuals } from "@/components/AuraBadge";
import type { AuraTier } from "@/components/AuraBadge";

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
  let auraRows: { place_id: string; tier: AuraTier; score: number }[] = [];

  if (listIds.length) {
    const [entriesResponse, auraResponse] = await Promise.all([
      supabase
        .from("user_list_entries")
        .select(
          `list_id, place:places ( id, name, category, price_tier, price_icon )`
        )
        .in("list_id", listIds),
      supabase
        .from("place_auras")
        .select("place_id, tier, score")
        .eq("user_id", targetUserId)
        .returns<{ place_id: string; tier: AuraTier; score: number }[]>(),
    ]);

    listEntries = entriesResponse.data ?? [];
    auraRows = auraResponse.data ?? [];
  }

  const auraMap = new Map<string, { tier: AuraTier | null; score: number | null }>();
  auraRows.forEach((row) => {
    auraMap.set(row.place_id, { tier: row.tier, score: row.score });
  });

  const socialLists = lists.map((list) => {
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
              list.entries.map((entry) => {
                const visuals = getAuraVisuals((entry.aura?.tier ?? "none") as AuraTier);
                return (
                  <GlassCard
                    key={entry.placeId}
                    className={`flex items-center justify-between gap-3 border ${visuals.cardClass} bg-white/75 px-4 py-3 text-sm text-[#1d2742]`}
                  >
                    <div className="flex flex-col">
                      <Link href={`/place/${entry.placeId}`} className="font-semibold text-[#18223a] underline-offset-4 hover:underline">
                        {entry.name}
                      </Link>
                      <span className="text-xs text-[#7c89aa]">{entry.category ?? "Spot"}</span>
                    </div>
                  </GlassCard>
                );
              })
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

  return (
    <PageContainer size="lg" className="mt-2 pb-20">
      <div className="flex flex-col gap-8">
        <GlassCard className="space-y-6 border-white/45 bg-white/60 shadow-none">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <h1 className="text-2xl font-semibold text-[#18223a]">{displayName}</h1>
              <p className="text-sm text-[#4c5a7a]">Shared spots and lists</p>
            </div>
            <FollowButton targetUserId={targetUserId} />
          </div>

          <div className="grid w-full gap-3 sm:max-w-md sm:auto-cols-fr sm:grid-flow-col">
            <div className="rounded-xl border border-white/45 bg-white/65 px-5 py-4 text-center text-sm text-[#1d2742] shadow-none">
              <p className="text-xs uppercase tracking-[0.2em] text-[#4d5f91]">Followers</p>
              <p className="text-xl font-semibold text-[#18223a]">{followersTotal}</p>
            </div>
            <div className="rounded-xl border border-white/45 bg-white/65 px-5 py-4 text-center text-sm text-[#1d2742] shadow-none">
              <p className="text-xs uppercase tracking-[0.2em] text-[#4d5f91]">Following</p>
              <p className="text-xl font-semibold text-[#18223a]">{followingTotal}</p>
            </div>
          </div>
        </GlassCard>

        {listSection}
      </div>
    </PageContainer>
  );
}
