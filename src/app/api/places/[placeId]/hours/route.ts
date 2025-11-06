import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { ensureAdmin } from "@/lib/admin-guard";

interface UpdateHoursRequest {
  hours?: Array<{
    weekday: number;
    open: string;
    close: string;
  }>;
}

export async function PUT(
  request: Request,
  context: { params: Promise<{ placeId: string }> },
) {
  const supabase = await createSupabaseServerClient();

  const adminCheck = await ensureAdmin(supabase);
  if (!adminCheck.ok) {
    return NextResponse.json({ error: adminCheck.error }, { status: adminCheck.status });
  }

  let body: UpdateHoursRequest;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const hours = Array.isArray(body.hours) ? body.hours : null;

  if (!hours) {
    return NextResponse.json({ error: "Hours array is required" }, { status: 400 });
  }

  const sanitized = hours
    .map((entry) => {
      const weekday = Number(entry.weekday);
      const open = typeof entry.open === "string" ? entry.open.trim() : "";
      const close = typeof entry.close === "string" ? entry.close.trim() : "";
      const isValidWeekday = Number.isInteger(weekday) && weekday >= 0 && weekday <= 6;
      const isValidRange = Boolean(open) && Boolean(close);

      if (!isValidWeekday || !isValidRange) {
        return null;
      }

      return { weekday, open: open.slice(0, 5), close: close.slice(0, 5) };
    })
    .filter((entry): entry is { weekday: number; open: string; close: string } => entry !== null);

  const hasInvalidRange = sanitized.some((entry) => entry.open >= entry.close);
  if (hasInvalidRange) {
    return NextResponse.json(
      { error: "Close time must be after open time for each range." },
      { status: 400 },
    );
  }

  const { placeId } = await context.params;

  if (!placeId) {
    return NextResponse.json({ error: "Missing place identifier." }, { status: 400 });
  }

  const { error: deleteError } = await supabase.from("place_hours").delete().eq("place_id", placeId);
  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 });
  }

  if (sanitized.length) {
    const insertPayload = sanitized.map((entry) => ({
      place_id: placeId,
      weekday: entry.weekday,
      open: entry.open,
      close: entry.close,
    }));

    const { error: insertError } = await supabase.from("place_hours").insert(insertPayload);
    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }
  }

  return NextResponse.json({ success: true });
}
