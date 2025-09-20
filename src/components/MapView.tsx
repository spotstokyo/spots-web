"use client";

import { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { getMapboxToken, MAPBOX_DEFAULT_STYLE, DEFAULT_MAP_CENTER } from "@/lib/mapbox";

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
  const mapRef = useRef<mapboxgl.Map | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    mapboxgl.accessToken = getMapboxToken();
    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: MAPBOX_DEFAULT_STYLE,
      center: DEFAULT_MAP_CENTER,
      zoom: 11,
      pitch: 45,
      bearing: -20,
      antialias: true,
    });

    mapRef.current = map;

    map.on("load", () => {
      places.forEach((place) => {
        const marker = new mapboxgl.Marker({ color: "#1d2742" })
          .setLngLat([place.lng, place.lat])
          .setPopup(
            new mapboxgl.Popup({ offset: 12 }).setHTML(
              `<strong>${place.name}</strong><br/>${place.category ?? ""}${place.address ? `<br/>${place.address}` : ""}`,
            ),
          );
        marker.addTo(map);
      });
    });

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          map.easeTo({
            center: [longitude, latitude],
            zoom: 13.5,
            duration: 2400,
            pitch: 55,
            bearing: -15,
            easing: (t) => 1 - Math.pow(1 - t, 3),
          });
          new mapboxgl.Marker({ color: "#8c93a8" })
            .setLngLat([longitude, latitude])
            .setPopup(new mapboxgl.Popup({ offset: 12 }).setText("You are here"))
            .addTo(map);
        },
        () => {},
        { enableHighAccuracy: true, timeout: 5000 },
      );
    }

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [places]);

  return <div ref={containerRef} className="h-full w-full" />;
}
