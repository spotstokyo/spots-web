
import { setOptions, importLibrary } from "@googlemaps/js-api-loader";

const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY as string;

let googleMapsPromise: Promise<void> | null = null;

export function loadGoogleMaps(): Promise<void> {
  if (googleMapsPromise) return googleMapsPromise;

  if (!GOOGLE_MAPS_API_KEY) {
    console.warn("Google Maps API Key is missing");
    return Promise.reject("Google Maps API Key is missing");
  }

  // Configure the loader options
  setOptions({
    key: GOOGLE_MAPS_API_KEY,
    v: "weekly",
    libraries: ["places"], // Although importLibrary specificies what to load, this might be good for init.
  });

  // Load the places library. 
  // Note: importLibrary returns a Promise<Library>. We just need to ensure it's loaded.
  googleMapsPromise = importLibrary("places")
    .then(() => {
        // Also ensure "maps" or "core" if needed? 
        // Autocomplete usually needs "places".
        return;
    })
    .catch((err) => {
      console.error("Failed to load Google Maps Places library", err);
      throw err;
    });

  return googleMapsPromise;
}

export function initAutocomplete(
  input: HTMLInputElement,
  onPlaceSelected: (place: google.maps.places.PlaceResult) => void
) {
  loadGoogleMaps().then(() => {
    // Ensure google.maps.places is available.
    // importLibrary("places") should have ensured this namespace is populated or we use the returned lib.
    
    // In strict functional API usage, we might get the class from the promise:
    // const { Autocomplete } = await importLibrary("places");
    // const autocomplete = new Autocomplete(...);
    
    // But existing code uses global window.google.maps.places.
    // This usually works if the library is loaded.
    
    if (!window.google || !window.google.maps || !window.google.maps.places) {
        console.error("Google Maps Places library not found in window");
        return;
    }

    const autocomplete = new window.google.maps.places.Autocomplete(input, {
      componentRestrictions: { country: "jp" },
      fields: [
        "place_id",
        "name",
        "formatted_address",
        "geometry",
        "formatted_phone_number",
        "website",
        "url",
        "types",
        "rating",
        "user_ratings_total",
        "opening_hours",
        "photos",
        "price_level",
      ],
    });

    autocomplete.addListener("place_changed", () => {
      const place = autocomplete.getPlace();
      onPlaceSelected(place);
    });
  });
}

export const autocompleteService = {
  currentPromise: null as Promise<google.maps.places.AutocompleteService> | null,
  
  getService: () => {
    if (autocompleteService.currentPromise) return autocompleteService.currentPromise;
    autocompleteService.currentPromise = loadGoogleMaps().then(() => {
      return new window.google.maps.places.AutocompleteService();
    });
    return autocompleteService.currentPromise;
  },

  getPlacePredictions: (input: string) => {
    return autocompleteService.getService().then((service) => {
      return new Promise<google.maps.places.AutocompletePrediction[]>((resolve, reject) => {
        if (!input) {
            resolve([]);
            return;
        }
        service.getPlacePredictions(
          { 
            input, 
            componentRestrictions: { country: "jp" },
            types: ["establishment", "geocode"]
          },
          (predictions, status) => {
            if (status !== window.google.maps.places.PlacesServiceStatus.OK || !predictions) {
              resolve([]);
              return;
            }
            resolve(predictions);
          }
        );
      });
    });
  },

  getPlaceDetails: (placeId: string) => {
    return loadGoogleMaps().then(() => {
        // PlacesService requires a DOM element, even if not displaying a map.
        // We can create a dummy one.
        const dummyDiv = document.createElement("div");
        const service = new window.google.maps.places.PlacesService(dummyDiv);
        
        return new Promise<google.maps.places.PlaceResult>((resolve, reject) => {
            service.getDetails(
                {
                    placeId,
                    fields: [
                        "place_id",
                        "name",
                        "formatted_address",
                        "geometry",
                        "formatted_phone_number",
                        "website",
                        "url",
                        "types",
                        "rating",
                        "user_ratings_total",
                        "opening_hours",
                        "photos",
                        "price_level",
                    ],
                },
                (place, status) => {
                    if (status === window.google.maps.places.PlacesServiceStatus.OK && place) {
                        resolve(place);
                    } else {
                        reject(status);
                    }
                }
            );
        });
    });
  }
};
