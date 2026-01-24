import MapScreen from "./MapScreen";
import type { MapPlace } from "@/components/features/map/MapView";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { normalizeCoordinates } from "@/lib/coordinates";

export const dynamic = "force-dynamic";

export default async function MapPage() {
  let places: MapPlace[] = [];

  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("places")
      .select(
        "id, name, category, address, lat, lng, price_tier, price_icon, rating_avg, rating_count, website",
      );

    if (error) {
      throw error;
    }

    places = (data ?? []).reduce<MapPlace[]>((acc, place) => {
      const coords = normalizeCoordinates(place.lat, place.lng);
      if (!coords) {
        return acc;
      }

      acc.push({
        id: place.id,
        name: place.name,
        lat: coords.lat,
        lng: coords.lng,
        category: place.category,
        address: place.address,
        price_tier: place.price_tier,
        price_icon: place.price_icon,
        rating_avg: place.rating_avg,
        rating_count: place.rating_count,
        website: place.website,
      });

      return acc;
    }, []);
  } catch (error) {
    console.warn("[MapPage] Unable to load places", error);
    return (
      <div className="mx-auto flex max-w-xl flex-col gap-4 rounded-2xl border border-white/70 bg-white/90 p-8 text-center text-[#1d2742] shadow-[0_18px_36px_-22px_rgba(24,39,79,0.55)]">
        <p className="text-lg font-semibold">Unable to load the map right now</p>
        <p className="text-sm text-[#4c5a7a]">
          Please check your connection and refresh the page. If the issue continues, try again later.
        </p>
      </div>
    );
  }

  return <MapScreen places={places} />;
}
