"use client";

import {
  forwardRef,
  type ForwardedRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
} from "react";
// Replace custom loader with Radar SDK and maplibre-gl
import Radar from 'radar-sdk-js';
import 'radar-sdk-js/dist/radar.css';
// maplibre-gl is needed for Markers/Popups/Bounds logic since Radar uses it under the hood but we need the classes
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

import {
  DEFAULT_MAP_CENTER,
  DEFAULT_MAP_ZOOM,
  MAP_DEFAULT_BEARING,
  MAP_DEFAULT_PITCH,
  MAP_BUILDING_MIN_ZOOM,
  MAP_FIT_BOUNDS_MAX_ZOOM,
  MAP_FOCUSED_ZOOM,
  MAP_PLACE_CLICK_ZOOM,
  MAP_SINGLE_PLACE_ZOOM,
  // MAP_STYLE_URL, // Not used with Radar default style
} from "@/lib/map-config";
import { normalizeCoordinates } from "@/lib/coordinates";

// Initialize Radar globally
Radar.initialize('prj_test_pk_2ed2dcac0719dc6dcb7619349de45afd0e75df8f');

// Alias types to avoid breaking changes, or use any if exact types aren't available immediately
// Radar's map instance is essentially a MapLibre map instance.
type MapLibreMap = any;
type MapLibreMarker = any;
// We don't need the module type anymore, we have 'maplibregl' imported directly



export interface MapPlace {
  id: string;
  name: string;
  lat: number;
  lng: number;
  category?: string | null;
  address?: string | null;
  price_icon?: string | null;
  price_tier?: number | null;
  rating_avg?: number | null;
  rating_count?: number | null;
  website?: string | null;
}

interface MapViewProps {
  places: MapPlace[];
  onPlaceSelect?: (place: MapPlace) => void;
  onReady?: () => void;
}

export interface MapViewHandle {
  recenterUser: () => void;
  zoomIn: (delta?: number) => void;
  zoomOut: (delta?: number) => void;
}

function MapViewInternal(
  { places, onPlaceSelect, onReady }: MapViewProps,
  ref: ForwardedRef<MapViewHandle>,
) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const placesMarkersRef = useRef<MapLibreMarker[]>([]);
  const userMarkerRef = useRef<MapLibreMarker | null>(null);
  const lastUserCoordsRef = useRef<[number, number] | null>(null);
  const styleDataHandlerRef = useRef<((...args: unknown[]) => void) | null>(null);

  const clearPlaceMarkers = () => {
    placesMarkersRef.current.forEach((marker: any) => marker.remove());
    placesMarkersRef.current = [];
  };

  const requestGeolocation = useCallback(async () => {
    if (!navigator.geolocation || !mapRef.current) return;

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const map = mapRef.current;
        if (!map) return;

        const coords: [number, number] = [position.coords.longitude, position.coords.latitude];

        userMarkerRef.current?.remove();

        const el = document.createElement("div");
        el.className = "map-marker map-marker--user";

        const popup = new maplibregl.Popup({ offset: 12 }).setText("You are here");
        const marker = Radar.ui.marker({ element: el, anchor: "bottom" })
          .setLngLat(coords)
          .setPopup(popup)
          .addTo(map);

        userMarkerRef.current = marker;
        lastUserCoordsRef.current = coords;

        map.easeTo({
          center: coords,
          zoom: Math.max(map.getZoom(), MAP_FOCUSED_ZOOM),
          duration: 2000,
          pitch: MAP_DEFAULT_PITCH,
          easing: (progress: number) => 1 - Math.pow(1 - progress, 2),
        });
      },
      () => {},
      { enableHighAccuracy: true, timeout: 5000 },
    );
  }, []);

  useImperativeHandle(
    ref,
    () => ({
      recenterUser: () => {
        const coords = lastUserCoordsRef.current;
        const map = mapRef.current;
        if (coords && map) {
          map.easeTo({
            center: coords,
            zoom: Math.max(map.getZoom(), MAP_FOCUSED_ZOOM),
            duration: 1200,
            pitch: MAP_DEFAULT_PITCH,
            easing: (progress: number) => 1 - Math.pow(1 - progress, 2),
          });
          return;
        }

        void requestGeolocation();
      },
      zoomIn: (delta = 1) => {
        const map = mapRef.current;
        if (!map?.zoomIn) return;
        map.zoomIn(delta, { duration: 320 });
      },
      zoomOut: (delta = 1) => {
        const map = mapRef.current;
        if (!map?.zoomOut) return;
        map.zoomOut(delta, { duration: 320 });
      },
    }),
    [requestGeolocation],
  );

  const updateMarkers = useCallback(async () => {
    const map = mapRef.current;
    if (!map) return;

    clearPlaceMarkers();

    if (!places.length) {
      map.easeTo({
        center: DEFAULT_MAP_CENTER,
        zoom: DEFAULT_MAP_ZOOM,
        duration: 800,
        easing: (progress: number) => 1 - Math.pow(1 - progress, 3),
      });
      return;
    }

    const normalizedPlaces = places
      .map((place) => {
        const coords = normalizeCoordinates(place.lat, place.lng);
        if (!coords) return null;
        return { place, coords };
      })
      .filter((entry): entry is { place: MapPlace; coords: { lat: number; lng: number } } => entry !== null);

    if (!normalizedPlaces.length) {
      map.easeTo({
        center: DEFAULT_MAP_CENTER,
        zoom: DEFAULT_MAP_ZOOM,
        duration: 800,
        easing: (progress: number) => 1 - Math.pow(1 - progress, 3),
      });
      return;
    }

    const bounds = new maplibregl.LngLatBounds(
      [normalizedPlaces[0].coords.lng, normalizedPlaces[0].coords.lat],
      [normalizedPlaces[0].coords.lng, normalizedPlaces[0].coords.lat],
    );

    normalizedPlaces.forEach(({ place, coords }) => {
      const popupLines = [`<strong>${place.name}</strong>`];
      if (place.category) popupLines.push(place.category);
      if (place.address) popupLines.push(place.address);

      const markerEl = document.createElement("div");
      markerEl.className = "map-marker";

      const marker = Radar.ui.marker({ element: markerEl, anchor: "bottom" })
        .setLngLat([coords.lng, coords.lat])
        .setPopup(
          new maplibregl.Popup({ offset: 12 }).setHTML(
            popupLines.length ? popupLines.join("<br/>") : place.name,
          ),
        )
        .addTo(map);

      placesMarkersRef.current.push(marker);
      bounds.extend([coords.lng, coords.lat]);

      if (onPlaceSelect) {
        markerEl.addEventListener("click", (event) => {
          event.stopPropagation();
          onPlaceSelect(place);
          const currentZoom = map.getZoom?.() ?? MAP_PLACE_CLICK_ZOOM;
          map.easeTo({
            center: [coords.lng, coords.lat],
            zoom: Math.max(currentZoom, MAP_PLACE_CLICK_ZOOM),
            duration: 900,
            pitch: MAP_DEFAULT_PITCH,
            easing: (progress: number) => 1 - Math.pow(1 - progress, 2),
          });
        });
      }
    });

    if (normalizedPlaces.length === 1) {
      map.easeTo({
        center: [normalizedPlaces[0].coords.lng, normalizedPlaces[0].coords.lat],
        zoom: Math.max(map.getZoom(), MAP_SINGLE_PLACE_ZOOM),
        duration: 1300,
        easing: (progress: number) => 1 - Math.pow(1 - progress, 2.2),
      });
    } else {
      map.fitBounds(bounds, {
        padding: { top: 80, right: 80, bottom: 120, left: 80 },
        maxZoom: MAP_FIT_BOUNDS_MAX_ZOOM,
        duration: 1200,
      });
    }
  }, [onPlaceSelect, places]);

  useEffect(() => {
    let cancelled = false;

    const initialiseMap = async () => {
      if (!containerRef.current || mapRef.current) return;
      if (cancelled) return;

      // Use Radar.ui.map to initialize
      const map = Radar.ui.map({
        container: containerRef.current,
        // Explicit style URL with API key to resolve loading errors
        style: 'https://api.radar.io/maps/styles/radar-default-v1?publishableKey=prj_test_pk_2ed2dcac0719dc6dcb7619349de45afd0e75df8f',
        center: DEFAULT_MAP_CENTER,
        zoom: DEFAULT_MAP_ZOOM,
        pitch: MAP_DEFAULT_PITCH,
        bearing: MAP_DEFAULT_BEARING,
        // attributionControl: true, // Removed to fix type error, default is true
      });

      console.log("Map Object:", map);

      mapRef.current = map;


      map.once("load", async () => {
        // Drastic Map Decluttering
          // Drastic Map Decluttering
        try {
          const style = map.getStyle();
          if (style && style.layers) {
            // Log all layers for debugging/identification if needed
            // console.log("Map Layers:", style.layers.map((l: any) => l.id));

            style.layers.forEach((layer: any) => {
              // 1. Broad-spectrum filtering: apply minzoom 16 to all symbol layers with "label"
              // EXCEPTION: Major places (City, Town, Country, State) should remain visible
              const isMajorPlace =
                layer.id.includes("city") ||
                layer.id.includes("town") ||
                layer.id.includes("country") ||
                layer.id.includes("state");

              // Specific keywords for granular place labels requested by user
              const isGranularPlace = 
                layer.id.includes("place-neighbourhood") || 
                layer.id.includes("place-suburb") || 
                layer.id.includes("poi-label") ||
                layer.id.includes("chome") || // Look for potential matches
                layer.id.includes("block");
                
              // Specific check for highway shields/numbers
              const isHighwayShield = 
                layer.id.includes("shield") || 
                layer.id.includes("road-number");
              
              // Specific check for transit (train stations, etc)
              // We want these visible much earlier (e.g. at city zoom level 12)
              const isTransit = 
                layer.id.includes("transit") || 
                layer.id.includes("station") || 
                layer.id.includes("rail") || 
                layer.id.includes("subway");

              if (
                layer.type === "symbol" &&
                !layer.id.includes("spots") && // Exclude custom "spots" data
                !isMajorPlace // Exclude major places so they show up normally
              ) {
                if (layer.id.includes("label") || isHighwayShield || isTransit) {
                    try {
                      let minZoom = 16;
                      
                      if (isTransit) {
                          minZoom = 12; // Show stations at city view
                          
                          // Customize Transit Labels: dark gray color, smaller icons
                          try {
                              map.setPaintProperty(layer.id, 'text-color', '#333333');
                              map.setPaintProperty(layer.id, 'icon-color', '#333333'); // Attempt to colorize icon if SDF
                              map.setLayoutProperty(layer.id, 'icon-size', 0.75); // Make icon smaller
                          } catch (e) {
                              // Ignore specific style errors (e.g. if property not supported or icon not SDF)
                          }
                      } else if (isGranularPlace) {
                          minZoom = 15; // Neighborhoods/Blocks at 15
                      } else if (isHighwayShield) {
                          minZoom = 16; // Highway shields at 16 (as requested)
                      }
                      
                      map.setLayerZoomRange(layer.id, minZoom, 24);
                    } catch (e) {
                      // Ignore individual layer errors
                    }
                }
              }
            });
          }

          // 2. Specific Radar Label Layers known from debugging:
          // The "neighbourhood-suburb-island-label" seems to combine everything.
          const combinedNeighborhoodLayer = "neighbourhood-suburb-island-label";
          try {
            if (map.getLayer(combinedNeighborhoodLayer)) {
              // Set minzoom to 15 so Daikanyama/etc ("chome" level details) appear sooner (15+)
              // Was 17, now 15
              map.setLayerZoomRange(combinedNeighborhoodLayer, 15, 24);
            }
          } catch (e) { /* ignore */ }

          // 3. Ensure POIs are strictly controlled
          // Remove transit-label from noisyLayers because we handle it specifically below
          const checkLayers = ["poi-label", "road-label", "road-number-shield"]; 

          checkLayers.forEach(layerId => {
             try {
               if (map.getLayer(layerId)) {
                 // Make POIs appear only when moderately zoomed in (16) to keep map clean but accessible
                 map.setLayerZoomRange(layerId, 16, 24);
               }
             } catch(e) {}
          });
          
          // Note: "transit-label" handling is now covered by the main loop above (isTransit check)
        } catch (error) {
          console.error("Error applying map decluttering:", error);
        }

        try {
          await updateMarkers();
          void requestGeolocation();
        } finally {
          if (onReady) {
            onReady();
          }
        }
      });
    };

    void initialiseMap();

    return () => {
      cancelled = true;
      clearPlaceMarkers();
      userMarkerRef.current?.remove();
      userMarkerRef.current = null;
      if (mapRef.current && styleDataHandlerRef.current) {
        try {
          mapRef.current.off("styledata", styleDataHandlerRef.current);
        } catch {
          // Ignore cleanup errors
        }
      }
      styleDataHandlerRef.current = null;
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [onReady, requestGeolocation, updateMarkers]);

  useEffect(() => {
    if (!mapRef.current) return;
    void updateMarkers();
  }, [updateMarkers]);

  return <div ref={containerRef} className="h-full w-full" />;
}

export default forwardRef<MapViewHandle, MapViewProps>(MapViewInternal);
