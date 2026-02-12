import Image from "next/image";
import Link from "next/link";
import FollowButton from "@/components/features/profile/FollowButton";
import type { Tables } from "@/lib/database.types";

type ProfileRow = Pick<Tables<"profiles">, "id" | "display_name" | "avatar_url" | "username">;

interface UserListProps {
    users: ProfileRow[];
    emptyMessage: string;
}

function getInitials(name: string) {
    const trimmed = name.trim();
    if (!trimmed) return "--";
    const parts = trimmed.split(/\s+/);
    if (parts.length === 1) {
        return parts[0]?.slice(0, 2).toUpperCase() ?? "--";
    }
    return `${parts[0]?.[0] ?? ""}${parts[parts.length - 1]?.[0] ?? ""}`.toUpperCase() || "--";
}

export default function UserList({ users, emptyMessage }: UserListProps) {
    if (users.length === 0) {
        return (
            <div className="rounded-xl border border-dashed border-gray-300 p-8 text-center text-gray-500">
                {emptyMessage}
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-3">
            {users.map((user) => {
                const displayName = user.display_name?.trim() || user.username || "Spots explorer";
                return (
                    <div
                        key={user.id}
                        className="flex items-center justify-between rounded-xl border border-white/65 bg-white/80 px-4 py-3 shadow-sm transition hover:scale-[1.01]"
                    >
                        <div className="flex items-center gap-3">
                            <Link href={`/users/${user.id}`} className="shrink-0">
                                {user.avatar_url ? (
                                    <Image
                                        src={user.avatar_url}
                                        alt={displayName}
                                        width={48}
                                        height={48}
                                        className="h-12 w-12 rounded-full border border-white/65 object-cover"
                                    />
                                ) : (
                                    <div className="flex h-12 w-12 items-center justify-center rounded-full border border-white/65 bg-gray-100 text-sm font-semibold text-gray-700">
                                        {getInitials(displayName)}
                                    </div>
                                )}
                            </Link>
                            <div className="flex flex-col">
                                <Link
                                    href={`/users/${user.id}`}
                                    className="font-medium text-gray-900 hover:underline"
                                >
                                    {displayName}
                                </Link>
                                {user.username && (
                                    <span className="text-xs text-gray-500">@{user.username}</span>
                                )}
                            </div>
                        </div>
                        <FollowButton targetUserId={user.id} />
                    </div>
                );
            })}
        </div>
    );
}
