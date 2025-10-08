import MapScreen from "./MapScreen";
import type { MapPlace } from "@/components/MapView";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { normalizeCoordinates } from "@/lib/coordinates";

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

  const places = (data ?? []).reduce<MapPlace[]>((acc, place) => {
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

  return <MapScreen places={places} />;
}
