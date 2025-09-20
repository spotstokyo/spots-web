import Link from "next/link";
import MapView, { type MapPlace } from "@/components/MapView";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

export default async function MapPage() {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("places")
    .select("id, name, category, address, lat, lng");

  if (error) {
    throw error;
  }

  const places: MapPlace[] = (data ?? [])
    .filter((place) => typeof place.lat === "number" && typeof place.lng === "number")
    .map((place) => ({
      id: place.id,
      name: place.name,
      lat: place.lat as number,
      lng: place.lng as number,
      category: place.category,
      address: place.address,
    }));

  return (
    <div className="relative h-[calc(100vh-7rem)] w-full overflow-hidden rounded-[48px]">
      <MapView places={places} />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-white/70 to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-white/60 to-transparent" />
      <div className="absolute left-1/2 top-6 z-10 flex -translate-x-1/2 items-center gap-3 rounded-full border border-white/70 bg-white/80 px-5 py-2 text-xs uppercase tracking-[0.3em] text-[#1d2742] shadow-sm">
        map view
      </div>
      <div className="absolute right-6 top-6 z-10 flex gap-3">
        <Link
          href="/feed"
          className="rounded-full border border-white/70 bg-white/80 px-4 py-2 text-xs font-semibold text-[#1d2742] shadow-sm transition hover:scale-[1.02]"
        >
          Back to feed
        </Link>
      </div>
    </div>
  );
}
