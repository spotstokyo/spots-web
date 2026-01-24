"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type RelationshipState =
  | "loading"
  | "anon"
  | "self"
  | "none"
  | "requested"
  | "incoming"
  | "followBack"
  | "friends";

type RelationshipAction = "follow" | "follow_back" | "cancel" | "accept" | "decline" | "remove";

interface FollowButtonProps {
  targetUserId: string | null;
  className?: string;
}

export default function FollowButton({ targetUserId, className }: FollowButtonProps) {
  const router = useRouter();
  const [sessionUserId, setSessionUserId] = useState<string | null | undefined>(undefined);
  const [state, setState] = useState<RelationshipState>("loading");
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const loadUser = async () => {
      const { data } = await supabase.auth.getUser();
      if (!cancelled) {
        setSessionUserId(data.user?.id ?? null);
      }
    };

    void loadUser();

    const { data: subscription } = supabase.auth.onAuthStateChange(async () => {
      if (cancelled) return;
      const { data } = await supabase.auth.getUser();
      if (!cancelled) {
        setSessionUserId(data.user?.id ?? null);
      }
    });

    return () => {
      cancelled = true;
      subscription.subscription.unsubscribe();
    };
  }, []);

  const fetchState = useCallback(
    async (selfId: string, otherId: string) => {
      setState("loading");
      setMessage(null);

      const { data: outgoing, error: outgoingError } = await supabase
        .from("user_relationships")
        .select("status")
        .eq("requester_id", selfId)
        .eq("addressee_id", otherId)
        .maybeSingle();

      if (outgoingError) {
        setState("none");
        setMessage(outgoingError.message ?? "Unable to load follow status.");
        return;
      }

      if (outgoing) {
        setState(outgoing.status === "accepted" ? "friends" : "requested");
        return;
      }

      const { data: incoming, error: incomingError } = await supabase
        .from("user_relationships")
        .select("status")
        .eq("requester_id", otherId)
        .eq("addressee_id", selfId)
        .maybeSingle();

      if (incomingError) {
        setState("none");
        setMessage(incomingError.message ?? "Unable to load follow status.");
        return;
      }

      if (incoming) {
        if (incoming.status === "accepted") {
          setState(outgoing ? "friends" : "followBack");
        } else {
          setState("incoming");
        }
        return;
      }

      setState("none");
    },
    [],
  );

  useEffect(() => {
    if (!targetUserId) {
      setState("loading");
      return;
    }
    if (sessionUserId === undefined) {
      setState("loading");
      return;
    }
    if (sessionUserId === null) {
      setState("anon");
      return;
    }
    if (!sessionUserId) {
      setState("loading");
      return;
    }
    if (sessionUserId === targetUserId) {
      setState("self");
      return;
    }

    let cancelled = false;
    const run = async () => {
      await fetchState(sessionUserId, targetUserId);
      if (cancelled) return;
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [sessionUserId, targetUserId, fetchState]);

  const disabled = busy || state === "loading";

  const refreshRelationship = useCallback(async () => {
    if (!sessionUserId || !targetUserId) return;
    await fetchState(sessionUserId, targetUserId);
  }, [fetchState, sessionUserId, targetUserId]);

  const runAction = useCallback(
    async (action: RelationshipAction, optimisticState: RelationshipState) => {
      if (!sessionUserId || !targetUserId) return;
      setBusy(true);
      setMessage(null);

      try {
        const response = await fetch("/api/relationships", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action, targetUserId }),
        });

        const payload = await response.json().catch(() => null);
        if (!response.ok) {
          setMessage(payload?.error ?? "Unable to update follow status.");
          return;
        }

        setState(optimisticState);
        await refreshRelationship();
        router.refresh();
      } catch {
        setMessage("Unable to update relationship right now.");
      } finally {
        setBusy(false);
      }
    },
    [refreshRelationship, router, sessionUserId, targetUserId],
  );

  const handleFollow = useCallback(async () => {
    await runAction("follow", "requested");
  }, [runAction]);

  const handleFollowBack = useCallback(async () => {
    await runAction("follow_back", "friends");
  }, [runAction]);

  const handleCancelRequest = useCallback(async () => {
    await runAction("cancel", "none");
  }, [runAction]);

  const handleAccept = useCallback(async () => {
    await runAction("accept", "friends");
  }, [runAction]);

  const handleDecline = useCallback(async () => {
    await runAction("decline", "none");
  }, [runAction]);

  const handleUnfriend = useCallback(async () => {
    await runAction("remove", "none");
  }, [runAction]);

  const baseButton =
    "rounded-full border px-3 py-1.5 text-[0.65rem] font-semibold uppercase tracking-[0.22em] transition hover:scale-[1.04]";

  const secondaryButton =
    "rounded-full border border-white/60 bg-white/65 px-3 py-1.5 text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-[#1d2742] transition hover:scale-[1.02]";
  const mutedLabel =
    "text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-[#4d5f91]";

  if (!targetUserId) return null;
  if (state === "self") return null;

  if (state === "loading") {
    return (
      <button
        type="button"
        className={`${baseButton} border-white/50 bg-white/55 text-[#4c5a7a] opacity-60 ${className ?? ""}`}
        disabled
      >
        …
      </button>
    );
  }

  if (state === "anon") {
    return (
      <Link
        href="/login"
        className={`${baseButton} border-[#1d2742] bg-[#1d2742] text-white ${className ?? ""}`}
      >
        Follow
      </Link>
    );
  }

  if (!sessionUserId) return null;

  return (
    <div className={`flex flex-col items-end gap-1 ${className ?? ""}`}>
      {state === "none" && (
        <button
          type="button"
          onClick={handleFollow}
          disabled={disabled}
          className={`${baseButton} border-[#1d2742] bg-[#1d2742] text-white ${
            disabled ? "opacity-60" : ""
          }`}
        >
          Follow
        </button>
      )}

      {state === "requested" && (
        <div className="flex items-center gap-2">
          <span className="text-xs uppercase tracking-[0.18em] text-[#7c89aa]">Requested</span>
          <button
            type="button"
            onClick={handleCancelRequest}
            disabled={disabled}
            className={`${secondaryButton} text-[#4c5a7a] ${
              disabled ? "opacity-60" : ""
            }`}
          >
            Cancel
          </button>
        </div>
      )}

      {state === "incoming" && (
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleAccept}
            disabled={disabled}
            className={`${baseButton} border-[#1d2742] bg-[#1d2742] text-white ${
              disabled ? "opacity-60" : ""
            }`}
          >
            Accept
          </button>
          <button
            type="button"
            onClick={handleDecline}
            disabled={disabled}
            className={`${secondaryButton} ${disabled ? "opacity-60" : ""}`}
          >
            Decline
          </button>
        </div>
      )}

      {state === "followBack" && (
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleFollowBack}
            disabled={disabled}
            className={`${baseButton} border-[#1d2742] bg-[#1d2742] text-white ${
              disabled ? "opacity-60" : ""
            }`}
          >
            Follow back
          </button>
          <button
            type="button"
            onClick={handleUnfriend}
            disabled={disabled}
            className={`${secondaryButton} text-[0.7rem] text-[#4d5f91] ${disabled ? "opacity-60" : ""}`}
          >
            Remove
          </button>
        </div>
      )}

      {state === "friends" && (
        <div className="flex items-center gap-2">
          <span className={mutedLabel}>
            Connected
          </span>
          <button
            type="button"
            onClick={handleUnfriend}
            disabled={disabled}
            className={`${secondaryButton} text-[0.7rem] text-[#4d5f91] ${disabled ? "opacity-60" : ""}`}
          >
            Remove
          </button>
        </div>
      )}

      {message ? <p className="text-[0.65rem] text-rose-500">{message}</p> : null}
    </div>
  );
}
