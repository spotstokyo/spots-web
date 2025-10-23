"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import AnimatedSearchInput from "@/components/AnimatedSearchInput";
import Appear from "@/components/Appear";
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
  const [cursorVisible, setCursorVisible] = useState(false);
  const [cursorPosition, setCursorPosition] = useState({ x: 0, y: 0 });
  const cursorTargetRef = useRef({ x: 0, y: 0 });
  const cursorCurrentRef = useRef({ x: 0, y: 0 });
  const cursorAnimationRef = useRef<number | null>(null);
  const cursorRevealRadius = 40;
  const cursorFeatherStart = cursorRevealRadius * 2.5;
  const cursorFeatherEnd = cursorRevealRadius * 4;
  const [cursorMaskPosition, setCursorMaskPosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    router.prefetch("/map");
  }, [router]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const params = new URLSearchParams(window.location.search);
    if (!params.has("code")) {
      return;
    }
    const query = params.toString();
    const target = query ? `/auth/callback?${query}` : "/auth/callback";
    router.replace(target);
  }, [router]);

  useEffect(() => {
    return () => {
      if (cursorAnimationRef.current != null) {
        cancelAnimationFrame(cursorAnimationRef.current);
        cursorAnimationRef.current = null;
      }
    };
  }, []);

  const animateCursor = useCallback(() => {
    const target = cursorTargetRef.current;
    const current = cursorCurrentRef.current;
    const dx = target.x - current.x;
    const dy = target.y - current.y;

    const followStrength = 0.06;
    current.x += dx * followStrength;
    current.y += dy * followStrength;
    cursorCurrentRef.current = { ...current };
    setCursorPosition({ x: current.x, y: current.y });
    const rect = containerRef.current?.getBoundingClientRect();
    setCursorMaskPosition({
      x: current.x - (rect?.left ?? 0),
      y: current.y - (rect?.top ?? 0),
    });

    const distance = Math.hypot(dx, dy);
    if (distance > 0.15) {
      cursorAnimationRef.current = requestAnimationFrame(animateCursor);
    } else {
      cursorCurrentRef.current = { ...target };
      setCursorPosition({ ...target });
      cursorAnimationRef.current = null;
    }
  }, []);

  const handleCursorMove = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      cursorTargetRef.current = { x: event.clientX, y: event.clientY };
      const rect = containerRef.current?.getBoundingClientRect();
      setCursorMaskPosition({
        x: event.clientX - (rect?.left ?? 0),
        y: event.clientY - (rect?.top ?? 0),
      });
      if (cursorAnimationRef.current == null) {
        cursorAnimationRef.current = requestAnimationFrame(animateCursor);
      }
    },
    [animateCursor],
  );

  const handleCursorEnter = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    const initial = { x: event.clientX, y: event.clientY };
    cursorTargetRef.current = initial;
    cursorCurrentRef.current = initial;
    setCursorPosition(initial);
    const rect = containerRef.current?.getBoundingClientRect();
    setCursorMaskPosition({
      x: initial.x - (rect?.left ?? 0),
      y: initial.y - (rect?.top ?? 0),
    });
    setCursorVisible(true);
  }, []);

  const handleCursorLeave = useCallback(() => {
    setCursorVisible(false);
    if (cursorAnimationRef.current != null) {
      cancelAnimationFrame(cursorAnimationRef.current);
      cursorAnimationRef.current = null;
    }
  }, []);

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
    <div
      className="relative flex hero-section-height w-full flex-col items-center justify-center overflow-hidden px-4 pb-20 pt-[calc(6rem+var(--safe-area-top,0px))] sm:px-6 lg:px-8"
      style={{ paddingBottom: "calc(5rem + var(--safe-area-bottom, 0px))" }}
    >
      <div className="absolute inset-0">
        <div
          ref={containerRef}
          className={`h-full w-full transform-gpu transition duration-700 ${
            isTransitioning ? "scale-105" : "scale-[1.05]"
          }`}
          onClick={revealMap}
          onMouseMove={handleCursorMove}
          onMouseEnter={handleCursorEnter}
          onMouseLeave={handleCursorLeave}
        />
        <div
          className="pointer-events-none absolute inset-0 z-0"
          style={{
            backdropFilter: isTransitioning ? "blur(1px)" : "blur(3.5px)",
            WebkitBackdropFilter: isTransitioning ? "blur(1px)" : "blur(3.5px)",
            transition:
              "backdrop-filter 260ms ease, -webkit-backdrop-filter 260ms ease, opacity 260ms ease",
            opacity: isTransitioning ? 0.28 : 1,
            ...(cursorVisible
              ? {
                  maskImage: `radial-gradient(circle ${cursorFeatherEnd}px at ${cursorMaskPosition.x}px ${cursorMaskPosition.y}px, rgba(0,0,0,0) 0px, rgba(0,0,0,0) ${cursorRevealRadius}px, rgba(0,0,0,0.6) ${cursorFeatherStart}px, rgba(0,0,0,1) ${cursorFeatherEnd}px)`,
                  WebkitMaskImage: `radial-gradient(circle ${cursorFeatherEnd}px at ${cursorMaskPosition.x}px ${cursorMaskPosition.y}px, rgba(0,0,0,0) 0px, rgba(0,0,0,0) ${cursorRevealRadius}px, rgba(0,0,0,0.6) ${cursorFeatherStart}px, rgba(0,0,0,1) ${cursorFeatherEnd}px)`,
                  maskRepeat: "no-repeat",
                  WebkitMaskRepeat: "no-repeat",
                }
              : undefined),
          }}
        />
        {cursorVisible && (
          <div className="pointer-events-none fixed inset-0 z-40">
            <div
              className="absolute h-[90px] w-[90px] -translate-x-1/2 -translate-y-1/2 transform rounded-full border border-black/70 transition-transform duration-150 ease-in-out"
              style={{ left: `${cursorPosition.x}px`, top: `${cursorPosition.y}px` }}
            />
          </div>
        )}
        <div
          className={`pointer-events-none absolute inset-0 z-10 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.3),transparent_58%),radial-gradient(circle_at_80%_30%,rgba(255,255,255,0.18),transparent_62%),linear-gradient(180deg,rgba(255,255,255,0.24)0%,rgba(255,255,255,0.42)80%)] transition-opacity duration-700 ${
            isTransitioning ? "opacity-20" : "opacity-65"
          }`}
        />
        <div className="pointer-events-none absolute inset-0 z-20 bg-gradient-to-b from-white/16 via-white/24 to-white/38" />
      </div>

      <div
        className={`relative z-30 flex w-full max-w-2xl flex-col items-center gap-6 text-center transition duration-500 ${
          !mapReady
            ? "pointer-events-none opacity-0 translate-y-3"
            : isTransitioning
            ? "pointer-events-none opacity-0 translate-y-4"
            : "opacity-100 translate-y-0"
        }`}
      >
        {mapReady ? (
          !isTransitioning ? (
            <>
              <Appear preset="lift-tilt" className="w-full">
                <h1 className="text-5xl font-semibold lowercase tracking-tight text-[#18223a]">
                  explore your next spot
                </h1>
              </Appear>
              <Appear preset="fade-up-soft" delayOrder={1} className="w-full">
                <AnimatedSearchInput
                  value={search}
                  onChange={setSearch}
                  onSubmit={handleSearch}
                  variant="elevated"
                />
              </Appear>
            </>
          ) : null
        ) : (
          <div className="w-full max-w-sm rounded-2xl border border-white/55 bg-white/65 px-4 py-3 text-sm text-[#4c5a7a] shadow-sm">
            Setting up the map…
          </div>
        )}
      </div>
    </div>
  );
}
