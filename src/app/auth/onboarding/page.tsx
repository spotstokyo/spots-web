import { redirect } from "next/navigation";
import PageContainer from "@/components/layout/PageContainer";
import GlassCard from "@/components/ui/GlassCard";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import GoogleOnboardingForm from "@/components/forms/GoogleOnboardingForm";

const DEFAULT_REDIRECT_PATH = "/profile";

function resolveRedirectPath(candidate: string | null | undefined) {
  if (!candidate) return DEFAULT_REDIRECT_PATH;
  if (!candidate.startsWith("/")) return DEFAULT_REDIRECT_PATH;
  if (candidate.startsWith("//")) return DEFAULT_REDIRECT_PATH;
  return candidate;
}

interface OnboardingPageProps {
  searchParams?: {
    redirect?: string;
  };
}

export default async function AuthOnboardingPage({ searchParams }: OnboardingPageProps) {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const redirectParam = searchParams?.redirect;
  const redirectPath = resolveRedirectPath(redirectParam);

  if (!user) {
    redirect(`/login?redirect=${encodeURIComponent(redirectPath)}`);
  }

  const provider = typeof user.app_metadata?.provider === "string" ? (user.app_metadata.provider as string) : null;

  if (provider !== "google") {
    redirect(redirectPath);
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("username, email")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.username) {
    redirect(redirectPath);
  }

  const suggestedUsername =
    profile?.username ??
    (typeof user.user_metadata?.preferred_username === "string"
      ? (user.user_metadata.preferred_username as string)
      : null) ??
    (user.email ? user.email.split("@")[0]?.toLowerCase() ?? null : null);

  const initialEmail = profile?.email ?? user.email ?? null;
  const displayName =
    (user.user_metadata?.full_name as string | undefined) ??
    (user.user_metadata?.name as string | undefined) ??
    null;

  return (
    <PageContainer size="sm" className="mt-2 pb-16" centerY>
      <GlassCard className="bg-[rgba(255,255,255,0.55)]">
        <GoogleOnboardingForm
          redirectPath={redirectPath}
          initialEmail={initialEmail}
          suggestedUsername={suggestedUsername}
          displayName={displayName}
        />
      </GlassCard>
    </PageContainer>
  );
}
