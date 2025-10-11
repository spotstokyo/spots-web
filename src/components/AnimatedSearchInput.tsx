"use client";

import { useEffect, useMemo, useState, type KeyboardEvent } from "react";
import { AnimatePresence, motion } from "framer-motion";

interface AnimatedSearchInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  suggestions?: string[];
  variant?: "default" | "elevated";
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
  variant = "default",
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
  const elevatedShadow = focused
    ? "shadow-[0_18px_46px_-18px_rgba(15,20,35,0.36)]"
    : "shadow-[0_16px_38px_-20px_rgba(15,20,35,0.28)]";
  const defaultShadow = focused
    ? "shadow-[0_16px_40px_-20px_rgba(21,30,52,0.3)]"
    : "shadow-[0_14px_32px_-22px_rgba(21,30,52,0.24)]";

  const wrapperClasses = [
    "relative",
    "w-full",
    "overflow-visible",
    "rounded-[28px]",
    "backdrop-blur-[32px]",
    "transition-all",
    "duration-200",
    variant === "elevated"
      ? `border border-white/70 bg-white/90 ${elevatedShadow}`
      : `border border-white/55 bg-white/86 ${defaultShadow}`,
    focused ? "ring-[1px] ring-white/65" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={wrapperClasses}>
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-[12px] -z-10 rounded-[36px] bg-[radial-gradient(circle,rgba(13,19,34,0.25),transparent_65%)] opacity-60 blur-[20px]"
      />
      <input
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={handleKeyDown}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        className={`relative z-10 w-full rounded-[22px] border px-5 py-3 pr-12 text-[#1d2742] bg-white/90 focus:outline-none ${
          focused
            ? "border-[#1d2742]/60"
            : "border-white/55 hover:border-white/70"
        } transition-[background,border] duration-150`}
      />
      {showOverlay ? (
        <div className="pointer-events-none absolute inset-y-0 left-5 z-20 flex items-center text-sm text-gray-500">
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
        className="absolute right-2 top-1/2 z-20 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-[#151f36] bg-[#151f36] text-[0.7rem] font-semibold tracking-[0.1em] text-white shadow-[0_14px_32px_-20px_rgba(13,22,40,0.68)] transition-transform transition-colors hover:scale-[1.01] hover:bg-[#0f182e] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1d2742] active:scale-95"
      >
        Go
      </button>
    </div>
  );
}
