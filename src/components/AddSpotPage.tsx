
"use client";

import { useEffect, useRef, useState } from "react";
import { initAutocomplete } from "@/lib/googlePlaces"; // Adjust import path
import { normalizePlaceToSpot, SpotDraft } from "@/lib/spotMapper";
import { upsertSpot, bulkUpsertSpots } from "@/lib/spotsRepo";
import HoursEditor from "@/components/HoursEditor";

type Mode = "single" | "mass" | "manual";

export default function AddSpotPage() {
    const [mode, setMode] = useState<Mode>("single");
    const [selectedSpot, setSelectedSpot] = useState<SpotDraft | null>(null);
    const [queue, setQueue] = useState<SpotDraft[]>([]);
    const [status, setStatus] = useState<string>("");
    const [error, setError] = useState<string>("");
    const [inputVal, setInputVal] = useState("");
    const [suggestions, setSuggestions] = useState<google.maps.places.AutocompletePrediction[]>([]);

    // Debounce effect
    useEffect(() => {
        const timer = setTimeout(() => {
            if (inputVal.length > 2 && mode !== "manual") {
                import("@/lib/googlePlaces").then(({ autocompleteService }) => {
                    autocompleteService.getPlacePredictions(inputVal).then(preds => {
                        setSuggestions(preds);
                    });
                });
            }
        }, 1000); // 1 second debounce

        return () => clearTimeout(timer);
    }, [inputVal, mode]);

    const handlePredictionSelect = async (placeId: string) => {
        setSuggestions([]); // Clear suggestions
        setStatus("Loading details...");

        try {
            const { autocompleteService } = await import("@/lib/googlePlaces");
            const place = await autocompleteService.getPlaceDetails(placeId);
            const spot = normalizePlaceToSpot(place);
            setSelectedSpot(spot);
            setStatus("Place selected. Review details below.");
            setError("");
        } catch (err) {
            console.error(err);
            setError("Failed to load place details.");
            setStatus("");
        }
    };

    // Actually initAutocomplete might need to be called after render when ref is ready.
    // The useEffect dependent on [] with ref access is tricky if ref is null initially.
    // Better to use a callback ref or check if ref.current exists.
    // Since we conditionally render input? No, input is always there.
    // React 18 strict mode double invoke might cause issues with google maps binding?
    // initAutocomplete handles loading checks.

    const handleAddToQueue = () => {
        if (!selectedSpot) return;
        setQueue([...queue, selectedSpot]);
        setSelectedSpot(null);
        setInputVal("");
        setStatus("Added to queue.");
    };

    const handleSaveSingle = async () => {
        if (!selectedSpot) return;

        // Simple client-side check (optional, but good UX)
        // ideally we check session. 
        // For now, let's rely on the repo error but make sure we are clear.

        setStatus("Saving...");
        try {
            // We could also check: await supabaseBrowserClient.auth.getSession() here
            // But let's just try to save.
            await upsertSpot(selectedSpot);
            setStatus("Saved successfully!");
            setSelectedSpot(null);
            setInputVal("");
        } catch (e) {
            console.error("Save error:", e);
            const message = e instanceof Error ? e.message : "Failed to save";

            // Check for 401/403
            if (message.includes("401") || message.includes("403") || message.includes("JWT")) {
                setError("You must be logged in to add a spot.");
            } else {
                setError(message);
            }
            setStatus("");
        }
    };

    const handleBulkSave = async () => {
        if (queue.length === 0) return;
        setStatus(`Saving ${queue.length} spots...`);
        try {
            await bulkUpsertSpots(queue);
            setStatus("Bulk save successful!");
            setQueue([]);
        } catch (e) {
            const message = e instanceof Error ? e.message : "Failed to bulk save";
            setError(message);
            setStatus("");
        }
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateSelectedSpot = (field: keyof SpotDraft, value: any) => {
        if (!selectedSpot) return;
        setSelectedSpot({ ...selectedSpot, [field]: value });
    };

    const switchToManual = () => {
        setMode("manual");
        setSelectedSpot({
            place_id: crypto.randomUUID(), // Temp ID for manual entry
            name: "",
            address: "",
            lat: "",
            lng: "",
            phone: "",
            website: "",
            google_maps_url: "",
            category: "other",
            rating_avg: null,
            rating_count: null,
            price_tier: 1,
            hours: [],
            opening_hours: null,
            photos: [],
            types: [],
        });
        setStatus("");
        setError("");
    };

    return (
        <div className="p-4 max-w-2xl mx-auto space-y-6">
            <h1 className="text-2xl font-bold">Add New Spot</h1>

            {/* Mode Toggle */}
            <div className="flex gap-4">
                <button
                    onClick={() => {
                        setMode("single");
                        setSelectedSpot(null);
                        setStatus("");
                        setError("");
                    }}
                    className={`px-4 py-2 rounded ${mode === "single" ? "bg-blue-600 text-white" : "bg-gray-200"
                        }`}
                >
                    Single Mode
                </button>
                <button
                    onClick={() => {
                        setMode("mass");
                        setSelectedSpot(null);
                        setStatus("");
                        setError("");
                    }}
                    className={`px-4 py-2 rounded ${mode === "mass" ? "bg-blue-600 text-white" : "bg-gray-200"
                        }`}
                >
                    Mass Mode ({queue.length})
                </button>
                <button
                    onClick={switchToManual}
                    className={`px-4 py-2 rounded ${mode === "manual" ? "bg-blue-600 text-white" : "bg-gray-200"
                        }`}
                >
                    Manual (Old)
                </button>
            </div>

            {/* Search Input - Hide in Manual Mode */}
            {mode !== "manual" && (
                <div className="relative">
                    <label className="block text-sm font-medium mb-1">
                        Search Google Places
                    </label>
                    <input
                        type="text"
                        className="w-full p-2 border rounded"
                        placeholder="Type to search..."
                        value={inputVal}
                        onChange={(e) => {
                            setInputVal(e.target.value);
                            if (e.target.value === "") {
                                setSuggestions([]);
                                setSelectedSpot(null);
                                setStatus("");
                                setError("");
                            }
                        }}
                    />

                    {/* Suggestions Dropdown */}
                    {suggestions.length > 0 && (
                        <ul className="absolute z-10 w-full bg-white border border-gray-300 rounded-b mt-1 max-h-60 overflow-y-auto shadow-lg">
                            {suggestions.map((prediction) => (
                                <li
                                    key={prediction.place_id}
                                    className="p-3 hover:bg-gray-100 cursor-pointer border-b last:border-b-0"
                                    onClick={() => handlePredictionSelect(prediction.place_id)}
                                >
                                    <div className="font-medium text-gray-900">
                                        {prediction.structured_formatting.main_text}
                                    </div>
                                    <div className="text-sm text-gray-500">
                                        {prediction.structured_formatting.secondary_text}
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            )}

            {/* Status Messages */}
            {status && <div className="text-green-600">{status}</div>}
            {error && <div className="text-red-600">{error}</div>}

            {/* Selected Spot Editor (Used for both Single search result and Manual entry) */}
            {selectedSpot && (
                <div className="border p-4 rounded bg-gray-50 space-y-4">
                    <h2 className="text-xl font-semibold">
                        {mode === "manual" ? "Submit a Spot" : "Edit Details"}
                    </h2>

                    <div className="grid grid-cols-1 gap-4">
                        <div>
                            <label className="block text-sm">Name</label>
                            <input
                                value={selectedSpot.name}
                                onChange={(e) => updateSelectedSpot("name", e.target.value)}
                                className="w-full p-2 border rounded"
                                placeholder="Name"
                            />
                        </div>
                        <div>
                            <label className="block text-sm">Category</label>
                            <select
                                value={selectedSpot.category}
                                onChange={(e) => updateSelectedSpot("category", e.target.value)}
                                className="w-full p-2 border rounded"
                            >
                                <option value="cafe">Cafe</option>
                                <option value="restaurant">Restaurant</option>
                                <option value="bar">Bar</option>
                                <option value="club">Club</option>
                                <option value="park">Park</option>
                                <option value="store">Store</option>
                                <option value="hotel">Hotel</option>
                                <option value="museum">Museum</option>
                                <option value="gym">Gym</option>
                                <option value="other">Other</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm">Price Tier</label>
                            <select
                                value={selectedSpot.price_tier || 1}
                                onChange={(e) => updateSelectedSpot("price_tier", Number(e.target.value))}
                                className="w-full p-2 border rounded"
                            >
                                <option value={1}>¥ (¥1–1,000)</option>
                                <option value={2}>¥ (¥1,000–2,000)</option>
                                <option value={3}>¥¥ (¥2,000–3,000)</option>
                                <option value={4}>¥¥ (¥3,000–5,000)</option>
                                <option value={5}>¥¥¥ (¥5,000–10,000)</option>
                                <option value={6}>¥¥¥ (¥10,000+)</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm">Address</label>
                            <input
                                value={selectedSpot.address || ""}
                                onChange={(e) => updateSelectedSpot("address", e.target.value)}
                                className="w-full p-2 border rounded"
                                placeholder="Address"
                            />
                        </div>
                        <div>
                            <label className="block text-sm">Phone</label>
                            <input
                                value={selectedSpot.phone || ""}
                                onChange={(e) => updateSelectedSpot("phone", e.target.value)}
                                className="w-full p-2 border rounded"
                                placeholder="Phone Number"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <label className="block text-sm">Lat (optional)</label>
                                <input
                                    value={selectedSpot.lat || ""}
                                    onChange={(e) => updateSelectedSpot("lat", e.target.value)}
                                    className="w-full p-2 border rounded"
                                    placeholder="Latitude"
                                />
                            </div>
                            <div>
                                <label className="block text-sm">Lng (optional)</label>
                                <input
                                    value={selectedSpot.lng || ""}
                                    onChange={(e) => updateSelectedSpot("lng", e.target.value)}
                                    className="w-full p-2 border rounded"
                                    placeholder="Longitude"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm">Website (optional)</label>
                            <input
                                value={selectedSpot.website || ""}
                                onChange={(e) => updateSelectedSpot("website", e.target.value)}
                                className="w-full p-2 border rounded"
                                placeholder="Website"
                            />
                        </div>

                        {/* Hours Editor */}
                        <div>
                            <label className="block text-sm font-medium mb-2">Opening hours (optional)</label>
                            <p className="text-xs text-gray-500 mb-2">Add one or more time ranges per day. Leave unchecked for closed days.</p>
                            <HoursEditor
                                hours={selectedSpot.hours || []}
                                onChange={(newHours) => updateSelectedSpot("hours", newHours)}
                            />
                        </div>
                    </div>

                    <div className="flex gap-2 mt-4">
                        {mode === "single" || mode === "manual" ? (
                            <button
                                onClick={handleSaveSingle}
                                className="px-6 py-2 bg-green-600 text-white rounded hover:bg-green-700 w-full font-bold"
                            >
                                {mode === "manual" ? "Submit Spot" : "Save Spot"}
                            </button>
                        ) : (
                            <button
                                onClick={handleAddToQueue}
                                className="px-6 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
                            >
                                Add to Queue
                            </button>
                        )}
                        <button
                            onClick={() => {
                                setSelectedSpot(null);
                                if (mode === "manual") setMode("single");
                            }}
                            className="px-6 py-2 bg-gray-300 text-black rounded hover:bg-gray-400"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}

            {/* Queue Display (Mass Mode) */}
            {mode === "mass" && queue.length > 0 && (
                <div className="border p-4 rounded bg-white mt-6">
                    <h2 className="text-xl font-semibold mb-4">Queue ({queue.length})</h2>
                    <ul className="space-y-2 mb-4">
                        {queue.map((spot, idx) => (
                            <li key={idx} className="border-b pb-2">
                                <div className="font-bold">{spot.name}</div>
                                <div className="text-sm text-gray-500">{spot.address}</div>
                            </li>
                        ))}
                    </ul>
                    <button
                        onClick={handleBulkSave}
                        className="w-full py-3 bg-green-600 text-white rounded font-bold hover:bg-green-700"
                    >
                        Bulk Save All
                    </button>
                </div>
            )}
        </div>
    );
}
