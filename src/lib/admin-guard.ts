import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

type AdminCheckResult =
  | { ok: true; userId: string }
  | { ok: false; status: number; error: string };

export async function ensureAdmin(supabase: SupabaseClient<Database>): Promise<AdminCheckResult> {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return {
      ok: false,
      status: 401,
      error: authError?.message ?? "Unauthorized",
    };
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .maybeSingle<{ is_admin: boolean | null }>();

  if (profileError) {
    return {
      ok: false,
      status: 500,
      error: profileError.message,
    };
  }

  if (!profile?.is_admin) {
    return {
      ok: false,
      status: 403,
      error: "Forbidden",
    };
  }

  return { ok: true, userId: user.id };
}
