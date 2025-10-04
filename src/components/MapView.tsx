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
  MAP_STYLE_URL,
} from "@/lib/map-config";
import { ensureMapLibre } from "@/lib/load-maplibre";

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
}

export interface MapViewHandle {
  recenterUser: () => void;
}

function MapViewInternal({ places, onPlaceSelect }: MapViewProps, ref: ForwardedRef<MapViewHandle>) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const placesMarkersRef = useRef<MapLibreMarker[]>([]);
  const userMarkerRef = useRef<MapLibreMarker | null>(null);
  const maplibreModuleRef = useRef<MapLibreModule | null>(null);
  const lastUserCoordsRef = useRef<[number, number] | null>(null);

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
          zoom: Math.max(map.getZoom(), 13),
          duration: 2000,
          pitch: MAP_DEFAULT_PITCH / 2,
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
            zoom: Math.max(map.getZoom(), 13),
            duration: 1200,
            pitch: MAP_DEFAULT_PITCH / 2,
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

    const bounds = new maplibre.LngLatBounds(
      [places[0].lng, places[0].lat],
      [places[0].lng, places[0].lat],
    );

    places.forEach((place) => {
      const popupLines = [`<strong>${place.name}</strong>`];
      if (place.category) popupLines.push(place.category);
      if (place.address) popupLines.push(place.address);

      const markerEl = document.createElement("div");
      markerEl.className = "map-marker";

      const marker = new maplibre.Marker({ element: markerEl })
        .setLngLat([place.lng, place.lat])
        .setPopup(
          new maplibre.Popup({ offset: 12 }).setHTML(
            popupLines.length ? popupLines.join("<br/>") : place.name,
          ),
        )
        .addTo(map);

      placesMarkersRef.current.push(marker);
      bounds.extend([place.lng, place.lat]);

      if (onPlaceSelect) {
        markerEl.addEventListener("click", (event) => {
          event.stopPropagation();
          onPlaceSelect(place);
          map.easeTo({
            center: [place.lng, place.lat],
            zoom: Math.max(map.getZoom(), 13),
            duration: 900,
            easing: (progress: number) => 1 - Math.pow(1 - progress, 2),
          });
        });
      }
    });

    if (places.length === 1) {
      map.easeTo({
        center: [places[0].lng, places[0].lat],
        zoom: 14,
        duration: 1300,
        easing: (progress: number) => 1 - Math.pow(1 - progress, 2.2),
      });
    } else {
      map.fitBounds(bounds, {
        padding: { top: 80, right: 80, bottom: 120, left: 80 },
        maxZoom: 14,
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
        pitch: MAP_DEFAULT_PITCH / 2,
        bearing: MAP_DEFAULT_BEARING,
        attributionControl: true,
      });

      map.addControl(new maplibre.NavigationControl({ showCompass: false }), "top-right");

      mapRef.current = map;

      map.once("load", async () => {
        await updateMarkers();
        void requestGeolocation();
      });
    };

    void initialiseMap();

    return () => {
      cancelled = true;
      clearPlaceMarkers();
      userMarkerRef.current?.remove();
      userMarkerRef.current = null;
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [loadMapLibre, requestGeolocation, updateMarkers]);

  useEffect(() => {
    if (!mapRef.current) return;
    void updateMarkers();
  }, [updateMarkers]);

  return <div ref={containerRef} className="h-full w-full" />;
}

export default forwardRef<MapViewHandle, MapViewProps>(MapViewInternal);
