import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { ensureAdmin } from "@/lib/admin-guard";

export async function DELETE(
  _: Request,
  context: { params: Promise<{ placeId: string }> },
) {
  const supabase = await createSupabaseServerClient();
  const adminCheck = await ensureAdmin(supabase);

  if (!adminCheck.ok) {
    return NextResponse.json({ error: adminCheck.error }, { status: adminCheck.status });
  }

  const { placeId } = await context.params;

  if (!placeId) {
    return NextResponse.json({ error: "Missing place identifier." }, { status: 400 });
  }

  const { error } = await supabase.from("places").delete().eq("id", placeId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
