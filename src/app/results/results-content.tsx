"use client";

import { useEffect, useState, useRef } from "react";
import { useSearchParams } from "next/navigation";
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

export default function ResultsContent() {
  const searchParams = useSearchParams();
  const query = searchParams.get("q")?.toLowerCase() ?? "";

  const [places, setPlaces] = useState<Place[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!query) {
      setPlaces([]);
      return;
    }

    const fetchPlaces = async () => {
      const { data, error } = await supabase.from("places").select("*");

      if (error) {
        setError(error.message);
        return;
      }

      const filtered = (data as Place[]).filter((p) =>
        [p.name, p.category, p.address]
          .filter(Boolean)
          .some((field) => field!.toLowerCase().includes(query))
      );

      setPlaces(filtered);
    };

    fetchPlaces();
  }, [query]);

  return (
    <main className="relative min-h-screen bg-[#FFFAFA]">
      {/* subtle grain */}
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-5 pointer-events-none" />

      {/* Header */}
      <header className="sticky top-0 z-10 mx-3 mt-3 rounded-2xl bg-transparent backdrop-blur-3xl border border-white/50 shadow-md">
        <div className="mx-auto max-w-5xl px-4 py-3 flex flex-col gap-3 items-center">
          <span className="text-xl font-bold text-gray-900 drop-shadow">
            spots
          </span>
          {query && (
            <p className="text-sm text-gray-600">
              Showing results for: <span className="font-medium">{query}</span>
            </p>
          )}
        </div>
      </header>

      {/* Cards */}
      {query ? (
        <section className="relative mx-auto max-w-5xl px-4 py-6 grid gap-6 sm:grid-cols-2">
          {places.map((p) => (
            <GlassCard key={p.id}>
              <div className="h-40 bg-gradient-to-br from-white/20 to-transparent" />
              <div className="p-3">
                <h3 className="font-semibold text-gray-900 drop-shadow">
                  {p.name}
                </h3>
                <p className="text-sm text-gray-700">
                  {p.address ?? "Tokyo"} · {"¥".repeat(p.price_tier ?? 1)} · ★{" "}
                  {Number(p.rating_avg ?? 0).toFixed(1)}
                </p>
              </div>
            </GlassCard>
          ))}

          {places.length === 0 && (
            <p className="col-span-full text-center text-gray-500">
              No results found.
            </p>
          )}
        </section>
      ) : (
        <p className="text-center text-gray-500 mt-12">
          Please enter a search term.
        </p>
      )}

      {error && <p className="text-red-500">{error}</p>}
    </main>
  );
}
