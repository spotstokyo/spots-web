import MapScreen from "./MapScreen";
import type { MapPlace } from "@/components/MapView";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

export default async function MapPage() {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("places")
    .select(
      "id, name, category, address, lat, lng, price_tier, price_icon, rating_avg, rating_count, website",
    );

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
      price_tier: place.price_tier,
      price_icon: place.price_icon,
      rating_avg: place.rating_avg,
      rating_count: place.rating_count,
      website: place.website,
    }));

  return <MapScreen places={places} />;
}
