import { redirect } from "next/navigation";
import GlassCard from "@/components/ui/GlassCard";
import PageContainer from "@/components/layout/PageContainer";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import type { Tables } from "@/lib/database.types";
import EditProfileForm from "./EditProfileForm";

type ProfileRow = Pick<Tables<"profiles">, "display_name" | "username" | "avatar_url">;

export const dynamic = "force-dynamic";

export default async function EditProfilePage() {
  const supabase = await createSupabaseServerClient();

  let user = null;
  try {
    const { data } = await supabase.auth.getUser();
    user = data.user ?? null;
  } catch (error) {
    if ((error as { name?: string })?.name !== "AuthSessionMissingError") {
      throw error;
    }
  }

  if (!user?.id) {
    redirect("/login");
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("display_name, username, avatar_url")
    .eq("id", user.id)
    .maybeSingle<ProfileRow>();

  if (error) {
    throw error;
  }

  return (
    <PageContainer size="sm" className="mt-2 pb-16">
      <GlassCard className="space-y-8 bg-white/70">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-semibold text-[#18223a]">Edit profile</h1>
          <p className="text-sm text-[#4c5a7a]">
            Update your avatar, display name, and username for your public profile.
          </p>
        </div>
        <EditProfileForm
          userId={user.id}
          initialAvatarUrl={profile?.avatar_url ?? null}
          initialDisplayName={profile?.display_name ?? ""}
          initialUsername={profile?.username ?? ""}
        />
      </GlassCard>
    </PageContainer>
  );
}
