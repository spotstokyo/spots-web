export function getMapboxToken() {
  const token = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;
  if (!token) {
    throw new Error("NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN is not set.");
  }
  return token;
}

export const MAPBOX_DEFAULT_STYLE =
  process.env.NEXT_PUBLIC_MAPBOX_STYLE_URL ?? "mapbox://styles/mapbox/light-v11";

export const DEFAULT_MAP_CENTER: [number, number] = [139.702, 35.659]; // Tokyo
