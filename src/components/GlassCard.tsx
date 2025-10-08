"use client";

import {
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
} from "react";
import { motion } from "framer-motion";

interface GlassCardProps {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  role?: string;
  tabIndex?: number;
}

export default function GlassCard({ children, className, onClick, role, tabIndex }: GlassCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });

  const interactive = useMemo(() => Boolean(onClick), [onClick]);

  const handleMouseMove = (event: ReactMouseEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const offsetX = (event.clientX - rect.left) / rect.width;
    const offsetY = (event.clientY - rect.top) / rect.height;

    setTilt({
      x: (offsetY - 0.5) * -10,
      y: (offsetX - 0.5) * 10,
    });
  };

  const resetTilt = () => {
    setTilt({ x: 0, y: 0 });
  };

  const classes = [
    "group relative overflow-hidden rounded-2xl border border-white/60 bg-white/55 px-5 py-4 shadow-[0_20px_42px_-32px_rgba(31,41,55,0.32)] transition-transform duration-200 ease-out backdrop-blur-xl",
    interactive ? "cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70" : undefined,
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (!interactive || !onClick) return;
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onClick();
    }
  };

  return (
    <motion.div
      ref={cardRef}
      layout
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.99 }}
      onMouseMove={handleMouseMove}
      onMouseLeave={resetTilt}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      role={interactive ? role ?? "button" : role}
      tabIndex={interactive ? tabIndex ?? 0 : tabIndex}
      style={{ rotateX: tilt.x, rotateY: tilt.y }}
      className={classes}
    >
      <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
        <div className="absolute inset-0 bg-gradient-to-br from-white/30 via-transparent to-white/10" />
      </div>
      <div className="relative z-10">
        {children}
      </div>
    </motion.div>
  );
}
