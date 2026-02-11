
// import { Database } from "./database.types";

export type PlaceHourDraft = {
  weekday: number;
  open: string;
  close: string;
};

export type SpotDraft = {
  place_id: string; // Google Place ID
  name: string;
  address: string | null;
  lat: string | null;
  lng: string | null;
  phone: string | null;
  website: string | null;
  google_maps_url: string | null;
  category: string;
  rating_avg: number | null;
  rating_count: number | null;
  price_tier: number | null;
  
  hours?: PlaceHourDraft[];

  // Extra fields for UI but not in DB yet (will be omitted on save logic or handled separately)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  opening_hours?: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  photos?: any[];
  types?: string[];
};

function formatTime(time: string): string {
  // input "1230" -> output "12:30:00"
  if (!time || time.length !== 4) return "00:00:00"; 
  const hh = time.substring(0, 2);
  const mm = time.substring(2, 4);
  return `${hh}:${mm}:00`;
}

export function normalizePlaceToSpot(
  place: google.maps.places.PlaceResult
): SpotDraft {
  const lat = place.geometry?.location?.lat();
  const lng = place.geometry?.location?.lng();

  // Map Google types to our supported categories
  let category = "restaurant"; // default
  if (place.types) {
    if (place.types.includes("bar") || place.types.includes("night_club")) {
      category = "bar";
    } else if (place.types.includes("cafe") || place.types.includes("bakery")) {
      category = "restaurant"; // map cafe to restaurant for now or 'restaurant'
    } else if (place.types.includes("club")) {
      category = "club";
    }
  }

  const hours: PlaceHourDraft[] = [];
  if (place.opening_hours && place.opening_hours.periods) {
    place.opening_hours.periods.forEach((period) => {
        if (period.open && period.close) {
            // Google day: 0 (Sunday) - 6 (Saturday) matches our schema check?
            // Schema check: weekday >= 0 and weekday <= 6.
            // CAUTION: Ensure Google day matches Postgres "weekday" logic if needed. 
            // Usually Sunday=0 is standard.
            
            hours.push({
                weekday: period.open.day,
                open: formatTime(period.open.time),
                close: formatTime(period.close.time),
            });
        }
    });
  }

  return {
    place_id: place.place_id || "",
    name: place.name || "",
    address: place.formatted_address || null,
    lat: lat ? String(lat) : null,
    lng: lng ? String(lng) : null,
    phone: place.formatted_phone_number || null,
    website: place.website || null,
    google_maps_url: place.url || null,
    category: category,
    rating_avg: place.rating || null,
    rating_count: place.user_ratings_total || null,
    // Google price_level: 0 (Free) - 4 (Very Expensive).
    // DB price_tier: integer. We map 1:1 or logic as needed.
    // Let's map directly for now.
    price_tier: place.price_level || null,
    hours: hours,
    opening_hours: place.opening_hours,
    photos: place.photos,
    types: place.types,
  };
}
