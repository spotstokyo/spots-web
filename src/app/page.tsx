"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

// 🔹 Reusable VisionOS-style floating search bar with tilt
function GlassSearchBar({ onSubmit }: { onSubmit: (q: string) => void }) {
  const searchRef = useRef<HTMLDivElement>(null);
  const [text, setText] = useState("");

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!searchRef.current) return;
    const { left, top, width, height } = searchRef.current.getBoundingClientRect();

    const x = e.clientX - left;
    const y = e.clientY - top;

    const rotateX = ((y / height) - 0.5) * 10;
    const rotateY = ((x / width) - 0.5) * -10;

    searchRef.current.style.transform = `rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(1.02)`;
  };

  const resetTilt = () => {
    if (!searchRef.current) return;
    searchRef.current.style.transform = "rotateX(0deg) rotateY(0deg) scale(1)";
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && text.trim()) {
      onSubmit(text.trim());
    }
  };

  return (
    <div
      ref={searchRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={resetTilt}
      className="w-full flex justify-center transition-transform duration-200 ease-out will-change-transform"
    >
      <input
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Search Nakameguro, Hiyoshi..."
        className="
          w-full max-w-md
          px-4 py-2
          rounded-full
          bg-white/10
          backdrop-blur-2xl
          border border-white/30
          shadow-lg
          text-gray-900 placeholder-gray-500
          focus:outline-none focus:ring-2 focus:ring-blue-400/50
          transition
        "
      />
    </div>
  );
}

// 🔹 Glass-style button (same vibe as search bar)
function GlassButton({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="
        mt-4 px-6 py-2
        rounded-full
        bg-white/10
        backdrop-blur-2xl
        border border-white/30
        shadow-lg
        text-gray-900 font-medium
        hover:bg-white/20
        transition
      "
    >
      {children}
    </button>
  );
}

export default function LandingPage() {
  const router = useRouter();

  const handleSearch = (query: string) => {
  router.push(`/results?q=${encodeURIComponent(query)}`);
};
  const handleSubmitSpot = () => {
    // For now, redirect to results page too or create new route later
    router.push("/submit");
  };

  return (
    <main className="relative min-h-screen flex flex-col items-center justify-center bg-[#FFFAFA]">
      {/* subtle grain */}
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-5 pointer-events-none" />

      <h1 className="text-5xl font-bold text-gray-900 drop-shadow mb-8">
        spots
      </h1>

      {/* Search bar */}
      <GlassSearchBar onSubmit={handleSearch} />

      {/* Submit Spot button */}
      <GlassButton onClick={handleSubmitSpot}>Submit spot</GlassButton>
    </main>
  );
}
