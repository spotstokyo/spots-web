"use client";

import { useRef } from "react";

interface GlassCardProps {
  children: React.ReactNode;
}

export default function GlassCard({ children }: GlassCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!cardRef.current) return;
    const { left, top, width, height } = cardRef.current.getBoundingClientRect();

    const x = e.clientX - left;
    const y = e.clientY - top;

    const rotateX = ((y / height) - 0.5) * 15; // tilt up/down
    const rotateY = ((x / width) - 0.5) * -15; // tilt left/right

    cardRef.current.style.transform = `rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(1.03)`;
  };

  const resetTilt = () => {
    if (!cardRef.current) return;
    cardRef.current.style.transform = "rotateX(0deg) rotateY(0deg) scale(1)";
  };

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={resetTilt}
      className="rounded-2xl bg-white/20 backdrop-blur-xl border border-white/30 shadow-xl overflow-hidden p-4 transition-transform duration-200 ease-out will-change-transform"
    >
      {children}
    </div>
  );
}
