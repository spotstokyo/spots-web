let cachedLocation: { lat: number; lng: number } | null = null;

export const requestUserLocation = async (signal?: AbortSignal): Promise<{ lat: number; lng: number } | null> => {
  if (typeof window === "undefined" || typeof navigator === "undefined" || !navigator.geolocation) {
    return null;
  }

  if (cachedLocation) {
    return cachedLocation;
  }

  return new Promise<{ lat: number; lng: number } | null>((resolve) => {
    let settled = false;

    const finish = (value: { lat: number; lng: number } | null) => {
      if (settled) return;
      settled = true;
      resolve(value);
    };

    const onAbort = () => {
      finish(null);
    };

    signal?.addEventListener("abort", onAbort, { once: true });

    navigator.geolocation.getCurrentPosition(
      (position) => {
        signal?.removeEventListener("abort", onAbort);
        const coords = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        cachedLocation = coords;
        finish(coords);
      },
      () => {
        signal?.removeEventListener("abort", onAbort);
        finish(null);
      },
      {
        enableHighAccuracy: true,
        timeout: 8000,
        maximumAge: 60_000,
      },
    );
  });
};
