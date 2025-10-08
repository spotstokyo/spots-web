export const DEFAULT_MAP_CENTER: [number, number] = [139.702, 35.659]; // Tokyo

export const DEFAULT_MAP_ZOOM = 11;

export const MAP_STYLE_URL =
  process.env.NEXT_PUBLIC_MAP_STYLE_URL ??
  "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json";

export const MAP_DEFAULT_PITCH = Number(process.env.NEXT_PUBLIC_MAP_PITCH ?? 0);

export const MAP_DEFAULT_BEARING = Number(process.env.NEXT_PUBLIC_MAP_BEARING ?? 0);

export const MAP_FOCUSED_ZOOM = Number(process.env.NEXT_PUBLIC_MAP_FOCUSED_ZOOM ?? 13.2);

export const MAP_SINGLE_PLACE_ZOOM = Number(
  process.env.NEXT_PUBLIC_MAP_SINGLE_PLACE_ZOOM ?? 14.5,
);

export const MAP_PLACE_CLICK_ZOOM = Number(
  process.env.NEXT_PUBLIC_MAP_PLACE_CLICK_ZOOM ?? 15.4,
);

export const MAP_FIT_BOUNDS_MAX_ZOOM = Number(
  process.env.NEXT_PUBLIC_MAP_FIT_BOUNDS_MAX_ZOOM ?? 13.8,
);

export const MAP_BUILDING_MIN_ZOOM = Number(
  process.env.NEXT_PUBLIC_MAP_BUILDING_MIN_ZOOM ?? 15.6,
);
