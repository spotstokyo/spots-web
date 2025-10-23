"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export function useIsAdmin() {
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const { data: userRes } = await supabase.auth.getUser();
        const user = userRes.user;
        if (!user) {
          if (!cancelled) {
            setIsAdmin(false);
            setLoading(false);
          }
          return;
        }

        const { data: profile } = await supabase
          .from("profiles")
          .select("is_admin")
          .eq("id", user.id)
          .maybeSingle<{ is_admin: boolean | null }>();

        if (!cancelled) {
          setIsAdmin(Boolean(profile?.is_admin));
          setLoading(false);
        }
      } catch {
        if (!cancelled) {
          setIsAdmin(false);
          setLoading(false);
        }
      }
    }

    void load();

    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      void load();
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  return { isAdmin, loading } as const;
}

