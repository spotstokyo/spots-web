export interface NormalizedCoordinates {
  lat: number;
  lng: number;
}

const isLatitude = (value: number) => Number.isFinite(value) && Math.abs(value) <= 90;
const isLongitude = (value: number) => Number.isFinite(value) && Math.abs(value) <= 180;

/**
 * Accepts numeric or string latitude/longitude pairs and normalises them.
 * Handles common data-entry mistakes where lat/lng are swapped.
 */
export function normalizeCoordinates(
  lat: number | string | null,
  lng: number | string | null,
): NormalizedCoordinates | null {
  if (lat == null || lng == null) {
    return null;
  }

  const latNumber = typeof lat === "string" ? Number.parseFloat(lat) : lat;
  const lngNumber = typeof lng === "string" ? Number.parseFloat(lng) : lng;

  if (!Number.isFinite(latNumber) || !Number.isFinite(lngNumber)) {
    return null;
  }

  if (isLatitude(latNumber) && isLongitude(lngNumber)) {
    return { lat: latNumber, lng: lngNumber };
  }

  if (isLatitude(lngNumber) && isLongitude(latNumber)) {
    return { lat: lngNumber, lng: latNumber };
  }

  return null;
}
