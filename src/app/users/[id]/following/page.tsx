import { notFound } from "next/navigation";
import PageContainer from "@/components/layout/PageContainer";
import GlassCard from "@/components/ui/GlassCard";
import UserList from "@/components/features/profile/UserList";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import type { Tables } from "@/lib/database.types";

export const revalidate = 0;

type ProfileRow = Pick<Tables<"profiles">, "id" | "display_name" | "avatar_url" | "username">;

interface PageProps {
    params: Promise<{ id: string }>;
}

export default async function PublicFollowingPage({ params }: PageProps) {
    const supabase = await createSupabaseServerClient();
    const { id: targetUserId } = await params;

    // Verify user exists
    const { data: profile } = await supabase
        .from("profiles")
        .select("display_name")
        .eq("id", targetUserId)
        .maybeSingle();

    if (!profile) {
        notFound();
    }

    const { data: relationships } = await supabase
        .from("user_relationships")
        .select(`
      addressee_id,
      addressee:profiles!user_relationships_addressee_id_fkey (
        id, display_name, avatar_url, username
      )
    `)
        .eq("requester_id", targetUserId)
        .eq("status", "accepted");

    const following: ProfileRow[] = (relationships ?? [])
        .map((r) => r.addressee)
        .filter((p): p is ProfileRow => p !== null);

    const displayName = profile.display_name?.trim() || "User";

    return (
        <PageContainer size="md" className="mt-4 pb-20">
            <div className="mb-6 flex items-center gap-2">
                <Link
                    href={`/users/${targetUserId}`}
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-white/50 text-gray-600 transition hover:bg-white/80"
                >
                    <ArrowLeft className="h-4 w-4" />
                </Link>
                <h1 className="text-xl font-bold text-gray-900">{displayName}'s Following</h1>
            </div>

            <GlassCard className="p-4">
                <UserList
                    users={following}
                    emptyMessage={`${displayName} isn't following anyone yet.`}
                />
            </GlassCard>
        </PageContainer>
    );
}
