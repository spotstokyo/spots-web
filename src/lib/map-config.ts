export const DEFAULT_MAP_CENTER: [number, number] = [139.702, 35.659]; // Tokyo

export const DEFAULT_MAP_ZOOM = 11;

export const MAP_STYLE_URL =
  process.env.NEXT_PUBLIC_MAP_STYLE_URL ??
  "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json";

export const MAP_DEFAULT_PITCH = Number(process.env.NEXT_PUBLIC_MAP_PITCH ?? 45);

export const MAP_DEFAULT_BEARING = Number(process.env.NEXT_PUBLIC_MAP_BEARING ?? -12);
