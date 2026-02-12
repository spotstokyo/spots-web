import { supabase } from "./supabase";
import { SpotDraft } from "./spotMapper";
import { Database } from "./database.types";

export async function upsertSpot(draft: SpotDraft) {
  // We need to map Draft to Table Row.
  // Google Lat/Lng are strings in our SpotDraft (from normalization), which matches DB.
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const payload: any = {
      name: draft.name,
      address: draft.address || null,
      lat: draft.lat || null,
      lng: draft.lng || null,
      phone: draft.phone || null,
      website: draft.website || null,
      category: draft.category,
      rating_avg: draft.rating_avg,
      rating_count: draft.rating_count,
      price_tier: draft.price_tier,
  };

  const { data: place, error } = await supabase
    .from("places")
    .insert(payload)
    .select()
    .single();

  if (error) {
    throw error;
  }

  // Insert Hours if any
  if (draft.hours && draft.hours.length > 0 && place) {

      // First, delete existing hours to avoid duplicates/conflicts
      const { error: deleteError } = await supabase
        .from("place_hours")
        .delete()
        .eq("place_id", place.id);

      if (deleteError) {
          console.error("Failed to delete existing hours", deleteError);
      }

      const hoursPayload = draft.hours.map(h => ({
          place_id: place.id,
          weekday: h.weekday,
          open: h.open,
          close: h.close
      }));
      
      const { error: hoursError } = await supabase
        .from("place_hours")
        .insert(hoursPayload);
        
      if (hoursError) {
          console.error("Failed to save hours full error:", hoursError);
          console.error("Failed to save hours message:", hoursError.message);
          console.error("Failed to save hours details:", hoursError.details);
          console.error("Failed to save hours hint:", hoursError.hint);
          console.error("Hours Payload attempted:", JSON.stringify(hoursPayload, null, 2));
      }
  }

  return place;

  return place;
}

export async function bulkUpsertSpots(drafts: SpotDraft[]) {
  const payloads = drafts.map(draft => ({
      name: draft.name,
      address: draft.address,
      lat: draft.lat,
      lng: draft.lng,
      phone: draft.phone,
      website: draft.website,
      category: draft.category,
      rating_avg: draft.rating_avg,
      rating_count: draft.rating_count,
      price_tier: draft.price_tier,
  }));

      // Retrieve inserted places to get IDs for hours insertion.
      const { data: places, error } = await supabase
        .from("places")
        .upsert(payloads, { onConflict: "google_place_id" })
        .select();

      if (error) throw error;

      if (places) {
          for (const place of places) {
             // Match draft.place_id (Google Place ID) with DB google_place_id
             // Cast place to any because database.types.ts might be out of sync regarding google_place_id
             // eslint-disable-next-line @typescript-eslint/no-explicit-any
             const draft = drafts.find(d => d.place_id === (place as any).google_place_id);
             
             if (draft && draft.hours && draft.hours.length > 0) {
                 // Delete existing hours to ensure clean state
                 const { error: delError } = await supabase
                    .from("place_hours")
                    .delete()
                    .eq("place_id", place.id);
                 
                 if (delError) {
                     console.error("Failed to delete hours", delError);
                 }

                 const hoursPayload = draft.hours.map(h => ({
                     place_id: place.id,
                     weekday: h.weekday,
                     open: h.open,
                     close: h.close
                 }));
                 
                 const { error: insError } = await supabase
                    .from("place_hours")
                    .insert(hoursPayload);
                 
                 if (insError) {
                     console.error("Failed to insert hours", insError);
                 }
             }
          }
      }

  return places;
}
