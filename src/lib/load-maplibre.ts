export interface MapLibreBounds {
  extend(lngLat: [number, number]): MapLibreBounds;
}

export interface MapLibreMap {
  remove(): void;
  easeTo(options: Record<string, unknown>): void;
  fitBounds(bounds: MapLibreBounds, options?: Record<string, unknown>): void;
  once(event: string, handler: () => void): void;
  addControl(control: unknown, position?: string): void;
  getZoom(): number;
}

export interface MapLibreMarker {
  remove(): void;
  setLngLat(lngLat: [number, number]): MapLibreMarker;
  setPopup(popup: MapLibrePopup): MapLibreMarker;
  addTo(map: MapLibreMap): MapLibreMarker;
}

export interface MapLibrePopup {
  setText(text: string): MapLibrePopup;
  setHTML(html: string): MapLibrePopup;
}

export interface MapLibreModule {
  readonly Map: new (options: Record<string, unknown>) => MapLibreMap;
  readonly NavigationControl: new (options?: Record<string, unknown>) => unknown;
  readonly Marker: new (options?: Record<string, unknown>) => MapLibreMarker;
  readonly Popup: new (options?: Record<string, unknown>) => MapLibrePopup;
  readonly LngLatBounds: new (...args: unknown[]) => MapLibreBounds;
}

declare global {
  interface Window {
    maplibregl?: MapLibreModule;
  }
}

interface MapLibreSource {
  script: string;
  style: string;
}

const ENV_SCRIPT_URL = process.env.NEXT_PUBLIC_MAPLIBRE_SCRIPT_URL;
const ENV_STYLE_URL = process.env.NEXT_PUBLIC_MAPLIBRE_STYLESHEET_URL;

const FALLBACK_SOURCES: MapLibreSource[] = [
  {
    script: "/vendor/maplibre-gl.js",
    style: "/vendor/maplibre-gl.css",
  },
  {
    script: "https://unpkg.com/maplibre-gl@3.7.0/dist/maplibre-gl.js",
    style: "https://unpkg.com/maplibre-gl@3.7.0/dist/maplibre-gl.css",
  },
  {
    script: "https://cdn.jsdelivr.net/npm/maplibre-gl@3.7.0/dist/maplibre-gl.min.js",
    style: "https://cdn.jsdelivr.net/npm/maplibre-gl@3.7.0/dist/maplibre-gl.min.css",
  },
  {
    script: "https://cdnjs.cloudflare.com/ajax/libs/maplibre-gl/3.7.0/maplibre-gl.min.js",
    style: "https://cdnjs.cloudflare.com/ajax/libs/maplibre-gl/3.7.0/maplibre-gl.min.css",
  },
];

const SOURCES: MapLibreSource[] = ENV_SCRIPT_URL
  ? [
      {
        script: ENV_SCRIPT_URL,
        style: ENV_STYLE_URL ?? FALLBACK_SOURCES[0].style,
      },
    ]
  : FALLBACK_SOURCES;

let loadPromise: Promise<MapLibreModule> | null = null;

const ensureStylesheet = (href: string) => {
  if (typeof document === "undefined") return;

  const existing = document.getElementById("maplibre-gl-stylesheet");
  if (existing instanceof HTMLLinkElement) {
    if (existing.getAttribute("href") !== href) {
      existing.setAttribute("href", href);
    }
    return;
  }

  const link = document.createElement("link");
  link.id = "maplibre-gl-stylesheet";
  link.rel = "stylesheet";
  link.href = href;
  link.crossOrigin = "anonymous";
  document.head.appendChild(link);
};

export const ensureMapLibre = async (): Promise<MapLibreModule> => {
  if (typeof window === "undefined") {
    throw new Error("MapLibre is only available in the browser");
  }

  if (window.maplibregl) {
    return window.maplibregl;
  }

  if (!loadPromise) {
    loadPromise = new Promise((resolve, reject) => {
      const tryLoad = (index: number) => {
        const source = SOURCES[index];
        if (!source) {
          loadPromise = null;
          reject(new Error("MapLibre script failed to load"));
          return;
        }

        ensureStylesheet(source.style);

        const script = document.createElement("script");
        script.src = source.script;
        script.async = true;
        script.crossOrigin = "anonymous";

        script.onload = () => {
          if (window.maplibregl) {
            resolve(window.maplibregl);
          } else {
            script.remove();
            tryLoad(index + 1);
          }
        };

        script.onerror = () => {
          script.remove();
          tryLoad(index + 1);
        };

        document.head.appendChild(script);
      };

      tryLoad(0);
    });
  }

  return loadPromise;
};
