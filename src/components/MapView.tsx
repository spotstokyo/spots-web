"use client";

import { useCallback, useEffect, useRef } from "react";
import type { Map as LeafletMap, LayerGroup, CircleMarker } from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  DEFAULT_MAP_CENTER,
  DEFAULT_MAP_ZOOM,
  MAP_TILE_ATTRIBUTION,
  MAP_TILE_URL,
} from "@/lib/map-config";

export interface MapPlace {
  id: string;
  name: string;
  lat: number;
  lng: number;
  category?: string | null;
  address?: string | null;
}

interface MapViewProps {
  places: MapPlace[];
}

export default function MapView({ places }: MapViewProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const placesLayerRef = useRef<LayerGroup | null>(null);
  const userMarkerRef = useRef<CircleMarker | null>(null);
  const leafletModuleRef = useRef<typeof import("leaflet") | null>(null);

  const loadLeaflet = useCallback(async () => {
    if (leafletModuleRef.current) {
      return leafletModuleRef.current;
    }
    const L = await import("leaflet");
    leafletModuleRef.current = L;
    return L;
  }, []);

  const requestGeolocation = useCallback((L: typeof import("leaflet"), map: LeafletMap) => {
    if (!navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(
      (position) => {
        if (!map) return;

        const latLng: [number, number] = [position.coords.latitude, position.coords.longitude];

        userMarkerRef.current?.remove();
        const marker = L.circleMarker(latLng, {
          radius: 5,
          weight: 2,
          color: "#8c93a8",
          fillColor: "#8c93a8",
          fillOpacity: 1,
        }).bindPopup("You are here");

        marker.addTo(map);
        userMarkerRef.current = marker;

        map.flyTo(latLng, Math.max(map.getZoom(), 13), {
          duration: 2,
          easeLinearity: 0.25,
        });
      },
      () => {},
      { enableHighAccuracy: true, timeout: 5000 },
    );
  }, []);

  const updateMarkers = useCallback(async () => {
    const L = await loadLeaflet();
    const map = mapRef.current;
    const layer = placesLayerRef.current;

    if (!map || !layer) return;

    layer.clearLayers();

    if (!places.length) {
      map.setView(DEFAULT_MAP_CENTER, DEFAULT_MAP_ZOOM);
      return;
    }

    const bounds = L.latLngBounds([]);

    places.forEach((place) => {
      const popupLines = [`<strong>${place.name}</strong>`];
      if (place.category) popupLines.push(place.category);
      if (place.address) popupLines.push(place.address);

      L.circleMarker([place.lat, place.lng], {
        radius: 6,
        weight: 2,
        color: "#1d2742",
        fillColor: "#1d2742",
        fillOpacity: 1,
      })
        .bindPopup(popupLines.join("<br/>") || place.name)
        .addTo(layer);

      bounds.extend([place.lat, place.lng]);
    });

    if (places.length === 1) {
      map.flyTo([places[0].lat, places[0].lng], 14, {
        duration: 1.3,
        easeLinearity: 0.25,
      });
    } else {
      map.fitBounds(bounds.pad(0.18), { maxZoom: 14 });
    }
  }, [loadLeaflet, places]);

  useEffect(() => {
    let cancelled = false;

    const initialiseMap = async () => {
      if (!containerRef.current || mapRef.current) return;
      const L = await loadLeaflet();
      if (cancelled || !containerRef.current || mapRef.current) return;

      const map = L.map(containerRef.current, {
        preferCanvas: true,
      }).setView(DEFAULT_MAP_CENTER, DEFAULT_MAP_ZOOM);

      L.tileLayer(MAP_TILE_URL, {
        attribution: MAP_TILE_ATTRIBUTION,
        maxZoom: 19,
      }).addTo(map);

      const placesLayer = L.layerGroup().addTo(map);

      mapRef.current = map;
      placesLayerRef.current = placesLayer;

      await updateMarkers();
      requestGeolocation(L, map);
    };

    void initialiseMap();

    return () => {
      cancelled = true;
      userMarkerRef.current?.remove();
      userMarkerRef.current = null;
      mapRef.current?.remove();
      mapRef.current = null;
      placesLayerRef.current = null;
    };
  }, [loadLeaflet, requestGeolocation, updateMarkers]);

  useEffect(() => {
    if (!mapRef.current) return;
    void updateMarkers();
  }, [updateMarkers]);

  return <div ref={containerRef} className="h-full w-full" />;
}
