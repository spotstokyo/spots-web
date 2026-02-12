import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import type { Database } from "@/lib/database.types";

type RelationshipAction = "follow" | "follow_back" | "cancel" | "accept" | "decline" | "remove";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

function errorResponse(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(request: Request) {
  if (!supabaseUrl) {
    return errorResponse("Supabase is not configured.", 500);
  }

  let payload: Partial<{ targetUserId: string; action: RelationshipAction }> | null = null;
  try {
    payload = await request.json();
  } catch {
    return errorResponse("Invalid request body.");
  }

  const targetUserId = payload?.targetUserId?.trim();
  const action = payload?.action;

  if (!targetUserId) {
    return errorResponse("Missing user to connect with.");
  }

  if (!action || !["follow", "follow_back", "cancel", "accept", "decline", "remove"].includes(action)) {
    return errorResponse("Invalid follow action.");
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return errorResponse("You need to be signed in.", 401);
  }

  if (user.id === targetUserId) {
    return errorResponse("You cannot follow yourself.");
  }

  const adminClient =
    serviceRoleKey && supabaseUrl
      ? createClient<Database>(supabaseUrl, serviceRoleKey)
      : supabase;

  const requesterId = user.id;
  const pairFilter = `and(requester_id.eq.${requesterId},addressee_id.eq.${targetUserId}),and(requester_id.eq.${targetUserId},addressee_id.eq.${requesterId})`;

  switch (action) {
    case "follow": {
      const { error } = await adminClient
        .from("user_relationships")
        .upsert(
          {
            requester_id: requesterId,
            addressee_id: targetUserId,
            status: "accepted",
          },
          { onConflict: "requester_id,addressee_id" },
        );

      if (error) {
        return errorResponse(error.message ?? "Unable to send follow request.", 400);
      }

      return NextResponse.json({ status: "friends" });
    }

    case "cancel": {
      const { error } = await adminClient
        .from("user_relationships")
        .delete()
        .eq("requester_id", requesterId)
        .eq("addressee_id", targetUserId);

      if (error) {
        return errorResponse(error.message ?? "Unable to cancel request.", 400);
      }

      return NextResponse.json({ status: "none" });
    }

    case "follow_back": {
      const { error } = await adminClient
        .from("user_relationships")
        .upsert(
          {
            requester_id: requesterId,
            addressee_id: targetUserId,
            status: "accepted",
          },
          { onConflict: "requester_id,addressee_id" },
        );

      if (error) {
        return errorResponse(error.message ?? "Unable to follow back.", 400);
      }

      return NextResponse.json({ status: "friends" });
    }

    case "accept": {
      const { data, error: fetchError } = await adminClient
        .from("user_relationships")
        .select("status")
        .eq("requester_id", targetUserId)
        .eq("addressee_id", requesterId)
        .maybeSingle();

      if (fetchError) {
        return errorResponse(fetchError.message ?? "Unable to load request.", 400);
      }

      if (!data) {
        return errorResponse("Request not found.", 404);
      }

      const { error } = await adminClient
        .from("user_relationships")
        .update({ status: "accepted" })
        .eq("requester_id", targetUserId)
        .eq("addressee_id", requesterId);

      if (error) {
        return errorResponse(error.message ?? "Unable to accept request.", 400);
      }

      return NextResponse.json({ status: "friends" });
    }

    case "decline": {
      const { error } = await adminClient
        .from("user_relationships")
        .delete()
        .eq("requester_id", targetUserId)
        .eq("addressee_id", requesterId);

      if (error) {
        return errorResponse(error.message ?? "Unable to decline request.", 400);
      }

      return NextResponse.json({ status: "none" });
    }

    case "remove": {
      const { data, error: fetchError } = await adminClient
        .from("user_relationships")
        .select("requester_id, addressee_id")
        .or(pairFilter);

      if (fetchError) {
        return errorResponse(fetchError.message ?? "Unable to load connection.", 400);
      }

      if (!data?.length) {
        return errorResponse("No connection to remove.", 404);
      }

      const { error } = await adminClient.from("user_relationships").delete().or(pairFilter);

      if (error) {
        return errorResponse(error.message ?? "Unable to update connection.", 400);
      }

      return NextResponse.json({ status: "none" });
    }

    default:
      return errorResponse("Unsupported action.");
  }
}
