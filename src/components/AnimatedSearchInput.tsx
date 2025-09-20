"use client";

import { useEffect, useMemo, useState, type KeyboardEvent } from "react";
import { AnimatePresence, motion } from "framer-motion";

interface AnimatedSearchInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  suggestions?: string[];
}

const defaultSuggestions = [
  "Search Hiyoshi…",
  "Try: cheap lunch under ¥1000",
  "Friends’ recent spots",
];

export default function AnimatedSearchInput({
  value,
  onChange,
  onSubmit,
  suggestions = defaultSuggestions,
}: AnimatedSearchInputProps) {
  const placeholders = useMemo(() => suggestions.filter(Boolean), [suggestions]);
  const [index, setIndex] = useState(0);
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (!placeholders.length) return;
    const timer = window.setInterval(() => {
      setIndex((prev) => (prev + 1) % placeholders.length);
    }, 3000);
    return () => window.clearInterval(timer);
  }, [placeholders]);

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      onSubmit();
    }
  };

  const showOverlay = !value;
  const activePlaceholder = placeholders[index] ?? "Search spots";

  return (
    <div className="relative w-full">
      <input
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={handleKeyDown}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        className={`w-full rounded-full border px-5 py-3 pr-12 text-[#1d2742] shadow-[0_20px_45px_-32px_rgba(19,28,46,0.55)] backdrop-blur-2xl focus:outline-none ${
          focused
            ? "border-[#1d2742]/70 bg-white/60"
            : "border-white/55 bg-white/45 hover:border-white/70"
        } transition-[background,box-shadow,border] duration-200`}
      />
      {showOverlay ? (
        <div className="pointer-events-none absolute inset-y-0 left-5 flex items-center text-sm text-gray-500">
          <AnimatePresence mode="wait">
            <motion.span
              key={activePlaceholder}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
            >
              {activePlaceholder}
            </motion.span>
          </AnimatePresence>
        </div>
      ) : null}
      <motion.button
        type="button"
        onClick={onSubmit}
        whileHover={{ scale: 1.06 }}
        whileTap={{ scale: 0.94 }}
        className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-[#1d2742] bg-[#1d2742] text-xs font-semibold uppercase tracking-[0.18em] text-white shadow-[0_18px_30px_-24px_rgba(19,28,46,0.55)]"
      >
        Go
      </motion.button>
    </div>
  );
}
