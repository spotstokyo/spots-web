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
  const placeholders = useMemo(() => {
    const filtered = suggestions.filter(Boolean);
    return filtered.length ? filtered : ["Search spots"];
  }, [suggestions]);
  const [index, setIndex] = useState(0);
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (placeholders.length <= 1) return;
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
        className={`w-full rounded-2xl border px-5 py-3 pr-12 text-[#1d2742] shadow-[0_12px_28px_-24px_rgba(19,28,46,0.45)] backdrop-blur-xl focus:outline-none ${
          focused
            ? "border-[#1d2742]/70 bg-white/65"
            : "border-white/55 bg-white/50 hover:border-white/70"
        } transition-[background,border] duration-150`}
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
      <button
        type="button"
        onClick={onSubmit}
        className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-[#151f36] bg-[#151f36] text-[0.7rem] font-semibold tracking-[0.1em] text-white shadow-[0_14px_28px_-20px_rgba(13,22,40,0.6)] transition-transform transition-colors hover:scale-[1.01] hover:bg-[#0f182e] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1d2742] active:scale-95"
      >
        Go
      </button>
    </div>
  );
}
