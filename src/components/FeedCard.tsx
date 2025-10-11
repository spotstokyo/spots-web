"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import GlassCard from "./GlassCard";
import FollowButton from "./FollowButton";

interface FeedCardPlace {
  id: string;
  name: string;
  priceLabel: string | null;
}

interface FeedCardUser {
  displayName: string;
  avatarUrl: string | null;
  initials: string;
}

interface FeedCardItem {
  id: string;
  photoUrl: string | null;
  note: string | null;
  timeAgo: string;
  userId: string | null;
  place: FeedCardPlace | null;
  priceLabel: string | null;
  user: FeedCardUser;
}

interface FeedCardProps {
  item: FeedCardItem;
  showFollowButton?: boolean;
}

function Avatar({ user }: { user: FeedCardUser }) {
  if (user.avatarUrl) {
    return (
      <Image
        src={user.avatarUrl}
        alt={user.displayName}
        width={40}
        height={40}
        className="h-10 w-10 rounded-full border border-white/40 object-cover shadow-sm"
      />
    );
  }

  return (
    <div className="flex h-10 w-10 items-center justify-center rounded-full border border-white/55 bg-white/65 text-sm font-semibold text-[#1d2742] shadow-sm">
      {user.initials}
    </div>
  );
}

export default function FeedCard({ item, showFollowButton = true }: FeedCardProps) {
  const placeLink = item.place ? `/place/${item.place.id}` : null;

  const noteContent = useMemo(() => {
    if (!item.note) return null;
    return item.note.trim();
  }, [item.note]);

  const [expanded, setExpanded] = useState(false);
  const isExpandable = Boolean(noteContent && noteContent.length > 0);

  const previewNote = useMemo(() => {
    if (!noteContent) return null;
    if (noteContent.length <= 160) return noteContent;
    return `${noteContent.slice(0, 157)}…`;
  }, [noteContent]);

  const handleToggle = () => {
    if (!isExpandable) return;
    setExpanded((prev) => !prev);
  };

  return (
    <GlassCard
      onClick={isExpandable ? handleToggle : undefined}
      className={`space-y-4 transition-[box-shadow,border] duration-300 ${
        expanded
          ? "border-white/60 shadow-[0_36px_80px_-42px_rgba(24,39,79,0.65)]"
          : "border-white/40"
      }`}
    >
      <header className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Avatar user={item.user} />
          <div className="flex flex-col">
          {item.userId ? (
            <Link
              href={`/users/${item.userId}`}
              className="text-sm font-medium text-[#18223a] underline-offset-4 hover:underline"
              onClick={(event) => event.stopPropagation()}
            >
              {item.user.displayName}
            </Link>
          ) : (
            <span className="text-sm font-medium text-[#18223a]">{item.user.displayName}</span>
          )}
            <span className="text-xs text-[#7c89aa]">{item.timeAgo}</span>
          </div>
        </div>
        {showFollowButton && item.userId ? (
          <FollowButton targetUserId={item.userId} />
        ) : null}
      </header>

      {item.photoUrl ? (
        <div className="relative overflow-hidden rounded-2xl border border-white/40 bg-white/25">
          <Image
            src={item.photoUrl}
            alt={item.place?.name ?? "Spot photo"}
            width={1200}
            height={675}
            className="h-64 w-full object-cover"
            priority={false}
          />
          <div className="absolute inset-x-4 bottom-4 rounded-full bg-gradient-to-br from-[#1e2a46]/80 via-[#304066]/75 to-[#1b2440]/80 px-4 py-2 text-sm text-white shadow-[0_12px_32px_-18px_rgba(15,20,35,0.85)] backdrop-blur">
            <div className="flex items-center justify-between gap-3">
              {placeLink ? (
                <Link
                  href={placeLink}
                  className="font-semibold underline-offset-4 hover:underline"
                >
                  {item.place?.name}
                </Link>
              ) : (
                <span className="font-semibold text-white">
                  {item.place?.name ?? "Unknown place"}
                </span>
              )}
              {item.priceLabel ? (
                <span className="text-xs uppercase tracking-wide">
                  {item.priceLabel}
                </span>
              ) : null}
            </div>
          </div>
        </div>
      ) : (
        <div className="flex h-64 w-full items-center justify-center rounded-2xl border border-dashed border-white/30 bg-white/10 text-sm text-gray-500">
            Photo coming soon
        </div>
      )}

      {noteContent ? (
        <div className="space-y-2">
          <AnimatePresence mode="wait" initial={false}>
            {expanded ? (
              <motion.p
                key="expanded"
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 4 }}
                transition={{ duration: 0.22, ease: "easeOut" }}
                className="whitespace-pre-wrap text-sm text-gray-800"
              >
                {noteContent}
              </motion.p>
            ) : (
              <motion.p
                key="collapsed"
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 4 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                className="text-sm text-[#2a3554]"
              >
                {previewNote}
              </motion.p>
            )}
          </AnimatePresence>
          <p className="text-xs uppercase tracking-[0.16em] text-[#7c89aa]">
            Tap to {expanded ? "collapse" : "expand"}
          </p>
        </div>
      ) : null}
    </GlassCard>
  );
}
