"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import AnimatedSearchInput from "@/components/AnimatedSearchInput";
import { useMapTransition } from "@/components/MapTransitionProvider";
import type { MapLibreMap, MapLibreModule } from "@/lib/load-maplibre";
import {
  DEFAULT_MAP_CENTER,
  DEFAULT_MAP_ZOOM,
  MAP_DEFAULT_BEARING,
  MAP_DEFAULT_PITCH,
  MAP_STYLE_URL,
} from "@/lib/map-config";
import { ensureMapLibre } from "@/lib/load-maplibre";

export default function LandingHero() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [isTransitioning, setIsTransitioning] = useState(false);
  const { startTransition: startMapTransition } = useMapTransition();
  const mapRef = useRef<MapLibreMap | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const maplibreModuleRef = useRef<MapLibreModule | null>(null);
  const [mapReady, setMapReady] = useState(false);

  useEffect(() => {
    router.prefetch("/map");
  }, [router]);

  const loadMapLibre = useCallback(async (): Promise<MapLibreModule> => {
    if (maplibreModuleRef.current) {
      return maplibreModuleRef.current;
    }
    const maplibre = await ensureMapLibre();
    maplibreModuleRef.current = maplibre;
    return maplibre;
  }, []);

  useEffect(() => {
    let cancelled = false;

    const initialiseMap = async () => {
      if (!containerRef.current || mapRef.current) return;
      let maplibre: MapLibreModule;
      try {
        maplibre = await loadMapLibre();
      } catch (error) {
        console.error("Failed to load MapLibre", error);
        return;
      }

      if (cancelled || !containerRef.current || mapRef.current) return;

      const map = new maplibre.Map({
        container: containerRef.current,
        style: MAP_STYLE_URL,
        center: DEFAULT_MAP_CENTER,
        zoom: DEFAULT_MAP_ZOOM - 0.7,
        pitch: MAP_DEFAULT_PITCH,
        bearing: MAP_DEFAULT_BEARING,
        interactive: false,
        attributionControl: false,
      });

      mapRef.current = map;

      map.once("load", () => {
        if (cancelled) return;
        setMapReady(true);
        map.easeTo({
          center: DEFAULT_MAP_CENTER,
          zoom: DEFAULT_MAP_ZOOM + 0.4,
          duration: 4000,
          pitch: MAP_DEFAULT_PITCH,
          bearing: MAP_DEFAULT_BEARING,
          easing: (progress: number) => 1 - Math.pow(1 - progress, 3),
        });
      });

      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            if (!mapRef.current) return;
            mapRef.current.easeTo({
              center: [position.coords.longitude, position.coords.latitude],
              zoom: DEFAULT_MAP_ZOOM + 1,
              duration: 2400,
              easing: (progress: number) => 1 - Math.pow(1 - progress, 2),
            });
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
  }, [loadMapLibre]);

  const handleSearch = () => {
    const value = search.trim();
    if (!value) return;
    router.push(`/explore?q=${encodeURIComponent(value)}`);
  };

  const revealMap = () => {
    if (!mapReady || isTransitioning) return;
    setIsTransitioning(true);
    startMapTransition(() => router.push("/map"));
  };

  return (
    <div className="relative -mt-28 flex hero-section-height w-full flex-col items-center justify-center gap-12 overflow-hidden px-4 pb-16 pt-28 sm:px-6 lg:px-8">
      <div className="absolute inset-0">
        <div
          ref={containerRef}
          className={`h-full w-full transform-gpu transition duration-700 ${
            isTransitioning ? "scale-105 blur-0" : "scale-[1.05] blur-sm"
          }`}
          onClick={revealMap}
        />
        <div
          className={`pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.35),transparent_58%),radial-gradient(circle_at_80%_30%,rgba(255,255,255,0.22),transparent_62%),linear-gradient(180deg,rgba(255,255,255,0.32)0%,rgba(255,255,255,0.5)80%)] transition-opacity duration-700 backdrop-blur-[3px] ${
            isTransitioning ? "opacity-25" : "opacity-75"
          }`}
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/18 via-white/26 to-white/42" />
      </div>

      <div
        className={`relative z-10 flex max-w-2xl flex-col items-center gap-5 text-center transition duration-500 ${
          isTransitioning ? "pointer-events-none opacity-0 translate-y-4" : "opacity-100"
        }`}
      >
        <h1 className="text-5xl font-semibold lowercase tracking-tight text-[#18223a]">
          explore your next spot
        </h1>
      </div>

      <div
        className={`relative z-10 flex w-full max-w-2xl flex-col gap-5 transition duration-500 ${
          isTransitioning ? "pointer-events-none opacity-0 translate-y-4" : "opacity-100"
        }`}
      >
        <AnimatedSearchInput
          value={search}
          onChange={setSearch}
          onSubmit={handleSearch}
          variant="elevated"
        />
      </div>
    </div>
  );
}
