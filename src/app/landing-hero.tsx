"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AnimatedSearchInput from "@/components/AnimatedSearchInput";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { getMapboxToken, MAPBOX_DEFAULT_STYLE, DEFAULT_MAP_CENTER } from "@/lib/mapbox";

export default function LandingHero() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [isTransitioning, setIsTransitioning] = useState(false);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [mapReady, setMapReady] = useState(false);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    let token: string;
    try {
      token = getMapboxToken();
    } catch (error) {
      console.warn(error);
      return;
    }

    mapboxgl.accessToken = token;
    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: MAPBOX_DEFAULT_STYLE,
      center: DEFAULT_MAP_CENTER,
      zoom: 10.5,
      pitch: 45,
      bearing: -15,
      interactive: false,
    });

    mapRef.current = map;

    map.once("load", () => {
      setMapReady(true);
      map.easeTo({
        center: DEFAULT_MAP_CENTER,
        zoom: 11.2,
        duration: 4000,
        pitch: 55,
        bearing: -25,
        easing: (t) => 1 - Math.pow(1 - t, 3),
      });
    });

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          map.easeTo({
            center: [position.coords.longitude, position.coords.latitude],
            zoom: 11.8,
            duration: 2400,
            pitch: 55,
            bearing: -18,
            easing: (t) => 1 - Math.pow(1 - t, 3),
          });
        },
        () => {},
        { enableHighAccuracy: true, timeout: 4000 },
      );
    }

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  const handleSearch = () => {
    const value = search.trim();
    if (!value) return;
    router.push(`/explore?q=${encodeURIComponent(value)}`);
  };

  const revealMap = () => {
    if (!mapReady || isTransitioning) return;
    setIsTransitioning(true);
    setTimeout(() => router.push("/map"), 600);
  };

  return (
    <div className="relative flex min-h-[calc(100vh-8rem)] w-full flex-col items-center justify-center gap-12 overflow-hidden">
      <div className="absolute inset-0">
        <div
          ref={containerRef}
          className={`h-full w-full transform-gpu transition duration-700 ${
            isTransitioning ? "scale-105 blur-0" : "scale-[1.2] blur-2xl"
          }`}
          onClick={revealMap}
        />
        <div
          className={`pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.6),transparent_55%),radial-gradient(circle_at_80%_30%,rgba(255,255,255,0.4),transparent_60%),linear-gradient(180deg,rgba(255,255,255,0.55)0%,rgba(255,255,255,0.75)85%)] transition-opacity duration-700 ${
            isTransitioning ? "opacity-40" : "opacity-100"
          }`}
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/40 via-white/55 to-white/80" />
      </div>

      <div
        className={`relative z-10 flex max-w-2xl flex-col items-center gap-5 text-center transition duration-500 ${
          isTransitioning ? "pointer-events-none opacity-0 translate-y-4" : "opacity-100"
        }`}
      >
        <div className="rounded-full border border-white/70 bg-white/80 px-5 py-2 text-xs uppercase tracking-[0.3em] text-[#1d2742] shadow-sm">
          spots
        </div>
        <h1 className="text-5xl font-semibold lowercase tracking-tight text-[#18223a]">
          explore your next streak
        </h1>
        <p className="text-sm text-[#4c5a7a]">
          Tap the map to dive in, or search and sign in to share your own spots.
        </p>
      </div>

      <div
        className={`relative z-10 flex w-full max-w-2xl flex-col gap-5 transition duration-500 ${
          isTransitioning ? "pointer-events-none opacity-0 translate-y-4" : "opacity-100"
        }`}
      >
        <AnimatedSearchInput value={search} onChange={setSearch} onSubmit={handleSearch} />
        <p className="text-center text-xs text-[#7c89aa]">Hint: “late night ramen in meguro”</p>
        <div className="flex flex-wrap justify-center gap-3">
          <Link
            href="/login"
            className="rounded-full border border-[#d6d9de] bg-white px-5 py-2 text-sm font-semibold text-[#1d2742] shadow-sm transition hover:scale-[1.02]"
          >
            Log in
          </Link>
          <Link
            href="/signup"
            className="rounded-full border border-[#1d2742] bg-[#1d2742] px-5 py-2 text-sm font-semibold text-white shadow-[0_20px_45px_-28px_rgba(19,28,46,0.55)] transition hover:scale-[1.03]"
          >
            Sign up
          </Link>
          <Link
            href="/explore"
            className="rounded-full border border-[#d6d9de] bg-white/80 px-5 py-2 text-sm text-[#1d2742] transition hover:scale-[1.02]"
          >
            Browse as guest
          </Link>
        </div>
      </div>

      <button
        type="button"
        onClick={revealMap}
        className="relative z-10 rounded-full border border-white/70 bg-white/80 px-5 py-2 text-xs uppercase tracking-[0.3em] text-[#1d2742] shadow-sm transition hover:scale-[1.02]"
      >
        tap map to explore
      </button>
    </div>
  );
}
