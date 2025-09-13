"use client";

import { useEffect, useState } from "react";
import { Database } from "@/lib/database.types";
import { supabase } from "@/lib/supabase";  // ✅ import your client

type Place = Database["public"]["Tables"]["places"]["Row"];

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
    <main className="min-h-screen bg-white">
      <header className="sticky top-0 bg-white/70 backdrop-blur border-b">
        <div className="mx-auto max-w-5xl px-4 py-3 flex items-center gap-3">
          <span className="text-xl font-bold">spots</span>
          <input
            placeholder="Search ramen, izakaya…"
            className="ml-auto w-full max-w-md rounded-lg border px-3 py-2"
          />
        </div>
      </header>

      <section className="mx-auto max-w-5xl px-4 py-6 grid gap-4 sm:grid-cols-2">
        {places.map((p) => (
          <article key={p.id} className="rounded-xl border overflow-hidden">
            <div className="h-40 bg-gray-100" />
            <div className="p-3">
              <h3 className="font-semibold">{p.name}</h3>
              <p className="text-sm text-gray-600">
                {p.address ?? "Tokyo"} · {"¥".repeat(p.price_tier ?? 1)} · ★{" "}
                {Number(p.rating_avg ?? 0).toFixed(1)}
              </p>
            </div>
          </article>
        ))}
      </section>

      {error && <p className="text-red-500">{error}</p>}
    </main>
  );
}
