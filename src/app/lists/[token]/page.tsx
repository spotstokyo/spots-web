import Link from "next/link";
import { notFound } from "next/navigation";
import GlassCard from "@/components/GlassCard";
import PageContainer from "@/components/PageContainer";
import { priceTierToSymbol } from "@/lib/pricing";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import type { Tables, Database } from "@/lib/database.types";

interface SharedListPageProps {
  params: Promise<{ token: string }>;
}

interface SharedListEntry {
  added_at: string;
  place: Pick<Tables<"places">, "id" | "name" | "category" | "price_tier" | "price_icon"> | null;
}

export const revalidate = 0;

export default async function SharedListPage({ params }: SharedListPageProps) {
  const supabase = await createSupabaseServerClient();
  const { token } = await params;

  const { data: tokenRow } = await supabase
    .from("list_share_tokens")
    .select("list_id, token")
    .eq("token", token)
    .maybeSingle<{ list_id: string; token: string }>();

  if (!tokenRow) {
    notFound();
  }

  const { data: listRow } = await supabase
    .from("user_lists")
    .select("id, title, list_type, is_public, user_id")
    .eq("id", tokenRow.list_id)
    .maybeSingle<{ id: string; title: string; list_type: Database["public"]["Enums"]["list_type"]; is_public: boolean; user_id: string }>();

  if (!listRow || !listRow.is_public) {
    notFound();
  }

  const { data: ownerProfile } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", listRow.user_id)
    .maybeSingle<{ display_name: string | null }>();

  const { data: entries } = await supabase
    .from("user_list_entries")
    .select(
      `added_at, place:places ( id, name, category, price_tier, price_icon )`
    )
    .eq("list_id", listRow.id)
    .order("added_at", { ascending: false })
    .returns<SharedListEntry[]>();

  const ownerName = ownerProfile?.display_name?.trim() || "Spots explorer";
  const places = (entries ?? []).filter((entry) => Boolean(entry.place?.id));

  return (
    <PageContainer size="md" className="mt-10 pb-20">
      <GlassCard className="space-y-6">
        <div className="flex flex-col gap-2">
          <p className="text-xs uppercase tracking-[0.4em] text-[#4d5f91]">Shared list</p>
          <h1 className="text-3xl font-semibold text-[#18223a]">{listRow.title}</h1>
          <p className="text-sm text-[#4c5a7a]">
            Curated by <span className="font-medium text-[#18223a]">{ownerName}</span>
          </p>
        </div>

        <div className="space-y-3">
          {places.length ? (
            places.map((entry) => {
              const place = entry.place!;
              return (
                <div
                  key={place.id}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-white/60 bg-white/65 px-4 py-3 text-sm text-[#1d2742]"
                >
                  <div className="flex flex-col">
                    <Link
                      href={`/place/${place.id}`}
                      className="font-semibold text-[#18223a] underline-offset-4 hover:underline"
                    >
                      {place.name}
                    </Link>
                    <span className="text-xs text-[#7c89aa]">
                      {place.category ?? "Spot"} · {priceTierToSymbol(place.price_tier)}
                    </span>
                  </div>
                  <span className="text-xs uppercase tracking-[0.22em] text-[#7c89aa]">Shared spot</span>
                </div>
              );
            })
          ) : (
            <div className="rounded-2xl border border-dashed border-white/50 bg-white/60 px-4 py-3 text-sm text-[#4c5a7a]">
              No places added yet.
            </div>
          )}
        </div>
      </GlassCard>
    </PageContainer>
  );
}
