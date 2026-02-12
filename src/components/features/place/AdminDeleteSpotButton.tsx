"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { deleteSpot } from "@/lib/spotsRepo";

interface AdminDeleteSpotButtonProps {
    placeId: string;
}

export default function AdminDeleteSpotButton({ placeId }: AdminDeleteSpotButtonProps) {
    const router = useRouter();
    const [isDeleting, setIsDeleting] = useState(false);

    const handleDelete = async () => {
        if (!confirm("Are you sure you want to delete this spot? This action cannot be undone.")) {
            return;
        }

        setIsDeleting(true);
        try {
            await deleteSpot(placeId);
            router.push("/"); // Redirect to home/map after delete
            router.refresh();
        } catch (error) {
            console.error("Failed to delete spot:", error);
            alert("Failed to delete spot. You might not have permission.");
            setIsDeleting(false);
        }
    };

    return (
        <button
            onClick={handleDelete}
            disabled={isDeleting}
            className="flex items-center gap-2 rounded-full border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-600 transition hover:bg-red-100 disabled:opacity-50"
        >
            <Trash2 className="h-4 w-4" />
            {isDeleting ? "Deleting..." : "Delete Spot"}
        </button>
    );
}
