"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

interface LogoutButtonProps {
  className?: string;
}

export default function LogoutButton({ className = "" }: LogoutButtonProps) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogout = async () => {
    setPending(true);
    setError(null);

    try {
      const { error: signOutError } = await supabase.auth.signOut();
      if (signOutError) {
        throw signOutError;
      }
      router.replace("/login");
      router.refresh();
    } catch (signOutError) {
      const message =
        signOutError instanceof Error ? signOutError.message : "Unable to log out. Please try again.";
      setError(message);
      setPending(false);
    }
  };

  return (
    <div className={`flex flex-col items-end gap-1 ${className}`}>
      <button
        type="button"
        onClick={handleLogout}
        disabled={pending}
        className={`rounded-full border border-[#1d2742] bg-[#1d2742] px-4 py-2 text-sm font-semibold text-white shadow-[0_18px_36px_-24px_rgba(19,28,46,0.55)] transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-60`}
      >
        {pending ? "Logging out…" : "Log out"}
      </button>
      {error ? <p className="text-[0.65rem] text-rose-500">{error}</p> : null}
    </div>
  );
}
