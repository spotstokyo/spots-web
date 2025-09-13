"use client";

import { useEffect, useState, useRef } from "react";
import { Database } from "@/lib/database.types";
import { supabase } from "@/lib/supabase";

type Place = Database["public"]["Tables"]["places"]["Row"];

function GlassCard({ children }: { children: React.ReactNode }) {
  const cardRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!cardRef.current) return;
    const { left, top, width, height } = cardRef.current.getBoundingClientRect();

    const x = e.clientX - left;
    const y = e.clientY - top;

    const rotateX = ((y / height) - 0.5) * 15;
    const rotateY = ((x / width) - 0.5) * -15;

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
      className="rounded-2xl bg-transparent backdrop-blur-3xl border border-white/50 shadow-2xl overflow-hidden p-4 transition-transform duration-200 ease-out will-change-transform"
    >
      {children}
    </div>
  );
}

// 🔹 visionOS-style floating search bar with tilt
function GlassSearchBar() {
  const searchRef = useRef<HTMLDivElement>(null);

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

  return (
    <div
      ref={searchRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={resetTilt}
      className="w-full flex justify-center transition-transform duration-200 ease-out will-change-transform"
    >
      <input
        type="text"
        placeholder="Search ramen, izakaya…"
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

export default function Home() {
  const [places, setPlaces] = useState<Place[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPlaces = async () => {
      const { data, error } = await supabase.from("places").select("*");
      if (error) {
        setError(error.message);
      } else {
        setPlaces((data as Place[]) ?? []);
      }
    };
    fetchPlaces();
  }, []);

  return (
    <main className="relative min-h-screen bg-[#FFFAFA]">
      {/* subtle grain for realism */}
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-5 pointer-events-none" />

      {/* Header */}
      <header className="sticky top-0 z-10 mx-3 mt-3 rounded-2xl bg-transparent backdrop-blur-3xl border border-white/50 shadow-md">
        <div className="mx-auto max-w-5xl px-4 py-3 flex flex-col gap-3 items-center">
          <span className="text-xl font-bold text-gray-900 drop-shadow">
            spots
          </span>
          <GlassSearchBar />
        </div>
      </header>

      {/* Cards */}
      <section className="relative mx-auto max-w-5xl px-4 py-6 grid gap-6 sm:grid-cols-2">
        {places.map((p) => (
          <GlassCard key={p.id}>
            <div className="h-40 bg-gradient-to-br from-white/20 to-transparent" />
            <div className="p-3">
              <h3 className="font-semibold text-gray-900 drop-shadow">{p.name}</h3>
              <p className="text-sm text-gray-700">
                {p.address ?? "Tokyo"} · {"¥".repeat(p.price_tier ?? 1)} · ★{" "}
                {Number(p.rating_avg ?? 0).toFixed(1)}
              </p>
            </div>
          </GlassCard>
        ))}
      </section>

      {error && <p className="text-red-500">{error}</p>}
    </main>
  );
}
