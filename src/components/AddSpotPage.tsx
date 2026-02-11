
"use client";

import { useEffect, useRef, useState } from "react";
import { initAutocomplete } from "@/lib/googlePlaces"; // Adjust import path
import { normalizePlaceToSpot, SpotDraft } from "@/lib/spotMapper";
import { upsertSpot, bulkUpsertSpots } from "@/lib/spotsRepo";
import HoursEditor from "@/components/HoursEditor";

type Mode = "single" | "mass";

export default function AddSpotPage() {
    const [mode, setMode] = useState<Mode>("single");
    const [selectedSpot, setSelectedSpot] = useState<SpotDraft | null>(null);
    const [queue, setQueue] = useState<SpotDraft[]>([]);
    const [status, setStatus] = useState<string>("");
    const [error, setError] = useState<string>("");
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (inputRef.current) {
            initAutocomplete(inputRef.current, (place) => {
                const spot = normalizePlaceToSpot(place);
                setSelectedSpot(spot);
                setStatus("Place selected. Review details below.");
                setError("");
            });
        }
    }, []); // Run once on mount (or when input ref attaches, checking logic)

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
        if (inputRef.current) inputRef.current.value = "";
        setStatus("Added to queue.");
    };

    const handleSaveSingle = async () => {
        if (!selectedSpot) return;
        setStatus("Saving...");
        try {
            await upsertSpot(selectedSpot);
            setStatus("Saved successfully!");
            setSelectedSpot(null);
            if (inputRef.current) inputRef.current.value = "";
        } catch (e) {
            const message = e instanceof Error ? e.message : "Failed to save";
            setError(message);
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

    return (
        <div className="p-4 max-w-2xl mx-auto space-y-6">
            <h1 className="text-2xl font-bold">Add New Spot</h1>

            {/* Mode Toggle */}
            <div className="flex gap-4">
                <button
                    onClick={() => setMode("single")}
                    className={`px-4 py-2 rounded ${mode === "single" ? "bg-blue-600 text-white" : "bg-gray-200"
                        }`}
                >
                    Single Mode
                </button>
                <button
                    onClick={() => setMode("mass")}
                    className={`px-4 py-2 rounded ${mode === "mass" ? "bg-blue-600 text-white" : "bg-gray-200"
                        }`}
                >
                    Mass Mode ({queue.length})
                </button>
            </div>

            {/* Search Input */}
            <div>
                <label className="block text-sm font-medium mb-1">
                    Search Google Places
                </label>
                <input
                    ref={inputRef}
                    type="text"
                    className="w-full p-2 border rounded"
                    placeholder="Type to search..."
                />
            </div>

            {/* Status Messages */}
            {status && <div className="text-green-600">{status}</div>}
            {error && <div className="text-red-600">{error}</div>}

            {/* Selected Spot Editor */}
            {selectedSpot && (
                <div className="border p-4 rounded bg-gray-50 space-y-4">
                    <h2 className="text-xl font-semibold">Edit Details</h2>

                    <div className="grid grid-cols-1 gap-4">
                        <div>
                            <label className="block text-sm">Name</label>
                            <input
                                value={selectedSpot.name}
                                onChange={(e) => updateSelectedSpot("name", e.target.value)}
                                className="w-full p-2 border rounded"
                            />
                        </div>
                        <div>
                            <label className="block text-sm">Category</label>
                            <select
                                value={selectedSpot.category}
                                onChange={(e) => updateSelectedSpot("category", e.target.value)}
                                className="w-full p-2 border rounded"
                            >
                                <option value="restaurant">Restaurant</option>
                                <option value="bar">Bar</option>
                                <option value="club">Club</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm">Address</label>
                            <input
                                value={selectedSpot.address || ""}
                                onChange={(e) => updateSelectedSpot("address", e.target.value)}
                                className="w-full p-2 border rounded"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <label className="block text-sm">Lat</label>
                                <input
                                    value={selectedSpot.lat || ""}
                                    onChange={(e) => updateSelectedSpot("lat", e.target.value)}
                                    className="w-full p-2 border rounded"
                                />
                            </div>
                            <div>
                                <label className="block text-sm">Lng</label>
                                <input
                                    value={selectedSpot.lng || ""}
                                    onChange={(e) => updateSelectedSpot("lng", e.target.value)}
                                    className="w-full p-2 border rounded"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm">Phone</label>
                            <input
                                value={selectedSpot.phone || ""}
                                onChange={(e) => updateSelectedSpot("phone", e.target.value)}
                                className="w-full p-2 border rounded"
                            />
                        </div>
                        <div>
                            <label className="block text-sm">Website</label>
                            <input
                                value={selectedSpot.website || ""}
                                onChange={(e) => updateSelectedSpot("website", e.target.value)}
                                className="w-full p-2 border rounded"
                            />
                        </div>

                        {/* Hours Editor */}
                        <div>
                            <HoursEditor
                                hours={selectedSpot.hours || []}
                                onChange={(newHours) => updateSelectedSpot("hours", newHours)}
                            />
                        </div>
                    </div>

                    <div className="flex gap-2 mt-4">
                        {mode === "single" ? (
                            <button
                                onClick={handleSaveSingle}
                                className="px-6 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                            >
                                Save Spot
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
                            onClick={() => setSelectedSpot(null)}
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
