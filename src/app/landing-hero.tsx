"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import AnimatedSearchInput from "@/components/AnimatedSearchInput";
import Appear from "@/components/Appear";
import TypewriterEffect from "@/components/TypewriterEffect";
import { useMapTransition } from "@/components/MapTransitionProvider";
// Replace custom loader with Radar SDK and maplibre-gl
// Replace custom loader with Radar SDK and maplibre-gl
// Radar CSS imports
import 'radar-sdk-js/dist/radar.css';
import 'maplibre-gl/dist/maplibre-gl.css';

import {
  DEFAULT_MAP_CENTER,
  DEFAULT_MAP_ZOOM,
  MAP_DEFAULT_BEARING,
  MAP_DEFAULT_PITCH,
  // MAP_STYLE_URL,
} from "@/lib/map-config";

// Initialize Radar globally (idempotent)
// Moved to useEffect to prevent "window is not defined" error during SSR

// Types for local usage
type MapLibreMap = any;
type MapLibreModule = any;

export default function LandingHero() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [isTransitioning, setIsTransitioning] = useState(false);
  const { startTransition: startMapTransition } = useMapTransition();
  const mapRef = useRef<MapLibreMap | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const blurRef = useRef<HTMLDivElement | null>(null);
  const [shouldLoadMap, setShouldLoadMap] = useState(true);
  const [cursorVisible, setCursorVisible] = useState(false);
  const [cursorPosition, setCursorPosition] = useState({ x: 0, y: 0 });
  const cursorTargetRef = useRef({ x: 0, y: 0 });
  const cursorCurrentRef = useRef({ x: 0, y: 0 });
  const cursorAnimationRef = useRef<number | null>(null);
  const cursorRevealRadius = 40;
  const cursorFeatherStart = cursorRevealRadius * 2.5;
  const cursorFeatherEnd = cursorRevealRadius * 4;
  const [cursorMaskPosition, setCursorMaskPosition] = useState({ x: 0, y: 0 });
  const [isCoarsePointer, setIsCoarsePointer] = useState(false);

  useEffect(() => {
    router.prefetch("/map");
  }, [router]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const prefersCoarsePointer = window.matchMedia?.("(pointer: coarse)").matches;
    if (prefersCoarsePointer) {
      setIsCoarsePointer(true);
      setShouldLoadMap(true);
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
    const hostRect = blurRef.current?.getBoundingClientRect() ?? containerRef.current?.getBoundingClientRect();
    setCursorMaskPosition({
      x: current.x - (hostRect?.left ?? 0),
      y: current.y - (hostRect?.top ?? 0),
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

  const handlePointerMove = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      // Only run the fancy cursor reveal for mouse/trackpad pointers.
      if (event.pointerType !== "mouse") {
        setShouldLoadMap(true);
        return;
      }

      setShouldLoadMap(true);
      cursorTargetRef.current = { x: event.clientX, y: event.clientY };
      const hostRect = blurRef.current?.getBoundingClientRect() ?? containerRef.current?.getBoundingClientRect();
      setCursorMaskPosition({
        x: event.clientX - (hostRect?.left ?? 0),
        y: event.clientY - (hostRect?.top ?? 0),
      });
      if (cursorAnimationRef.current == null) {
        cursorAnimationRef.current = requestAnimationFrame(animateCursor);
      }
    },
    [animateCursor],
  );

  const handlePointerEnter = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== "mouse") {
      setShouldLoadMap(true);
      return;
    }
    setShouldLoadMap(true);
    const initial = { x: event.clientX, y: event.clientY };
    cursorTargetRef.current = initial;
    cursorCurrentRef.current = initial;
    setCursorPosition(initial);
    const hostRect = blurRef.current?.getBoundingClientRect() ?? containerRef.current?.getBoundingClientRect();
    setCursorMaskPosition({
      x: initial.x - (hostRect?.left ?? 0),
      y: initial.y - (hostRect?.top ?? 0),
    });
    setCursorVisible(true);
  }, []);

  const handlePointerDown = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== "mouse") {
      setShouldLoadMap(true);
    }
  }, []);

  const handlePointerLeave = useCallback(() => {
    setCursorVisible(false);
    if (cursorAnimationRef.current != null) {
      cancelAnimationFrame(cursorAnimationRef.current);
      cursorAnimationRef.current = null;
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    const initialiseMap = async () => {
      if (!shouldLoadMap || !containerRef.current || mapRef.current) return;
      if (cancelled) return;

      // Dynamically import Radar SDK and MapLibre only when needed
      const Radar = (await import('radar-sdk-js')).default;
      const maplibregl = (await import('maplibre-gl')).default;

      // Initialize Radar client-side only
      Radar.initialize('prj_test_pk_2ed2dcac0719dc6dcb7619349de45afd0e75df8f');

      const map = Radar.ui.map({
        container: containerRef.current,
        style: 'https://api.radar.io/maps/styles/radar-default-v1?publishableKey=prj_test_pk_2ed2dcac0719dc6dcb7619349de45afd0e75df8f',
        // Specific fixed center for landing page as requested
        center: [139.70165140430015, 35.65808965448815],
        zoom: DEFAULT_MAP_ZOOM - 0.7,
        pitch: MAP_DEFAULT_PITCH,
        bearing: MAP_DEFAULT_BEARING,
        interactive: false,
        // attributionControl: false, // Default is true, explicit false might trigger type error, relying on default overlay behavior or CSS if needed
      });
      
      
      // Removed redundant JS opacity set (now handled by Tailwind class on container)

      mapRef.current = map;

      map.once("load", () => {
        if (cancelled) return;
        
        // --- Decluttering Logic (Matched to MapView.tsx) ---
        try {
          const style = map.getStyle();
          if (style && style.layers) {
            style.layers.forEach((layer: any) => {
              // 1. Broad-spectrum filtering
              const isMajorPlace =
                layer.id.includes("city") ||
                layer.id.includes("town") ||
                layer.id.includes("country") ||
                layer.id.includes("state");

              const isGranularPlace = 
                layer.id.includes("place-neighbourhood") || 
                layer.id.includes("place-suburb") || 
                layer.id.includes("poi-label") ||
                layer.id.includes("chome") || 
                layer.id.includes("block");
                
              const isHighwayShield = 
                layer.id.includes("shield") || 
                layer.id.includes("road-number");
              
              const isTransit = 
                layer.id.includes("transit") || 
                layer.id.includes("station") || 
                layer.id.includes("rail") || 
                layer.id.includes("subway");

              if (
                layer.type === "symbol" &&
                !layer.id.includes("spots") && 
                !isMajorPlace
              ) {
                if (layer.id.includes("label") || isHighwayShield || isTransit) {
                    try {
                      let minZoom = 16;
                      
                      if (isTransit) {
                          minZoom = 12; // Show stations at city view
                          
                          // Customize Transit Labels: dark gray color, smaller icons
                          try {
                              map.setPaintProperty(layer.id, 'text-color', '#333333');
                              map.setPaintProperty(layer.id, 'icon-color', '#333333');
                              map.setLayoutProperty(layer.id, 'icon-size', 0.75);
                          } catch (e) {}
                      } else if (isGranularPlace) {
                          minZoom = 15; // Neighborhoods/Blocks at 15
                      } else if (isHighwayShield) {
                          minZoom = 16; // Highway shields at 16
                      }
                      
                      map.setLayerZoomRange(layer.id, minZoom, 24);
                    } catch (e) {}
                }
              }
            });
          }

          // 2. Specific Radar Label Layers
          const combinedNeighborhoodLayer = "neighbourhood-suburb-island-label";
          try {
            if (map.getLayer(combinedNeighborhoodLayer)) {
              map.setLayerZoomRange(combinedNeighborhoodLayer, 15, 24);
            }
          } catch (e) { /* ignore */ }

          // 3. Ensure POIs are strictly controlled
          const checkLayers = ["poi-label", "road-label", "road-number-shield"]; 
          checkLayers.forEach(layerId => {
             try {
               if (map.getLayer(layerId)) {
                 map.setLayerZoomRange(layerId, 16, 24);
               }
             } catch(e) {}
          });
        } catch (error) {
          console.error("Error applying map decluttering on landing page:", error);
        }
        // ---------------------------------------------------

        // Fade in map after style adjustments
        // This prevents the user from seeing the "flash" of granular labels
        if (map.getCanvas()) {
          setTimeout(() => {
             map.getCanvas().style.opacity = '1';
          }, 100);
        }

        map.easeTo({
          center: [139.70165140430015, 35.65808965448815], // Keep fixed center
          zoom: DEFAULT_MAP_ZOOM + 0.4,
          duration: 4000,
          pitch: MAP_DEFAULT_PITCH,
          bearing: MAP_DEFAULT_BEARING,
          easing: (progress: number) => 1 - Math.pow(1 - progress, 3),
        });
      });
      
      // Removed geolocation logic to ensure consistent landing page for all users


    };

    void initialiseMap();

    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [shouldLoadMap]);

  const handleSearch = () => {
    const value = search.trim();
    if (!value) return;
    router.push(`/explore?q=${encodeURIComponent(value)}`);
  };

  const revealMap = () => {
    setShouldLoadMap(true);
    if (isTransitioning) return;
    setIsTransitioning(true);
    startMapTransition(() => router.push("/map"));
  };

  const scrollDownOneViewport = () => {
    if (typeof window === "undefined") return;
    const section = document.getElementById("nearby-spots");
    if (!section) return;

    const nav = document.querySelector("nav");
    const navHeight = nav?.getBoundingClientRect().height ?? 76;
    const offset = navHeight + 24;
    const start = window.scrollY;
    const target = Math.max(0, section.getBoundingClientRect().top + window.scrollY - offset);
    const duration = 1300;
    const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

    const startTime = performance.now();
    const step = (now: number) => {
      const elapsed = Math.min(1, (now - startTime) / duration);
      const eased = easeInOutCubic(elapsed);
      window.scrollTo({ top: start + (target - start) * eased, behavior: "auto" });
      if (elapsed < 1) requestAnimationFrame(step);
    };

    requestAnimationFrame(step);
  };

  return (
    <div
      className="relative flex hero-section-height w-full flex-col items-center justify-center overflow-hidden px-4 pb-20 pt-[calc(6rem+var(--safe-area-top,0px))] sm:px-6 lg:px-8"
      style={{ paddingBottom: "calc(5rem + var(--safe-area-bottom, 0px))" }}
    >
      <div className="absolute inset-0">
        <div
          ref={containerRef}
          className={`h-full w-full bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.16),transparent_62%),radial-gradient(circle_at_80%_40%,rgba(255,255,255,0.12),transparent_68%),linear-gradient(135deg,#e6ebfa_0%,#f5f7fe_100%)] transform-gpu transition-[transform,filter] duration-[1400ms] ease-[cubic-bezier(0.22,0.61,0.36,1)] [&_canvas]:opacity-0 [&_canvas]:transition-opacity [&_canvas]:duration-[1500ms] ${
            isTransitioning ? "scale-105" : "scale-[1.05]"
          }`}
          onClick={revealMap}
          onPointerMove={handlePointerMove}
          onPointerEnter={handlePointerEnter}
          onPointerLeave={handlePointerLeave}
          onPointerDown={handlePointerDown}
        />
        <div
          ref={blurRef}
          className="pointer-events-none inset-0 z-0 absolute"
          style={{
            backdropFilter: isTransitioning ? "blur(1px)" : `blur(${isCoarsePointer ? 2.2 : 3.5}px)`,
            WebkitBackdropFilter: isTransitioning ? "blur(1px)" : `blur(${isCoarsePointer ? 2.2 : 3.5}px)`,
            transition:
              "backdrop-filter 260ms ease, -webkit-backdrop-filter 260ms ease, opacity 260ms ease",
            opacity: isTransitioning ? 0.28 : 1,
            background: "rgba(255,255,255,0.01)",
            willChange: "backdrop-filter",
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
        <div
          className="pointer-events-none absolute inset-x-0 top-0 z-30"
          style={{
            height: "calc(4.75rem + var(--safe-area-top, 0px))",
            background:
              "linear-gradient(180deg, #ffffff 0%, rgba(255,255,255,0.75) 32%, rgba(255,255,255,0.05) 100%)",
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
        <div className="pointer-events-none absolute inset-0 z-20 bg-gradient-to-b from-white/12 via-white/22 to-white/40" />
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 z-20 bg-gradient-to-b from-transparent via-white/62 to-white/95 backdrop-blur-[4px]"
          style={{ height: "calc(var(--vh, 1vh) * 7.5)" }}
        />
      </div>

      <div
        className={`relative z-30 flex w-full max-w-2xl flex-col items-center gap-6 text-center transition duration-500 ${
          isTransitioning ? "pointer-events-none opacity-0 translate-y-4" : "opacity-100 -translate-y-1"
        }`}
      >
        {!isTransitioning ? (
          <>
            <div className="w-full min-h-[3.5rem] flex items-center justify-center">
               <h1 className="text-5xl font-semibold lowercase tracking-tight text-[#18223a]">
                <TypewriterEffect text="explore your next spot" duration={1.7} />
              </h1>
            </div>
            <Appear preset="fade-up-soft" delayOrder={1} className="w-full">
              <AnimatedSearchInput
                value={search}
                onChange={setSearch}
                onSubmit={handleSearch}
                variant="elevated"
              />
            </Appear>
            <Appear preset="fade-up-soft" delayOrder={2}>
              <p className="text-xs font-medium tracking-[0.12em] text-[#2f3a58]/70">
                click anywhere on the map to explore
              </p>
            </Appear>
          </>
        ) : null}
      </div>
      <button
        type="button"
        onClick={scrollDownOneViewport}
        className="pointer-events-auto absolute bottom-9 left-1/2 z-30 flex -translate-x-1/2 flex-col items-center rounded-full px-5 py-4 text-[#1d2742]/70 drop-shadow-[0_10px_30px_rgba(27,38,74,0.35)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1d2742]/50 focus-visible:ring-offset-2 focus-visible:ring-offset-white/70"
        aria-label="Scroll down"
      >
        <span className="animate-bounce leading-none" aria-hidden>
          <svg width="46" height="18" viewBox="0 0 46 18" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M3 3l20 12 20-12"
              stroke="#1d2742"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
        <span className="sr-only">Scroll down one screen</span>
      </button>
    </div>
  );
}
