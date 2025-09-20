"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import AnimatedSearchInput from "@/components/AnimatedSearchInput";
import type { Map as LeafletMap } from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  DEFAULT_MAP_CENTER,
  DEFAULT_MAP_ZOOM,
  MAP_TILE_ATTRIBUTION,
  MAP_TILE_URL,
} from "@/lib/map-config";

export default function LandingHero() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [isTransitioning, setIsTransitioning] = useState(false);
  const mapRef = useRef<LeafletMap | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const leafletModuleRef = useRef<typeof import("leaflet") | null>(null);
  const [mapReady, setMapReady] = useState(false);

  const loadLeaflet = async () => {
    if (leafletModuleRef.current) {
      return leafletModuleRef.current;
    }
    const L = await import("leaflet");
    leafletModuleRef.current = L;
    return L;
  };

  useEffect(() => {
    let cancelled = false;

    const initialiseMap = async () => {
      if (!containerRef.current || mapRef.current) return;
      const L = await loadLeaflet();
      if (cancelled || !containerRef.current || mapRef.current) return;

      const map = L.map(containerRef.current, {
        attributionControl: false,
        zoomControl: false,
        dragging: false,
        scrollWheelZoom: false,
        doubleClickZoom: false,
        boxZoom: false,
        keyboard: false,
        touchZoom: false,
      }).setView(DEFAULT_MAP_CENTER, DEFAULT_MAP_ZOOM - 0.5);

      L.tileLayer(MAP_TILE_URL, {
        attribution: MAP_TILE_ATTRIBUTION,
        maxZoom: 19,
      }).addTo(map);

      map.dragging?.disable();
      map.scrollWheelZoom?.disable();
      map.doubleClickZoom?.disable();
      map.boxZoom?.disable();
      map.keyboard?.disable();
      map.touchZoom?.disable();
      (map as unknown as { tap?: { disable?: () => void } }).tap?.disable?.();

      mapRef.current = map;

      map.whenReady(() => {
        if (cancelled) return;
        setMapReady(true);
        map.flyTo(DEFAULT_MAP_CENTER, DEFAULT_MAP_ZOOM + 0.5, {
          duration: 4,
          easeLinearity: 0.2,
        });
      });

      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            if (!mapRef.current) return;
            mapRef.current.flyTo(
              [position.coords.latitude, position.coords.longitude],
              DEFAULT_MAP_ZOOM + 1,
              {
                duration: 2.4,
                easeLinearity: 0.2,
              },
            );
          },
          () => {},
          { enableHighAccuracy: true, timeout: 4000 },
        );
      }
    };

    void initialiseMap();

    return () => {
      cancelled = true;
      mapRef.current?.remove();
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
        <h1 className="text-5xl font-semibold lowercase tracking-tight text-[#18223a]">
          explore your next streak
        </h1>
      </div>

      <div
        className={`relative z-10 flex w-full max-w-2xl flex-col gap-5 transition duration-500 ${
          isTransitioning ? "pointer-events-none opacity-0 translate-y-4" : "opacity-100"
        }`}
      >
        <AnimatedSearchInput value={search} onChange={setSearch} onSubmit={handleSearch} />
        <p className="text-center text-xs text-[#7c89aa]">Hint: “late night ramen in meguro”</p>
      </div>
    </div>
  );
}
