"use client";

import {
  forwardRef,
  type ForwardedRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
} from "react";
import type { MapLibreMap, MapLibreMarker, MapLibreModule } from "@/lib/load-maplibre";
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
  MAP_STYLE_URL,
} from "@/lib/map-config";
import { ensureMapLibre } from "@/lib/load-maplibre";
import { normalizeCoordinates } from "@/lib/coordinates";

const BUILDING_LAYER_PATTERN = /building/i;
const MAX_LAYER_ZOOM = 24;

const applyBuildingVisibility = (map: MapLibreMap) => {
  const style = map.getStyle?.();
  const layers = style?.layers ?? [];

  layers.forEach((layer) => {
    if (!layer?.id || !BUILDING_LAYER_PATTERN.test(layer.id)) return;
    if (typeof map.setLayerZoomRange === "function") {
      try {
        map.setLayerZoomRange(layer.id, MAP_BUILDING_MIN_ZOOM, MAX_LAYER_ZOOM);
      } catch {
        // Ignore missing layer zoom capabilities; safest behaviour is to leave defaults.
      }
    }
  });
};

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
}

function MapViewInternal(
  { places, onPlaceSelect, onReady }: MapViewProps,
  ref: ForwardedRef<MapViewHandle>,
) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const placesMarkersRef = useRef<MapLibreMarker[]>([]);
  const userMarkerRef = useRef<MapLibreMarker | null>(null);
  const maplibreModuleRef = useRef<MapLibreModule | null>(null);
  const lastUserCoordsRef = useRef<[number, number] | null>(null);
  const styleDataHandlerRef = useRef<((...args: unknown[]) => void) | null>(null);

  const loadMapLibre = useCallback(async (): Promise<MapLibreModule> => {
    if (maplibreModuleRef.current) {
      return maplibreModuleRef.current;
    }
    const maplibre = await ensureMapLibre();
    maplibreModuleRef.current = maplibre;
    return maplibre;
  }, []);

  const clearPlaceMarkers = () => {
    placesMarkersRef.current.forEach((marker) => marker.remove());
    placesMarkersRef.current = [];
  };

  const requestGeolocation = useCallback(async () => {
    if (!navigator.geolocation || !mapRef.current) return;
    let maplibre: MapLibreModule;
    try {
      maplibre = await loadMapLibre();
    } catch (error) {
      console.error("Failed to load MapLibre", error);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const map = mapRef.current;
        if (!map) return;

        const coords: [number, number] = [position.coords.longitude, position.coords.latitude];

        userMarkerRef.current?.remove();

        const el = document.createElement("div");
        el.className = "map-marker map-marker--user";

        const popup = new maplibre.Popup({ offset: 12 }).setText("You are here");
        const marker = new maplibre.Marker({ element: el })
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
  }, [loadMapLibre]);

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
    }),
    [requestGeolocation],
  );

  const updateMarkers = useCallback(async () => {
    const map = mapRef.current;
    if (!map) return;

    let maplibre: MapLibreModule;
    try {
      maplibre = await loadMapLibre();
    } catch (error) {
      console.error("Failed to load MapLibre", error);
      return;
    }
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

    const bounds = new maplibre.LngLatBounds(
      [normalizedPlaces[0].coords.lng, normalizedPlaces[0].coords.lat],
      [normalizedPlaces[0].coords.lng, normalizedPlaces[0].coords.lat],
    );

    normalizedPlaces.forEach(({ place, coords }) => {
      const popupLines = [`<strong>${place.name}</strong>`];
      if (place.category) popupLines.push(place.category);
      if (place.address) popupLines.push(place.address);

      const markerEl = document.createElement("div");
      markerEl.className = "map-marker";

      const marker = new maplibre.Marker({ element: markerEl })
        .setLngLat([coords.lng, coords.lat])
        .setPopup(
          new maplibre.Popup({ offset: 12 }).setHTML(
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
          map.easeTo({
            center: [coords.lng, coords.lat],
            zoom: MAP_PLACE_CLICK_ZOOM,
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
  }, [loadMapLibre, onPlaceSelect, places]);

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
        zoom: DEFAULT_MAP_ZOOM,
        pitch: MAP_DEFAULT_PITCH,
        bearing: MAP_DEFAULT_BEARING,
        attributionControl: true,
      });

      map.addControl(new maplibre.NavigationControl({ showCompass: false }), "top-right");

      mapRef.current = map;

      const handleStyleData = () => applyBuildingVisibility(map);
      styleDataHandlerRef.current = handleStyleData;
      map.on("styledata", handleStyleData);
      applyBuildingVisibility(map);

      map.once("load", async () => {
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
          // Ignore cleanup errors from already-destroyed maps.
        }
      }
      styleDataHandlerRef.current = null;
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [loadMapLibre, onReady, requestGeolocation, updateMarkers]);

  useEffect(() => {
    if (!mapRef.current) return;
    void updateMarkers();
  }, [updateMarkers]);

  return <div ref={containerRef} className="h-full w-full" />;
}

export default forwardRef<MapViewHandle, MapViewProps>(MapViewInternal);
