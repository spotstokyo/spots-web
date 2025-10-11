import { cookies } from "next/headers";
import type { CookieOptions } from "@supabase/ssr";
import { createServerClient } from "@supabase/ssr";
import type { Database } from "./database.types";

function getSupabaseEnv() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Supabase environment variables are not configured.");
  }

  return { supabaseUrl, supabaseKey };
}

export async function createSupabaseServerClient() {
  const { supabaseUrl, supabaseKey } = getSupabaseEnv();
  let cookieStore: Awaited<ReturnType<typeof cookies>> | null = null;

  try {
    cookieStore = await cookies();
  } catch {
    cookieStore = null;
  }

  type MutableCookieStore = { set?: (attributes: { name: string; value: string; maxAge?: number } & CookieOptions) => void };

  const mutableCookies = cookieStore as unknown as MutableCookieStore | null;
  const hasMutableCookies = Boolean(mutableCookies?.set);

  return createServerClient<Database>(supabaseUrl, supabaseKey, {
    cookies: {
      get(name: string) {
        return cookieStore?.get(name)?.value;
      },
      set(name: string, value: string, options: CookieOptions) {
        if (!hasMutableCookies || !mutableCookies?.set) return;
        try {
          mutableCookies.set({ name, value, ...options });
        } catch (error) {
          if (
            process.env.NODE_ENV !== "production" &&
            !(error instanceof Error && error.message.includes("Cookies can only be modified"))
          ) {
            console.warn("[Supabase] Skipped setting cookie", error);
          }
        }
      },
      remove(name: string, options: CookieOptions) {
        if (!hasMutableCookies || !mutableCookies?.set) return;
        try {
          mutableCookies.set({
            name,
            value: "",
            ...options,
            maxAge: 0,
          });
        } catch (error) {
          if (
            process.env.NODE_ENV !== "production" &&
            !(error instanceof Error && error.message.includes("Cookies can only be modified"))
          ) {
            console.warn("[Supabase] Skipped removing cookie", error);
          }
        }
      },
    },
  });
}
