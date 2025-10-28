import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";

const DEFAULT_REDIRECT_PATH = "/profile";
const ONBOARDING_PATH = "/auth/onboarding";

function resolveRedirectPath(candidate: string | null) {
  if (!candidate) return DEFAULT_REDIRECT_PATH;
  if (!candidate.startsWith("/")) return DEFAULT_REDIRECT_PATH;
  if (candidate.startsWith("//")) return DEFAULT_REDIRECT_PATH;
  return candidate;
}

function cloneCookies(source: NextResponse, target: NextResponse) {
  const cookies = source.cookies.getAll();
  for (const cookie of cookies) {
    target.cookies.set(cookie);
  }
}

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const errorDescription = requestUrl.searchParams.get("error_description");
  const redirectParam = requestUrl.searchParams.get("redirect");
  const redirectPath = resolveRedirectPath(redirectParam);

  if (errorDescription) {
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(errorDescription)}`, requestUrl.origin),
    );
  }

  if (!code) {
    return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent("Missing auth code")}`, requestUrl.origin));
  }

  const redirectUrl = new URL(redirectPath, requestUrl.origin);
  const response = NextResponse.redirect(redirectUrl);

  try {
    const supabase = await createSupabaseServerClient(response);
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      return NextResponse.redirect(
        new URL(`/login?error=${encodeURIComponent(error.message)}`, requestUrl.origin),
      );
    }

    const user = data?.user ?? null;

    if (user?.id) {
      const provider = typeof user.app_metadata?.provider === "string" ? (user.app_metadata.provider as string) : null;
      const { data: profile } = await supabase
        .from("profiles")
        .select("id, username, email, display_name")
        .eq("id", user.id)
        .maybeSingle();

      const primaryEmail = user.email?.toLowerCase() ?? null;
      const displayName =
        (user.user_metadata?.full_name as string | undefined) ??
        (user.user_metadata?.name as string | undefined) ??
        null;

      if (!profile) {
        const { error: profileInsertError } = await supabase
          .from("profiles")
          .upsert(
            {
              id: user.id,
              email: primaryEmail,
              display_name: displayName,
            },
            { onConflict: "id" },
          );
        if (profileInsertError) {
          throw profileInsertError;
        }
      } else if (!profile.email && primaryEmail) {
        const { error: profileUpdateError } = await supabase
          .from("profiles")
          .update({ email: primaryEmail })
          .eq("id", user.id);
        if (profileUpdateError) {
          throw profileUpdateError;
        }
      }

      const needsUsername = !(profile?.username);

      if (provider === "google" && needsUsername) {
        const onboardingUrl = new URL(ONBOARDING_PATH, requestUrl.origin);
        onboardingUrl.searchParams.set("redirect", redirectPath);
        const onboardingResponse = NextResponse.redirect(onboardingUrl);
        cloneCookies(response, onboardingResponse);
        return onboardingResponse;
      }
    }

    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Auth callback failed";
    return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(message)}`, requestUrl.origin));
  }
}
