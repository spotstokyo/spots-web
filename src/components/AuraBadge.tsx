import type { Database } from "@/lib/database.types";

export type AuraTier = Database["public"]["Enums"]["aura_tier"];

export const AURA_META: Record<
  AuraTier,
  { label: string; badgeClass: string; cardClass: string }
> = {
  none: {
    label: "No aura yet",
    badgeClass: "border border-white/50 bg-white/40 text-[#4c5a7a]",
    cardClass:
      "border-white/60 shadow-[0_22px_48px_-32px_rgba(24,39,79,0.35)]",
  },
  bronze: {
    label: "Bronze aura",
    badgeClass:
      "border border-[#b87333]/60 bg-[rgba(185,115,51,0.15)] text-[#79451f]",
    cardClass:
      "border-[#b87333]/60 shadow-[0_30px_64px_-34px_rgba(185,115,51,0.55)]",
  },
  silver: {
    label: "Silver aura",
    badgeClass:
      "border border-[#c0c0c0]/60 bg-[rgba(192,192,192,0.18)] text-[#4f5661]",
    cardClass:
      "border-[#c0c0c0]/60 shadow-[0_32px_70px_-34px_rgba(192,192,192,0.5)]",
  },
  gold: {
    label: "Gold aura",
    badgeClass:
      "border border-[#d4af37]/60 bg-[rgba(212,175,55,0.16)] text-[#7a5b05]",
    cardClass:
      "border-[#d4af37]/60 shadow-[0_34px_78px_-36px_rgba(212,175,55,0.58)]",
  },
  mythic: {
    label: "Mythic aura",
    badgeClass:
      "border border-[#7157ff]/70 bg-[rgba(113,87,255,0.18)] text-[#4030a8]",
    cardClass:
      "border-[#7157ff]/70 shadow-[0_36px_90px_-32px_rgba(113,87,255,0.62)]",
  },
};

export function getAuraVisuals(tier: AuraTier): (typeof AURA_META)[AuraTier] {
  return AURA_META[tier];
}

interface AuraBadgeProps {
  tier: AuraTier | null | undefined;
  score?: number | null;
  dense?: boolean;
}

export default function AuraBadge({ tier, score, dense }: AuraBadgeProps) {
  const effectiveTier: AuraTier = tier ?? "none";
  const meta = AURA_META[effectiveTier];
  const sizeClasses = dense
    ? "px-2 py-0.5 text-[0.65rem]"
    : "px-3 py-1 text-xs";

  const primaryLabel = meta.label;

  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full uppercase tracking-[0.22em] ${sizeClasses} ${meta.badgeClass}`}
    >
      <span className="font-semibold">{primaryLabel}</span>
      {typeof score === "number" && effectiveTier !== "none" ? (
        <span className="ml-1 text-[0.7rem] font-medium lowercase tracking-normal text-[#4c5a7a]">
          score {Math.round(score)}
        </span>
      ) : null}
    </span>
  );
}
