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

export default async function FollowingPage() {
    const supabase = await createSupabaseServerClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        return notFound();
    }

    const { data: relationships } = await supabase
        .from("user_relationships")
        .select(`
      addressee_id,
      addressee:profiles!user_relationships_addressee_id_fkey (
        id, display_name, avatar_url, username
      )
    `)
        .eq("requester_id", user.id)
        .eq("status", "accepted");

    const following: ProfileRow[] = (relationships ?? [])
        .map((r) => r.addressee)
        .filter((p): p is ProfileRow => p !== null);

    return (
        <PageContainer size="md" className="mt-4 pb-20">
            <div className="mb-6 flex items-center gap-2">
                <Link
                    href="/profile"
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-white/50 text-gray-600 transition hover:bg-white/80"
                >
                    <ArrowLeft className="h-4 w-4" />
                </Link>
                <h1 className="text-xl font-bold text-gray-900">Following</h1>
            </div>

            <GlassCard className="p-4">
                <UserList
                    users={following}
                    emptyMessage="You aren't following anyone yet."
                />
            </GlassCard>
        </PageContainer>
    );
}
