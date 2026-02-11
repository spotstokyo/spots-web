import React from "react";
import { PlaceHourDraft } from "@/lib/spotMapper";

type HoursEditorProps = {
    hours: PlaceHourDraft[];
    onChange: (hours: PlaceHourDraft[]) => void;
};

const WEEKDAYS = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
];

// Helper to sort hours by open time
const sortHours = (hours: PlaceHourDraft[]) => {
    return [...hours].sort((a, b) => a.open.localeCompare(b.open));
};

export default function HoursEditor({ hours, onChange }: HoursEditorProps) {
    // Group by weekday
    const hoursByDay: Record<number, PlaceHourDraft[]> = {};
    WEEKDAYS.forEach((_, idx) => {
        hoursByDay[idx] = [];
    });

    hours.forEach((h) => {
        if (hoursByDay[h.weekday]) {
            hoursByDay[h.weekday].push(h);
        }
    });

    // Sort each day
    Object.keys(hoursByDay).forEach((key) => {
        const day = Number(key);
        hoursByDay[day] = sortHours(hoursByDay[day]);
    });

    const handleTimeChange = (
        day: number,
        index: number,
        field: "open" | "close",
        value: string
    ) => {
        // Value likely comes as "HH:MM". We need to ensure seconds or keep it simple.
        // Our schema expects "HH:MM:00". Input type="time" gives "HH:MM".
        const timeWithSeconds = value.length === 5 ? `${value}:00` : value;

        const newHours = [...hours];
        // Find the specific item in the flat array... restricted by day sorting complexity.
        // Easier strategy: Reconstruct the flat array from the grouped state we rely on? 
        // Or just filter out the day's hours, modify, and concat.

        // Let's filter out *this* day's hours from the main list first
        const otherDaysHours = newHours.filter(h => h.weekday !== day);

        // Get this day's hours
        const dayHours = [...hoursByDay[day]];

        // Update the specific slot
        if (dayHours[index]) {
            dayHours[index] = { ...dayHours[index], [field]: timeWithSeconds };
        }

        onChange([...otherDaysHours, ...dayHours]);
    };

    const handleAddSlot = (day: number) => {
        const newSlot: PlaceHourDraft = {
            weekday: day,
            open: "09:00:00",
            close: "17:00:00"
        };
        onChange([...hours, newSlot]);
    };

    const handleRemoveSlot = (day: number, index: number) => {
        // Filter out this day's hours
        const otherDaysHours = hours.filter(h => h.weekday !== day);
        const dayHours = [...hoursByDay[day]];

        // Remove specific index
        dayHours.splice(index, 1);

        onChange([...otherDaysHours, ...dayHours]);
    };

    return (
        <div className="space-y-4 border p-4 rounded bg-white">
            <h3 className="font-semibold text-lg">Opening Hours</h3>
            <div className="space-y-2">
                {WEEKDAYS.map((dayName, dayIndex) => (
                    <div key={dayIndex} className="border-b pb-2 last:border-0">
                        <div className="flex justify-between items-center mb-1">
                            <span className="font-medium w-24">{dayName}</span>
                            <button
                                onClick={() => handleAddSlot(dayIndex)}
                                className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded hover:bg-blue-200"
                            >
                                + Add Hours
                            </button>
                        </div>

                        {hoursByDay[dayIndex].length === 0 && (
                            <div className="text-gray-400 text-sm ml-24">Closed</div>
                        )}

                        {hoursByDay[dayIndex].map((slot, slotIdx) => (
                            <div key={slotIdx} className="flex gap-2 items-center ml-24 mb-2">
                                <input
                                    type="time"
                                    value={slot.open.substring(0, 5)}
                                    onChange={(e) => handleTimeChange(dayIndex, slotIdx, "open", e.target.value)}
                                    className="border rounded p-1 text-sm"
                                />
                                <span className="text-gray-500">-</span>
                                <input
                                    type="time"
                                    value={slot.close.substring(0, 5)}
                                    onChange={(e) => handleTimeChange(dayIndex, slotIdx, "close", e.target.value)}
                                    className="border rounded p-1 text-sm"
                                />
                                <button
                                    onClick={() => handleRemoveSlot(dayIndex, slotIdx)}
                                    className="text-red-500 hover:text-red-700 ml-2"
                                    title="Remove slot"
                                >
                                    &times;
                                </button>
                            </div>
                        ))}
                    </div>
                ))}
            </div>
        </div>
    );
}
